// ============================================
// KUNAAL WACHANEKAR - HUMAN PERFORMANCE PLATFORM
// app.js - Core Application Logic
// ============================================

// ============================================
// CONSTANTS & CONFIG
// ============================================
const UPI_ID = "kunal.wachanekar-4@okicici";
const PAYEE_NAME = "Kunaal Wachanekar";
const WHATSAPP_NUMBER = "919011101654";
const EMAIL = "kunaalextraedge@gmail.com";

// ============================================
// VISITOR INTELLIGENCE (privacy-conscious)
// ============================================
// Anonymous visitor/session identifiers only — no fingerprinting, no
// third-party trackers, no attempt to identify who someone actually is.
// Every function here is wrapped so a failure (storage disabled,
// private browsing, tracking blocked, the backend not deployed yet,
// etc.) NEVER breaks the site. Tracking is always best-effort.
const Track = (function () {
  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  let visitorId = null, sessionId = null, isReturning = false, attribution = null;

  function init() {
    try {
      visitorId = localStorage.getItem('_kw_vid');
      if (!visitorId) {
        visitorId = uuid();
        localStorage.setItem('_kw_vid', visitorId);
      } else {
        isReturning = true;
      }
    } catch (e) { visitorId = visitorId || uuid(); }

    try {
      sessionId = sessionStorage.getItem('_kw_sid');
      if (!sessionId) {
        sessionId = uuid();
        sessionStorage.setItem('_kw_sid', sessionId);
      }
    } catch (e) { sessionId = sessionId || uuid(); }

    try {
      const stored = sessionStorage.getItem('_kw_attr');
      if (stored) {
        attribution = JSON.parse(stored);
      } else {
        attribution = deriveAttribution();
        sessionStorage.setItem('_kw_attr', JSON.stringify(attribution));
      }
    } catch (e) {
      attribution = attribution || deriveAttribution();
    }
  }

  function deriveAttribution() {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    if (utmSource) {
      return {
        source: utmSource,
        medium: params.get('utm_medium') || 'unknown',
        campaign: params.get('utm_campaign') || null,
        content: params.get('utm_content') || null,
        term: params.get('utm_term') || null,
        landingUrl: window.location.href,
      };
    }
    const ref = document.referrer || '';
    if (!ref) return { source: 'direct', medium: 'none', campaign: null, content: null, term: null, landingUrl: window.location.href };
    try {
      const refHost = new URL(ref).hostname.replace(/^www\./, '');
      if (/instagram\.com/.test(refHost)) return { source: 'instagram', medium: 'referral', campaign: null, content: null, term: null, landingUrl: window.location.href };
      if (/google\./.test(refHost)) return { source: 'google', medium: 'organic', campaign: null, content: null, term: null, landingUrl: window.location.href };
      return { source: refHost, medium: 'referral', campaign: null, content: null, term: null, landingUrl: window.location.href };
    } catch (e) {
      return { source: 'referral', medium: 'referral', campaign: null, content: null, term: null, landingUrl: window.location.href };
    }
  }

  /** Fire-and-forget event tracking. Never throws, never blocks the caller. */
  function event(eventType, extra) {
    try {
      if (!visitorId) init();
      const payload = Object.assign({
        eventType, visitorId, sessionId, isReturning,
        source: attribution.source, medium: attribution.medium,
        campaign: attribution.campaign, content: attribution.content, term: attribution.term,
        landingUrl: attribution.landingUrl,
      }, extra || {});
      fetch('/.netlify/functions/api?action=track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {});
    } catch (e) { /* tracking must never break the site */ }
  }

  /** Submits contact info onto the visitor's lead record. Fire-and-forget. */
  function lead(fields) {
    try {
      if (!visitorId) init();
      const payload = Object.assign({
        visitorId, sessionId,
        source: attribution.source, medium: attribution.medium, campaign: attribution.campaign,
      }, fields || {});
      return fetch('/.netlify/functions/api?action=lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
    } catch (e) { return Promise.resolve({ ok: false }); }
  }

  /**
   * Submits a completed booking server-side. Returns a promise resolving
   * to { ok, bookingId, leadScore, intentLevel, whatsappUrl } — or
   * { ok: false } if the backend is unreachable/not yet deployed, in
   * which case the caller MUST fall back to building its own WhatsApp
   * link exactly as before, so booking never depends on this succeeding.
   */
  function booking(fields) {
    try {
      if (!visitorId) init();
      const payload = Object.assign({
        visitorId, sessionId,
        source: attribution.source, medium: attribution.medium, campaign: attribution.campaign,
      }, fields || {});
      return fetch('/.netlify/functions/api?action=booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
    } catch (e) { return Promise.resolve({ ok: false }); }
  }

  function getVisitorId() { if (!visitorId) init(); return visitorId; }
  function getSessionId() { if (!sessionId) init(); return sessionId; }
  function getAttribution() { if (!attribution) init(); return attribution; }

  return { init: init, event: event, lead: lead, booking: booking, getVisitorId: getVisitorId, getSessionId: getSessionId, getAttribution: getAttribution, uuid: uuid };
})();

// ============================================
// STATE MANAGEMENT
// ============================================
const AppState = {
  currentStep: 0,
  totalSteps: 9,
  assessmentData: {},
  selectedService: null,
  showHypnotherapy: false,
  services: {
    'personal-training': {
      title: 'Personal Training',
      icon: '&#x1F4AA;',
      who: 'Individuals who want direct, in-person coaching &#x2014; hands-on technique correction, real-time feedback, and a coach physically present for every session.',
      includes: [
        'Exercise programming built around you',
        'Real-time technique correction',
        'Progressive strength development',
        'Nutrition guidance alongside training',
        'Weekly progress tracking',
        'In-person accountability, every session'
      ],
      how: 'Starts with a movement and strength assessment, then a program built around your goals and any limitations. Every session is coached live, with cues and adjustments made in real time.',
      expect: 'Faster technique improvement, safer progressive overload, and the accountability of a coach who sees your training firsthand every session.',
      process: 'Initial assessment &#x2192; Program design &#x2192; In-person coached sessions &#x2192; Ongoing technique refinement &#x2192; Progress reviews'
    },
    'online-training': {
      title: 'Online Personal Training',
      icon: '&#x1F4BB;',
      who: 'People who can&#x2019;t train in person but still want a structured, coached program &#x2014; remote clients, frequent travelers, or anyone training on their own schedule.',
      includes: [
        'Personalized workout program',
        'Weekly check-ins',
        'Progress and photo tracking',
        'Exercise demonstration videos',
        'Direct messaging access',
        'Ongoing program adjustments'
      ],
      how: 'A program is built remotely based on your equipment, schedule, and goals, delivered with exercise demonstrations. You check in weekly with photos and metrics; the program adjusts from there.',
      expect: 'The structure and accountability of in-person coaching, adapted to work from wherever you are, with direct access to ask questions between sessions.',
      process: 'Remote assessment &#x2192; Program build &#x2192; Weekly check-ins &#x2192; Ongoing adjustments &#x2192; Direct messaging support'
    },
    'diet-consultation': {
      title: 'Diet Consultation',
      icon: '&#x1F957;',
      who: 'Anyone who wants to eat better for their goals but isn&#x2019;t sure how &#x2014; whether that&#x2019;s fat loss, muscle gain, energy, or just eating with more structure.',
      includes: [
        'Personalized meal planning',
        'Macro and micronutrient optimization',
        'Meal timing strategies',
        'Lifestyle integration planning',
        'Grocery and meal prep guidance',
        'Sustainable habit development'
      ],
      how: 'Comprehensive nutrition assessment including current eating patterns, preferences, restrictions, and goals. Plan designed for adherence and results, not a rigid, unsustainable diet.',
      expect: 'Improved energy levels, better body composition, enhanced recovery, and sustainable eating habits that fit your lifestyle.',
      process: 'Nutrition audit &#x2192; Goal setting &#x2192; Meal plan design &#x2192; Weekly adjustments &#x2192; Long-term sustainability'
    },
    'contest-prep': {
      title: 'Contest Preparation',
      icon: '&#x1F3C6;',
      who: 'Physique athletes preparing for bodybuilding, classic physique, or fitness competitions. Requires minimum 12-16 week commitment.',
      includes: [
        'Competition-specific training protocols',
        'Precision nutrition and meal planning',
        'Peak week strategy',
        'Posing and presentation coaching',
        'Conditioning timeline management',
        'Stage-ready physique optimization'
      ],
      how: 'Structured preparation timeline with reverse-engineered goals. Every week is calculated to bring you to stage in peak condition.',
      expect: 'Competition-ready physique with optimal conditioning, confident stage presence, and a strategic approach to peak week.',
      process: 'Initial assessment &#x2192; Timeline planning &#x2192; Weekly adjustments &#x2192; Peak week protocol &#x2192; Stage day support &#x2192; Post-show guidance'
    },
    'transformation': {
      title: 'Physique Transformation',
      icon: '&#x1F3CB;&#xFE0F;',
      who: 'Individuals seeking significant changes in body composition, muscle development, and aesthetic physique. Suitable for beginners to advanced trainees.',
      includes: [
        'Comprehensive body composition analysis',
        'Customized resistance training program',
        'Progressive overload strategies',
        'Nutrition guidance',
        'Weekly check-ins and adjustments',
        'Photo and measurement tracking'
      ],
      how: 'Begins with a detailed assessment of your current physique, training history, and goals. A periodized program is designed specifically for your body type and objectives.',
      expect: 'Measurable changes in body composition, improved muscle definition, increased strength, and enhanced confidence in your physical appearance.',
      process: 'Initial consultation &#x2192; Assessment &#x2192; Program design &#x2192; Weekly check-ins &#x2192; Monthly reviews &#x2192; Continuous refinement'
    },
    'hypnotherapy': {
      title: 'Hypnotherapy',
      icon: '&#x1F9E0;',
      who: 'Individuals seeking behavioural change, habit transformation, confidence building, stress management, or performance enhancement through subconscious reprogramming.',
      includes: [
        'One-on-one hypnotherapy sessions',
        'Behavioural pattern analysis',
        'Subconscious reprogramming',
        'Confidence and performance enhancement',
        'Stress and anxiety management',
        'Habit transformation protocols'
      ],
      how: 'Uses guided hypnosis to access the subconscious mind and reprogram limiting beliefs, habits, and behaviours. Each session is tailored to your specific needs.',
      expect: 'Reduced anxiety, improved confidence, transformed habits, enhanced mental performance, and lasting behavioural change.',
      process: 'Initial consultation &#x2192; Pattern identification &#x2192; Hypnotherapy sessions &#x2192; Integration exercises &#x2192; Progress review &#x2192; Maintenance'
    },
    'lifestyle': {
      title: 'Lifestyle & Performance',
      icon: '&#x1F331;',
      who: 'High-performers and individuals seeking a broader, integrated approach to training, recovery, and daily performance &#x2014; or anyone not sure which specific service fits and wants to talk it through first.',
      includes: [
        'Integrated training and lifestyle planning',
        'Recovery and sleep optimization',
        'Stress management systems',
        'Habit and behaviour architecture',
        'Flexible, conversation-first approach',
        'No pressure to commit to one path'
      ],
      how: 'Starts with an honest conversation about where you are, what you want, and what&#x2019;s realistic &#x2014; from there, a plan is shaped around your actual life, or you&#x2019;re matched to the more specific service that fits.',
      expect: 'Either a broader, integrated performance plan, or clarity on which specific service is the right starting point &#x2014; with zero pressure either way.',
      process: 'Conversation &#x2192; Goals clarified &#x2192; Path confirmed &#x2192; Plan or referral to the right service'
    }
  }
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  initLoading();
  initParticles();
  initHeroNeuralCanvas();
  initNavigation();
  initAssessment();
  initScrollAnimations();
  initCheckboxRadios();
  initDateInput();
  initPayment();
  initHashRouting();
  initCtaTracking();

  try {
    Track.init();
    Track.event('page_view');
  } catch (e) { /* tracking must never break the site */ }
});

function initLoading() {
  setTimeout(() => {
    document.getElementById('loadingOverlay').classList.add('hidden');
  }, 1500);
}

// ============================================
// PARTICLES & VISUAL EFFECTS
// ============================================
function initParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  const particleCount = window.innerWidth < 768 ? 20 : 40;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'hero-particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (4 + Math.random() * 4) + 's';
    particle.style.width = (2 + Math.random() * 3) + 'px';
    particle.style.height = particle.style.width;
    container.appendChild(particle);
  }
}

function initNeuralNodes() {}  // superseded by canvas version

function initHeroNeuralCanvas() {
  const canvas = document.getElementById('neuralCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const col = canvas.parentElement;

  function resize() {
    canvas.width  = col.offsetWidth  || 200;
    canvas.height = col.offsetHeight || 600;
  }
  resize();
  window.addEventListener('resize', resize);

  const CYAN = '0,212,170';
  const nodes = Array.from({length: 18}, () => ({
    x:  Math.random(),
    y:  Math.random(),
    vx: (Math.random() - 0.5) * 0.00028,
    vy: (Math.random() - 0.5) * 0.00028,
    r:  1.8 + Math.random() * 1.8,
    phase: Math.random() * Math.PI * 2,
  }));

  function draw(t) {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    /* edges */
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = (a.x - b.x) * W, dy = (a.y - b.y) * H;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 170) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(' + CYAN + ',' + ((1 - dist/170) * 0.3) + ')';
          ctx.lineWidth = 0.7;
          ctx.moveTo(a.x*W, a.y*H);
          ctx.lineTo(b.x*W, b.y*H);
          ctx.stroke();
        }
      }
    }

    /* nodes */
    nodes.forEach(function(n) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.0009 + n.phase);
      const alpha = 0.35 + 0.55 * pulse;
      const r = n.r * (0.8 + 0.35 * pulse);
      const g = ctx.createRadialGradient(n.x*W, n.y*H, 0, n.x*W, n.y*H, r*5);
      g.addColorStop(0, 'rgba(' + CYAN + ',' + (alpha * 0.5) + ')');
      g.addColorStop(1, 'rgba(' + CYAN + ',0)');
      ctx.beginPath(); ctx.fillStyle = g;
      ctx.arc(n.x*W, n.y*H, r*5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = 'rgba(' + CYAN + ',' + alpha + ')';
      ctx.arc(n.x*W, n.y*H, r, 0, Math.PI*2); ctx.fill();
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > 1) n.vx *= -1;
      if (n.y < 0 || n.y > 1) n.vy *= -1;
    });

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

// ============================================
// NAVIGATION & ROUTING
// ============================================
function initCtaTracking() {
  document.addEventListener('click', function (e) {
    try {
      const btn = e.target.closest('.btn-primary, .btn-whatsapp, .btn-secondary, .btn-outline');
      if (!btn) return;
      const label = (btn.textContent || '').trim().slice(0, 60);
      Track.event('cta_click', { label: label });
    } catch (err) { /* tracking must never break the site */ }
  });
}

function initNavigation() {
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
    });
  }

  // Close mobile menu on outside click
  document.addEventListener('click', (e) => {
    if (!mobileMenu.contains(e.target) && !navToggle.contains(e.target)) {
      mobileMenu.classList.remove('active');
    }
  });

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
      navbar.style.background = 'rgba(5, 6, 8, 0.95)';
    } else {
      navbar.style.background = 'rgba(5, 6, 8, 0.9)';
    }
  });

  // Active bottom bar link
  const bottomLinks = document.querySelectorAll('.mobile-bottom-bar a');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      if (scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });
    bottomLinks.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === '#' + current || (href === '#payment' && current === 'payment')) {
        link.classList.add('active');
      }
    });
  });
}

function initHashRouting() {
  // Handle direct hash navigation on load
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    if (hash === 'payment') {
      setTimeout(() => goToPayment(), 500);
    } else if (hash !== '') {
      setTimeout(() => scrollToSection(hash), 500);
    }
  }
}

function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('active');
}

function goHome() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  window.location.hash = '';
}

function goToPayment() {
  scrollToSection('payment');
  window.location.hash = 'payment';
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.location.hash = id;
  }
  closeMobileMenu();
}

function scrollToBooking() {
  openBookNow('');
}

// ============================================
// ASSESSMENT LOGIC
// ============================================
function initAssessment() {
  updateAssessmentUI();

  // Hypnotherapy checkbox listener
  const hypnoCheckbox = document.getElementById('hypnotherapyCheckbox');
  if (hypnoCheckbox) {
    hypnoCheckbox.addEventListener('change', function() {
      AppState.showHypnotherapy = this.checked;
      updateStepIndicators();
    });
  }
}

function updateStepIndicators() {
  const hypnoIndicator = document.getElementById('hypnoStepIndicator');
  const hypnoLine = document.getElementById('hypnoStepLine');
  if (hypnoIndicator && hypnoLine) {
    hypnoIndicator.style.display = AppState.showHypnotherapy ? 'flex' : 'none';
    hypnoLine.style.display = AppState.showHypnotherapy ? 'block' : 'none';
  }
}

function getVisibleSteps() {
  return AppState.showHypnotherapy ? 9 : 8;
}

function getAdjustedStep(rawStep) {
  if (!AppState.showHypnotherapy && rawStep >= 7) {
    return rawStep + 1;
  }
  return rawStep;
}

function getRawStep(visibleStep) {
  if (!AppState.showHypnotherapy && visibleStep >= 7) {
    return visibleStep - 1;
  }
  return visibleStep;
}

function nextStep() {
  try {
    if (!validateCurrentStep()) return;

    saveStepData();

    if (AppState.currentStep === 0 && !AppState._assessmentStartTracked) {
      AppState._assessmentStartTracked = true;
      try { Track.event('form_start', { formType: 'coaching_assessment' }); Track.event('assessment_start'); } catch (e) {}
    }

    const visibleSteps = getVisibleSteps();
    const currentVisible = getVisibleStepIndex(AppState.currentStep);

    if (currentVisible < visibleSteps - 1) {
      AppState.currentStep++;
      if (!AppState.showHypnotherapy && AppState.currentStep === 7) {
        AppState.currentStep = 8;
      }
      updateAssessmentUI();
      const body = document.getElementById('assessmentBody');
      if (body) body.scrollTop = 0;
      try { Track.event('assessment_step', { step: AppState.currentStep }); } catch (e) {}
    }
  } catch (err) {
    console.error('nextStep() failed on step', AppState.currentStep, err);
    showToast('&#x26A0; Something went wrong loading the next step. Please refresh and try again.');
  }
}

function prevStep() {
  if (AppState.currentStep > 0) {
    AppState.currentStep--;
    if (!AppState.showHypnotherapy && AppState.currentStep === 7) {
      AppState.currentStep = 6;
    }
    updateAssessmentUI();
    document.getElementById('assessmentBody').scrollTop = 0;
  }
}

function getVisibleStepIndex(rawStep) {
  if (!AppState.showHypnotherapy && rawStep > 7) {
    return rawStep - 1;
  }
  return rawStep;
}

function validateCurrentStep() {
  const step = AppState.currentStep;

  if (step === 0) {
    const name = document.getElementById('fullName').value.trim();
    const age = document.getElementById('age').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!name) { showToast('&#x26A0; Please enter your full name'); return false; }
    if (!age) { showToast('&#x26A0; Please enter your age'); return false; }
    if (!phone) { showToast('&#x26A0; Please enter your phone number'); return false; }
    if (!email) { showToast('&#x26A0; Please enter your email'); return false; }
    if (!isValidEmail(email)) { showToast('&#x26A0; Please enter a valid email'); return false; }
  }

  if (step === 7) {
    const consent = document.getElementById('hypnoConsent');
    if (consent && !consent.checked) {
      showToast('&#x26A0; Please confirm hypnotherapy consent to continue');
      return false;
    }
  }

  return true;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function saveStepData() {
  const step = AppState.currentStep;

  if (step === 0) {
    AppState.assessmentData.fullName = document.getElementById('fullName').value;
    AppState.assessmentData.age = document.getElementById('age').value;
    AppState.assessmentData.sex = document.getElementById('sex').value;
    AppState.assessmentData.phone = document.getElementById('phone').value;
    AppState.assessmentData.whatsapp = document.getElementById('whatsapp').value;
    AppState.assessmentData.email = document.getElementById('email').value;
    AppState.assessmentData.location = document.getElementById('location').value;
  }

  if (step === 1) {
    AppState.assessmentData.height = document.getElementById('height').value;
    AppState.assessmentData.weight = document.getElementById('weight').value;
    AppState.assessmentData.bodyfat = document.getElementById('bodyfat').value;
    AppState.assessmentData.trainingExp = document.getElementById('trainingExp').value;
    AppState.assessmentData.yearsTraining = document.getElementById('yearsTraining').value;
    AppState.assessmentData.activityLevel = document.getElementById('activityLevel').value;
    AppState.assessmentData.waist = document.getElementById('waist').value;
    AppState.assessmentData.measurements = document.getElementById('measurements').value;
  }

  if (step === 2) {
    const goals = [];
    document.querySelectorAll('#primaryGoals input:checked').forEach(cb => goals.push(cb.value));
    AppState.assessmentData.primaryGoals = goals;
    AppState.assessmentData.goalDescription = document.getElementById('goalDescription').value;
    AppState.assessmentData.timeline = document.getElementById('timeline').value;
    AppState.assessmentData.barriers = document.getElementById('barriers').value;
    AppState.assessmentData.triedBefore = document.getElementById('triedBefore').value;
    AppState.assessmentData.commitment = document.getElementById('commitment').value;
  }

  if (step === 3) {
    AppState.assessmentData.occupation = document.getElementById('occupation').value;
    AppState.assessmentData.workSchedule = document.getElementById('workSchedule').value;
    AppState.assessmentData.sleepDuration = document.getElementById('sleepDuration').value;
    AppState.assessmentData.sleepQuality = document.getElementById('sleepQuality').value;
    AppState.assessmentData.stressLevel = document.getElementById('stressLevel').value;
    AppState.assessmentData.trainingFrequency = document.getElementById('trainingFrequency').value;
    AppState.assessmentData.travelFreq = document.getElementById('travelFreq').value;
    AppState.assessmentData.alcohol = document.getElementById('alcohol').value;
    AppState.assessmentData.smoking = document.getElementById('smoking').value;
    AppState.assessmentData.currentRoutine = document.getElementById('currentRoutine').value;
  }

  if (step === 4) {
    const diet = document.querySelector('input[name="diet"]:checked');
    AppState.assessmentData.diet = diet ? diet.value : '';
    AppState.assessmentData.allergies = document.getElementById('allergies').value;
    AppState.assessmentData.intolerances = document.getElementById('intolerances').value;
    AppState.assessmentData.foodsAvoided = document.getElementById('foodsAvoided').value;
    AppState.assessmentData.restrictions = document.getElementById('restrictions').value;
    AppState.assessmentData.mealsPerDay = document.getElementById('mealsPerDay').value;
    AppState.assessmentData.waterIntake = document.getElementById('waterIntake').value;
    AppState.assessmentData.eatingPattern = document.getElementById('eatingPattern').value;
    AppState.assessmentData.supplements = document.getElementById('supplements').value;
    AppState.assessmentData.previousDiets = document.getElementById('previousDiets').value;
  }

  if (step === 5) {
    AppState.assessmentData.injuries = document.getElementById('injuries').value;
    AppState.assessmentData.medicalConditions = document.getElementById('medicalConditions').value;
    AppState.assessmentData.medications = document.getElementById('medications').value;
    AppState.assessmentData.exerciseRestrictions = document.getElementById('exerciseRestrictions').value;
    AppState.assessmentData.healthcareAdvice = document.getElementById('healthcareAdvice').value;
    AppState.assessmentData.emergencyContact = document.getElementById('emergencyContact').value;
  }

  if (step === 6) {
    const services = [];
    document.querySelectorAll('#serviceSelection input:checked').forEach(cb => services.push(cb.value));
    AppState.assessmentData.selectedServices = services;
    const mode = document.querySelector('input[name="mode"]:checked');
    AppState.assessmentData.workMode = mode ? mode.value : '';
    updateBookingSummary();
  }

  if (step === 7) {
    AppState.assessmentData.hypnoChange = document.getElementById('hypnoChange').value;
    AppState.assessmentData.hypnoDifferent = document.getElementById('hypnoDifferent').value;
    AppState.assessmentData.hypnoKnow = document.getElementById('hypnoKnow').value;
    AppState.assessmentData.hypnoSense = document.getElementById('hypnoSense').value;
    AppState.assessmentData.hypnoCost = document.getElementById('hypnoCost').value;
    AppState.assessmentData.hypnoPossible = document.getElementById('hypnoPossible').value;
    AppState.assessmentData.hypnoWhen = document.getElementById('hypnoWhen').value;
    AppState.assessmentData.hypnoExceptions = document.getElementById('hypnoExceptions').value;
    AppState.assessmentData.hypnoTried = document.getElementById('hypnoTried').value;
    AppState.assessmentData.hypnoImportance = document.getElementById('hypnoImportance').value;
    AppState.assessmentData.hypnoConfidence = document.getElementById('hypnoConfidence').value;
    AppState.assessmentData.hypnoFuture = document.getElementById('hypnoFuture').value;
    AppState.assessmentData.hypnoInstead = document.getElementById('hypnoInstead').value;
  }

  if (step === 8) {
    AppState.assessmentData.preferredDate = document.getElementById('preferredDate').value;
    AppState.assessmentData.preferredTime = document.getElementById('preferredTime').value;
    AppState.assessmentData.consultationType = document.getElementById('consultationType').value;
    AppState.assessmentData.bookingNotes = document.getElementById('bookingNotes').value;
  }
}

function updateAssessmentUI() {
  const steps = document.querySelectorAll('.assessment-step');
  const indicators = document.querySelectorAll('.assessment-progress-step');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  steps.forEach((step, index) => {
    step.classList.toggle('active', index === AppState.currentStep);
  });

  indicators.forEach((ind, index) => {
    ind.classList.remove('active', 'completed');
    const stepNum = parseInt(ind.dataset.step);
    if (stepNum < AppState.currentStep) {
      ind.classList.add('completed');
    } else if (stepNum === AppState.currentStep) {
      ind.classList.add('active');
    }
  });

  prevBtn.style.display = AppState.currentStep === 0 ? 'none' : 'flex';

  const visibleSteps = getVisibleSteps();
  const currentVisible = getVisibleStepIndex(AppState.currentStep);

  if (currentVisible === visibleSteps - 1) {
    nextBtn.innerHTML = '&#x1F4AC; Finish & Send via WhatsApp';
    nextBtn.onclick = finishAssessment;
  } else {
    nextBtn.innerHTML = 'Continue &#x2192;';
    nextBtn.onclick = nextStep;
  }
}

function updateBookingSummary() {
  const services = AppState.assessmentData.selectedServices || [];
  const serviceNames = services.map(s => {
    const map = {
      'personal-training': 'Personal Training',
      'online-training': 'Online Training',
      'diet-consultation': 'Diet Consultation',
      'contest-prep': 'Contest Preparation',
      'transformation': 'Transformation',
      'hypnotherapy': 'Hypnotherapy',
      'lifestyle': 'Lifestyle / Performance'
    };
    return map[s] || s;
  }).join(', ') || 'Not selected';

  const modeMap = { 'in-person': 'In Person', 'online': 'Online', 'either': 'Either' };
  const mode = modeMap[AppState.assessmentData.workMode] || 'Not selected';

  document.getElementById('summaryService').textContent = serviceNames;
  document.getElementById('summaryMode').textContent = mode;
}

function finishAssessment() {
  try {
    saveStepData();
    showToast('&#x2705; Assessment complete! Opening WhatsApp...');

    try {
      Track.event('assessment_complete');
      Track.event('form_complete', { formType: 'coaching_assessment' });
      const services = AppState.assessmentData.selectedServices || [];
      Track.lead({
        name: AppState.assessmentData.fullName || '',
        email: AppState.assessmentData.email || '',
        phone: AppState.assessmentData.phone || '',
        service: services[0] || '',
      });
    } catch (e) {}

    setTimeout(() => {
      window.open(generateWhatsAppLink(), '_blank');
    }, 800);

    // Show submission options
    const footer = document.getElementById('assessmentFooter');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-secondary" onclick="location.reload()">&#x1F504; Start Over</button>
        <a href="${generateWhatsAppLink()}" target="_blank" class="btn btn-whatsapp">&#x1F4AC; Send via WhatsApp</a>
        <a href="${generateEmailLink()}" class="btn btn-primary">&#x2709;&#xFE0F; Send via Email</a>
      `;
    }
  } catch (err) {
    console.error('finishAssessment() failed', err);
    showToast('&#x26A0; Something went wrong sending your assessment. Please try WhatsApp directly.');
  }
}

function generateWhatsAppLink() {
  const data = AppState.assessmentData;
  const services = (data.selectedServices || []).map(s => {
    const map = {
      'personal-training': 'Personal Training',
      'online-training': 'Online Training',
      'diet-consultation': 'Diet Consultation',
      'contest-prep': 'Contest Preparation',
      'transformation': 'Transformation',
      'hypnotherapy': 'Hypnotherapy',
      'lifestyle': 'Lifestyle / Performance'
    };
    return map[s] || s;
  }).join(', ');

  const goals = (data.primaryGoals || []).join(', ');
  const modeMap = { 'in-person': 'In Person', 'online': 'Online', 'either': 'Either' };

  const hypnoSection = AppState.showHypnotherapy ? `
&#x1F9E0; HYPNOTHERAPY INTAKE
What they want to change: ${data.hypnoChange || ''}
What would be different: ${data.hypnoDifferent || ''}
How they'd know it changed: ${data.hypnoKnow || ''}
What they'd see/hear/feel: ${data.hypnoSense || ''}
What it's costing them: ${data.hypnoCost || ''}
What becomes possible: ${data.hypnoPossible || ''}
When they first noticed it: ${data.hypnoWhen || ''}
Exceptions (when it doesn't happen): ${data.hypnoExceptions || ''}
What they've already tried: ${data.hypnoTried || ''}
Importance (1-10): ${data.hypnoImportance || ''}
Confidence change is possible (1-10): ${data.hypnoConfidence || ''}
6 months from now: ${data.hypnoFuture || ''}
What they want instead: ${data.hypnoInstead || ''}
` : '';

  const message = `Hello Kunaal, I completed the assessment and would like to discuss coaching.

&#x1F464; Name: ${data.fullName || ''}
&#x1F382; Age: ${data.age || ''}
&#x1F4F1; Phone: ${data.phone || ''}
&#x2709;&#xFE0F; Email: ${data.email || ''}
&#x1F3D8;&#xFE0F; Location: ${data.location || ''}

&#x1F3AF; Primary Goal: ${goals || ''}
&#x1F3CB;&#xFE0F; Services: ${services || ''}
&#x1F504; Mode: ${modeMap[data.workMode] || ''}
${hypnoSection}
&#x1F4C5; Preferred Date: ${data.preferredDate || ''}
&#x23F0; Preferred Time: ${data.preferredTime || ''}
&#x1F4F9; Consultation Type: ${data.consultationType || ''}

&#x1F4CA; Commitment Level: ${data.commitment || ''}/10

I would like to know the next steps.`;

  return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
}

function generateEmailLink() {
  const data = AppState.assessmentData;
  const services = (data.selectedServices || []).map(s => {
    const map = {
      'personal-training': 'Personal Training',
      'online-training': 'Online Training',
      'diet-consultation': 'Diet Consultation',
      'contest-prep': 'Contest Preparation',
      'transformation': 'Transformation',
      'hypnotherapy': 'Hypnotherapy',
      'lifestyle': 'Lifestyle / Performance'
    };
    return map[s] || s;
  }).join(', ');

  const goals = (data.primaryGoals || []).join(', ');
  const modeMap = { 'in-person': 'In Person', 'online': 'Online', 'either': 'Either' };

  const subject = `New Coaching Assessment - ${data.fullName || 'Client'}`;

  const body = `COACHING ASSESSMENT SUMMARY

PERSONAL DETAILS
----------------
Name: ${data.fullName || ''}
Age: ${data.age || ''}
Sex: ${data.sex || ''}
Phone: ${data.phone || ''}
WhatsApp: ${data.whatsapp || ''}
Email: ${data.email || ''}
Location: ${data.location || ''}

BODY PROFILE
------------
Height: ${data.height || ''} cm
Weight: ${data.weight || ''} kg
Body Fat: ${data.bodyfat || ''}%
Training Experience: ${data.trainingExp || ''}
Years Training: ${data.yearsTraining || ''}
Activity Level: ${data.activityLevel || ''}

GOALS
-----
Primary Goals: ${goals || ''}
Description: ${data.goalDescription || ''}
Timeline: ${data.timeline || ''}
Barriers: ${data.barriers || ''}
Previously Tried: ${data.triedBefore || ''}
Commitment: ${data.commitment || ''}/10

LIFESTYLE
---------
Occupation: ${data.occupation || ''}
Work Schedule: ${data.workSchedule || ''}
Sleep Duration: ${data.sleepDuration || ''}
Sleep Quality: ${data.sleepQuality || ''}
Stress Level: ${data.stressLevel || ''}
Training Frequency: ${data.trainingFrequency || ''}
Travel Frequency: ${data.travelFreq || ''}
Alcohol: ${data.alcohol || ''}
Smoking: ${data.smoking || ''}

NUTRITION
---------
Diet Preference: ${data.diet || ''}
Allergies: ${data.allergies || ''}
Intolerances: ${data.intolerances || ''}
Foods Avoided: ${data.foodsAvoided || ''}
Restrictions: ${data.restrictions || ''}
Meals Per Day: ${data.mealsPerDay || ''}
Water Intake: ${data.waterIntake || ''}
Supplements: ${data.supplements || ''}

HEALTH & SAFETY
---------------
Injuries: ${data.injuries || ''}
Medical Conditions: ${data.medicalConditions || ''}
Medications: ${data.medications || ''}
Exercise Restrictions: ${data.exerciseRestrictions || ''}
Healthcare Advice: ${data.healthcareAdvice || ''}
Emergency Contact: ${data.emergencyContact || ''}
${AppState.showHypnotherapy ? `
HYPNOTHERAPY INTAKE
--------------------
What they want to change: ${data.hypnoChange || ''}
What would be different: ${data.hypnoDifferent || ''}
How they'd know it changed: ${data.hypnoKnow || ''}
What they'd see/hear/feel: ${data.hypnoSense || ''}
What it's costing them: ${data.hypnoCost || ''}
What becomes possible: ${data.hypnoPossible || ''}
When they first noticed it: ${data.hypnoWhen || ''}
Exceptions (when it doesn't happen): ${data.hypnoExceptions || ''}
What they've already tried: ${data.hypnoTried || ''}
Importance (1-10): ${data.hypnoImportance || ''}
Confidence change is possible (1-10): ${data.hypnoConfidence || ''}
6 months from now: ${data.hypnoFuture || ''}
What they want instead: ${data.hypnoInstead || ''}
` : ''}
SERVICE SELECTION
-----------------
Services: ${services || ''}
Work Mode: ${modeMap[data.workMode] || ''}

BOOKING
-------
Preferred Date: ${data.preferredDate || ''}
Preferred Time: ${data.preferredTime || ''}
Consultation Type: ${data.consultationType || ''}
Notes: ${data.bookingNotes || ''}

---
Submitted via kunaal-human-performance.com`;

  return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}

// ============================================
// PAYMENT SYSTEM
// ============================================
function initPayment() {
  // Check for URL params to pre-fill payment
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('pay') === '1') {
    const service = urlParams.get('service');
    const amount = urlParams.get('amount');
    if (service) document.getElementById('paymentService').value = service;
    if (amount) {
      document.getElementById('paymentAmount').value = amount;
      updatePaymentQR();
    }
    setTimeout(() => scrollToSection('payment'), 800);
  }
}

function getUPIServiceName(serviceId) {
  const map = {
    'personal-training': 'Personal Training',
    'online-training': 'Online Training',
    'diet-consultation': 'Diet Consultation',
    'contest-prep': 'Contest Preparation',
    'transformation': 'Transformation',
    'hypnotherapy': 'Hypnotherapy',
    'lifestyle': 'Lifestyle Performance',
    'other': 'Coaching Service'
  };
  return map[serviceId] || 'Coaching Service';
}

function buildUPIUrl(amount, serviceName) {
  const encodedName = encodeURIComponent(PAYEE_NAME);
  const encodedService = encodeURIComponent(serviceName);
  return `upi://pay?pa=${UPI_ID}&pn=${encodedName}&am=${amount}&cu=INR&tn=${encodedService}`;
}

function updatePaymentQR() {
  const amountInput = document.getElementById('paymentAmount');
  const serviceSelect = document.getElementById('paymentService');
  const qrContainer = document.getElementById('paymentQRContainer');
  const payBtn = document.getElementById('upiPayBtn');

  const amount = parseFloat(amountInput.value);
  const serviceId = serviceSelect.value;
  const serviceName = getUPIServiceName(serviceId);

  if (!amount || amount <= 0) {
    qrContainer.innerHTML = `<p style="color: var(--text-muted); margin-bottom: 16px;">&#x1F4F1; Enter an amount above to generate your payment QR code</p>`;
    payBtn.disabled = true;
    return;
  }

  const upiUrl = buildUPIUrl(amount, serviceName);

  qrContainer.innerHTML = `
    <div id="paymentQRCanvas" style="display:flex; justify-content:center; margin-bottom:16px;"></div>
    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 8px;">&#x1F4F1; Scan with any UPI app</p>
    <div class="upi-id" style="margin-bottom: 16px;">${UPI_ID}</div>
    <p style="color: var(--text-muted); font-size: 0.8rem;">&#x1F4B0; Amount: &#x20B9;${amount.toLocaleString('en-IN')}</p>
    <p style="color: var(--text-muted); font-size: 0.8rem;">&#x1F3AF; ${serviceName}</p>
  `;

  try {
    const qrEl = document.getElementById('paymentQRCanvas');
    if (typeof QRCode !== 'undefined' && qrEl) {
      qrEl.innerHTML = '';
      new QRCode(qrEl, {
        text: upiUrl,
        width: 220,
        height: 220,
        colorDark: '#0a0a0f',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    } else if (qrEl) {
      qrEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">QR code unavailable &#x2014; use the UPI link below</p>';
    }
  } catch (err) {
    console.error('QR generation failed', err);
    const qrEl = document.getElementById('paymentQRCanvas');
    if (qrEl) qrEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">QR code unavailable &#x2014; use the UPI link below</p>';
  }

  payBtn.disabled = false;
}

function openUPILink() {
  const amountInput = document.getElementById('paymentAmount');
  const serviceSelect = document.getElementById('paymentService');
  const amount = parseFloat(amountInput.value);
  const serviceId = serviceSelect.value;

  if (!amount || amount <= 0) {
    showToast('&#x26A0; Please enter a valid amount');
    return;
  }

  const serviceName = getUPIServiceName(serviceId);
  const upiUrl = buildUPIUrl(amount, serviceName);
  try { Track.event('payment_start', { service: serviceId, amount: amount }); } catch (e) {}

  // Try to open UPI app
  window.location.href = upiUrl;

  // Fallback message
  setTimeout(() => {
    showToast('&#x1F4F1; If UPI app did not open, use the QR code or copy UPI ID');
  }, 1500);
}

function copyUPI() {
  navigator.clipboard.writeText(UPI_ID).then(() => {
    showToast('&#x2705; UPI ID copied: ' + UPI_ID);
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = UPI_ID;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast('&#x2705; UPI ID copied: ' + UPI_ID);
  });
}

function submitPaymentConfirmation() {
  const transactionId = document.getElementById('paymentTransactionId').value;
  const amountInput = document.getElementById('paymentAmount');
  const serviceSelect = document.getElementById('paymentService');
  const amount = amountInput.value;
  const serviceId = serviceSelect.value;
  const serviceName = getUPIServiceName(serviceId);

  if (!amount) {
    showToast('&#x26A0; Please enter the amount paid');
    return;
  }

  try { Track.event('payment_complete', { service: serviceId, amount: parseFloat(amount) || null }); } catch (e) {}

  const message = `Hello Kunaal, I have completed the payment.

&#x1F464; Name: ${AppState.assessmentData.fullName || 'Client'}
&#x1F3AF; Service: ${serviceName}
&#x1F4B0; Amount: &#x20B9;${amount}
&#x1F4CB; Transaction ID / UTR: ${transactionId || 'Not provided'}
&#x1F4F1; Phone: ${AppState.assessmentData.phone || ''}
&#x2709;&#xFE0F; Email: ${AppState.assessmentData.email || ''}

Please confirm receipt.`;

  window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message), '_blank');
}

// ============================================
// SERVICE MODAL
// ============================================
function openServiceModal(serviceKey) {
  const service = AppState.services[serviceKey];
  if (!service) return;

  AppState.selectedService = serviceKey;
  try { Track.event('service_view', { service: serviceKey }); } catch (e) {}

  document.getElementById('modalTitle').innerHTML = `${service.icon} ${service.title}`;
  document.getElementById('modalBody').innerHTML = `
    <h4>&#x1F464; Who It Is For</h4>
    <p>${service.who}</p>
    <h4>&#x2705; What It Includes</h4>
    <ul>${service.includes.map(i => `<li>${i}</li>`).join('')}</ul>
    <h4>&#x2699;&#xFE0F; How It Works</h4>
    <p>${service.how}</p>
    <h4>&#x1F31F; What You Can Expect</h4>
    <p>${service.expect}</p>
    <h4>&#x1F4C5; Consultation Process</h4>
    <p>${service.process}</p>
  `;

  document.getElementById('serviceModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeServiceModal() {
  document.getElementById('serviceModal').classList.remove('active');
  document.body.style.overflow = '';
}

function openPrivacyModal() {
  const modal = document.getElementById('privacyModal');
  if (modal) modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePrivacyModal() {
  const modal = document.getElementById('privacyModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

function selectService(serviceKey) {
  openBookNow(serviceKey);
}

// ============================================
// BOOK NOW (short, service-specific booking form)
// ============================================
let BookNowState = { service: '', idempotencyKey: null, submitting: false };

const BOOK_NOW_SERVICE_ORDER = ['personal-training', 'online-training', 'diet-consultation', 'contest-prep', 'transformation', 'hypnotherapy', 'lifestyle'];

function bookNowFieldGroup(serviceKey) {
  if (serviceKey === 'diet-consultation') return 'diet';
  if (serviceKey === 'hypnotherapy') return 'hypno';
  if (serviceKey === 'lifestyle') return 'lifestyle';
  if (['personal-training', 'online-training', 'contest-prep', 'transformation'].includes(serviceKey)) return 'training';
  return 'generic';
}

function openBookNow(serviceKey) {
  BookNowState.service = serviceKey || '';
  BookNowState.idempotencyKey = Track.uuid();
  try { Track.event('form_start', { formType: 'book_now', service: serviceKey || null }); } catch (e) {}
  renderBookNowForm();
  const modal = document.getElementById('bookNowModal');
  if (modal) modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeBookNowModal() {
  const modal = document.getElementById('bookNowModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

function renderBookNowServiceFields(serviceKey) {
  const group = bookNowFieldGroup(serviceKey);
  if (group === 'training') {
    return `
      <div class="form-group">
        <label>Primary Goal</label>
        <select id="bnGoal">
          <option value="">Select...</option>
          <option value="Lose Fat">Lose Fat</option>
          <option value="Build Muscle">Build Muscle</option>
          <option value="Recomposition">Recomposition (lose fat + build muscle)</option>
          <option value="Get Stage Ready">Get Stage Ready</option>
          <option value="Improve Athletic Performance">Improve Athletic Performance</option>
          <option value="Not Sure Yet">Not Sure Yet</option>
        </select>
      </div>
      <div class="form-group">
        <label>Training Experience</label>
        <select id="bnExperience">
          <option value="">Select...</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>
      <div class="form-group">
        <label>Any injuries or health conditions we should know about?</label>
        <textarea id="bnHealthNote" placeholder="Optional"></textarea>
      </div>`;
  }
  if (group === 'diet') {
    return `
      <div class="form-group">
        <label>Diet Preference</label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="bnDiet" value="Vegetarian"><span>&#x1F331; Vegetarian</span></label>
          <label class="radio-item"><input type="radio" name="bnDiet" value="Vegan"><span>&#x1F343; Vegan</span></label>
          <label class="radio-item"><input type="radio" name="bnDiet" value="Eggetarian"><span>&#x1F373; Eggetarian</span></label>
          <label class="radio-item"><input type="radio" name="bnDiet" value="Non-Vegetarian"><span>&#x1F356; Non-Vegetarian</span></label>
        </div>
      </div>
      <div class="form-group">
        <label>Any allergies or food restrictions?</label>
        <textarea id="bnDietNote" placeholder="Optional"></textarea>
      </div>`;
  }
  if (group === 'hypno') {
    return `
      <div class="form-group">
        <label>What would you like to work on? *</label>
        <textarea id="bnHypnoNote" placeholder="A short description is fine"></textarea>
      </div>
      <div class="checkbox-group">
        <label class="checkbox-item"><input type="checkbox" id="bnHypnoConsent"><span>I understand that hypnotherapy is not a substitute for emergency medical or psychiatric care.</span></label>
      </div>`;
  }
  if (group === 'lifestyle') {
    return `
      <div class="form-group">
        <label>What are you looking for?</label>
        <textarea id="bnLifestyleNote" placeholder="Tell us a bit about what you have in mind"></textarea>
      </div>`;
  }
  return '<p style="color: var(--text-secondary); font-size: 0.9rem;">Select a service above to continue.</p>';
}

function renderBookNowForm() {
  const svc = BookNowState.service;
  const serviceOptions = BOOK_NOW_SERVICE_ORDER.map(key => {
    const s = AppState.services[key];
    const sel = key === svc ? ' selected' : '';
    return `<option value="${key}"${sel}>${s.title}</option>`;
  }).join('');

  const html = `
    <div class="form-group">
      <label>Which service are you interested in? *</label>
      <select id="bnService" onchange="onBookNowServiceChange()">
        <option value="">Select a service...</option>
        ${serviceOptions}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Full Name *</label>
        <input type="text" id="bnName" placeholder="Your name">
      </div>
      <div class="form-group">
        <label>Phone *</label>
        <input type="tel" id="bnPhone" placeholder="Your phone number">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="bnEmail" placeholder="you@example.com">
      </div>
      <div class="form-group">
        <label>City</label>
        <input type="text" id="bnCity" placeholder="Your city">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Preferred Date</label>
        <input type="date" id="bnDate">
      </div>
      <div class="form-group">
        <label>Preferred Time</label>
        <input type="time" id="bnTime">
      </div>
    </div>
    <div class="form-group">
      <label>Mode</label>
      <div class="radio-group">
        <label class="radio-item"><input type="radio" name="bnMode" value="In Person"><span>&#x1F3E0; In Person</span></label>
        <label class="radio-item"><input type="radio" name="bnMode" value="Online"><span>&#x1F4BB; Online</span></label>
        <label class="radio-item"><input type="radio" name="bnMode" value="Either"><span>&#x1F504; Either</span></label>
      </div>
    </div>
    <div id="bnServiceFields">${renderBookNowServiceFields(svc)}</div>
  `;
  const body = document.getElementById('bookNowBody');
  if (body) body.innerHTML = html;
  initCheckboxRadios();
}

function onBookNowServiceChange() {
  const select = document.getElementById('bnService');
  BookNowState.service = select ? select.value : '';
  const fields = document.getElementById('bnServiceFields');
  if (fields) fields.innerHTML = renderBookNowServiceFields(BookNowState.service);
  initCheckboxRadios();
}

function validateBookNow() {
  const serviceEl = document.getElementById('bnService');
  const nameEl = document.getElementById('bnName');
  const phoneEl = document.getElementById('bnPhone');
  const service = serviceEl ? serviceEl.value : '';
  const name = nameEl ? nameEl.value.trim() : '';
  const phone = phoneEl ? phoneEl.value.trim() : '';

  if (!service) { showToast('&#x26A0; Please select a service'); return false; }
  if (!name) { showToast('&#x26A0; Please enter your name'); return false; }
  if (!phone) { showToast('&#x26A0; Please enter your phone number'); return false; }

  if (bookNowFieldGroup(service) === 'hypno') {
    const noteEl = document.getElementById('bnHypnoNote');
    const consentEl = document.getElementById('bnHypnoConsent');
    if (!noteEl || !noteEl.value.trim()) { showToast('&#x26A0; Please tell us what you would like to work on'); return false; }
    if (!consentEl || !consentEl.checked) { showToast('&#x26A0; Please confirm the consent checkbox'); return false; }
  }
  return true;
}

function submitBookNow() {
  try {
    if (BookNowState.submitting) return; // guards against double-click / double-submit
    if (!validateBookNow()) return;

    BookNowState.submitting = true;
    const submitBtn = document.querySelector('#bookNowModal .btn-primary');
    if (submitBtn) submitBtn.disabled = true;

    const svcKey = document.getElementById('bnService').value;
    const service = AppState.services[svcKey];
    const mode = document.querySelector('input[name="bnMode"]:checked');
    const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

    const name = val('bnName');
    const phone = val('bnPhone');
    const email = val('bnEmail');
    const city = val('bnCity');
    const date = val('bnDate');
    const time = val('bnTime');

    let extra = '';
    let extraGoal = '', extraNotes = '';
    const group = bookNowFieldGroup(svcKey);
    if (group === 'training') {
      const goal = val('bnGoal');
      const exp = val('bnExperience');
      const health = val('bnHealthNote');
      extra = `\n&#x1F3AF; Goal: ${goal}\n&#x1F4AA; Experience: ${exp}` + (health ? `\n&#x26A0; Health Note: ${health}` : '');
      extraGoal = goal; extraNotes = [exp, health].filter(Boolean).join(' | ');
    } else if (group === 'diet') {
      const diet = document.querySelector('input[name="bnDiet"]:checked');
      const note = val('bnDietNote');
      extra = `\n&#x1F957; Diet Preference: ${diet ? diet.value : ''}` + (note ? `\n&#x26A0; Allergies/Restrictions: ${note}` : '');
      extraGoal = diet ? diet.value : ''; extraNotes = note;
    } else if (group === 'hypno') {
      const note = val('bnHypnoNote');
      extra = `\n&#x1F9E0; What they want to work on: ${note}`;
      extraNotes = note;
    } else if (group === 'lifestyle') {
      const note = val('bnLifestyleNote');
      extra = note ? `\n&#x1F4AD; Notes: ${note}` : '';
      extraNotes = note;
    }

    // This is the exact message the client sends today. It is ALWAYS the
    // fallback, unchanged, so the booking flow never depends on the
    // backend being deployed or reachable.
    const fallbackMessage = `Hello Kunaal, I would like to book a session.

&#x1F4CC; Service: ${service ? service.title : svcKey}
&#x1F464; Name: ${name}
&#x1F4F1; Phone: ${phone}
&#x2709;&#xFE0F; Email: ${email}
&#x1F3D8;&#xFE0F; City: ${city}
&#x1F4C5; Preferred Date: ${date}
&#x23F0; Preferred Time: ${time}
&#x1F504; Mode: ${mode ? mode.value : ''}${extra}

I would like to know the next steps.`;
    const fallbackLink = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(fallbackMessage);

    try { Track.event('booking_start', { service: svcKey }); } catch (e) {}

    const openWhatsApp = (link) => {
      closeBookNowModal();
      showToast('&#x2705; Opening WhatsApp...');
      setTimeout(() => window.open(link, '_blank'), 400);
      BookNowState.submitting = false;
      if (submitBtn) submitBtn.disabled = false;
    };

    // Try the enhanced server-side flow (booking ID, live lead score,
    // richer owner notification) with a short timeout. If the backend
    // is slow, unreachable, or simply not deployed yet, fall back to
    // the proven client-only message above — booking must never wait
    // on or depend on this succeeding.
    const backendAttempt = Track.booking({
      idempotencyKey: BookNowState.idempotencyKey,
      name, phone, email, city, date, time, mode: mode ? mode.value : '',
      service: svcKey, goal: extraGoal, notes: extraNotes,
    });
    const timeout = new Promise((resolve) => setTimeout(() => resolve({ ok: false, timedOut: true }), 2000));

    Promise.race([backendAttempt, timeout]).then((result) => {
      try { Track.event('form_complete', { formType: 'book_now', service: svcKey }); } catch (e) {}
      if (result && result.ok && result.whatsappUrl) {
        try { Track.event('booking_complete', { service: svcKey }); } catch (e) {}
        openWhatsApp(result.whatsappUrl);
      } else {
        openWhatsApp(fallbackLink);
      }
    }).catch(() => {
      openWhatsApp(fallbackLink);
    });
  } catch (err) {
    console.error('submitBookNow() failed', err);
    showToast('&#x26A0; Something went wrong. Please message us directly on WhatsApp.');
    BookNowState.submitting = false;
    const submitBtn = document.querySelector('#bookNowModal .btn-primary');
    if (submitBtn) submitBtn.disabled = false;
  }
}

// Close Book Now modal on overlay click
document.getElementById('bookNowModal') && document.getElementById('bookNowModal').addEventListener('click', function(e) {
  if (e.target === this) closeBookNowModal();
});

// Close modal on overlay click
document.getElementById('serviceModal').addEventListener('click', function(e) {
  if (e.target === this) closeServiceModal();
});

// Close Privacy modal on overlay click
document.getElementById('privacyModal') && document.getElementById('privacyModal').addEventListener('click', function(e) {
  if (e.target === this) closePrivacyModal();
});

// ============================================
// CHECKBOX / RADIO STYLING
// ============================================
function initCheckboxRadios() {
  document.querySelectorAll('.checkbox-item, .radio-item').forEach(item => {
    const input = item.querySelector('input');
    if (input) {
      input.addEventListener('change', () => {
        try {
          if (input.type === 'checkbox') {
            item.classList.toggle('selected', input.checked);
          } else {
            document.querySelectorAll(`input[name="${input.name}"]`).forEach(r => {
              const wrapper = r.closest('.radio-item');
              if (wrapper) wrapper.classList.toggle('selected', r === input);
            });
          }
        } catch (err) {
          console.error('checkbox/radio handler failed', err);
        }
      });
    }
  });
}

// ============================================
// DATE INPUT
// ============================================
function initDateInput() {
  const dateInput = document.getElementById('preferredDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }
}

// ============================================
// SCROLL ANIMATIONS
// ============================================
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in-up');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.card, .expertise-card, .credibility-card, .method-stage, .about-content p, .resource-card').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.innerHTML = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ============================================
// CALCULATORS (BMI, BMR/TDEE, Macros)
// ============================================
function switchCalcTab(tab) {
  document.querySelectorAll('.calc-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.calc-panel').forEach(p => p.classList.toggle('active', p.id === 'calcPanel-' + tab));
}

function toggleCalcHipField() {
  const gender = document.getElementById('calcGender').value;
  const hipGroup = document.getElementById('calcHipGroup');
  if (hipGroup) hipGroup.style.display = gender === 'female' ? 'block' : 'none';
}

function getCalcInputs() {
  const weight = parseFloat(document.getElementById('calcWeight').value);
  const height = parseFloat(document.getElementById('calcHeight').value);
  const age = parseFloat(document.getElementById('calcAge').value);
  const gender = document.getElementById('calcGender').value;
  return { weight, height, age, gender };
}

function calcBMR(weight, height, age, gender) {
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  bmr += (gender === 'male') ? 5 : -161;
  return bmr;
}

function calculateBMI() {
  try {
    const { weight, height } = getCalcInputs();
    const resultEl = document.getElementById('bmiResult');
    if (!weight || !height || weight <= 0 || height <= 0) {
      resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please enter a valid weight and height above.</p>';
      return;
    }
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    try { Track.event('calculator_used', { calculator: 'bmi' }); } catch (e) {}
    let category, color;
    if (bmi < 18.5) { category = 'Underweight'; color = '#ffb23e'; }
    else if (bmi < 25) { category = 'Normal'; color = '#00d4aa'; }
    else if (bmi < 30) { category = 'Overweight'; color = '#ffb23e'; }
    else { category = 'Obese'; color = '#ff3ec8'; }

    resultEl.innerHTML = `
      <div class="calc-result-value" style="color:${color};">${bmi.toFixed(1)}</div>
      <div class="calc-result-label">${category}</div>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:8px;">BMI is a general screening tool and does not account for muscle mass or individual body composition.</p>
    `;
  } catch (err) {
    console.error('calculateBMI() failed', err);
    showToast('&#x26A0; Something went wrong calculating BMI.');
  }
}

function calculateBMR() {
  try {
    const { weight, height, age, gender } = getCalcInputs();
    const resultEl = document.getElementById('bmrResult');
    if (!weight || !height || !age || weight <= 0 || height <= 0 || age <= 0) {
      resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please fill in weight, height, and age above.</p>';
      return;
    }
    const activity = parseFloat(document.getElementById('calcActivity').value);
    const bmr = calcBMR(weight, height, age, gender);
    const tdee = bmr * activity;
    try { Track.event('calculator_used', { calculator: 'bmr' }); } catch (e) {}

    resultEl.innerHTML = `
      <div class="calc-result-row"><span>BMR (Base Metabolic Rate)</span><strong>${Math.round(bmr)} kcal/day</strong></div>
      <div class="calc-result-row"><span>TDEE (Total Daily Energy Expenditure)</span><strong>${Math.round(tdee)} kcal/day</strong></div>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:8px;">TDEE is roughly how many calories you burn per day at your current activity level. Estimate only &#x2014; individual metabolism varies.</p>
    `;
  } catch (err) {
    console.error('calculateBMR() failed', err);
    showToast('&#x26A0; Something went wrong calculating BMR.');
  }
}

function calculateMacros() {
  try {
    const { weight, height, age, gender } = getCalcInputs();
    const resultEl = document.getElementById('macroResult');
    if (!weight || !height || !age || weight <= 0 || height <= 0 || age <= 0) {
      resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please fill in weight, height, and age above.</p>';
      return;
    }
    const activity = parseFloat(document.getElementById('calcActivityMacro').value);
    const goalEl = document.querySelector('input[name="calcGoal"]:checked');
    const goal = goalEl ? goalEl.value : 'maintain';

    const bmr = calcBMR(weight, height, age, gender);
    const tdee = bmr * activity;
    try { Track.event('calculator_used', { calculator: 'macros' }); } catch (e) {}
    if (goal === 'cut') { targetCalories = tdee - 500; proteinPerKg = 2.2; fatPct = 0.25; }
    else if (goal === 'bulk') { targetCalories = tdee + 350; proteinPerKg = 1.8; fatPct = 0.25; }
    else { targetCalories = tdee; proteinPerKg = 2.0; fatPct = 0.28; }
    targetCalories = Math.max(targetCalories, 1200);

    const proteinG = weight * proteinPerKg;
    const proteinCal = proteinG * 4;
    const fatCal = targetCalories * fatPct;
    const fatG = fatCal / 9;
    const carbCal = Math.max(targetCalories - proteinCal - fatCal, 0);
    const carbG = carbCal / 4;

    const goalLabel = { cut: 'Fat Loss', maintain: 'Maintenance', bulk: 'Muscle Gain' }[goal];

    resultEl.innerHTML = `
      <div class="calc-result-value">${Math.round(targetCalories)} kcal/day</div>
      <div class="calc-result-label">${goalLabel} Target</div>
      <div class="calc-macro-grid">
        <div class="calc-macro-item"><span>&#x1F357; Protein</span><strong>${Math.round(proteinG)}g</strong></div>
        <div class="calc-macro-item"><span>&#x1F35E; Carbs</span><strong>${Math.round(carbG)}g</strong></div>
        <div class="calc-macro-item"><span>&#x1F951; Fat</span><strong>${Math.round(fatG)}g</strong></div>
      </div>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:12px;">A solid starting point &#x2014; individual needs vary. For a plan tailored to you, book a diet consultation.</p>
    `;
  } catch (err) {
    console.error('calculateMacros() failed', err);
    showToast('&#x26A0; Something went wrong calculating macros.');
  }
}

function calculateLBM() {
  try {
    const { weight } = getCalcInputs();
    const resultEl = document.getElementById('lbmResult');
    const bf = parseFloat(document.getElementById('calcBfPercent').value);
    if (!weight || weight <= 0) { resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please fill in weight above.</p>'; return; }
    if (!bf || bf <= 0 || bf >= 70) { resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please enter a body fat % (try the Body Fat % tab first if you don\'t know it).</p>'; return; }
    try { Track.event('calculator_used', { calculator: 'lbm' }); } catch (e) {}
    const fatMass = weight * (bf / 100);
    const lbm = weight - fatMass;
    resultEl.innerHTML = `
      <div class="calc-result-value">${lbm.toFixed(1)} kg</div>
      <div class="calc-result-label">Estimated Lean Body Mass</div>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:12px;">Fat mass: ~${fatMass.toFixed(1)} kg. An estimate based on the body fat % you entered.</p>
    `;
  } catch (err) { console.error('calculateLBM() failed', err); showToast('&#x26A0; Something went wrong.'); }
}

function calculateBodyFat() {
  try {
    const { height, gender } = getCalcInputs();
    const resultEl = document.getElementById('bodyfatResult');
    const neck = parseFloat(document.getElementById('calcNeck').value);
    const waist = parseFloat(document.getElementById('calcWaist').value);
    const hip = parseFloat(document.getElementById('calcHip').value);
    if (!height || height <= 0 || !neck || neck <= 0 || !waist || waist <= 0) {
      resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please fill in height (above) plus neck and waist measurements.</p>'; return;
    }
    if (gender === 'female' && (!hip || hip <= 0)) {
      resultEl.innerHTML = '<p class="calc-error">&#x26A0; Hip measurement is required for the female estimate.</p>'; return;
    }
    if (gender === 'male' && waist <= neck) {
      resultEl.innerHTML = '<p class="calc-error">&#x26A0; Waist measurement should be larger than neck for this formula to work.</p>'; return;
    }
    try { Track.event('calculator_used', { calculator: 'bodyfat' }); } catch (e) {}

    let bf;
    if (gender === 'female') {
      bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
    } else {
      bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    }
    bf = Math.max(2, Math.min(bf, 60));

    resultEl.innerHTML = `
      <div class="calc-result-value">${bf.toFixed(1)}%</div>
      <div class="calc-result-label">Estimated Body Fat (U.S. Navy method)</div>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:12px;">An estimate from body measurements, not a scan &#x2014; use it as a rough guide, not a precise number.</p>
    `;
  } catch (err) { console.error('calculateBodyFat() failed', err); showToast('&#x26A0; Something went wrong.'); }
}

function calculateIdealWeight() {
  try {
    const { height } = getCalcInputs();
    const resultEl = document.getElementById('idealweightResult');
    if (!height || height <= 0) { resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please fill in height above.</p>'; return; }
    try { Track.event('calculator_used', { calculator: 'idealweight' }); } catch (e) {}
    const h2 = (height / 100) * (height / 100);
    const minW = 18.5 * h2;
    const maxW = 24.9 * h2;
    resultEl.innerHTML = `
      <div class="calc-result-value">${minW.toFixed(1)} &#x2013; ${maxW.toFixed(1)} kg</div>
      <div class="calc-result-label">Healthy Weight Range (BMI-based)</div>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:12px;">Based on the standard healthy BMI band. Doesn't account for muscle mass &#x2014; many athletic people sit above this range in a healthy way.</p>
    `;
  } catch (err) { console.error('calculateIdealWeight() failed', err); showToast('&#x26A0; Something went wrong.'); }
}

function calculateWeightLoss() {
  try {
    const { weight, height, age, gender } = getCalcInputs();
    const resultEl = document.getElementById('weightlossResult');
    const activity = parseFloat(document.getElementById('calcActivityLoss').value);
    const goalWeight = parseFloat(document.getElementById('calcGoalWeightLoss').value);
    const paceEl = document.querySelector('input[name="calcLossPace"]:checked');
    const deficit = paceEl ? parseFloat(paceEl.value) : 500;
    if (!weight || !height || !age || weight <= 0 || height <= 0 || age <= 0) {
      resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please fill in weight, height, and age above.</p>'; return;
    }
    if (!goalWeight || goalWeight <= 0 || goalWeight >= weight) {
      resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please enter a goal weight lower than your current weight.</p>'; return;
    }
    try { Track.event('calculator_used', { calculator: 'weightloss' }); } catch (e) {}
    const bmr = calcBMR(weight, height, age, gender);
    const tdee = bmr * activity;
    const targetCal = Math.max(tdee - deficit, 1200);
    const toLose = weight - goalWeight;
    const weeklyLossKg = (deficit * 7) / 7700; // ~7700 kcal per kg of fat, a standard approximation
    const weeks = Math.ceil(toLose / weeklyLossKg);
    resultEl.innerHTML = `
      <div class="calc-result-value">${Math.round(targetCal)} kcal/day</div>
      <div class="calc-result-label">Daily Target</div>
      <div class="calc-macro-grid">
        <div class="calc-macro-item"><span>&#x1F4C9; Weekly Rate</span><strong>~${weeklyLossKg.toFixed(2)} kg</strong></div>
        <div class="calc-macro-item"><span>&#x1F4C5; Estimated Time</span><strong>~${weeks} weeks</strong></div>
      </div>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:12px;">A projection, not a guarantee &#x2014; actual results vary with adherence, training, sleep, and individual response.</p>
    `;
  } catch (err) { console.error('calculateWeightLoss() failed', err); showToast('&#x26A0; Something went wrong.'); }
}

function calculateMuscleGain() {
  try {
    const { weight, height, age, gender } = getCalcInputs();
    const resultEl = document.getElementById('musclegainResult');
    const activity = parseFloat(document.getElementById('calcActivityGain').value);
    const goalWeight = parseFloat(document.getElementById('calcGoalWeightGain').value);
    const exp = document.getElementById('calcTrainingExp').value;
    if (!weight || !height || !age || weight <= 0 || height <= 0 || age <= 0) {
      resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please fill in weight, height, and age above.</p>'; return;
    }
    if (!goalWeight || goalWeight <= weight) {
      resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please enter a goal weight higher than your current weight.</p>'; return;
    }
    try { Track.event('calculator_used', { calculator: 'musclegain' }); } catch (e) {}
    const bmr = calcBMR(weight, height, age, gender);
    const tdee = bmr * activity;
    const surplus = 300;
    const targetCal = tdee + surplus;
    const toGain = goalWeight - weight;
    // Realistic natural muscle-gain rates slow down with training age — conservative, well-established ranges.
    const monthlyRateKg = { beginner: 0.75, intermediate: 0.375, advanced: 0.15 }[exp] || 0.375;
    const months = Math.ceil(toGain / monthlyRateKg);
    resultEl.innerHTML = `
      <div class="calc-result-value">${Math.round(targetCal)} kcal/day</div>
      <div class="calc-result-label">Daily Target (moderate surplus)</div>
      <div class="calc-macro-grid">
        <div class="calc-macro-item"><span>&#x1F4C8; Monthly Rate</span><strong>~${monthlyRateKg} kg</strong></div>
        <div class="calc-macro-item"><span>&#x1F4C5; Estimated Time</span><strong>~${months} months</strong></div>
      </div>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:12px;">Natural muscle gain slows as training experience increases &#x2014; this is a general estimate, not everyone gains at the same rate.</p>
    `;
  } catch (err) { console.error('calculateMuscleGain() failed', err); showToast('&#x26A0; Something went wrong.'); }
}

function calculateContestPrep() {
  try {
    const { weight } = getCalcInputs();
    const resultEl = document.getElementById('contestprepResult');
    const weeks = parseFloat(document.getElementById('calcPrepWeeks').value);
    const loss = parseFloat(document.getElementById('calcPrepLoss').value);
    if (!weight || weight <= 0 || !weeks || weeks <= 0 || !loss || loss <= 0) {
      resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please fill in weight above, plus weeks until show and target weight loss.</p>'; return;
    }
    try { Track.event('calculator_used', { calculator: 'contestprep' }); } catch (e) {}
    const weeklyLossKg = loss / weeks;
    const dailyDeficit = Math.round((weeklyLossKg * 7700) / 7);
    const pctPerWeek = (weeklyLossKg / weight) * 100;
    const safe = pctPerWeek <= 1.0;
    resultEl.innerHTML = `
      <div class="calc-result-value">${weeklyLossKg.toFixed(2)} kg/week</div>
      <div class="calc-result-label">Required Weekly Rate</div>
      <div class="calc-macro-grid">
        <div class="calc-macro-item"><span>&#x1F525; Daily Deficit</span><strong>~${dailyDeficit} kcal</strong></div>
        <div class="calc-macro-item"><span>&#x1F4CA; % of Bodyweight/wk</span><strong>${pctPerWeek.toFixed(2)}%</strong></div>
      </div>
      <p style="color:${safe ? 'var(--text-muted)' : 'var(--amber)'}; font-size:0.85rem; margin-top:12px;">${safe ? 'This rate is within a generally sustainable range.' : '&#x26A0; This rate is faster than the commonly recommended ~1%/week — consider a longer prep or working with a coach to manage this safely.'}</p>
    `;
  } catch (err) { console.error('calculateContestPrep() failed', err); showToast('&#x26A0; Something went wrong.'); }
}

function calculateCarbCycle() {
  try {
    const { weight, height, age, gender } = getCalcInputs();
    const resultEl = document.getElementById('carbcycleResult');
    const activity = parseFloat(document.getElementById('calcActivityCarb').value);
    if (!weight || !height || !age || weight <= 0 || height <= 0 || age <= 0) {
      resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please fill in weight, height, and age above.</p>'; return;
    }
    try { Track.event('calculator_used', { calculator: 'carbcycle' }); } catch (e) {}
    const bmr = calcBMR(weight, height, age, gender);
    const tdee = bmr * activity;
    const protein = weight * 2.0;
    const proteinCal = protein * 4;

    const highCal = tdee;
    const highFatCal = highCal * 0.22;
    const highFatG = highFatCal / 9;
    const highCarbG = Math.max(highCal - proteinCal - highFatCal, 0) / 4;

    const lowCal = tdee - 500;
    const lowFatCal = lowCal * 0.30;
    const lowFatG = lowFatCal / 9;
    const lowCarbG = Math.max(lowCal - proteinCal - lowFatCal, 0) / 4;

    resultEl.innerHTML = `
      <div class="calc-result-label">High Carb Day (~${Math.round(highCal)} kcal)</div>
      <div class="calc-macro-grid">
        <div class="calc-macro-item"><span>&#x1F357; Protein</span><strong>${Math.round(protein)}g</strong></div>
        <div class="calc-macro-item"><span>&#x1F35E; Carbs</span><strong>${Math.round(highCarbG)}g</strong></div>
        <div class="calc-macro-item"><span>&#x1F951; Fat</span><strong>${Math.round(highFatG)}g</strong></div>
      </div>
      <div class="calc-result-label" style="margin-top:16px;">Low Carb Day (~${Math.round(lowCal)} kcal)</div>
      <div class="calc-macro-grid">
        <div class="calc-macro-item"><span>&#x1F357; Protein</span><strong>${Math.round(protein)}g</strong></div>
        <div class="calc-macro-item"><span>&#x1F35E; Carbs</span><strong>${Math.round(lowCarbG)}g</strong></div>
        <div class="calc-macro-item"><span>&#x1F951; Fat</span><strong>${Math.round(lowFatG)}g</strong></div>
      </div>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:12px;">A simple two-tier split. Protein stays constant; carbs and fat shift between higher and lower activity days.</p>
    `;
  } catch (err) { console.error('calculateCarbCycle() failed', err); showToast('&#x26A0; Something went wrong.'); }
}

function calculateRefeed() {
  try {
    const { weight, height, age, gender } = getCalcInputs();
    const resultEl = document.getElementById('refeedResult');
    const activity = parseFloat(document.getElementById('calcActivityRefeed').value);
    if (!weight || !height || !age || weight <= 0 || height <= 0 || age <= 0) {
      resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please fill in weight, height, and age above.</p>'; return;
    }
    try { Track.event('calculator_used', { calculator: 'refeed' }); } catch (e) {}
    const bmr = calcBMR(weight, height, age, gender);
    const tdee = bmr * activity;
    const refeedCal = tdee * 1.05;
    const protein = weight * 1.8;
    const proteinCal = protein * 4;
    const fatCal = refeedCal * 0.18;
    const fatG = fatCal / 9;
    const carbG = Math.max(refeedCal - proteinCal - fatCal, 0) / 4;
    resultEl.innerHTML = `
      <div class="calc-result-value">${Math.round(refeedCal)} kcal</div>
      <div class="calc-result-label">Refeed Day Target</div>
      <div class="calc-macro-grid">
        <div class="calc-macro-item"><span>&#x1F357; Protein</span><strong>${Math.round(protein)}g</strong></div>
        <div class="calc-macro-item"><span>&#x1F35E; Carbs</span><strong>${Math.round(carbG)}g</strong></div>
        <div class="calc-macro-item"><span>&#x1F951; Fat</span><strong>${Math.round(fatG)}g</strong></div>
      </div>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:12px;">Carb-heavy, at or slightly above maintenance &#x2014; used occasionally during a longer fat-loss phase, not every day.</p>
    `;
  } catch (err) { console.error('calculateRefeed() failed', err); showToast('&#x26A0; Something went wrong.'); }
}

function calculateProtein() {
  try {
    const { weight } = getCalcInputs();
    const resultEl = document.getElementById('proteinResult');
    if (!weight || weight <= 0) { resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please fill in weight above.</p>'; return; }
    const goalEl = document.querySelector('input[name="calcProteinGoal"]:checked');
    const goal = goalEl ? goalEl.value : 'maintain';
    try { Track.event('calculator_used', { calculator: 'protein' }); } catch (e) {}
    const perKg = { cut: 2.2, maintain: 1.8, bulk: 1.8 }[goal];
    const proteinG = weight * perKg;
    resultEl.innerHTML = `
      <div class="calc-result-value">${Math.round(proteinG)}g / day</div>
      <div class="calc-result-label">Daily Protein Target (${perKg}g/kg)</div>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:12px;">Spread across 3-5 meals for best results. A useful default &#x2014; individual needs vary.</p>
    `;
  } catch (err) { console.error('calculateProtein() failed', err); showToast('&#x26A0; Something went wrong.'); }
}

function calculateWater() {
  try {
    const { weight } = getCalcInputs();
    const resultEl = document.getElementById('waterResult');
    if (!weight || weight <= 0) { resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please fill in weight above.</p>'; return; }
    const activity = parseFloat(document.getElementById('calcActivityWater').value);
    try { Track.event('calculator_used', { calculator: 'water' }); } catch (e) {}
    const baseMl = weight * 35;
    const activityBonusMl = (activity - 1.2) * 800; // scales up with activity level selected
    const totalLiters = (baseMl + Math.max(activityBonusMl, 0)) / 1000;
    resultEl.innerHTML = `
      <div class="calc-result-value">${totalLiters.toFixed(1)} L / day</div>
      <div class="calc-result-label">Estimated Water Target</div>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:12px;">A general guide &#x2014; increase further in hot weather or with heavy sweating.</p>
    `;
  } catch (err) { console.error('calculateWater() failed', err); showToast('&#x26A0; Something went wrong.'); }
}

function calculateMealDistribution() {
  try {
    const { weight, height, age, gender } = getCalcInputs();
    const resultEl = document.getElementById('mealdistResult');
    const meals = parseInt(document.getElementById('calcMealCount').value, 10);
    if (!meals || meals <= 0 || meals > 10) { resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please enter a number of meals between 1 and 10.</p>'; return; }
    if (!weight || !height || !age || weight <= 0 || height <= 0 || age <= 0) {
      resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please fill in weight, height, and age above.</p>'; return;
    }
    try { Track.event('calculator_used', { calculator: 'mealdist' }); } catch (e) {}
    const bmr = calcBMR(weight, height, age, gender);
    const tdee = bmr * 1.55; // moderate-activity maintenance as the base reference
    const protein = weight * 2.0;
    const proteinCal = protein * 4;
    const fatCal = tdee * 0.28;
    const fatG = fatCal / 9;
    const carbG = Math.max(tdee - proteinCal - fatCal, 0) / 4;

    resultEl.innerHTML = `
      <div class="calc-result-label">Per Meal (&#xF7; ${meals})</div>
      <div class="calc-macro-grid">
        <div class="calc-macro-item"><span>&#x1F525; Calories</span><strong>${Math.round(tdee / meals)}</strong></div>
        <div class="calc-macro-item"><span>&#x1F357; Protein</span><strong>${Math.round(protein / meals)}g</strong></div>
        <div class="calc-macro-item"><span>&#x1F35E; Carbs</span><strong>${Math.round(carbG / meals)}g</strong></div>
        <div class="calc-macro-item"><span>&#x1F951; Fat</span><strong>${Math.round(fatG / meals)}g</strong></div>
      </div>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:12px;">Based on a moderate-activity maintenance estimate, split evenly. Adjust portions around training if useful.</p>
    `;
  } catch (err) { console.error('calculateMealDistribution() failed', err); showToast('&#x26A0; Something went wrong.'); }
}

function calculateTrainingVolume() {
  try {
    const resultEl = document.getElementById('trainingvolumeResult');
    const days = parseInt(document.getElementById('calcTrainingDays').value, 10);
    const target = document.getElementById('calcVolumeTarget').value;
    if (!days || days <= 0 || days > 7) { resultEl.innerHTML = '<p class="calc-error">&#x26A0; Please enter training days between 1 and 7.</p>'; return; }
    try { Track.event('calculator_used', { calculator: 'trainingvolume' }); } catch (e) {}
    // Established general weekly working-set landmarks per major muscle group.
    const landmarks = {
      mev: { major: '10-12', minor: '6-8' },
      optimal: { major: '14-20', minor: '10-14' },
      high: { major: '20-25', minor: '14-18' },
    }[target];
    const perSession = Math.ceil(16 / days);
    resultEl.innerHTML = `
      <div class="calc-result-value">${landmarks.major} sets/week</div>
      <div class="calc-result-label">Per Major Muscle Group (chest, back, quads, etc.)</div>
      <div class="calc-macro-grid">
        <div class="calc-macro-item"><span>Smaller Muscles</span><strong>${landmarks.minor} sets/wk</strong></div>
        <div class="calc-macro-item"><span>Rough Sets/Session</span><strong>~${perSession}</strong></div>
      </div>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:12px;">General research-informed ranges, not a personalized program &#x2014; actual volume should account for recovery, experience, and how each muscle group responds for you.</p>
    `;
  } catch (err) { console.error('calculateTrainingVolume() failed', err); showToast('&#x26A0; Something went wrong.'); }
}

// ============================================
// KEYBOARD NAVIGATION
// ============================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeServiceModal();
    closeMobileMenu();
  }
});

// ============================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href !== '#') {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
});
