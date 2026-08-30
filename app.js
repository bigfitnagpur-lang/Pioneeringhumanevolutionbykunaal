// ============================================
// PIONEERING HUMAN EVOLUTION — React SPA (Compiled)
// app.js — Core Application Logic
// Zero build step. Edit directly.
// ============================================

const e = React.createElement;
const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;

// ============================================
// CONSTANTS
// ============================================
const BRAND_NAME = "PIONEERING HUMAN EVOLUTION";
const BRAND_SHORT = "PHE";
const TAGLINE = "Train the body. Rewire the mind. Build a better human system.";
const COACH_NAME = "Kunaal";
const WHATSAPP_NUMBER = "919011101654";
const EMAIL = "kunaalextraedge@gmail.com";
const INSTAGRAM_HANDLE = "@kunaal_thechamp";
const INSTAGRAM_URL = "https://www.instagram.com/kunaal_thechamp";
const UPI_ID = "kunal.wachanekar-4@okicici";
const PAYEE_NAME = "Kunaal Wachanekar";

const C = {
  bg: "#0a0a0f", surface: "#111118", card: "#14141c", border: "rgba(255,255,255,0.06)",
  accent: "#00d4aa", accentDim: "rgba(0,212,170,0.15)",
  white: "#f0f0f5", dim: "#a0a0b0", faint: "#6b6b7b",
  amber: "#ffb23e", magenta: "#ff3ec8", violet: "#b98bff", gold: "#ffd23e", lime: "#39ff88"
};

const SERVICE_COLOR = {
  "physique": C.amber, "strength": C.accent, "contest": C.gold,
  "nutrition": C.lime, "hypnotherapy": C.violet, "performance": C.magenta
};

const SERVICE_EMOJI = {
  "physique": "🏋️", "strength": "⚡", "contest": "🏆",
  "nutrition": "🥗", "hypnotherapy": "🧠", "performance": "🧬"
};

const SERVICES = [
  {
    id: "physique",
    name: "Physique Transformation",
    tagline: "Body composition, hypertrophy, strength and aesthetic development.",
    bullets: [
      "Comprehensive body composition analysis",
      "Customized resistance training program",
      "Progressive overload strategies",
      "Pose and presentation guidance",
      "Weekly check-ins and adjustments",
      "Photo and measurement tracking"
    ],
    cta: "Book Physique Transformation",
    who: "Individuals seeking significant changes in body composition, muscle development, and aesthetic physique. Suitable for beginners to advanced trainees.",
    how: "Begins with a detailed assessment of your current physique, training history, and goals. A periodized program is designed specifically for your body type and objectives.",
    expect: "Measurable changes in body composition, improved muscle definition, increased strength, and enhanced confidence in your physical appearance.",
    process: "Initial consultation (60 min) → Assessment → Program design → Weekly check-ins → Monthly reviews → Continuous refinement"
  },
  {
    id: "strength",
    name: "Strength & Conditioning",
    tagline: "Structured training for strength, conditioning, movement and performance.",
    bullets: [
      "Strength-focused periodization",
      "Power and explosiveness training",
      "Movement pattern optimization",
      "Mobility and flexibility work",
      "Recovery protocols",
      "Performance metrics tracking"
    ],
    cta: "Book Strength Training",
    who: "Athletes, fitness enthusiasts, and individuals looking to build functional strength, power, and overall athletic performance.",
    how: "Assessment of current strength levels, movement patterns, and athletic goals. Program designed around compound movements and progressive overload.",
    expect: "Significant increases in strength metrics, improved movement quality, enhanced athletic capability, and reduced injury risk.",
    process: "Movement screening → Strength assessment → Program design → Technique coaching → Progressive loading → Performance review"
  },
  {
    id: "contest",
    name: "Contest Preparation",
    tagline: "Structured preparation for physique athletes including training, nutrition, conditioning and presentation.",
    bullets: [
      "Competition-specific training protocols",
      "Precision nutrition and meal planning",
      "Peak week strategy",
      "Posing and presentation coaching",
      "Conditioning timeline management",
      "Stage-ready physique optimization"
    ],
    cta: "Book Contest Prep",
    who: "Physique athletes preparing for bodybuilding, classic physique, or fitness competitions. Requires minimum 12-16 week commitment.",
    how: "Structured preparation timeline with reverse-engineered goals. Every week is calculated to bring you to stage in peak condition.",
    expect: "Competition-ready physique with optimal conditioning, confident stage presence, and a strategic approach to peak week.",
    process: "Initial assessment → Timeline planning → Weekly adjustments → Peak week protocol → Stage day support → Post-show guidance"
  },
  {
    id: "nutrition",
    name: "Nutrition & Lifestyle",
    tagline: "Personalized nutrition and lifestyle strategies built around goals, preferences and adherence.",
    bullets: [
      "Personalized meal planning",
      "Macro and micronutrient optimization",
      "Meal timing strategies",
      "Lifestyle integration planning",
      "Grocery and meal prep guidance",
      "Sustainable habit development"
    ],
    cta: "Book Nutrition Coaching",
    who: "Anyone looking to optimize their nutrition for health, performance, body composition, or specific lifestyle goals.",
    how: "Comprehensive nutrition assessment including current eating patterns, preferences, restrictions, and goals. Plan designed for adherence and results.",
    expect: "Improved energy levels, better body composition, enhanced recovery, and sustainable eating habits that fit your lifestyle.",
    process: "Nutrition audit → Goal setting → Meal plan design → Weekly adjustments → Habit tracking → Long-term sustainability"
  },
  {
    id: "hypnotherapy",
    name: "Hypnotherapy",
    tagline: "One-on-one sessions focused on behavioural patterns, habits, confidence, performance and personal change.",
    bullets: [
      "One-on-one hypnotherapy sessions",
      "Behavioural pattern analysis",
      "Subconscious reprogramming",
      "Confidence and performance enhancement",
      "Stress and anxiety management",
      "Habit transformation protocols"
    ],
    cta: "Book Hypnotherapy",
    who: "Individuals seeking behavioural change, habit transformation, confidence building, stress management, or performance enhancement through subconscious reprogramming.",
    how: "Uses guided hypnosis to access the subconscious mind and reprogram limiting beliefs, habits, and behaviours. Each session is tailored to your specific needs.",
    expect: "Reduced anxiety, improved confidence, transformed habits, enhanced mental performance, and lasting behavioural change.",
    process: "Initial consultation → Pattern identification → Hypnotherapy sessions → Integration exercises → Progress review → Maintenance",
    note: "Hypnotherapy is not a substitute for emergency medical or psychiatric care."
  },
  {
    id: "performance",
    name: "Human Performance",
    tagline: "An integrated approach to training, recovery, lifestyle, behaviour and performance optimization.",
    bullets: [
      "Integrated training and nutrition",
      "Recovery optimization",
      "Sleep and circadian protocols",
      "Stress management systems",
      "Cognitive performance enhancement",
      "Lifestyle architecture"
    ],
    cta: "Book Performance Coaching",
    who: "High-performers, executives, athletes, and individuals seeking comprehensive optimization of their physical and mental capabilities.",
    how: "Holistic assessment of all performance variables. A comprehensive system designed to optimize every aspect of your human potential.",
    expect: "Peak physical condition, enhanced mental clarity, optimized recovery, sustained high performance, and improved quality of life.",
    process: "Comprehensive audit → System design → Implementation → Biometric tracking → Continuous optimization → Peak maintenance"
  }
];

const GOAL_OPTIONS = [
  { label: "Lose fat", service: "physique" },
  { label: "Build muscle", service: "physique" },
  { label: "Recompose (lose fat + build muscle)", service: "physique" },
  { label: "Get stage ready", service: "contest" },
  { label: "Improve athletic performance", service: "strength" },
  { label: "Start online coaching", service: "performance" },
  { label: "Train with a coach in person", service: "strength" },
  { label: "Fix my diet / nutrition", service: "nutrition" },
  { label: "Improve mindset / behaviour", service: "hypnotherapy" },
  { label: "Hypnotherapy specifically", service: "hypnotherapy" },
  { label: "I'm not sure yet", service: "performance" }
];

// ============================================
// UTILITIES
// ============================================
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function buildSummary(service, fields) {
  const lines = [`Service: ${service.name}`, ""];
  for (const [key, value] of Object.entries(fields)) {
    if (value === "" || value === null || value === undefined) continue;
    if (key === "consent") continue;
    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
    const display = Array.isArray(value) ? value.join(", ") : String(value);
    lines.push(`${label}: ${display}`);
  }
  return lines.join("\n");
}

function openWhatsApp(text) {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=` + encodeURIComponent(text), "_blank");
}

function openEmail(subject, body) {
  window.open(`mailto:${EMAIL}?subject=` + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body), "_blank");
}

// ============================================
// COMPONENTS — Visual Effects
// ============================================

function Grain() {
  return e("div", { className: "grain-overlay" });
}

function DNAHelix() {
  const strands = [];
  const rungs = [];
  const steps = 40;
  const width = 200;
  const height = 500;
  const amplitude = 40;
  const frequency = 0.08;

  for (let i = 0; i <= steps; i++) {
    const y = (i / steps) * height;
    const phase = i * frequency * Math.PI * 2;
    const x1 = width / 2 + Math.sin(phase) * amplitude;
    const x2 = width / 2 + Math.sin(phase + Math.PI) * amplitude;

    strands.push(e("circle", {
      key: `s1-${i}`, cx: x1, cy: y, r: 2.5,
      fill: "#00d4aa", opacity: 0.6
    }));
    strands.push(e("circle", {
      key: `s2-${i}`, cx: x2, cy: y, r: 2.5,
      fill: "#00b894", opacity: 0.6
    }));

    if (i % 3 === 0 && i < steps) {
      rungs.push(e("line", {
        key: `r-${i}`, x1: x1, y1: y, x2: x2, y2: y,
        stroke: "#00d4aa", strokeWidth: 1, opacity: 0.3
      }));
    }
  }

  return e("div", { className: "dna-helix-container" },
    e("svg", {
      className: "dna-helix-svg",
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio: "xMidYMid meet"
    }, ...strands, ...rungs)
  );
}

function BodyAnatomy() {
  return e("div", { className: "body-anatomy-container" },
    e("svg", {
      className: "body-anatomy-svg",
      viewBox: "0 0 200 420",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    },
      // Head
      e("circle", { cx: "100", cy: "35", r: "22", stroke: "#00d4aa", strokeWidth: "1.5", opacity: "0.8" }),
      // Neck
      e("line", { x1: "100", y1: "57", x2: "100", y2: "75", stroke: "#00d4aa", strokeWidth: "1.5", opacity: "0.6" }),
      // Shoulders
      e("path", {
        d: "M55 85 Q75 78 100 80 Q125 78 145 85",
        stroke: "#00d4aa", strokeWidth: "1.5", opacity: "0.7", fill: "none"
      }),
      // Torso outline
      e("path", {
        d: "M55 85 L60 180 L100 195 L140 180 L145 85",
        stroke: "#00d4aa", strokeWidth: "1.5", opacity: "0.6", fill: "none"
      }),
      // Abs lines
      e("line", { x1: "100", y1: "110", x2: "100", y2: "180", stroke: "#00d4aa", strokeWidth: "1", opacity: "0.3" }),
      e("line", { x1: "75", y1: "130", x2: "125", y2: "130", stroke: "#00d4aa", strokeWidth: "1", opacity: "0.3" }),
      e("line", { x1: "72", y1: "155", x2: "128", y2: "155", stroke: "#00d4aa", strokeWidth: "1", opacity: "0.3" }),
      // Left arm
      e("path", {
        d: "M55 85 L35 140 L30 200",
        stroke: "#00d4aa", strokeWidth: "1.5", opacity: "0.6", fill: "none"
      }),
      e("path", {
        d: "M55 95 L42 145 L38 195",
        stroke: "#00d4aa", strokeWidth: "1", opacity: "0.4", fill: "none"
      }),
      // Right arm
      e("path", {
        d: "M145 85 L165 140 L170 200",
        stroke: "#00d4aa", strokeWidth: "1.5", opacity: "0.6", fill: "none"
      }),
      e("path", {
        d: "M145 95 L158 145 L162 195",
        stroke: "#00d4aa", strokeWidth: "1", opacity: "0.4", fill: "none"
      }),
      // Left leg
      e("path", {
        d: "M60 180 L55 280 L50 380 L65 410",
        stroke: "#00d4aa", strokeWidth: "1.5", opacity: "0.6", fill: "none"
      }),
      e("path", {
        d: "M75 185 L72 280 L68 380 L80 405",
        stroke: "#00d4aa", strokeWidth: "1", opacity: "0.4", fill: "none"
      }),
      // Right leg
      e("path", {
        d: "M140 180 L145 280 L150 380 L135 410",
        stroke: "#00d4aa", strokeWidth: "1.5", opacity: "0.6", fill: "none"
      }),
      e("path", {
        d: "M125 185 L128 280 L132 380 L120 405",
        stroke: "#00d4aa", strokeWidth: "1", opacity: "0.4", fill: "none"
      }),
      // Muscle detail lines
      e("path", {
        d: "M65 100 Q80 115 95 105",
        stroke: "#00d4aa", strokeWidth: "0.8", opacity: "0.4", fill: "none"
      }),
      e("path", {
        d: "M135 100 Q120 115 105 105",
        stroke: "#00d4aa", strokeWidth: "0.8", opacity: "0.4", fill: "none"
      }),
      e("path", {
        d: "M70 200 Q85 240 95 270",
        stroke: "#00d4aa", strokeWidth: "0.8", opacity: "0.3", fill: "none"
      }),
      e("path", {
        d: "M130 200 Q115 240 105 270",
        stroke: "#00d4aa", strokeWidth: "0.8", opacity: "0.3", fill: "none"
      })
    )
  );
}

function Particles() {
  const particles = [];
  const count = typeof window !== "undefined" && window.innerWidth < 768 ? 20 : 40;
  for (let i = 0; i < count; i++) {
    particles.push(e("div", {
      key: i,
      className: "hero-particle",
      style: {
        left: Math.random() * 100 + "%",
        top: Math.random() * 100 + "%",
        animationDelay: Math.random() * 6 + "s",
        animationDuration: (4 + Math.random() * 4) + "s",
        width: (2 + Math.random() * 3) + "px",
        height: (2 + Math.random() * 3) + "px"
      }
    }));
  }
  return e("div", { className: "hero-particles" }, ...particles);
}

// ============================================
// COMPONENTS — Navigation
// ============================================

function NavBar({ onNav, screen }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { label: "Home", target: "home" },
    { label: "About", target: "about" },
    { label: "Services", target: "services" },
    { label: "Method", target: "method" },
    { label: "Assessment", target: "quiz" },
    { label: "Contact", target: "contact" }
  ];

  return e("nav", { className: "nav" },
    e("div", { className: "nav-container" },
      e("a", {
        className: "nav-logo",
        onClick: () => onNav("home")
      }, "KUNAAL", e("span", null, ".")),

      e("ul", { className: "nav-links" },
        ...navItems.map(item =>
          e("li", { key: item.target },
            e("button", {
              onClick: () => onNav(item.target)
            }, item.label)
          )
        ),
        e("li", null,
          e("button", {
            className: "btn btn-primary btn-sm",
            onClick: () => onNav("quiz")
          }, "Start Assessment")
        )
      ),

      e("button", {
        className: "btn btn-primary btn-sm nav-cta",
        onClick: () => onNav("quiz")
      }, "Start Assessment"),

      e("button", {
        className: "nav-toggle",
        onClick: () => setMenuOpen(!menuOpen),
        "aria-label": "Toggle menu"
      }, e("span", null), e("span", null), e("span", null))
    ),

    e("div", { className: "mobile-menu" + (menuOpen ? " active" : "") },
      ...navItems.map(item =>
        e("button", {
          key: item.target,
          onClick: () => { setMenuOpen(false); onNav(item.target); }
        }, item.label)
      ),
      e("div", { style: { marginTop: "32px" } },
        e("button", {
          className: "btn btn-primary",
          style: { width: "100%" },
          onClick: () => { setMenuOpen(false); onNav("quiz"); }
        }, "Start Assessment")
      )
    )
  );
}

// ============================================
// COMPONENTS — Home Screen Sections
// ============================================

function HeroSection({ onNav }) {
  return e("section", { className: "hero", id: "home" },
    e("div", { className: "hero-bg" },
      e("div", { className: "hero-grid" }),
      e(Particles),
      e("div", { className: "hero-scan-line" })
    ),
    e(DNAHelix),
    e(BodyAnatomy),
    e("div", { className: "hero-content" },
      e("div", { className: "hero-label animate-fade-in-up" }, "Human Performance & Transformation"),
      e("h1", { className: "hero-title animate-fade-in-up animate-delay-1" },
        e("span", { className: "line-1" }, "PIONEERING"),
        e("span", { className: "line-2" }, "HUMAN EVOLUTION")
      ),
      e("p", { className: "hero-subtitle animate-fade-in-up animate-delay-2" },
        "\"Train the body. Rewire the mind. Build a better human system.\""
      ),
      e("p", { className: "hero-supporting animate-fade-in-up animate-delay-3" },
        "Personalized coaching across physique transformation, performance, nutrition, contest preparation, lifestyle and hypnotherapy."
      ),
      e("div", { className: "hero-ctas animate-fade-in-up animate-delay-4" },
        e("button", { className: "btn btn-primary btn-lg", onClick: () => onNav("quiz") }, "Start Your Assessment"),
        e("button", { className: "btn btn-secondary btn-lg", onClick: () => onNav("booking") }, "Book a Consultation"),
        e("a", { href: `https://wa.me/${WHATSAPP_NUMBER}`, target: "_blank", className: "btn btn-whatsapp btn-lg" }, "WhatsApp Kunaal")
      ),
      e("div", { className: "hero-stats animate-fade-in-up animate-delay-5" },
        e("div", { className: "hero-stat" }, e("div", { className: "hero-stat-number" }, "01"), e("div", { className: "hero-stat-label" }, "Assess")),
        e("div", { className: "hero-stat" }, e("div", { className: "hero-stat-number" }, "02"), e("div", { className: "hero-stat-label" }, "Engineer")),
        e("div", { className: "hero-stat" }, e("div", { className: "hero-stat-number" }, "03"), e("div", { className: "hero-stat-label" }, "Execute")),
        e("div", { className: "hero-stat" }, e("div", { className: "hero-stat-number" }, "04"), e("div", { className: "hero-stat-label" }, "Adapt")),
        e("div", { className: "hero-stat" }, e("div", { className: "hero-stat-number" }, "05"), e("div", { className: "hero-stat-label" }, "Transform"))
      )
    )
  );
}

function AboutSection() {
  return e("section", { className: "section about", id: "about" },
    e("div", { className: "container" },
      e("span", { className: "label" }, "The Mind Behind The Method"),
      e("div", { className: "about-grid" },
        e("div", { className: "about-visual" },
          e("div", { className: "about-photo-ring" }),
          e("div", { className: "about-photo-ring-2" }),
          e("div", { className: "about-photo-frame" },
            e("div", { className: "about-photo-placeholder" },
              e("div", { className: "icon" }, "📷"),
              e("p", null, "Your Photo Here"),
              e("p", { style: { fontSize: "0.75rem", marginTop: "4px" } }, "Replace with your image")
            )
          )
        ),
        e("div", { className: "about-content" },
          e("h2", null, "Kunaal Wachanekar"),
          e("span", { className: "role" }, "Human Performance & Transformation Coach"),
          e("p", null, "Kunaal Wachanekar is a human performance and transformation coach working at the intersection of physique development, strength and conditioning, nutrition, lifestyle optimization and behavioural change."),
          e("p", null, "His approach goes beyond simply prescribing workouts or diets. Every individual is treated as a complete system — their goals, physiology, training history, lifestyle, nutrition, habits, mindset and environment."),
          e("p", null, "The objective is simple: Create measurable physical transformation while developing the behaviours, discipline and mental framework required to sustain it."),
          e("p", null, "From personal transformation and physique development to contest preparation, online coaching, nutrition consultation and one-on-one hypnotherapy, Kunaal works with individuals who want more than a temporary result."),
          e("p", null, "His philosophy is built around understanding the individual first, then designing the system around them."),
          e("div", { className: "about-highlight" },
            "\"DON'T JUST CHASE A BETTER BODY.\", e("br", null), "BUILD A BETTER HUMAN SYSTEM.\""
          )
        )
      )
    )
  );
}

function MethodSection() {
  const stages = [
    { num: "01", title: "ASSESS", desc: "Understand where the individual is starting from. Comprehensive evaluation of physiology, history, lifestyle, nutrition, habits, mindset and environment." },
    { num: "02", title: "ENGINEER", desc: "Design the training, nutrition, lifestyle and behavioural strategy. Every element is calculated and customized to the individual's unique system." },
    { num: "03", title: "EXECUTE", desc: "Build consistency through structured action and accountability. Daily habits, weekly check-ins, and real-time guidance ensure progress." },
    { num: "04", title: "ADAPT", desc: "Use feedback, performance and progress to continuously refine the system. What works is amplified; what doesn't is adjusted." },
    { num: "05", title: "TRANSFORM", desc: "Create meaningful physical and behavioural change. The result is not just a better body, but a better human system." }
  ];

  return e("section", { className: "section method", id: "method" },
    e("div", { className: "container" },
      e("span", { className: "label" }, "The Kunaal Method"),
      e("h2", { className: "section-title" }, "A Systematic Approach to", e("br", null), e("span", { className: "text-gradient" }, "Human Evolution")),
      e("div", { className: "method-stages" },
        ...stages.map(s =>
          e("div", { key: s.num, className: "method-stage" },
            e("div", { className: "method-stage-number" }, s.num),
            e("div", { className: "method-stage-content" },
              e("h3", null, s.title),
              e("p", null, s.desc)
            )
          )
        )
      ),
      e("div", { className: "method-footer" }, "\"Your program should evolve as you do.\"")
    )
  );
}

function ServicesSection({ onNav }) {
  return e("section", { className: "section expertise", id: "services" },
    e("div", { className: "container" },
      e("span", { className: "label" }, "Areas of Expertise"),
      e("h2", { className: "section-title" }, "Specialized Coaching", e("br", null), e("span", { className: "text-gradient" }, "For Every Goal")),
      e("p", { className: "section-subtitle" }, "Comprehensive services designed around your unique physiology, psychology and objectives."),
      e("div", { className: "expertise-grid" },
        ...SERVICES.map(srv =>
          e("div", {
            key: srv.id,
            className: "expertise-card",
            onClick: () => onNav("booking", srv.id)
          },
            e("span", { className: "expertise-card-icon" }, SERVICE_EMOJI[srv.id]),
            e("h3", null, srv.name.toUpperCase()),
            e("p", null, srv.tagline),
            e("div", { className: "expertise-card-actions" },
              e("button", {
                className: "btn btn-outline btn-sm",
                onClick: (ev) => { ev.stopPropagation(); onNav("booking", srv.id); }
              }, "Learn More"),
              e("button", {
                className: "btn btn-primary btn-sm",
                onClick: (ev) => { ev.stopPropagation(); onNav("booking", srv.id); }
              }, "Book Consultation")
            )
          )
        )
      )
    )
  );
}

function PhilosophySection({ onNav }) {
  return e("section", { className: "section philosophy", id: "philosophy" },
    e("div", { className: "container" },
      e("h2", null, "NOT A TEMPLATE.", e("br", null), "A ", e("span", { className: "text-gradient" }, "SYSTEM"), "."),
      e("p", null, "No two people have the same physiology, history, schedule, psychology or environment. That's why coaching begins with assessment rather than assumptions."),
      e("p", null, "Training, nutrition, lifestyle and behavioural strategies are designed around the individual rather than forcing the individual into a template."),
      e("button", { className: "btn btn-primary btn-lg", style: { marginTop: "16px" }, onClick: () => onNav("quiz") }, "Discover Your Plan")
    )
  );
}

function CredibilitySection() {
  const items = [
    { num: "01", title: "INDIVIDUALIZED", desc: "Every program begins by understanding the individual. No templates. No assumptions." },
    { num: "02", title: "SYSTEMATIC", desc: "Training, nutrition, lifestyle and behaviour work together as an integrated system." },
    { num: "03", title: "DATA INFORMED", desc: "Progress and feedback guide adjustments. What gets measured gets managed." },
    { num: "04", title: "HUMAN", desc: "Technology and science are tools. The individual always comes first." }
  ];
  return e("section", { className: "section credibility", id: "credibility" },
    e("div", { className: "container" },
      e("span", { className: "label" }, "Why People Work With Kunaal"),
      e("h2", { className: "section-title" }, "Built on ", e("span", { className: "text-gradient" }, "Principles")),
      e("div", { className: "credibility-grid" },
        ...items.map(item =>
          e("div", { key: item.num, className: "credibility-card" },
            e("div", { className: "credibility-card-number" }, item.num),
            e("h3", null, item.title),
            e("p", null, item.desc)
          )
        )
      )
    )
  );
}

function ScienceSection() {
  const nodes = [
    { icon: "🧠", label: "Mind", top: "10%", left: "20%" },
    { icon: "💪", label: "Muscle", top: "10%", right: "20%" },
    { icon: "❤️", label: "Recovery", top: "40%", left: "5%" },
    { icon: "🧬", label: "Biology", top: "40%", right: "5%" },
    { icon: "🥗", label: "Nutrition", bottom: "10%", left: "20%" },
    { icon: "😴", label: "Sleep", bottom: "10%", right: "20%" },
    { icon: "🎯", label: "Behaviour", bottom: "35%", left: "15%" },
    { icon: "⚡", label: "Performance", bottom: "35%", right: "15%" }
  ];
  return e("section", { className: "section science", id: "science" },
    e("div", { className: "container" },
      e("span", { className: "label" }, "The Human System"),
      e("h2", { className: "section-title" }, "Performance is Not", e("br", null), e("span", { className: "text-gradient" }, "One Variable")),
      e("div", { className: "science-visual" },
        e("div", { className: "science-center" },
          e("h3", null, "The Human System"),
          e("p", null, "Performance emerges from the interaction between physiology, behaviour, environment, training, nutrition and recovery.")
        ),
        e("div", { className: "science-nodes" },
          ...nodes.map((n, i) =>
            e("div", {
              key: i,
              className: "science-node",
              style: { top: n.top, left: n.left, right: n.right, bottom: n.bottom }
            },
              e("div", { className: "science-node-icon" }, n.icon),
              e("span", { className: "science-node-label" }, n.label)
            )
          )
        )
      )
    )
  );
}

function InstagramSection() {
  const cards = [
    { icon: "🏆", label: "Transformations" },
    { icon: "💪", label: "Training" },
    { icon: "🥗", label: "Nutrition" },
    { icon: "🧠", label: "Hypnotherapy" },
    { icon: "🎙️", label: "Podcast" },
    { icon: "📚", label: "Education" },
    { icon: "⚡", label: "Performance" },
    { icon: "👤", label: "Behind The Scenes" }
  ];
  return e("section", { className: "section instagram", id: "transformations" },
    e("div", { className: "container" },
      e("span", { className: "label" }, "Real People. Real Journeys."),
      e("h2", { className: "section-title" }, "Explore Real Coaching", e("br", null), e("span", { className: "text-gradient" }, "Journeys")),
      e("p", { className: "section-subtitle" }, "Genuine transformations, client experiences and behind-the-scenes work. Follow the journey on Instagram."),
      e("div", { className: "instagram-profile" },
        e("div", { className: "instagram-avatar" }, "🏋️"),
        e("div", { className: "instagram-info" },
          e("h3", null, "Kunaal Wachanekar"),
          e("div", { className: "handle" }, INSTAGRAM_HANDLE),
          e("div", { className: "bio" }, "Human Performance & Transformation"),
          e("div", { className: "buttons" },
            e("a", { href: INSTAGRAM_URL, target: "_blank", className: "btn btn-primary btn-sm" }, "Follow on Instagram"),
            e("a", { href: INSTAGRAM_URL, target: "_blank", className: "btn btn-secondary btn-sm" }, "View Transformations")
          )
        )
      ),
      e("div", { className: "instagram-gallery" },
        ...cards.map((c, i) =>
          e("a", { key: i, href: INSTAGRAM_URL, target: "_blank", className: "instagram-card" },
            e("span", { className: "instagram-card-icon" }, c.icon),
            e("span", { className: "instagram-card-label" }, c.label)
          )
        )
      ),
      e("div", { className: "instagram-cta" },
        e("a", { href: INSTAGRAM_URL, target: "_blank", className: "btn btn-outline btn-lg" }, "View More on Instagram")
      )
    )
  );
}

function ContactSection() {
  return e("section", { className: "section contact", id: "contact" },
    e("div", { className: "container" },
      e("span", { className: "label" }, "Get In Touch"),
      e("h2", { className: "section-title", style: { textAlign: "center" } }, "Contact ", e("span", { className: "text-gradient" }, "Kunaal")),
      e("p", { className: "section-subtitle", style: { textAlign: "center", margin: "0 auto 48px" } }, "Ready to start your transformation? Reach out directly."),
      e("div", { className: "contact-grid" },
        e("div", { className: "contact-card" },
          e("div", { className: "contact-card-icon" }, "💬"),
          e("h3", null, "WhatsApp"),
          e("p", null, "Fastest way to get in touch. Chat directly with Kunaal."),
          e("a", { href: `https://wa.me/${WHATSAPP_NUMBER}`, target: "_blank", className: "btn btn-whatsapp", style: { width: "100%" } }, "Chat on WhatsApp")
        ),
        e("div", { className: "contact-card" },
          e("div", { className: "contact-card-icon" }, "✉️"),
          e("h3", null, "Email"),
          e("p", null, "Send detailed inquiries or your assessment summary."),
          e("a", { href: `mailto:${EMAIL}`, className: "btn btn-outline", style: { width: "100%" } }, "Email Kunaal")
        ),
        e("div", { className: "contact-card" },
          e("div", { className: "contact-card-icon" }, "📱"),
          e("h3", null, "Instagram"),
          e("p", null, "Follow the journey and see real transformations."),
          e("a", { href: INSTAGRAM_URL, target: "_blank", className: "btn btn-secondary", style: { width: "100%" } }, "Follow @kunaal_thechamp")
        )
      )
    )
  );
}

function Footer({ onNav }) {
  return e("footer", { className: "footer" },
    e("div", { className: "container" },
      e("div", { className: "footer-grid" },
        e("div", { className: "footer-brand" },
          e("h3", null, "KUNAAL", e("span", { style: { color: "var(--accent-primary)" } }, ".")),
          e("p", null, "Human Performance & Transformation Coach. Pioneering Human Evolution through science, biology, and behavioural change.")
        ),
        e("div", { className: "footer-col" },
          e("h4", null, "Navigation"),
          e("button", { onClick: () => onNav("home") }, "Home"),
          e("button", { onClick: () => onNav("about") }, "About"),
          e("button", { onClick: () => onNav("services") }, "Services"),
          e("button", { onClick: () => onNav("method") }, "Method")
        ),
        e("div", { className: "footer-col" },
          e("h4", null, "Services"),
          e("button", { onClick: () => onNav("services") }, "Physique Transformation"),
          e("button", { onClick: () => onNav("services") }, "Strength & Conditioning"),
          e("button", { onClick: () => onNav("services") }, "Nutrition"),
          e("button", { onClick: () => onNav("services") }, "Hypnotherapy")
        ),
        e("div", { className: "footer-col" },
          e("h4", null, "Connect"),
          e("a", { href: `https://wa.me/${WHATSAPP_NUMBER}`, target: "_blank" }, "WhatsApp"),
          e("a", { href: `mailto:${EMAIL}` }, "Email"),
          e("a", { href: INSTAGRAM_URL, target: "_blank" }, "Instagram"),
          e("button", { onClick: () => onNav("quiz") }, "Start Assessment")
        )
      ),
      e("div", { className: "footer-bottom" },
        e("p", null, "© 2026 Kunaal Wachanekar. All rights reserved."),
        e("p", { style: { color: "var(--text-muted)", fontSize: "0.75rem" } }, "This website does not provide medical advice. Consult a healthcare professional for medical concerns.")
      )
    )
  );
}

// ============================================
// COMPONENTS — Screens
// ============================================

function HomeScreen({ onNav }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return e("div", null,
    e(HeroSection, { onNav }),
    e(AboutSection),
    e(MethodSection),
    e(ServicesSection, { onNav }),
    e(PhilosophySection, { onNav }),
    e(CredibilitySection),
    e(ScienceSection),
    e(InstagramSection),
    e(ContactSection),
    e(Footer, { onNav })
  );
}

function QuizScreen({ onNav }) {
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [profile, setProfile] = useState({ name: "", age: "", phone: "", email: "" });

  const totalSteps = 3;

  const handleGoalSelect = (goal) => {
    setSelectedGoal(goal);
  };

  const handleNext = () => {
    if (step === 0) {
      if (!selectedGoal) { showToast("Please select a goal"); return; }
      setStep(1);
    } else if (step === 1) {
      if (!profile.name || !profile.age || !profile.phone || !profile.email) {
        showToast("Please fill in all required fields");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const service = SERVICES.find(s => s.id === selectedGoal.service);
      onNav("recommendation", service);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else onNav("home");
  };

  return e("div", { className: "screen-container" },
    e("div", { className: "quiz-screen" },
      e("div", { className: "quiz-header" },
        e("h2", null, "PHE Assessment"),
        e("p", null, "Answer a few questions to find your ideal coaching path.")
      ),
      e("div", { className: "quiz-progress" },
        ...Array.from({ length: totalSteps }, (_, i) =>
          e("div", { key: i, className: "quiz-progress-dot" + (i === step ? " active" : "") })
        )
      ),
      e("div", { className: "quiz-step" },
        step === 0 && e("div", null,
          e("h3", null, "What is your primary goal?"),
          e("div", { className: "quiz-options" },
            ...GOAL_OPTIONS.map((g, i) =>
              e("label", {
                key: i,
                className: "quiz-option" + (selectedGoal && selectedGoal.label === g.label ? " selected" : "")
              },
                e("input", {
                  type: "radio",
                  name: "goal",
                  checked: selectedGoal && selectedGoal.label === g.label,
                  onChange: () => handleGoalSelect(g)
                }),
                e("span", null, g.label)
              )
            )
          )
        ),
        step === 1 && e("div", null,
          e("h3", null, "Tell us about yourself"),
          e("div", { className: "form-row" },
            e("div", { className: "form-group" },
              e("label", null, "Full Name ", e("span", { className: "required" }, "*")),
              e("input", {
                type: "text",
                placeholder: "Your full name",
                value: profile.name,
                onChange: (ev) => setProfile({ ...profile, name: ev.target.value })
              })
            ),
            e("div", { className: "form-group" },
              e("label", null, "Age ", e("span", { className: "required" }, "*")),
              e("input", {
                type: "number",
                placeholder: "Your age",
                value: profile.age,
                onChange: (ev) => setProfile({ ...profile, age: ev.target.value })
              })
            )
          ),
          e("div", { className: "form-row" },
            e("div", { className: "form-group" },
              e("label", null, "Phone ", e("span", { className: "required" }, "*")),
              e("input", {
                type: "tel",
                placeholder: "+91XXXXXXXXXX",
                value: profile.phone,
                onChange: (ev) => setProfile({ ...profile, phone: ev.target.value })
              })
            ),
            e("div", { className: "form-group" },
              e("label", null, "Email ", e("span", { className: "required" }, "*")),
              e("input", {
                type: "email",
                placeholder: "your@email.com",
                value: profile.email,
                onChange: (ev) => setProfile({ ...profile, email: ev.target.value })
              })
            )
          )
        ),
        step === 2 && e("div", null,
          e("h3", null, "Ready for your recommendation"),
          e("p", { style: { color: "var(--text-secondary)", marginBottom: "24px" } },
            "Based on your goal of ", e("strong", { style: { color: "var(--accent-primary)" } }, selectedGoal ? selectedGoal.label : ""),
            ", we recommend the following service."
          ),
          e("div", { className: "recommendation-card", style: { marginBottom: 0 } },
            e("div", { className: "icon" }, selectedGoal ? SERVICE_EMOJI[selectedGoal.service] : "🎯"),
            e("h2", null, selectedGoal ? SERVICES.find(s => s.id === selectedGoal.service).name : ""),
            e("p", null, selectedGoal ? SERVICES.find(s => s.id === selectedGoal.service).tagline : "")
          )
        )
      ),
      e("div", { className: "quiz-footer" },
        e("button", { className: "btn btn-secondary", onClick: handleBack }, step === 0 ? "Back to Home" : "Back"),
        e("button", { className: "btn btn-primary", onClick: handleNext },
          step === 2 ? "View Recommendation" : "Continue"
        )
      )
    )
  );
}

function RecommendationScreen({ service, onNav }) {
  if (!service) return null;
  return e("div", { className: "screen-container" },
    e("div", { className: "recommendation-screen" },
      e("div", { className: "recommendation-card" },
        e("div", { className: "icon" }, SERVICE_EMOJI[service.id]),
        e("h2", null, service.name),
        e("p", null, service.tagline),
        e("ul", { className: "bullets" },
          ...service.bullets.map((b, i) => e("li", { key: i }, b))
        ),
        e("div", { style: { background: "var(--bg-primary)", borderRadius: "12px", padding: "16px", marginBottom: "24px", textAlign: "left" } },
          e("h4", { style: { color: "var(--accent-primary)", fontSize: "0.9rem", marginBottom: "8px" } }, "Who It Is For"),
          e("p", { style: { color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "16px" } }, service.who),
          e("h4", { style: { color: "var(--accent-primary)", fontSize: "0.9rem", marginBottom: "8px" } }, "How It Works"),
          e("p", { style: { color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "16px" } }, service.how),
          e("h4", { style: { color: "var(--accent-primary)", fontSize: "0.9rem", marginBottom: "8px" } }, "What You Can Expect"),
          e("p", { style: { color: "var(--text-secondary)", fontSize: "0.9rem" } }, service.expect)
        )
      ),
      e("div", { className: "recommendation-actions" },
        e("button", { className: "btn btn-secondary", onClick: () => onNav("quiz") }, "Retake Assessment"),
        e("button", { className: "btn btn-primary", onClick: () => onNav("booking", service.id) }, "Book This Service"),
        e("a", { href: `https://wa.me/${WHATSAPP_NUMBER}`, target: "_blank", className: "btn btn-whatsapp" }, "Chat on WhatsApp")
      )
    )
  );
}

function BookingScreen({ serviceId, onNav }) {
  const service = SERVICES.find(s => s.id === serviceId) || SERVICES[0];
  const [fields, setFields] = useState({
    name: "", email: "", phone: "", city: "",
    height: "", weight: "", bodyfat: "", trainingExp: "",
    goal: "", timeline: "", barriers: "",
    diet: "", allergies: "", mealsPerDay: "",
    injuries: "", medical: "",
    focusAreas: [], sessionType: "",
    consent: false,
    preferredDate: "", preferredTime: "", notes: ""
  });

  const updateField = (key, value) => setFields({ ...fields, [key]: value });

  const commonFields = e("div", null,
    e("h3", null, "Personal Details"),
    e("div", { className: "form-row" },
      e("div", { className: "form-group" },
        e("label", null, "Full Name ", e("span", { className: "required" }, "*")),
        e("input", { type: "text", placeholder: "Your full name", value: fields.name, onChange: (ev) => updateField("name", ev.target.value) })
      ),
      e("div", { className: "form-group" },
        e("label", null, "Email ", e("span", { className: "required" }, "*")),
        e("input", { type: "email", placeholder: "your@email.com", value: fields.email, onChange: (ev) => updateField("email", ev.target.value) })
      )
    ),
    e("div", { className: "form-row" },
      e("div", { className: "form-group" },
        e("label", null, "Phone ", e("span", { className: "required" }, "*")),
        e("input", { type: "tel", placeholder: "+91XXXXXXXXXX", value: fields.phone, onChange: (ev) => updateField("phone", ev.target.value) })
      ),
      e("div", { className: "form-group" },
        e("label", null, "City ", e("span", { className: "optional" }, "(optional)")),
        e("input", { type: "text", placeholder: "Your city", value: fields.city, onChange: (ev) => updateField("city", ev.target.value) })
      )
    )
  );

  const physiqueFields = e("div", null,
    e("h3", null, "Body Profile"),
    e("div", { className: "form-row" },
      e("div", { className: "form-group" }, e("label", null, "Height (cm)"), e("input", { type: "number", placeholder: "Height in cm", value: fields.height, onChange: (ev) => updateField("height", ev.target.value) })),
      e("div", { className: "form-group" }, e("label", null, "Weight (kg)"), e("input", { type: "number", placeholder: "Weight in kg", value: fields.weight, onChange: (ev) => updateField("weight", ev.target.value) }))
    ),
    e("div", { className: "form-row" },
      e("div", { className: "form-group" }, e("label", null, "Body Fat % ", e("span", { className: "optional" }, "(if known)")), e("input", { type: "number", placeholder: "e.g. 15", value: fields.bodyfat, onChange: (ev) => updateField("bodyfat", ev.target.value) })),
      e("div", { className: "form-group" }, e("label", null, "Training Experience"), e("select", { value: fields.trainingExp, onChange: (ev) => updateField("trainingExp", ev.target.value) }, e("option", { value: "" }, "Select"), e("option", { value: "beginner" }, "Beginner (0-1 year)"), e("option", { value: "intermediate" }, "Intermediate (1-3 years)"), e("option", { value: "advanced" }, "Advanced (3-5 years)"), e("option", { value: "elite" }, "Elite (5+ years)")))
    ),
    e("h3", null, "Goals"),
    e("div", { className: "form-group" }, e("label", null, "Primary Goal"), e("textarea", { placeholder: "Describe your primary goal...", value: fields.goal, onChange: (ev) => updateField("goal", ev.target.value) })),
    e("div", { className: "form-group" }, e("label", null, "Target Timeline"), e("select", { value: fields.timeline, onChange: (ev) => updateField("timeline", ev.target.value) }, e("option", { value: "" }, "Select"), e("option", { value: "1-3" }, "1-3 months"), e("option", { value: "3-6" }, "3-6 months"), e("option", { value: "6-12" }, "6-12 months"), e("option", { value: "12+" }, "12+ months"))),
    e("div", { className: "form-group" }, e("label", null, "Previous Barriers"), e("textarea", { placeholder: "What has stopped you before?", value: fields.barriers, onChange: (ev) => updateField("barriers", ev.target.value) }))
  );

  const nutritionFields = e("div", null,
    e("h3", null, "Nutrition"),
    e("div", { className: "form-group" }, e("label", null, "Diet Preference"), e("select", { value: fields.diet, onChange: (ev) => updateField("diet", ev.target.value) }, e("option", { value: "" }, "Select"), e("option", { value: "vegetarian" }, "Vegetarian"), e("option", { value: "vegan" }, "Vegan"), e("option", { value: "eggetarian" }, "Eggetarian"), e("option", { value: "non-vegetarian" }, "Non-Vegetarian"))),
    e("div", { className: "form-group" }, e("label", null, "Food Allergies ", e("span", { className: "optional" }, "(optional)")), e("input", { type: "text", placeholder: "List any allergies", value: fields.allergies, onChange: (ev) => updateField("allergies", ev.target.value) })),
    e("div", { className: "form-group" }, e("label", null, "Meals Per Day"), e("select", { value: fields.mealsPerDay, onChange: (ev) => updateField("mealsPerDay", ev.target.value) }, e("option", { value: "" }, "Select"), e("option", { value: "1-2" }, "1-2 meals"), e("option", { value: "3" }, "3 meals"), e("option", { value: "4-5" }, "4-5 meals"), e("option", { value: "6+" }, "6+ meals")))
  );

  const healthFields = e("div", null,
    e("h3", null, "Health & Safety"),
    e("div", { className: "form-group" }, e("label", null, "Current Injuries ", e("span", { className: "optional" }, "(optional)")), e("textarea", { placeholder: "Describe any injuries...", value: fields.injuries, onChange: (ev) => updateField("injuries", ev.target.value) })),
    e("div", { className: "form-group" }, e("label", null, "Medical Conditions ", e("span", { className: "optional" }, "(optional)")), e("textarea", { placeholder: "Diabetes, hypertension, etc...", value: fields.medical, onChange: (ev) => updateField("medical", ev.target.value) })),
    e("div", { className: "disclaimer" }, e("strong", null, "Important:"), " Please provide accurate information so your coaching plan can be appropriately considered. This assessment is not a medical diagnosis.")
  );

  const hypnoFields = e("div", null,
    e("h3", null, "Hypnotherapy Intake"),
    e("div", { className: "form-group" }, e("label", null, "What would you like to change?"), e("textarea", { placeholder: "Describe what you want to change...", value: fields.goal, onChange: (ev) => updateField("goal", ev.target.value) })),
    e("div", { className: "form-group" }, e("label", null, "What has this been costing you?"), e("textarea", { placeholder: "Time, energy, opportunities...", value: fields.barriers, onChange: (ev) => updateField("barriers", ev.target.value) })),
    e("div", { className: "form-group" }, e("label", null, "What would you like to experience instead?"), e("textarea", { placeholder: "The positive alternative...", value: fields.notes, onChange: (ev) => updateField("notes", ev.target.value) })),
    e("div", { className: "form-group" },
      e("label", null, "Focus Areas"),
      e("div", { className: "checkbox-group" },
        ["Confidence & self-esteem", "Stress & anxiety", "Habit transformation", "Performance enhancement", "Sleep improvement", "Past experiences / emotional release"].map(opt =>
          e("label", { key: opt, className: "checkbox-item" + (fields.focusAreas.includes(opt) ? " selected" : "") },
            e("input", {
              type: "checkbox",
              checked: fields.focusAreas.includes(opt),
              onChange: (ev) => {
                const arr = ev.target.checked
                  ? [...fields.focusAreas, opt]
                  : fields.focusAreas.filter(x => x !== opt);
                updateField("focusAreas", arr);
              }
            }),
            e("span", null, opt)
          )
        )
      )
    ),
    e("div", { className: "form-group" }, e("label", null, "Preferred Session Type"), e("select", { value: fields.sessionType, onChange: (ev) => updateField("sessionType", ev.target.value) }, e("option", { value: "" }, "Select"), e("option", { value: "online" }, "Online Video"), e("option", { value: "in-person" }, "In Person"), e("option", { value: "either" }, "Either"))),
    e("div", { className: "consent-box" },
      e("label", null,
        e("input", { type: "checkbox", checked: fields.consent, onChange: (ev) => updateField("consent", ev.target.checked) }),
        e("span", null, "I understand that hypnotherapy is not a substitute for emergency medical or psychiatric care.")
      )
    )
  );

  const bookingFields = e("div", null,
    e("h3", null, "Booking Preferences"),
    e("div", { className: "form-group" }, e("label", null, "Preferred Date"), e("input", { type: "date", value: fields.preferredDate, onChange: (ev) => updateField("preferredDate", ev.target.value) })),
    e("div", { className: "form-group" }, e("label", null, "Preferred Time"), e("select", { value: fields.preferredTime, onChange: (ev) => updateField("preferredTime", ev.target.value) }, e("option", { value: "" }, "Select"), e("option", { value: "morning" }, "Morning (6AM - 10AM)"), e("option", { value: "midday" }, "Midday (10AM - 2PM)"), e("option", { value: "afternoon" }, "Afternoon (2PM - 6PM)"), e("option", { value: "evening" }, "Evening (6PM - 9PM)"))),
    e("div", { className: "form-group" }, e("label", null, "Additional Notes ", e("span", { className: "optional" }, "(optional)")), e("textarea", { placeholder: "Anything else Kunaal should know...", value: fields.notes, onChange: (ev) => updateField("notes", ev.target.value) }))
  );

  const getPerServiceFields = () => {
    switch (service.id) {
      case "physique": case "strength": case "contest": return physiqueFields;
      case "nutrition": return nutritionFields;
      case "hypnotherapy": return hypnoFields;
      default: return physiqueFields;
    }
  };

  const handleSend = (via) => {
    if (!fields.name || !fields.email || !fields.phone) {
      showToast("Please fill in name, email and phone");
      return;
    }
    if (service.id === "hypnotherapy" && !fields.consent) {
      showToast("Please confirm hypnotherapy consent");
      return;
    }
    const summary = buildSummary(service, fields);
    if (via === "whatsapp") {
      openWhatsApp(summary);
    } else {
      openEmail(`Booking Request - ${service.name} - ${fields.name}`, summary);
    }
    onNav("confirmation");
  };

  return e("div", { className: "screen-container" },
    e("div", { className: "booking-screen" },
      e("div", { className: "booking-header" },
        e("h2", null, service.cta),
        e("p", null, service.tagline)
      ),
      e("div", { className: "booking-form" },
        commonFields,
        getPerServiceFields(),
        service.id !== "hypnotherapy" && healthFields,
        bookingFields,
        e("div", { style: { display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" } },
          e("button", { className: "btn btn-secondary", onClick: () => onNav("home") }, "Cancel"),
          e("button", { className: "btn btn-whatsapp", onClick: () => handleSend("whatsapp") }, "Send via WhatsApp"),
          e("button", { className: "btn btn-primary", onClick: () => handleSend("email") }, "Send via Email")
        )
      )
    )
  );
}

function PaymentScreen({ serviceId, prefillAmount, onNav }) {
  const service = SERVICES.find(s => s.id === serviceId) || SERVICES[0];
  const [amount, setAmount] = useState(prefillAmount || "");
  const [selectedService, setSelectedService] = useState(serviceId || "physique");
  const qrRef = useRef(null);
  const qrInstance = useRef(null);

  const upiUrl = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(SERVICES.find(s => s.id === selectedService)?.name || "Coaching")}`;
  const validAmount = amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;

  useEffect(() => {
    if (validAmount && qrRef.current && typeof QRCode !== "undefined") {
      if (qrInstance.current) {
        qrRef.current.innerHTML = "";
      }
      qrInstance.current = new QRCode(qrRef.current, {
        text: upiUrl,
        width: 220,
        height: 220,
        colorDark: "#0a0a0f",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  }, [upiUrl, validAmount]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("pay") === "1") {
      const s = params.get("service");
      const a = params.get("amount");
      if (s) setSelectedService(s);
      if (a) setAmount(a);
    }
  }, []);

  const copyUpi = () => {
    navigator.clipboard.writeText(UPI_ID).then(() => showToast("UPI ID copied!"));
  };

  return e("div", { className: "screen-container" },
    e("div", { className: "payment-screen" },
      e("div", { className: "payment-card" },
        e("h2", null, "Secure Your Session"),
        e("div", { className: "form-group" },
          e("label", null, "Service"),
          e("select", {
            value: selectedService,
            onChange: (ev) => setSelectedService(ev.target.value)
          }, ...SERVICES.map(s => e("option", { key: s.id, value: s.id }, s.name)))
        ),
        e("div", { className: "form-group" },
          e("label", null, "Amount (INR)"),
          e("input", {
            type: "number",
            placeholder: "Enter amount",
            value: amount,
            onChange: (ev) => setAmount(ev.target.value)
          })
        ),
        validAmount && e("div", { className: "qr-container" },
          e("div", { ref: qrRef })
        ),
        e("p", { style: { color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "8px" } }, "Scan with any UPI app"),
        e("div", { className: "upi-id-display", onClick: copyUpi }, UPI_ID),
        e("div", { style: { display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" } },
          e("a", { href: upiUrl, className: "btn btn-primary" }, "Pay via GPay / UPI"),
          e("button", { className: "btn btn-outline", onClick: copyUpi }, "Copy UPI ID")
        )
      ),
      e("button", { className: "btn btn-secondary", onClick: () => onNav("home") }, "Back to Home")
    )
  );
}

function ConfirmationScreen({ onNav }) {
  return e("div", { className: "screen-container" },
    e("div", { className: "confirmation-screen" },
      e("div", { className: "check" }, "✓"),
      e("h2", null, "Your Message is Ready"),
      e("p", null, "Your pre-filled message has been opened in your chosen app. Please send it to complete your booking request."),
      e("div", { style: { display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" } },
        e("button", { className: "btn btn-primary", onClick: () => onNav("payment") }, "Make Payment"),
        e("button", { className: "btn btn-secondary", onClick: () => onNav("home") }, "Back to Home")
      )
    )
  );
}

function WhatsAppFab() {
  return e("a", {
    href: `https://wa.me/${WHATSAPP_NUMBER}`,
    target: "_blank",
    className: "whatsapp-fab"
  }, "💬");
}

function PheAiFab({ onNav }) {
  return e("button", {
    className: "phe-ai-fab",
    onClick: () => onNav("quiz")
  }, "🧬", "PHE AI Assessment");
}

// ============================================
// ROOT APP
// ============================================

function App() {
  const [screen, setScreen] = useState("home");
  const [selectedService, setSelectedService] = useState(null);
  const [prefillAmount, setPrefillAmount] = useState("");

  const handleNav = (target, payload) => {
    if (target === "whatsapp") {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank");
      return;
    }
    if (target === "services" || target === "about" || target === "method" || target === "contact" || target === "transformations" || target === "philosophy" || target === "credibility" || target === "science") {
      setScreen("home");
      setTimeout(() => {
        const el = document.getElementById(target);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return;
    }
    if (target === "quiz") {
      setScreen("quiz");
      window.scrollTo(0, 0);
      return;
    }
    if (target === "booking" && payload) {
      setSelectedService(payload);
      setScreen("booking");
      window.scrollTo(0, 0);
      return;
    }
    if (target === "recommendation" && payload) {
      setSelectedService(payload.id);
      setScreen("recommendation");
      window.scrollTo(0, 0);
      return;
    }
    if (target === "payment") {
      setScreen("payment");
      window.scrollTo(0, 0);
      return;
    }
    setScreen(target);
    window.scrollTo(0, 0);
  };

  const currentService = SERVICES.find(s => s.id === selectedService) || SERVICES[0];

  return e("div", null,
    e(Grain),
    e(NavBar, { onNav: handleNav, screen }),

    screen === "home" && e(HomeScreen, { onNav: handleNav }),
    screen === "quiz" && e(QuizScreen, { onNav: handleNav }),
    screen === "recommendation" && e(RecommendationScreen, { service: currentService, onNav: handleNav }),
    screen === "booking" && e(BookingScreen, { serviceId: selectedService, onNav: handleNav }),
    screen === "payment" && e(PaymentScreen, { serviceId: selectedService, prefillAmount, onNav: handleNav }),
    screen === "confirmation" && e(ConfirmationScreen, { onNav: handleNav }),

    screen === "home" && e(PheAiFab, { onNav: handleNav }),
    screen !== "payment" && e(WhatsAppFab),

    e("div", { id: "toast", className: "toast" })
  );
}

// ============================================
// MOUNT
// ============================================
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(e(App));
