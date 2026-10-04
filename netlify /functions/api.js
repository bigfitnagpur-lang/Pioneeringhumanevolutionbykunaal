// ============================================
// ONE combined Netlify Function handling track-event, submit-lead,
// submit-booking, and the admin dashboard — merged into a single file
// (instead of separate files in nested folders) purely so this project
// is easy to upload: only ONE folder to create (netlify/functions),
// no subfolders inside it.
//
// Routing is by a `?action=` query parameter:
//   POST /.netlify/functions/api?action=track    (analytics events)
//   POST /.netlify/functions/api?action=lead     (lead form submissions)
//   POST /.netlify/functions/api?action=booking  (bookings)
//   GET  /.netlify/functions/api?action=admin&token=...  (admin dashboard)
//
// Functionally identical to the multi-file version — same logic,
// same tests, just packaged as one file for simpler uploading.
// ============================================

// ---- from blobs.js (storage) ----
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

// ---- from sanitize.js (escaping/validation) ----
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

// ---- from scoring.js (lead scoring engine) ----
// ============================================
// LEAD SCORING ENGINE
// Transparent, rule-based, weighted signal scoring.
// NOT a black-box model — every point is documented below.
// Score is normalized to 0-100. Intent labels are operational
// categories describing website engagement only — never a claim
// about the person's identity, character, or purchasing behavior.
// ============================================

// Signals that fire once (boolean-style — repeats don't add more points
// beyond the first time). Adjust freely; nothing else depends on exact
// values, only on the final 0-100 total.
const SIGNAL_WEIGHTS = {
  websiteVisit: 5,          // Visit
  multiplePages: 5,          // Viewed more than one section/service page
  servicePageViewed: 10,      // Viewed any specific service's detail
  calculatorUsed: 5,          // Used any calculator
  assessmentStarted: 10,
  assessmentCompleted: 15,
  bookingStarted: 20,
  bookingCompleted: 30,
  paymentInitiated: 25,
  // Not in the original spec list, which only names "payment initiated" —
  // added deliberately: an actual completed payment is the strongest
  // signal a lead can send, so it's weighted above every other signal.
  // Documented here rather than silently assumed.
  paymentCompleted: 35,
  returningVisitor: 5,
};

// Signals that can repeat and award a SMALL additional bonus each time,
// capped so repeat activity can't inflate a score without limit ("Repeated
// high-intent actions: controlled additional points" in the spec).
const REPEATABLE_BONUS = {
  perRepeat: 3,
  maxBonusPerSignal: 9,   // at most 3 repeats' worth of bonus per signal
  eligibleSignals: ['calculatorUsed', 'servicePageViewed', 'assessmentStarted', 'bookingStarted'],
};

const RAW_MAX_POSSIBLE =
  Object.values(SIGNAL_WEIGHTS).reduce((a, b) => a + b, 0) +
  REPEATABLE_BONUS.maxBonusPerSignal * REPEATABLE_BONUS.eligibleSignals.length;

const INTENT_BANDS = [
  { max: 39, label: 'Low intent' },
  { max: 69, label: 'Medium intent' },
  { max: 100, label: 'High intent' },
];

// Score at/above this triggers a one-time "high-intent visitor" event
// (see markHighIntentIfCrossed below). Configurable — change freely.
const HIGH_INTENT_THRESHOLD = 70;

/**
 * Computes a lead's score from a signal-count map, e.g.
 * { websiteVisit: 1, calculatorUsed: 3, bookingCompleted: 1 }.
 * Any positive count counts as "fired" for base weight; counts beyond
 * 1 on an eligible signal add the small repeat bonus, capped.
 *
 * Returns { score, rawScore, intent, breakdown }.
 */
function scoreLead(signalCounts) {
  const counts = signalCounts || {};
  const breakdown = [];
  let rawScore = 0;

  for (const key of Object.keys(SIGNAL_WEIGHTS)) {
    const count = counts[key] || 0;
    if (count > 0) {
      const weight = SIGNAL_WEIGHTS[key];
      rawScore += weight;
      breakdown.push({ signal: key, weight, count });

      if (REPEATABLE_BONUS.eligibleSignals.includes(key) && count > 1) {
        const repeats = count - 1;
        const bonus = Math.min(repeats * REPEATABLE_BONUS.perRepeat, REPEATABLE_BONUS.maxBonusPerSignal);
        rawScore += bonus;
        breakdown.push({ signal: key + '_repeatBonus', weight: bonus, count: repeats });
      }
    }
  }

  const normalized = Math.round((rawScore / RAW_MAX_POSSIBLE) * 100);
  const score = Math.max(0, Math.min(100, normalized));
  const band = INTENT_BANDS.find(b => score <= b.max) || INTENT_BANDS[INTENT_BANDS.length - 1];

  return { score, rawScore, intent: band.label, breakdown };
}

/** Increments a signal's count in a lead's rolling signal-count map. */
function mergeSignal(existingCounts, signalKey) {
  const merged = Object.assign({}, existingCounts);
  if (SIGNAL_WEIGHTS[signalKey] !== undefined) {
    merged[signalKey] = (merged[signalKey] || 0) + 1;
  }
  return merged;
}

/**
 * Checks whether this score crossing HIGH_INTENT_THRESHOLD is a NEW
 * crossing (i.e. the lead's previous score was below it). Returns true
 * only the first time — call this once per scoring update and use the
 * result to decide whether to fire a "high-intent visitor" event.
 */
function markHighIntentIfCrossed(previousScore, newScore) {
  return (previousScore || 0) < HIGH_INTENT_THRESHOLD && newScore >= HIGH_INTENT_THRESHOLD;
}

/** Maps a tracked event_type (+ context) to the signal key it should increment, if any. */
function eventToSignal(eventType, context) {
  const map = {
    page_view: 'websiteVisit',
    service_view: 'servicePageViewed',
    calculator_used: 'calculatorUsed',
    assessment_start: 'assessmentStarted',
    assessment_complete: 'assessmentCompleted',
    booking_start: 'bookingStarted',
    booking_complete: 'bookingCompleted',
    payment_start: 'paymentInitiated',
    payment_complete: 'paymentCompleted',
  };
  return map[eventType] || null;
}

// ---- from useragent.js (device/browser parsing) ----
// ============================================
// LIGHTWEIGHT USER-AGENT PARSER
// Deliberately simple and dependency-free — classifies device
// category, browser family, and OS well enough for reporting.
// Not a full UA-parsing library; good enough for analytics, not
// for browser-capability detection.
// ============================================

function parseUserAgent(uaString) {
  const ua = String(uaString || '');

  let deviceCategory = 'desktop';
  if (/tablet|ipad/i.test(ua)) deviceCategory = 'tablet';
  else if (/mobile|iphone|android.*mobile|windows phone/i.test(ua)) deviceCategory = 'mobile';

  let os = 'Other';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Other';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) browser = 'Safari';

  return { deviceCategory, os, browser };
}

// ---- from whatsapp.js (notification message builder) ----
// ============================================
// WHATSAPP NOTIFICATION LINK BUILDER
// Produces a pre-filled https://wa.me/<number>?text=<message> URL.
// This does NOT send anything automatically — opening the link
// only prepares WhatsApp with the message; a human presses Send.
// No WhatsApp Business API / Cloud API / automation of any kind.
// ============================================

/**
 * Builds the "new booking" WhatsApp notification message for the owner.
 * `booking` is the structured booking/lead record (see report.js for shape).
 * Returns the message as plain text (WhatsApp text, not HTML — no escaping
 * needed here since this never gets rendered into a web page).
 */
function buildBookingWhatsAppMessage(booking) {
  const line = (label, value) => `${label}: ${value || '-'}`;

  const paymentStatus = booking.paymentCompleted ? 'Completed'
    : booking.paymentStarted ? 'Pending'
    : 'Not started';

  const assessmentStatus = booking.assessmentCompleted ? 'Completed' : 'Not completed';

  return [
    '\u{1F525} NEW BOOKING',
    '',
    line('Booking ID', booking.bookingId),
    '',
    line('Name', booking.name),
    line('Phone', booking.phone),
    line('Email', booking.email),
    '',
    line('Service', booking.service),
    '',
    'Appointment:',
    line('Date', booking.date),
    line('Time', booking.time),
    '',
    line('Lead Score', booking.leadScore !== undefined ? `${booking.leadScore}/100` : '-'),
    line('Intent', booking.intentLevel),
    '',
    'Source:',
    line('Channel', [booking.source, booking.medium].filter(Boolean).join(' / ') || '-'),
    line('Campaign', booking.campaign),
    '',
    line('Assessment', assessmentStatus),
    line('Payment', paymentStatus),
  ].join('\n');
}

/** Builds the wa.me URL from a phone number and plain-text message. */
function buildWhatsAppUrl(ownerNumber, message) {
  const digits = String(ownerNumber || '').replace(/[^\d]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
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

// ---- from report.js (report aggregation + dashboard rendering) ----
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

const OWNER_WHATSAPP_NUMBER = process.env.OWNER_WHATSAPP_NUMBER || '919011101654';

async function gatherWindow(window) {
  const eventLists = await Promise.all(window.utcKeysToQuery.map(k => listEventsForDay(k).catch(() => [])));
  const leadLists = await Promise.all(window.utcKeysToQuery.map(k => listLeadsForDay(k).catch(() => [])));
  const bookingLists = await Promise.all(window.utcKeysToQuery.map(k => listBookingsForDay(k).catch(() => [])));
  return {
    events: filterByWindow(eventLists.flat(), window, 'timestamp'),
    leads: filterByWindow(leadLists.flat(), window, 'createdAt'),
    bookings: filterByWindow(bookingLists.flat(), window, 'createdAt'),
  };
}

function renderDashboardPage(report, dateStr) {
  const stat = (label, value) => `
    <div style="background:#14141c;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px 20px;min-width:140px;">
      <div style="color:#8a8a99;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(label)}</div>
      <div style="color:#f0f0f5;font-size:28px;font-weight:700;margin-top:4px;">${escapeHtml(String(value))}</div>
    </div>`;

  const table = (headers, rows) => `
    <table style="border-collapse:collapse;width:100%;margin-top:8px;">
      <tr>${headers.map(h => `<th style="text-align:left;padding:8px 10px;font-size:12px;color:#8a8a99;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid rgba(255,255,255,0.1);">${escapeHtml(h)}</th>`).join('')}</tr>
      ${rows.map(r => `<tr>${r.map(c => `<td style="padding:8px 10px;font-size:14px;color:#e0e0e8;border-bottom:1px solid rgba(255,255,255,0.05);">${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${headers.length}" style="padding:16px 10px;color:#8a8a99;font-size:13px;">No data for this day.</td></tr>`}
    </table>`;

  const leadsRows = report.leads
    .slice().sort((a, b) => b.leadScore - a.leadScore)
    .map(l => [
      (l.highIntentEvent ? '\u{1F525} ' : '') + (escapeHtmlInline(truncate(l.name, 40)) || '\u2014'),
      escapeHtmlInline(truncate(l.contact, 30)) || '\u2014',
      escapeHtmlInline(l.service) || '\u2014',
      `<span style="color:${l.leadScore >= 75 ? '#00d4aa' : l.leadScore >= 50 ? '#ffb23e' : '#8a8a99'};font-weight:600;">${l.leadScore}/100</span>`,
      escapeHtmlInline(l.intentLevel),
      escapeHtmlInline(l.firstTouch) || '\u2014',
      escapeHtmlInline(l.lastTouch) || '\u2014',
      escapeHtmlInline(l.bookingStatus),
    ]);

  const bookingsRows = report.bookings.map(b => [
    escapeHtmlInline(b.bookingId), escapeHtmlInline(truncate(b.name, 40)) || '\u2014',
    escapeHtmlInline(b.service) || '\u2014', escapeHtmlInline(b.date) || '\u2014',
    escapeHtmlInline(b.time) || '\u2014', `${b.leadScore}/100`, escapeHtmlInline(b.source) || '\u2014',
  ]);

  const sourceRows = report.trafficSources.map(s => [
    escapeHtmlInline(s.source), escapeHtmlInline(s.medium), String(s.sessions),
  ]);

  const serviceRows = Object.entries(report.servicePerformance).map(([key, s]) => [
    escapeHtmlInline(key), String(s.views), String(s.formStarts), String(s.formCompletions), String(s.bookings), String(s.payments),
  ]);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Admin Dashboard \u2014 ${escapeHtml(dateStr)}</title>
</head>
<body style="margin:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;">
  <div style="max-width:1000px;margin:0 auto;">
    <h1 style="color:#f0f0f5;font-size:22px;">Website Intelligence \u2014 <span style="color:#00d4aa;">${escapeHtml(dateStr)}</span></h1>
    <p style="color:#8a8a99;font-size:13px;">Change the date with <code>?date=YYYY-MM-DD&token=...</code> in the URL.</p>

    <div style="display:flex;flex-wrap:wrap;gap:12px;margin:20px 0 32px;">
      ${stat('Visitors', report.traffic.totalVisitors)}
      ${stat('Returning', report.traffic.returningVisitors)}
      ${stat('Sessions', report.traffic.totalSessions)}
      ${stat('Leads', report.leads.length)}
      ${stat('Bookings', report.bookings.length)}
      ${stat('Payments', report.payments.completed)}
    </div>

    <h2 style="color:#f0f0f5;font-size:16px;border-bottom:2px solid #00d4aa;padding-bottom:6px;">Leads (by score)</h2>
    ${table(['Name', 'Contact', 'Service', 'Score', 'Intent', 'First Touch', 'Last Touch', 'Booking'], leadsRows)}

    <h2 style="color:#f0f0f5;font-size:16px;border-bottom:2px solid #00d4aa;padding-bottom:6px;margin-top:32px;">Bookings</h2>
    ${table(['Booking ID', 'Name', 'Service', 'Date', 'Time', 'Score', 'Source'], bookingsRows)}

    <h2 style="color:#f0f0f5;font-size:16px;border-bottom:2px solid #00d4aa;padding-bottom:6px;margin-top:32px;">Traffic Sources</h2>
    ${table(['Source', 'Medium', 'Sessions'], sourceRows)}

    <h2 style="color:#f0f0f5;font-size:16px;border-bottom:2px solid #00d4aa;padding-bottom:6px;margin-top:32px;">Service Performance</h2>
    ${table(['Service', 'Views', 'Form Starts', 'Completions', 'Bookings', 'Payments'], serviceRows)}

    <h2 style="color:#f0f0f5;font-size:16px;border-bottom:2px solid #00d4aa;padding-bottom:6px;margin-top:32px;">Funnel</h2>
    <p style="color:#e0e0e8;font-size:14px;">Visitors ${report.funnel.visitors} \u2192 Forms started ${report.funnel.formsStarted} \u2192 completed ${report.funnel.formsCompleted} (${report.funnel.conversion.formsCompletedPct}%) \u2192 Bookings ${report.funnel.bookingsCompleted} (${report.funnel.conversion.visitorToBookingPct}% of visitors)</p>

    <h2 style="color:#f0f0f5;font-size:16px;border-bottom:2px solid #00d4aa;padding-bottom:6px;margin-top:32px;">Abandoned Forms</h2>
    <p style="color:#e0e0e8;font-size:14px;">${report.abandoned.total} abandoned today.</p>
  </div>
</body>
</html>`;
}

// ============================================
// POST /.netlify/functions/track-event
// Receives a single analytics event from the frontend. Stores the
// raw event, and if the event type maps to a scoring signal, updates
// that visitor's rolling lead record (created anonymously on first
// signal — leadId is the visitorId until/unless the visitor later
// submits contact info via submit-lead/submit-booking, at which point
// that same record gains a name/email/phone).
//
// Also maintains first-touch attribution (captured once, never
// overwritten) alongside last-touch (updated on every event), and
// detects "multiple pages" (more than one distinct service viewed)
// and a one-time "high-intent" score crossing.
//
// This function must NEVER cause the website to break: any failure
// here is logged and swallowed, always returning 200 so a slow/failed
// analytics call never surfaces as a visible error to a visitor.
// ============================================
async function handleTrack(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
  }

  const { eventType, visitorId, sessionId } = payload;
  if (!eventType || !visitorId || !sessionId) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing required fields' }) };
  }

  const ua = (event.headers && (event.headers['user-agent'] || event.headers['User-Agent'])) || '';
  const { deviceCategory, os, browser } = parseUserAgent(ua);
  const geo = (context && context.geo) || {};

  const record = {
    eventId: newId('EVT'),
    eventType: cleanText(eventType, 60),
    visitorId: cleanText(visitorId, 100),
    sessionId: cleanText(sessionId, 100),
    timestamp: new Date().toISOString(),
    source: cleanText(payload.source, 60) || 'direct',
    medium: cleanText(payload.medium, 60) || 'none',
    campaign: cleanText(payload.campaign, 100) || null,
    content: cleanText(payload.content, 100) || null,
    term: cleanText(payload.term, 100) || null,
    landingUrl: cleanText(payload.landingUrl, 300) || null,
    isReturning: !!payload.isReturning,
    service: payload.service ? cleanText(payload.service, 60) : null,
    formType: payload.formType ? cleanText(payload.formType, 60) : null,
    step: payload.step !== undefined && payload.step !== null ? Number(payload.step) : undefined,
    variant: payload.variant ? cleanText(payload.variant, 100) : null, // A/B experiment assignment, if any
    deviceCategory, os, browser,
    country: (geo.country && (geo.country.name || geo.country.code)) || null,
    timezone: geo.timezone || null,
  };

  try {
    await saveEvent(record);
  } catch (err) {
    console.error('track-event: saveEvent failed', err);
    return { statusCode: 200, body: JSON.stringify({ ok: false, stored: false }) };
  }

  const signalKey = eventToSignal(record.eventType);
  if (signalKey) {
    try {
      let lead = await getLead(record.visitorId);
      const isNewLead = !lead;
      if (!lead) {
        lead = {
          leadId: record.visitorId,
          createdAt: record.timestamp,
          visitorId: record.visitorId,
          sessionId: record.sessionId,
          firstTouch: { source: record.source, medium: record.medium, campaign: record.campaign, content: record.content, landingUrl: record.landingUrl },
          signals: {},
          viewedServices: [],
        };
      }
      // Last-touch is always refreshed; first-touch is set once, on creation, and never overwritten.
      lead.lastTouch = { source: record.source, medium: record.medium, campaign: record.campaign, content: record.content };
      lead.source = record.source; lead.medium = record.medium; lead.campaign = record.campaign; lead.content = record.content;

      lead.signals = mergeSignal(lead.signals || {}, signalKey);

      // "Multiple pages" = viewed more than one distinct service this lead's lifetime.
      if (record.eventType === 'service_view' && record.service) {
        lead.viewedServices = lead.viewedServices || [];
        if (!lead.viewedServices.includes(record.service)) lead.viewedServices.push(record.service);
        if (lead.viewedServices.length >= 2) {
          lead.signals = mergeSignal(lead.signals, 'multiplePages');
        }
      }

      const previousScore = lead.leadScore || 0;
      const { score, intent } = scoreLead(lead.signals);
      lead.leadScore = score;
      lead.intentLevel = intent;
      if (record.service) lead.service = record.service;
      if (record.eventType === 'assessment_start') lead.assessmentStarted = true;
      if (record.eventType === 'assessment_complete') lead.assessmentCompleted = true;
      if (record.eventType === 'booking_start') lead.bookingStarted = true;
      if (record.eventType === 'payment_start') lead.paymentStarted = true;
      if (record.eventType === 'payment_complete') lead.paymentCompleted = true;

      if (!lead.highIntentEventFired && markHighIntentIfCrossed(previousScore, score)) {
        lead.highIntentEventFired = true;
        lead.highIntentEventAt = record.timestamp;
      }

      await saveLead(lead);
    } catch (err) {
      console.error('track-event: lead update failed', err);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
}

// ============================================
// POST /.netlify/functions/submit-lead
// Called whenever a visitor submits contact info through any form
// (coaching assessment, Book Now, etc.) — upserts that info onto
// their existing anonymous lead record (keyed by visitorId, created
// earlier by track-event as signals came in), so browsing history
// and attribution carry through to the named lead.
//
// This does NOT send email/WhatsApp — it only persists the lead.
// The frontend still opens its own WhatsApp/email link exactly as
// before; this just makes sure the lead is recorded server-side too.
// Never blocks or breaks the existing frontend flow on failure.
// ============================================
async function handleLead(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
  }

  const { visitorId, sessionId } = payload;
  if (!visitorId) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing visitorId' }) };
  }

  const name = cleanText(payload.name, 120);
  const email = payload.email ? cleanText(payload.email, 200) : '';
  const phone = payload.phone ? cleanText(payload.phone, 40) : '';
  const instagramUsername = payload.instagramUsername ? cleanText(payload.instagramUsername, 60) : '';

  if (email && !isValidEmail(email)) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid email' }) };
  }
  if (phone && !isValidPhone(phone)) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid phone' }) };
  }

  try {
    let lead = await getLead(visitorId);
    if (!lead) {
      lead = {
        leadId: visitorId, createdAt: new Date().toISOString(),
        visitorId, sessionId: sessionId || null,
        source: cleanText(payload.source, 60) || 'direct',
        medium: cleanText(payload.medium, 60) || 'none',
        campaign: cleanText(payload.campaign, 100) || null,
        signals: {},
      };
    }
    if (name) lead.name = name;
    if (email) lead.email = email;
    if (phone) lead.phone = phone;
    if (instagramUsername) lead.instagramUsername = instagramUsername;
    if (payload.service) lead.service = cleanText(payload.service, 60);
    if (payload.goal) lead.goal = cleanText(payload.goal, 120);

    lead.signals = mergeSignal(lead.signals || {}, 'servicePageViewed');
    const { score, intent } = scoreLead(lead.signals);
    lead.leadScore = score;
    lead.intentLevel = intent;

    await saveLead(lead);
    return { statusCode: 200, body: JSON.stringify({ ok: true, leadId: lead.leadId, leadScore: score, intentLevel: intent }) };
  } catch (err) {
    console.error('submit-lead: failed', err);
    // Still 200 — the frontend's own WhatsApp/email flow must proceed regardless.
    return { statusCode: 200, body: JSON.stringify({ ok: false, stored: false }) };
  }
}

// ============================================
// POST /.netlify/functions/submit-booking
// Validates a booking submission, prevents duplicate submissions
// (via a client-supplied idempotency key — the frontend generates
// one UUID per booking attempt, and disables its submit button
// immediately, so this is defense in depth against double-clicks
// and retried network requests, not the only line of defense),
// generates a booking ID, persists the booking, upserts the lead
// with the completed booking + a fresh score, and returns the
// pre-filled WhatsApp URL for the frontend to open — the frontend
// still does the actual "open WhatsApp" step; this function only
// prepares the data and the link. No message is ever sent
// automatically.
// ============================================
async function handleBooking(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
  }

  const { visitorId, sessionId, idempotencyKey } = payload;
  const name = cleanText(payload.name, 120);
  const phone = cleanText(payload.phone, 40);
  const email = payload.email ? cleanText(payload.email, 200) : '';
  const service = cleanText(payload.service, 60);

  if (!visitorId || !name || !phone || !service) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing required fields (name, phone, service)' }) };
  }
  if (!isValidPhone(phone)) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid phone number' }) };
  }
  if (email && !isValidEmail(email)) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid email' }) };
  }

  try {
    // Duplicate-submission guard: if this exact idempotencyKey was already
    // processed today, return the existing booking instead of creating a
    // second one (covers double-click / retried request scenarios).
    if (idempotencyKey) {
      const today = dateKey(new Date());
      const todaysBookings = await listBookingsForDay(today);
      const existing = todaysBookings.find(b => b.idempotencyKey === idempotencyKey);
      if (existing) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            ok: true, duplicate: true, bookingId: existing.bookingId,
            leadScore: existing.leadScore, intentLevel: existing.intentLevel,
            whatsappUrl: buildWhatsAppUrl(OWNER_WHATSAPP_NUMBER, buildBookingWhatsAppMessage(existing)),
          }),
        };
      }
    }

    let lead = await getLead(visitorId);
    if (!lead) {
      lead = {
        leadId: visitorId, createdAt: new Date().toISOString(), visitorId,
        source: cleanText(payload.source, 60) || 'direct',
        medium: cleanText(payload.medium, 60) || 'none',
        campaign: cleanText(payload.campaign, 100) || null,
        signals: {},
      };
    }
    lead.name = name;
    lead.phone = phone;
    if (email) lead.email = email;
    lead.service = service;
    lead.bookingStarted = true;
    lead.bookingCompleted = true;
    lead.signals = mergeSignal(lead.signals || {}, 'bookingCompleted');
    lead.signals = mergeSignal(lead.signals, 'servicePageViewed');
    const { score, intent } = scoreLead(lead.signals);
    lead.leadScore = score;
    lead.intentLevel = intent;
    await saveLead(lead);

    const bookingId = newId('BK');
    const booking = {
      bookingId,
      idempotencyKey: idempotencyKey || null,
      createdAt: new Date().toISOString(),
      visitorId, sessionId: sessionId || null,
      name, phone, email,
      service, goal: payload.goal ? cleanText(payload.goal, 120) : '',
      date: payload.date ? cleanText(payload.date, 20) : '',
      time: payload.time ? cleanText(payload.time, 20) : '',
      mode: payload.mode ? cleanText(payload.mode, 20) : '',
      notes: payload.notes ? cleanText(payload.notes, 500) : '',
      source: lead.source, medium: lead.medium, campaign: lead.campaign,
      leadScore: score, intentLevel: intent,
      assessmentCompleted: !!lead.assessmentCompleted,
      paymentStarted: !!lead.paymentStarted,
      paymentCompleted: !!lead.paymentCompleted,
    };
    await saveBooking(booking);

    const message = buildBookingWhatsAppMessage(booking);
    const whatsappUrl = buildWhatsAppUrl(OWNER_WHATSAPP_NUMBER, message);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, bookingId, leadScore: score, intentLevel: intent, whatsappUrl }),
    };
  } catch (err) {
    console.error('submit-booking: failed', err);
    return { statusCode: 200, body: JSON.stringify({ ok: false, stored: false, error: 'storage_unavailable' }) };
  }
}

// ============================================
// GET /.netlify/functions/admin-dashboard?token=...&date=YYYY-MM-DD
//
// SECURITY MODEL (read this before relying on it):
// There is no frontend password anywhere — a password checked in
// client-side JavaScript can always be read out of the page source,
// so that pattern is deliberately NOT used here.
//
// Instead, this function checks a secret token (the ADMIN_ACCESS_TOKEN
// environment variable, set in Netlify's site settings — never
// committed to the repo, never sent to the browser except as part of
// the URL the owner uses to open the dashboard) against the `token`
// query parameter. The check happens entirely server-side inside this
// function; the token itself is never embedded in any JS the visitor
// can read.
//
// This is a reasonable lightweight access-control mechanism for a
// static-site-plus-Functions architecture with no user database — it
// is equivalent to a long, unguessable bookmarked link. It is NOT
// full authentication: there's no rate limiting, no token rotation,
// no login history, and anyone who obtains the exact link (e.g. via
// browser history, a shared screenshot, or shoulder-surfing) can view
// it until the token is changed. Treat the link itself as a secret.
//
// If stronger security is needed later, Netlify Identity or a proper
// auth provider would be the next step — that is a larger change and
// intentionally out of scope here per the "do not pretend it's secure
// if it isn't" requirement.
// ============================================
async function handleAdmin(event) {
  const qs = (event && event.queryStringParameters) || {};
  const configuredToken = process.env.ADMIN_ACCESS_TOKEN;

  if (!configuredToken) {
    return { statusCode: 503, body: 'Admin dashboard is not configured. Set ADMIN_ACCESS_TOKEN in Netlify site settings to enable it.' };
  }
  if (!qs.token || qs.token !== configuredToken) {
    return { statusCode: 401, body: 'Unauthorized.' };
  }

  const offsetMinutes = process.env.REPORT_TIMEZONE_OFFSET_MINUTES !== undefined
    ? Number(process.env.REPORT_TIMEZONE_OFFSET_MINUTES) : undefined;

  let referenceDate = new Date();
  if (qs.date) {
    const parsed = new Date(`${qs.date}T12:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) referenceDate = parsed;
  }

  const window = getReportWindow(referenceDate, offsetMinutes);

  let data;
  try {
    data = await gatherWindow(window);
  } catch (err) {
    console.error('admin-dashboard: failed to gather data', err);
    return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: '<p style="font-family:sans-serif;">Storage temporarily unavailable. Try again shortly.</p>' };
  }

  const report = buildReport(window.localDay, data.events, data.leads, data.bookings);
  const html = renderDashboardPage(report, window.localDay);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
    body: html,
  };
}

// ============================================
// ROUTER — dispatches by ?action= query parameter
// ============================================
exports.handler = async (event, context) => {
  const action = (event.queryStringParameters && event.queryStringParameters.action) || '';
  try {
    switch (action) {
      case 'track':
        return await handleTrack(event, context);
      case 'lead':
        return await handleLead(event);
      case 'booking':
        return await handleBooking(event);
      case 'admin':
        return await handleAdmin(event);
      default:
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Unknown or missing ?action= parameter' }) };
    }
  } catch (err) {
    console.error('api router: unhandled error for action', action, err);
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'internal_error' }) };
  }
};
