// =============================================================================
// i18n — T1 SAFE rewrite. Education / formazione platform.
// No references to tokens, tips, unlocks, wallets, donations, or premium
// adult-style language.
// 6 languages: it, en, fr, de, es, pt.
// =============================================================================

export const SUPPORTED_LANGS = ["it", "en", "fr", "de", "es", "pt"];

export function detectLanguage() {
  if (typeof navigator === "undefined") return "en";
  const stored = localStorage.getItem("unlockr_lang");
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  const lang = (navigator.language || "en").slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(lang) ? lang : "en";
}

const it = {
  nav: {
    courses: "Corsi",
    messages: "Messaggi",
    dashboard: "Dashboard",
    login: "Accedi",
    becomeCreator: "Diventa creator",
  },
  hero: {
    badgePrefix: "Anteprima gratuita",
    badge: "su ogni corso, prima di iscriverti",
    title1: "Acquisisci competenze pratiche",
    title2: "da chi le usa ogni giorno",
    subtitle: "Corsi e community con formatori indipendenti. Guardi le lezioni, fai domande nella community e applichi subito quello che impari.",
    cta1: "Guarda il primo corso gratis",
    cta2: "Diventa formatore",
    socialProof: "Studenti e formatori già attivi su Menia",
  },
  advantages: {
    label: "Perché Menia",
    title1: "Formazione",
    title2: "che si vede sul tuo lavoro",
    subtitle: "Tre cose che fanno la differenza tra un corso che guardi e uno che cambia come operi.",
    items: [
      {
        title: "Corsi strutturati con materiali pratici",
        description: "Ogni corso è organizzato in lezioni, video, dispense e bonus scaricabili. Sai sempre dove sei nel percorso, e cosa fare appena finisce la lezione.",
      },
      {
        title: "Aggiornamenti continui dal formatore",
        description: "Nuove lezioni, materiali extra e risposte ai dubbi degli studenti aggiunti nel tempo. Il corso evolve con te.",
      },
      {
        title: "Community privata di chi sta studiando",
        description: "Accedi a uno spazio dove confrontarti con altri studenti dello stesso corso. Più feedback, meno isolamento, risultati più rapidi.",
      },
    ],
  },
  howItWorks: {
    label: "Come funziona",
    title1: "Dal corso giusto",
    title2: "al risultato concreto",
    steps: [
      {
        title: "Scegli il corso giusto per te",
        description: "Filtra per tema, livello e prezzo. Anteprima gratuita su ogni corso per capire se fa per te prima di pagare.",
      },
      {
        title: "Accedi e segui le lezioni",
        description: "Trovi video, materiali e aggiornamenti del formatore nello stesso spazio. Niente piattaforme separate, niente passaggi extra.",
      },
      {
        title: "Studia, applica, confrontati",
        description: "Accedi alle lezioni quando vuoi, scarica i materiali, metti in pratica e fai domande nella community del corso.",
      },
    ],
  },
  trustBar: {
    courses: "corsi pubblicati",
    creators: "formatori attivi",
    lessons: "lezioni e materiali",
  },
  featuredCourses: {
    label: "Corsi in evidenza",
    title: "Cosa stanno imparando gli altri studenti",
    cta: "Vedi tutti i corsi",
  },
  finalCta: {
    title: "Trova il corso che cambia il tuo lavoro",
    studentTitle: "Voglio imparare",
    studentText: "Trova corsi pratici e una community attiva per migliorare competenze utili davvero.",
    studentCta: "Esplora i corsi",
    studentLink: "Sfoglia senza registrarti",
    creatorTitle: "Voglio insegnare",
    creatorText: "Pubblica corsi e contenuti premium in uno spazio dedicato — senza piattaforme separate.",
    creatorCta: "Diventa formatore",
    creatorLink: "Vedi piani e prezzi",
  },
  featured: {
    topCreator: "Creator in evidenza",
    label: "Talenti",
    title1: "Creator",
    title2: "in evidenza",
  },
  cta: {
    title1: "Pronto a",
    title2: "iniziare?",
    subtitle: "Sia che tu voglia imparare o insegnare, Menia è il posto giusto.",
    button: "Crea account",
    feature1: "Iscrizione gratuita",
    feature2: "Nessun costo nascosto",
    feature3: "Supporto in italiano",
  },
  footer: {
    title: "Menia",
    description: "Formazione, corsi e community con i creator che ti ispirano.",
    platform: "Piattaforma",
    courses: "Corsi",
    pricing: "Piani",
    becomeCreator: "Diventa creator",
    support: "Supporto",
    legal: "Legale",
    privacy: "Privacy",
    terms: "Termini",
    cookiePolicy: "Cookie policy",
    cookieSettings: "Impostazioni cookie",
    contentPolicy: "Content policy",
    followUs: "Seguici",
    copyright: "© Menia. Tutti i diritti riservati.",
  },
  cookieBanner: {
    title: "Usiamo i cookie",
    description: "Cookie tecnici per il funzionamento del sito e cookie di analisi (con il tuo consenso) per migliorarlo.",
    readOur: "Leggi la nostra",
    cookiePolicy: "Cookie Policy",
    andThe: "e la",
    privacyPolicy: "Privacy Policy",
    customize: "Personalizza",
    technicalCookies: "Cookie tecnici",
    technicalDesc: "Necessari per autenticazione e funzionamento di base. Sempre attivi.",
    analyticsCookies: "Cookie di analisi",
    analyticsDesc: "Aiutano a capire come viene usata la piattaforma. Disattivabili.",
    savePreferences: "Salva preferenze",
    acceptAll: "Accetta tutti",
    rejectAll: "Rifiuta non essenziali",
  },
};

const en = {
  nav: {
    courses: "Courses",
    messages: "Messages",
    dashboard: "Dashboard",
    login: "Sign in",
    becomeCreator: "Become a creator",
  },
  hero: {
    badge: "Learning and growth",
    title1: "Learn from the best",
    title2: "creators",
    subtitle: "Menia is the platform where creators share real skills, training, and growth paths.",
    cta1: "Explore courses",
    cta2: "Become a creator",
    socialProof: "Hundreds of creators and students already active",
  },
  advantages: {
    label: "Why Menia",
    title1: "Real",
    title2: "education",
    subtitle: "A platform built so creators and students grow together.",
    items: [
      { title: "Structured courses", description: "Organized lessons, practical materials, clear paths." },
      { title: "Live workshops", description: "Live sessions to dig deeper and ask creators directly." },
      { title: "Private community", description: "Student groups to share progress and stay accountable." },
      { title: "Safe payments", description: "Purchases handled by regulated external providers." },
    ],
  },
  howItWorks: {
    label: "How it works",
    title1: "Three simple",
    title2: "steps",
    steps: [
      { title: "Explore", description: "Discover creators and courses in topics that matter to you." },
      { title: "Purchase", description: "Pay securely through the creator's external link." },
      { title: "Learn", description: "Access lessons, join live workshops, engage in the community." },
    ],
  },
  featured: {
    topCreator: "Featured creator",
    label: "Talents",
    title1: "Featured",
    title2: "creators",
  },
  cta: {
    title1: "Ready to",
    title2: "start?",
    subtitle: "Whether you want to learn or teach, Menia is the right place.",
    button: "Create account",
    feature1: "Free signup",
    feature2: "No hidden fees",
    feature3: "Multi-language support",
  },
  footer: {
    title: "Menia",
    description: "Education, courses and community with the creators that inspire you.",
    platform: "Platform",
    courses: "Courses",
    becomeCreator: "Become a creator",
    support: "Support",
    legal: "Legal",
    privacy: "Privacy",
    terms: "Terms",
    cookiePolicy: "Cookie policy",
    cookieSettings: "Cookie settings",
    contentPolicy: "Content policy",
    followUs: "Follow us",
    copyright: "© Menia. All rights reserved.",
  },
  cookieBanner: {
    title: "We use cookies",
    description: "Technical cookies for the site to function and analytics cookies (with your consent) to improve it.",
    readOur: "Read our",
    cookiePolicy: "Cookie Policy",
    andThe: "and the",
    privacyPolicy: "Privacy Policy",
    customize: "Customize",
    technicalCookies: "Technical cookies",
    technicalDesc: "Required for authentication and basic functionality. Always active.",
    analyticsCookies: "Analytics cookies",
    analyticsDesc: "Help us understand how the platform is used. Optional.",
    savePreferences: "Save preferences",
    acceptAll: "Accept all",
    rejectAll: "Reject non-essential",
  },
};

// For now, fr/de/es/pt fall back to English content. Real localization comes
// post-launch — keeping them in sync with the EN copy avoids dead keys.
const fr = en;
const de = en;
const es = en;
const pt = en;

export const translations = { it, en, fr, de, es, pt };
