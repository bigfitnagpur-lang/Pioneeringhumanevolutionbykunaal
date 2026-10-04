// ============================================
// SCHEDULED: /.netlify/functions/daily-report
// Self-contained (all shared logic inlined below) so there's only one
// flat file to upload for this function — no subfolders needed.
//
// Runs once a day (schedule configured in netlify.toml). Gathers the
// full calendar day's events/leads/bookings in the owner's timezone,
// builds the report, and emails it.
//
// Can also be invoked manually with ?date=YYYY-MM-DD for testing.
//
// TIMEZONE: defaults to IST (UTC+5:30). Override with the
// REPORT_TIMEZONE_OFFSET_MINUTES environment variable if needed —
// see DEPLOYMENT.md.
// ============================================

// ---- from blobs.js (storage reads) ----
// ============================================
// NETLIFY BLOBS STORAGE HELPERS
// Thin wrapper around @netlify/blobs with the key conventions
// this project uses. Three logical stores:
//   events   — raw event log, one blob per event
//   leads    — one blob per lead, upserted across the visitor's journey
//   bookings — one blob per booking
//
// Keys are date-prefixed (YYYY-MM-DD) so the daily report can list
// a single day's events/bookings efficiently via prefix filtering,
// without scanning the entire store.
// ============================================

const { getStore } = require('@netlify/blobs');

function dateKey(d) {
  const date = d instanceof Date ? d : new Date(d || Date.now());
  return date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function newId(prefix) {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `${prefix}-${ts}${rand}`;
}

async function saveEvent(event) {
  const store = getStore('events');
  const day = dateKey(event.timestamp);
  const key = `${day}:${event.eventId || newId('EVT')}`;
  await store.setJSON(key, event);
  return key;
}

async function listEventsForDay(day) {
  const store = getStore('events');
  const { blobs } = await store.list({ prefix: `${day}:` });
  const results = [];
  for (const b of blobs) {
    const val = await store.get(b.key, { type: 'json' });
    if (val) results.push(val);
  }
  return results;
}

async function getLead(leadId) {
  const store = getStore('leads');
  return store.get(leadId, { type: 'json' });
}

async function saveLead(lead) {
  const store = getStore('leads');
  lead.updatedAt = new Date().toISOString();
  await store.setJSON(lead.leadId, lead);
  return lead;
}

async function listLeadsForDay(day) {
  const store = getStore('leads');
  const { blobs } = await store.list();
  const results = [];
  for (const b of blobs) {
    const val = await store.get(b.key, { type: 'json' });
    if (val && dateKey(val.createdAt) === day) results.push(val);
  }
  return results;
}

async function saveBooking(booking) {
  const store = getStore('bookings');
  const day = dateKey(booking.createdAt);
  const key = `${day}:${booking.bookingId}`;
  await store.setJSON(key, booking);
  return key;
}

async function listBookingsForDay(day) {
  const store = getStore('bookings');
  const { blobs } = await store.list({ prefix: `${day}:` });
  const results = [];
  for (const b of blobs) {
    const val = await store.get(b.key, { type: 'json' });
    if (val) results.push(val);
  }
  return results;
}

// ---- from sanitize.js (escaping) ----
// ============================================
// SANITIZE — escape user-submitted text before it is ever
// interpolated into HTML (admin dashboard, email report).
// Every lead/booking field that came from a visitor must pass
// through escapeHtml() before being placed in an HTML template.
// ============================================

/**
 * Escapes HTML-special characters so a string can be safely
 * interpolated into an HTML document as text content.
 * Never use this for content that should be an attribute value
 * inside single quotes — use escapeAttr for that instead.
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Same escaping, but also strips newlines/control characters —
 * useful for single-line contexts like table cells or subject lines.
 */
function escapeHtmlInline(value) {
  return escapeHtml(value).replace(/[\r\n\t]+/g, ' ').trim();
}

/**
 * Truncates a string to a max length after trimming, appending an
 * ellipsis if truncated. Applied BEFORE escaping in callers, since
 * truncating already-escaped HTML entities could cut one in half.
 */
function truncate(value, maxLen) {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1).trim() + '\u2026';
}

/**
 * Validates a string is a "safe" plain-text field: no HTML tags,
 * reasonable length. Does not throw — returns a cleaned version.
 * Used when accepting arbitrary lead/booking text fields server-side.
 */
function cleanText(value, maxLen) {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // strip any literal tag-like sequences defensively (defense in depth —
  // escapeHtml at render time is still the real protection)
  str = str.replace(/<[^>]*>/g, '');
  str = str.trim();
  if (maxLen && str.length > maxLen) str = str.slice(0, maxLen);
  return str;
}

/** Basic email format check — not exhaustive, just sane validation. */
function isValidEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

/** Basic phone check — digits, spaces, +, -, () allowed, 7-15 digits. */
function isValidPhone(value) {
  if (!value) return false;
  const digits = String(value).replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

// ---- from timezone.js (report day-window math) ----
// ============================================
// TIMEZONE WINDOW HELPER
// Netlify Blobs are keyed by UTC calendar date (see blobs.js's
// dateKey()), but the daily report should reflect a calendar day in
// the OWNER'S timezone (default IST, UTC+5:30 — a non-whole-hour
// offset, which is exactly why this needs care: a single IST day can
// span parts of two different UTC date-keys).
//
// getReportWindow(referenceDate, offsetMinutes) returns the UTC
// storage date-keys that need to be queried, plus the exact UTC
// instant boundaries to filter events against, for "the calendar day
// in the target timezone that `referenceDate` falls in."
// ============================================

const DEFAULT_OFFSET_MINUTES = 330; // IST = UTC+5:30

function pad(n) { return String(n).padStart(2, '0'); }

/**
 * Given a UTC instant and a timezone offset in minutes (e.g. 330 for
 * IST), returns the "local" calendar date string (YYYY-MM-DD) that
 * instant falls on in that timezone.
 */
function localDateString(utcDate, offsetMinutes) {
  const shifted = new Date(utcDate.getTime() + offsetMinutes * 60000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/**
 * Computes the UTC instant boundaries [startUtc, endUtc) for the
 * local calendar day (in the given offset) that `referenceDate`
 * falls in, plus the list of UTC date-keys (as used by blobs.js)
 * that need to be queried to cover that window (1 or 2 keys).
 */
function getReportWindow(referenceDate, offsetMinutes) {
  const offset = offsetMinutes === undefined ? DEFAULT_OFFSET_MINUTES : offsetMinutes;
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);

  const localDay = localDateString(ref, offset);
  // Local midnight (start of localDay) expressed as a UTC instant:
  // local midnight = UTC midnight of that same "shifted" date, minus the offset.
  const [y, m, d] = localDay.split('-').map(Number);
  const localMidnightAsUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - offset * 60000;
  const startUtc = new Date(localMidnightAsUtcMs);
  const endUtc = new Date(localMidnightAsUtcMs + 24 * 60 * 60 * 1000);

  // Which UTC date-keys (YYYY-MM-DD, blobs.js convention) does this window touch?
  const startKey = startUtc.toISOString().slice(0, 10);
  const endKeyExclusive = new Date(endUtc.getTime() - 1).toISOString().slice(0, 10);
  const utcKeysToQuery = startKey === endKeyExclusive ? [startKey] : [startKey, endKeyExclusive];

  return { localDay, offsetMinutes: offset, startUtc, endUtc, utcKeysToQuery };
}

/** Filters an array of records (with a `timestamp` or `createdAt` field) to those within [startUtc, endUtc). */
function filterByWindow(records, window, field) {
  field = field || 'timestamp';
  return records.filter(r => {
    const t = new Date(r[field]).getTime();
    if (Number.isNaN(t)) return false;
    return t >= window.startUtc.getTime() && t < window.endUtc.getTime();
  });
}

// ---- from report.js (report aggregation + email rendering) ----
// ============================================
// DAILY REPORT — aggregation + HTML rendering
// Pure functions: given a day's events/leads/bookings, compute the
// report structure, then render it as an HTML email body.
// All user-submitted text is escaped before being placed in HTML.
// ============================================

// (escapeHtml, escapeHtmlInline, truncate already defined above from sanitize.js)

const KNOWN_SERVICES = [
  'personal-training', 'online-training', 'diet-consultation',
  'contest-prep', 'transformation', 'hypnotherapy', 'lifestyle',
];
const SERVICE_LABELS = {
  'personal-training': 'Personal Training',
  'online-training': 'Online Coaching',
  'diet-consultation': 'Diet Consultation',
  'contest-prep': 'Contest Prep',
  'transformation': 'Body Transformation',
  'hypnotherapy': 'Clinical Hypnotherapy',
  'lifestyle': 'Lifestyle & Performance',
};

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10; // one decimal place
}

/**
 * Builds the full structured report from raw data for one day.
 * events/leads/bookings are arrays as returned by blobs.js's
 * listEventsForDay / listLeadsForDay / listBookingsForDay.
 */
function buildReport(day, events, leads, bookings) {
  events = events || []; leads = leads || []; bookings = bookings || [];

  // ---- Traffic ----
  const visitorIds = new Set(events.map(e => e.visitorId).filter(Boolean));
  const sessionIds = new Set(events.map(e => e.sessionId).filter(Boolean));
  const returningVisitorIds = new Set(
    events.filter(e => e.isReturning).map(e => e.visitorId).filter(Boolean)
  );

  const sessionSpans = {};
  for (const e of events) {
    if (!e.sessionId || !e.timestamp) continue;
    const t = new Date(e.timestamp).getTime();
    if (Number.isNaN(t)) continue;
    if (!sessionSpans[e.sessionId]) sessionSpans[e.sessionId] = { min: t, max: t };
    else {
      sessionSpans[e.sessionId].min = Math.min(sessionSpans[e.sessionId].min, t);
      sessionSpans[e.sessionId].max = Math.max(sessionSpans[e.sessionId].max, t);
    }
  }
  const spans = Object.values(sessionSpans);
  const avgSessionDurationSec = spans.length
    ? Math.round(spans.reduce((sum, s) => sum + (s.max - s.min), 0) / spans.length / 1000)
    : null;

  const traffic = {
    totalVisitors: visitorIds.size,
    uniqueVisitors: visitorIds.size,
    returningVisitors: returningVisitorIds.size,
    totalSessions: sessionIds.size,
    avgSessionDurationSec, // null if not computable — estimated from first/last event per session
  };

  // ---- Traffic sources (dedup by session so one busy session isn't overcounted) ----
  const sessionSource = {};
  for (const e of events) {
    if (!e.sessionId) continue;
    if (!sessionSource[e.sessionId]) {
      sessionSource[e.sessionId] = {
        source: e.source || 'direct',
        medium: e.medium || 'none',
        campaign: e.campaign || null,
      };
    }
  }
  const sourceBuckets = {};
  for (const s of Object.values(sessionSource)) {
    const key = s.source;
    if (!sourceBuckets[key]) sourceBuckets[key] = { source: s.source, medium: s.medium, sessions: 0, campaigns: {} };
    sourceBuckets[key].sessions += 1;
    if (s.campaign) sourceBuckets[key].campaigns[s.campaign] = (sourceBuckets[key].campaigns[s.campaign] || 0) + 1;
  }
  const trafficSources = Object.values(sourceBuckets).sort((a, b) => b.sessions - a.sessions);

  // ---- Funnel ----
  const countType = (type) => events.filter(e => e.eventType === type).length;
  const funnelRaw = {
    visitors: visitorIds.size,
    ctaClicks: countType('cta_click'),
    formsStarted: countType('form_start'),
    formsCompleted: countType('form_complete'),
    assessmentsStarted: countType('assessment_start'),
    assessmentsCompleted: countType('assessment_complete'),
    bookingsStarted: countType('booking_start'),
    bookingsCompleted: bookings.length,
    paymentsInitiated: countType('payment_start'),
    paymentsCompleted: countType('payment_complete'),
  };
  const funnel = {
    ...funnelRaw,
    conversion: {
      formsCompletedPct: pct(funnelRaw.formsCompleted, funnelRaw.formsStarted),
      assessmentsCompletedPct: pct(funnelRaw.assessmentsCompleted, funnelRaw.assessmentsStarted),
      bookingsCompletedPct: pct(funnelRaw.bookingsCompleted, funnelRaw.bookingsStarted),
      paymentsCompletedPct: pct(funnelRaw.paymentsCompleted, funnelRaw.paymentsInitiated),
      visitorToBookingPct: pct(funnelRaw.bookingsCompleted, funnelRaw.visitors),
    },
  };

  // ---- Abandoned forms ----
  // A form_start with no matching form_complete for the same session+formType.
  const startsByKey = {};
  const completedKeys = new Set();
  const lastStepByKey = {};
  for (const e of events) {
    if (e.eventType === 'form_start' && e.sessionId && e.formType) {
      const key = `${e.sessionId}::${e.formType}`;
      if (!startsByKey[key]) startsByKey[key] = e;
    }
    if (e.eventType === 'form_complete' && e.sessionId && e.formType) {
      completedKeys.add(`${e.sessionId}::${e.formType}`);
    }
    if (e.eventType === 'assessment_step' && e.sessionId) {
      const key = `${e.sessionId}::coaching_assessment`;
      const step = Number(e.step);
      if (!Number.isNaN(step)) {
        lastStepByKey[key] = Math.max(lastStepByKey[key] || 0, step);
      }
    }
  }
  const abandoned = [];
  for (const [key, startEvent] of Object.entries(startsByKey)) {
    if (!completedKeys.has(key)) {
      abandoned.push({
        formType: startEvent.formType,
        service: startEvent.service || null,
        lastStep: lastStepByKey[key] !== undefined ? lastStepByKey[key] : null,
        timestamp: startEvent.timestamp,
      });
    }
  }
  const abandonedByForm = {};
  const abandonedByService = {};
  for (const a of abandoned) {
    abandonedByForm[a.formType] = (abandonedByForm[a.formType] || 0) + 1;
    if (a.service) abandonedByService[a.service] = (abandonedByService[a.service] || 0) + 1;
  }

  // ---- Leads ----
  const leadSummaries = leads.map(l => ({
    leadId: l.leadId,
    name: l.name || '',
    contact: l.phone || l.email || '',
    service: l.service ? (SERVICE_LABELS[l.service] || l.service) : '',
    leadScore: l.leadScore || 0,
    intentLevel: l.intentLevel || '',
    source: l.source || '',
    campaign: l.campaign || '',
    firstTouch: l.firstTouch ? `${l.firstTouch.source || 'direct'}${l.firstTouch.campaign ? ' / ' + l.firstTouch.campaign : ''}` : '',
    lastTouch: l.lastTouch ? `${l.lastTouch.source || 'direct'}${l.lastTouch.campaign ? ' / ' + l.lastTouch.campaign : ''}` : '',
    highIntentEvent: !!l.highIntentEventFired,
    createdAt: l.createdAt,
    bookingStatus: l.bookingCompleted ? 'Booked' : (l.bookingStarted ? 'Started' : 'Not started'),
    paymentStatus: l.paymentCompleted ? 'Completed' : (l.paymentStarted ? 'Pending' : 'Not started'),
  }));
  const topLeads = [...leadSummaries].sort((a, b) => b.leadScore - a.leadScore).slice(0, 5);
  const highIntentEvents = leadSummaries.filter(l => l.highIntentEvent);

  // ---- Bookings ----
  const bookingSummaries = bookings.map(b => ({
    bookingId: b.bookingId,
    name: b.name || '',
    service: b.service ? (SERVICE_LABELS[b.service] || b.service) : '',
    date: b.date || '',
    time: b.time || '',
    leadScore: b.leadScore || 0,
    source: b.source || '',
  }));

  // ---- Payments ----
  const payments = {
    initiated: funnelRaw.paymentsInitiated,
    completed: funnelRaw.paymentsCompleted,
    // Failures cannot be reliably detected client-side for a UPI deep-link flow
    // (the payment happens in an external app with no callback to this site),
    // so this is intentionally left as a documented gap rather than guessed at.
    failuresNote: 'Not detectable with the current UPI deep-link flow (no callback from the payment app to this site).',
  };

  // ---- Service performance ----
  const servicePerf = {};
  for (const svc of KNOWN_SERVICES) {
    servicePerf[svc] = { views: 0, formStarts: 0, formCompletions: 0, bookings: 0, payments: 0 };
  }
  for (const e of events) {
    const svc = e.service;
    if (!svc || !servicePerf[svc]) continue;
    if (e.eventType === 'service_view') servicePerf[svc].views += 1;
    if (e.eventType === 'form_start') servicePerf[svc].formStarts += 1;
    if (e.eventType === 'form_complete') servicePerf[svc].formCompletions += 1;
    if (e.eventType === 'payment_complete') servicePerf[svc].payments += 1;
  }
  for (const b of bookings) {
    if (b.service && servicePerf[b.service]) servicePerf[b.service].bookings += 1;
  }

  // ---- System health ----
  const systemHealth = {
    functionErrors: countType('function_error'),
    trackingErrors: countType('tracking_error'),
    formErrors: countType('form_error'),
    emailErrors: countType('email_error'),
    bookingErrors: countType('booking_error'),
  };

  // ---- Executive summary (factual, no marketing language) ----
  const igSessions = (sourceBuckets['instagram'] && sourceBuckets['instagram'].sessions) || 0;
  const summaryLines = [
    `Today there were ${traffic.totalVisitors} visitor${traffic.totalVisitors === 1 ? '' : 's'} across ${traffic.totalSessions} session${traffic.totalSessions === 1 ? '' : 's'}.`,
    igSessions ? `Instagram generated ${igSessions} session${igSessions === 1 ? '' : 's'}.` : `No Instagram-attributed sessions were recorded today.`,
    `${funnel.assessmentsCompleted} assessment${funnel.assessmentsCompleted === 1 ? '' : 's'} ${funnel.assessmentsCompleted === 1 ? 'was' : 'were'} completed out of ${funnel.assessmentsStarted} started.`,
    `${funnel.bookingsCompleted} booking${funnel.bookingsCompleted === 1 ? '' : 's'} ${funnel.bookingsCompleted === 1 ? 'was' : 'were'} recorded.`,
    `${leads.length} lead${leads.length === 1 ? '' : 's'} ${leads.length === 1 ? 'was' : 'were'} captured.`,
  ];

  return {
    day, traffic, trafficSources, funnel,
    abandoned: { total: abandoned.length, byForm: abandonedByForm, byService: abandonedByService, items: abandoned },
    leads: leadSummaries, topLeads, highIntentEvents, bookings: bookingSummaries, payments,
    servicePerformance: servicePerf, systemHealth,
    executiveSummary: summaryLines,
  };
}

/** Renders the report structure as an HTML email body. Escapes all user text. */
function renderReportHtml(report) {
  const row = (cells) => `<tr>${cells.map(c => `<td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:13px;">${c}</td>`).join('')}</tr>`;
  const section = (title, bodyHtml) => `
    <h2 style="font-family:sans-serif;font-size:16px;color:#111;margin:28px 0 10px;border-bottom:2px solid #00d4aa;padding-bottom:6px;">${escapeHtml(title)}</h2>
    ${bodyHtml}`;

  const trafficHtml = `
    <table style="border-collapse:collapse;font-family:sans-serif;">
      ${row(['Total visitors', report.traffic.totalVisitors])}
      ${row(['Returning visitors', report.traffic.returningVisitors])}
      ${row(['Total sessions', report.traffic.totalSessions])}
      ${row(['Avg session duration', report.traffic.avgSessionDurationSec !== null ? `${report.traffic.avgSessionDurationSec}s (estimated)` : 'N/A'])}
    </table>`;

  const sourcesHtml = report.trafficSources.length
    ? `<table style="border-collapse:collapse;font-family:sans-serif;width:100%;">
        ${row(['Source', 'Medium', 'Sessions'].map(h => `<strong>${h}</strong>`))}
        ${report.trafficSources.map(s => row([escapeHtmlInline(s.source), escapeHtmlInline(s.medium), s.sessions])).join('')}
      </table>`
    : `<p style="font-family:sans-serif;color:#666;font-size:13px;">No sessions recorded today.</p>`;

  const funnelHtml = `
    <table style="border-collapse:collapse;font-family:sans-serif;width:100%;">
      ${row(['Visitors', report.funnel.visitors, ''])}
      ${row(['CTA interactions', report.funnel.ctaClicks, ''])}
      ${row(['Forms started \u2192 completed', `${report.funnel.formsStarted} \u2192 ${report.funnel.formsCompleted}`, `${report.funnel.conversion.formsCompletedPct}%`])}
      ${row(['Assessments started \u2192 completed', `${report.funnel.assessmentsStarted} \u2192 ${report.funnel.assessmentsCompleted}`, `${report.funnel.conversion.assessmentsCompletedPct}%`])}
      ${row(['Bookings started \u2192 completed', `${report.funnel.bookingsStarted} \u2192 ${report.funnel.bookingsCompleted}`, `${report.funnel.conversion.bookingsCompletedPct}%`])}
      ${row(['Payments initiated \u2192 completed', `${report.funnel.paymentsInitiated} \u2192 ${report.funnel.paymentsCompleted}`, `${report.funnel.conversion.paymentsCompletedPct}%`])}
      ${row(['Visitor \u2192 booking', '', `${report.funnel.conversion.visitorToBookingPct}%`])}
    </table>`;

  const abandonedHtml = `
    <p style="font-family:sans-serif;font-size:13px;">Total abandoned: <strong>${report.abandoned.total}</strong></p>
    ${Object.keys(report.abandoned.byForm).length ? `<p style="font-family:sans-serif;font-size:13px;">By form: ${Object.entries(report.abandoned.byForm).map(([k, v]) => `${escapeHtmlInline(k)} (${v})`).join(', ')}</p>` : ''}
    ${Object.keys(report.abandoned.byService).length ? `<p style="font-family:sans-serif;font-size:13px;">By service: ${Object.entries(report.abandoned.byService).map(([k, v]) => `${escapeHtmlInline(SERVICE_LABELS[k] || k)} (${v})`).join(', ')}</p>` : ''}`;

  const leadsHtml = report.leads.length
    ? `<table style="border-collapse:collapse;font-family:sans-serif;width:100%;">
        ${row(['Name', 'Contact', 'Service', 'Score', 'Intent', 'First Touch', 'Last Touch', 'Booking', 'Payment'].map(h => `<strong>${h}</strong>`))}
        ${report.leads.map(l => row([
          escapeHtmlInline(truncate(l.name, 40)) || '-',
          escapeHtmlInline(truncate(l.contact, 30)) || '-',
          escapeHtmlInline(l.service) || '-',
          `${l.leadScore}/100`,
          escapeHtmlInline(l.intentLevel),
          escapeHtmlInline(l.firstTouch) || '-',
          escapeHtmlInline(l.lastTouch) || '-',
          escapeHtmlInline(l.bookingStatus),
          escapeHtmlInline(l.paymentStatus),
        ])).join('')}
      </table>`
    : `<p style="font-family:sans-serif;color:#666;font-size:13px;">No leads captured today.</p>`;

  const bookingsHtml = report.bookings.length
    ? `<table style="border-collapse:collapse;font-family:sans-serif;width:100%;">
        ${row(['Booking ID', 'Name', 'Service', 'Date', 'Time', 'Score', 'Source'].map(h => `<strong>${h}</strong>`))}
        ${report.bookings.map(b => row([
          escapeHtmlInline(b.bookingId),
          escapeHtmlInline(truncate(b.name, 40)) || '-',
          escapeHtmlInline(b.service) || '-',
          escapeHtmlInline(b.date) || '-',
          escapeHtmlInline(b.time) || '-',
          `${b.leadScore}/100`,
          escapeHtmlInline(b.source) || '-',
        ])).join('')}
      </table>`
    : `<p style="font-family:sans-serif;color:#666;font-size:13px;">No bookings today.</p>`;

  const paymentsHtml = `
    <table style="border-collapse:collapse;font-family:sans-serif;">
      ${row(['Initiated', report.payments.initiated])}
      ${row(['Completed', report.payments.completed])}
    </table>
    <p style="font-family:sans-serif;color:#888;font-size:12px;">${escapeHtml(report.payments.failuresNote)}</p>`;

  const serviceRows = Object.entries(report.servicePerformance)
    .map(([key, s]) => row([escapeHtmlInline(SERVICE_LABELS[key] || key), s.views, s.formStarts, s.formCompletions, s.bookings, s.payments]));
  const servicePerfHtml = `
    <table style="border-collapse:collapse;font-family:sans-serif;width:100%;">
      ${row(['Service', 'Views', 'Form Starts', 'Form Completions', 'Bookings', 'Payments'].map(h => `<strong>${h}</strong>`))}
      ${serviceRows.join('')}
    </table>`;

  const topLeadsHtml = report.topLeads.length
    ? `<table style="border-collapse:collapse;font-family:sans-serif;width:100%;">
        ${row(['High-intent lead', 'Score', 'Service', 'Source'].map(h => `<strong>${h}</strong>`))}
        ${report.topLeads.map(l => row([
          escapeHtmlInline(truncate(l.name, 40)) || '(anonymous)',
          `${l.leadScore}/100`,
          escapeHtmlInline(l.service) || '-',
          escapeHtmlInline(l.source) || '-',
        ])).join('')}
      </table>`
    : `<p style="font-family:sans-serif;color:#666;font-size:13px;">No leads to rank today.</p>`;

  const highIntentEventsHtml = report.highIntentEvents.length
    ? `<table style="border-collapse:collapse;font-family:sans-serif;width:100%;">
        ${row(['\u{1F525} High-Intent Visitor', 'Score', 'Service', 'Source', 'Booking'].map(h => `<strong>${h}</strong>`))}
        ${report.highIntentEvents.map(l => row([
          escapeHtmlInline(truncate(l.name, 40)) || '(anonymous)',
          `${l.leadScore}/100`,
          escapeHtmlInline(l.service) || '-',
          escapeHtmlInline(l.source) || '-',
          escapeHtmlInline(l.bookingStatus),
        ])).join('')}
      </table>`
    : `<p style="font-family:sans-serif;color:#666;font-size:13px;">No visitors crossed the high-intent threshold today.</p>`;

  const healthHtml = `
    <table style="border-collapse:collapse;font-family:sans-serif;">
      ${row(['Function errors', report.systemHealth.functionErrors])}
      ${row(['Tracking errors', report.systemHealth.trackingErrors])}
      ${row(['Form errors', report.systemHealth.formErrors])}
      ${row(['Email errors', report.systemHealth.emailErrors])}
      ${row(['Booking errors', report.systemHealth.bookingErrors])}
    </table>`;

  const summaryHtml = `<ul style="font-family:sans-serif;font-size:14px;line-height:1.6;">${report.executiveSummary.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`;

  return `
    <div style="max-width:680px;margin:0 auto;padding:24px;">
      <h1 style="font-family:sans-serif;font-size:20px;color:#111;">KUNAAL \u2014 Daily Website Intelligence Report \u2014 ${escapeHtml(report.day)}</h1>
      ${section('Executive Summary', summaryHtml)}
      ${section('Traffic', trafficHtml)}
      ${section('Traffic Sources', sourcesHtml)}
      ${section('Funnel', funnelHtml)}
      ${section('Abandoned Forms', abandonedHtml)}
      ${section('Leads', leadsHtml)}
      ${section('Bookings', bookingsHtml)}
      ${section('Payments', paymentsHtml)}
      ${section('Service Performance', servicePerfHtml)}
      ${section('High-Intent Leads', topLeadsHtml)}
      ${section('\u{1F525} High-Intent Visitor Events', highIntentEventsHtml)}
      ${section('System Health', healthHtml)}
    </div>`;
}

// ---- from email.js (provider-agnostic sender) ----
// ============================================
// EMAIL SENDER — provider-agnostic
// Default implementation targets Resend (https://resend.com) because
// its API is a single HTTP POST with no SDK dependency required.
//
// Required environment variables (set in Netlify site settings, never
// committed to the repo):
//   EMAIL_API_KEY     — your Resend API key
//   REPORT_EMAIL_TO   — where the daily report should be sent (your inbox)
//   REPORT_EMAIL_FROM — the "from" address (must be a domain verified in Resend,
//                       e.g. "reports@yourdomain.com" — Resend requires this;
//                       for testing you can use their shared onboarding
//                       address, see Resend's docs)
//
// SWAPPING PROVIDERS LATER:
// Only sendEmail() below talks to the provider's API. To switch to
// SendGrid, Postmark, etc., rewrite the body of sendEmail() to call
// that provider's HTTP API instead — nothing else in this project
// needs to change, since everything else calls sendEmail(), not
// Resend directly.
//
// THIS IS NOT VERIFIED AGAINST A LIVE ACCOUNT. It follows Resend's
// documented API shape, but you must test an actual send after
// deploying with real credentials before relying on it.
// ============================================

async function sendEmail({ to, from, subject, html, text }) {
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) {
    return { ok: false, skipped: true, reason: 'EMAIL_API_KEY not configured' };
  }
  if (!to || !from) {
    return { ok: false, skipped: true, reason: 'REPORT_EMAIL_TO / REPORT_EMAIL_FROM not configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text: text || undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, skipped: false, status: res.status, error: body };
    }
    const json = await res.json().catch(() => ({}));
    return { ok: true, id: json.id };
  } catch (err) {
    return { ok: false, skipped: false, error: err.message };
  }
}

async function gatherWindow(window) {
  const eventLists = await Promise.all(window.utcKeysToQuery.map(k => listEventsForDay(k).catch(() => [])));
  const leadLists = await Promise.all(window.utcKeysToQuery.map(k => listLeadsForDay(k).catch(() => [])));
  const bookingLists = await Promise.all(window.utcKeysToQuery.map(k => listBookingsForDay(k).catch(() => [])));

  const events = filterByWindow(eventLists.flat(), window, 'timestamp');
  const leads = filterByWindow(leadLists.flat(), window, 'createdAt');
  const bookings = filterByWindow(bookingLists.flat(), window, 'createdAt');
  return { events, leads, bookings };
}

exports.handler = async (event) => {
  const offsetMinutes = process.env.REPORT_TIMEZONE_OFFSET_MINUTES !== undefined
    ? Number(process.env.REPORT_TIMEZONE_OFFSET_MINUTES)
    : undefined; // falls back to IST default inside getReportWindow

  // Allow an optional ?date=YYYY-MM-DD query param for manually regenerating
  // a specific past day's report (useful for testing without waiting for
  // the scheduler, and for backfilling a missed day).
  let referenceDate = new Date();
  const qs = (event && event.queryStringParameters) || {};
  if (qs.date) {
    const parsed = new Date(`${qs.date}T12:00:00Z`); // noon UTC avoids DST/boundary ambiguity
    if (!Number.isNaN(parsed.getTime())) referenceDate = parsed;
  }

  const window = getReportWindow(referenceDate, offsetMinutes);

  let data;
  try {
    data = await gatherWindow(window);
  } catch (err) {
    console.error('daily-report: failed to gather data', err);
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'storage_unavailable' }) };
  }

  const report = buildReport(window.localDay, data.events, data.leads, data.bookings);
  const html = renderReportHtml(report);

  const emailResult = await sendEmail({
    to: process.env.REPORT_EMAIL_TO,
    from: process.env.REPORT_EMAIL_FROM,
    subject: `KUNAAL \u2014 Daily Website Intelligence Report \u2014 ${window.localDay}`,
    html,
  });

  if (!emailResult.ok) {
    console.error('daily-report: email not sent', emailResult);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      day: window.localDay,
      emailSent: emailResult.ok,
      emailSkippedReason: emailResult.skipped ? emailResult.reason : undefined,
      summary: report.executiveSummary,
    }),
  };
};
