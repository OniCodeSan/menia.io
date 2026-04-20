// =============================================================================
// Catalogo creator + contenuti — singola fonte di verità per tutte le pagine
// mock-driven (Home, Explore, CreatorProfile, ContentPage, Checkout).
// Chiavi: handle senza @. Contenuti: id stringa "handle-n" globalmente unico.
// Tutti i prezzi sono in Token (T). 1T ≈ €0,10 per riferimento interno.
// =============================================================================

export const creatorsCatalog = {
  sararossi: {
    handle: "sararossi",
    name: "Sara Rossi",
    category: "Fitness",
    bio: "Personal trainer certificata. Allenamenti HIIT, yoga e nutrizione sportiva. Aiuto le persone a trasformare corpo e mente ogni giorno con contenuti esclusivi.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face",
    cover: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=500&fit=crop",
    fans: 12400,
    fansLabel: "12.4K",
    posts: 234,
    rating: 4.9,
    subscriptionTokenMonthly: 100,
    subscriptionTokenYearly: 840,
    isLive: true,
    trending: true,
    tags: ["hiit", "yoga", "dieta", "workout", "benessere"],
    contents: [
      {
        id: "sararossi-1",
        title: "Allenamento HIIT completo — 30 minuti full body",
        image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&h=500&fit=crop",
        type: "free",
        unlockPriceTokens: 0,
        body: "Una sessione HIIT completa pensata per bruciare grassi e tonificare tutti i gruppi muscolari in 30 minuti. Nessuna attrezzatura necessaria, solo il tuo corpo e la voglia di migliorarti.",
        likes: "2.4K",
        comments: 89,
        views: "12K",
        timeAgo: "2 ore fa",
      },
      {
        id: "sararossi-2",
        title: "Piano alimentare personalizzato — 4 settimane",
        image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=900&h=500&fit=crop",
        type: "premium",
        unlockPriceTokens: 50,
        body: "Un piano alimentare completo che ti accompagna per 4 settimane, con ricette, liste della spesa e indicazioni caloriche. Personalizzabile in base ai tuoi obiettivi.",
        likes: "1.8K",
        comments: 143,
        views: "9.1K",
        timeAgo: "1 giorno fa",
      },
      {
        id: "sararossi-3",
        title: "Yoga mattutino — routine di 15 minuti",
        image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=900&h=500&fit=crop",
        type: "free",
        unlockPriceTokens: 0,
        body: "Inizia la giornata con questa routine di yoga rigenerante. 15 minuti per risvegliare corpo e mente e affrontare la giornata con energia.",
        likes: "4.2K",
        comments: 178,
        views: "18K",
        timeAgo: "12 ore fa",
      },
      {
        id: "sararossi-4",
        title: "Programma 12 settimane — trasforma il tuo corpo",
        image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&h=500&fit=crop",
        type: "premium",
        unlockPriceTokens: 120,
        body: "Il programma completo di 12 settimane che ha trasformato centinaia di persone. Video-lezioni, schede PDF e community dedicata.",
        likes: "3.1K",
        comments: 256,
        views: "14K",
        timeAgo: "3 giorni fa",
      },
    ],
  },

  marcob: {
    handle: "marcob",
    name: "Marco Bianchi",
    category: "Fotografia",
    bio: "Fotografo professionista. Tutorial Lightroom, street photography e paesaggio. Condivido il mio processo creativo e i miei preset esclusivi.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face",
    cover: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&h=500&fit=crop",
    fans: 8200,
    fansLabel: "8.2K",
    posts: 156,
    rating: 4.7,
    subscriptionTokenMonthly: 70,
    subscriptionTokenYearly: 600,
    isLive: false,
    trending: true,
    tags: ["fotografia", "lightroom", "tutorial", "paesaggio", "ritratto"],
    contents: [
      {
        id: "marcob-1",
        title: "Backstage del mio ultimo shooting esclusivo a Milano",
        image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900&h=500&fit=crop",
        type: "premium",
        unlockPriceTokens: 50,
        body: "Vi porto dietro le quinte del mio ultimo shooting a Milano. Location incredibile, team fantastico e risultati che non vi aspettate. In questo contenuto esclusivo vedrete tutto il processo creativo, dalla preparazione allo scatto finale.",
        likes: "5.1K",
        comments: 203,
        views: "34K",
        timeAgo: "4 ore fa",
      },
      {
        id: "marcob-2",
        title: "Lightroom presets esclusivi — trasforma le tue foto in 1 click",
        image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=900&h=500&fit=crop",
        type: "premium",
        unlockPriceTokens: 80,
        body: "Il pacchetto completo dei miei preset Lightroom, quelli che uso per tutte le mie foto. Include preset per ritratto, paesaggio, street e moody.",
        likes: "6.3K",
        comments: 312,
        views: "41K",
        timeAgo: "1 giorno fa",
      },
      {
        id: "marcob-3",
        title: "Street photography tips — come catturare l'attimo",
        image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=900&h=500&fit=crop",
        type: "free",
        unlockPriceTokens: 0,
        body: "Consigli pratici per la street photography. Come avvicinarsi ai soggetti, scegliere il momento giusto e comporre uno scatto memorabile.",
        likes: "2.9K",
        comments: 118,
        views: "16K",
        timeAgo: "2 giorni fa",
      },
    ],
  },

  elenaconti: {
    handle: "elenaconti",
    name: "Elena Conti",
    category: "Musica",
    bio: "Cantante e chitarrista. Lezioni online, cover e composizione originale. Trasformo la passione per la musica in un percorso accessibile a tutti.",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop&crop=face",
    cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200&h=500&fit=crop",
    fans: 15100,
    fansLabel: "15.1K",
    posts: 312,
    rating: 5.0,
    subscriptionTokenMonthly: 130,
    subscriptionTokenYearly: 1100,
    isLive: true,
    trending: true,
    tags: ["musica", "chitarra", "canto", "lezioni", "composizione"],
    contents: [
      {
        id: "elenaconti-1",
        title: "Come ho guadagnato 100.000 Token in un mese con la musica",
        image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=900&h=500&fit=crop",
        type: "free",
        unlockPriceTokens: 0,
        body: "Il tutorial completo in cui racconto come ho strutturato la mia presenza online e monetizzato la mia musica. Tecniche, strumenti e mindset.",
        likes: "3.8K",
        comments: 145,
        views: "22K",
        timeAgo: "6 ore fa",
      },
      {
        id: "elenaconti-2",
        title: "Lezione di chitarra — accordi per principianti",
        image: "https://images.unsplash.com/photo-1510915361894-db8b7855a8a5?w=900&h=500&fit=crop",
        type: "premium",
        unlockPriceTokens: 60,
        body: "La prima lezione del mio corso di chitarra: gli accordi fondamentali che ti permetteranno di suonare centinaia di canzoni.",
        likes: "2.1K",
        comments: 94,
        views: "8.3K",
        timeAgo: "2 giorni fa",
      },
    ],
  },

  lucaf: {
    handle: "lucaf",
    name: "Luca Ferrari",
    category: "Gaming",
    bio: "Pro gamer e streamer. Guide, speedrun, tornei e community gaming. Condivido strategie e tecniche per giocatori competitivi.",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=500&fit=crop&crop=face",
    cover: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1200&h=500&fit=crop",
    fans: 6700,
    fansLabel: "6.7K",
    posts: 89,
    rating: 4.5,
    subscriptionTokenMonthly: 50,
    subscriptionTokenYearly: 420,
    isLive: false,
    trending: false,
    tags: ["gaming", "fps", "rpg", "streaming", "esports"],
    contents: [
      {
        id: "lucaf-1",
        title: "Setup gaming definitivo 2026 — ogni pezzo che uso e perché",
        image: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=900&h=500&fit=crop",
        type: "premium",
        unlockPriceTokens: 40,
        body: "Il mio setup completo per il 2026. PC, monitor, periferiche, audio — tutto con le specifiche e le motivazioni di ogni scelta.",
        likes: "1.9K",
        comments: 67,
        views: "8.5K",
        timeAgo: "8 ore fa",
      },
    ],
  },

  giuliam: {
    handle: "giuliam",
    name: "Giulia Moretti",
    category: "Arte",
    bio: "Illustratrice digitale e pittrice. Procreate, acquerello e concept art. Tutorial e timelapse dei miei lavori.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop&crop=face",
    cover: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1200&h=500&fit=crop",
    fans: 9800,
    fansLabel: "9.8K",
    posts: 201,
    rating: 4.8,
    subscriptionTokenMonthly: 80,
    subscriptionTokenYearly: 680,
    isLive: false,
    trending: true,
    tags: ["arte", "illustrazione", "procreate", "acquerello", "design"],
    contents: [
      {
        id: "giuliam-1",
        title: "Procreate: creare un ritratto digitale da zero",
        image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=900&h=500&fit=crop",
        type: "premium",
        unlockPriceTokens: 70,
        body: "Un tutorial completo su come realizzare un ritratto digitale professionale con Procreate. Dai bozzetti iniziali al rendering finale.",
        likes: "3.4K",
        comments: 187,
        views: "19K",
        timeAgo: "1 giorno fa",
      },
    ],
  },

  andrear: {
    handle: "andrear",
    name: "Andrea Ricci",
    category: "Tech",
    bio: "Sviluppatore full-stack. Coding, startup, AI e produttività digitale. Condivido esperienza e percorso con la community tech.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop&crop=face",
    cover: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=500&fit=crop",
    fans: 11300,
    fansLabel: "11.3K",
    posts: 178,
    rating: 4.6,
    subscriptionTokenMonthly: 100,
    subscriptionTokenYearly: 840,
    isLive: false,
    trending: false,
    tags: ["coding", "ai", "startup", "javascript", "produttività"],
    contents: [
      {
        id: "andrear-1",
        title: "JavaScript avanzato: async/await e promises spiegate semplicemente",
        image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=900&h=500&fit=crop",
        type: "free",
        unlockPriceTokens: 0,
        body: "Una spiegazione chiara e pratica delle promises e di async/await in JavaScript. Con esempi reali e best practice.",
        likes: "2.7K",
        comments: 112,
        views: "19K",
        timeAgo: "2 giorni fa",
      },
    ],
  },

  chiaraneri: {
    handle: "chiaraneri",
    name: "Chiara Neri",
    category: "Cucina",
    bio: "Chef casalinga. Ricette veloci, sane e sfiziose. Cucina italiana autentica con un tocco moderno.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop&crop=face",
    cover: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=1200&h=500&fit=crop",
    fans: 7400,
    fansLabel: "7.4K",
    posts: 145,
    rating: 4.7,
    subscriptionTokenMonthly: 60,
    subscriptionTokenYearly: 500,
    isLive: false,
    trending: false,
    tags: ["cucina", "ricette", "italiana", "dolci", "vegano"],
    contents: [
      {
        id: "chiaraneri-1",
        title: "Ricetta pasta alla carbonara originale — i segreti degli chef romani",
        image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=900&h=500&fit=crop",
        type: "free",
        unlockPriceTokens: 0,
        body: "La ricetta autentica della carbonara, così come viene preparata nei migliori ristoranti romani. Senza panna, senza compromessi.",
        likes: "3.1K",
        comments: 95,
        views: "15K",
        timeAgo: "1 giorno fa",
      },
    ],
  },

  roberto: {
    handle: "roberto",
    name: "Roberto Esposito",
    category: "Viaggi",
    bio: "Viaggiatore seriale. Guida ai luoghi nascosti d'Europa e consigli per budget travel. Racconti e itinerari dal mondo.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=500&fit=crop&crop=face",
    cover: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&h=500&fit=crop",
    fans: 13600,
    fansLabel: "13.6K",
    posts: 267,
    rating: 4.9,
    subscriptionTokenMonthly: 90,
    subscriptionTokenYearly: 760,
    isLive: true,
    trending: true,
    tags: ["viaggi", "europa", "budget", "avventura", "fotografia"],
    contents: [
      {
        id: "roberto-1",
        title: "Guida ai luoghi segreti di Lisbona che i turisti non conoscono",
        image: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=900&h=500&fit=crop",
        type: "premium",
        unlockPriceTokens: 55,
        body: "Lisbona lontano dai circuiti turistici: i quartieri autentici, le osterie locali, i belvedere nascosti e gli itinerari che solo chi ci vive conosce.",
        likes: "4.8K",
        comments: 203,
        views: "28K",
        timeAgo: "2 giorni fa",
      },
    ],
  },
};

// Flat list per iterare (Explore, FeaturedCreators, ecc.)
export const creatorsList = Object.values(creatorsCatalog);

// Indice piatto: id contenuto → { ...content, creator }
const contentsIndex = {};
for (const creator of creatorsList) {
  for (const content of creator.contents) {
    contentsIndex[content.id] = { ...content, creator };
  }
}

// Feed globale (home/feed preview): tutti i contenuti, ordinati per "freschezza" mock
export const feedContents = creatorsList.flatMap((creator) =>
  creator.contents.map((content) => ({
    id: content.id,
    title: content.title,
    image: content.image,
    type: content.type,
    category: creator.category,
    creatorName: creator.name,
    creatorHandle: creator.handle,
    creatorAvatar: creator.avatar,
    likes: content.likes,
    comments: content.comments,
    views: content.views,
    timeAgo: content.timeAgo,
  }))
);

export const categories = [
  "Tutti",
  "Fitness",
  "Fotografia",
  "Musica",
  "Gaming",
  "Lifestyle",
  "Tech",
  "Arte",
  "Cucina",
  "Viaggi",
];

// Normalizza uno slug in ingresso: rimuove @ iniziale e lowercase
const normalizeHandle = (slug) => {
  if (!slug) return "";
  return String(slug).replace(/^@/, "").toLowerCase();
};

// Trasforma un nome "Sara Rossi" in uno slug "sararossi" compatibile con il catalogo
export function nameToHandle(name) {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function getCreatorByHandle(slug) {
  const h = normalizeHandle(slug);
  if (!h) return null;
  if (creatorsCatalog[h]) return creatorsCatalog[h];
  // Fallback: prova a cercare per slug-nome (utile per feed DB-driven)
  const match = creatorsList.find((c) => nameToHandle(c.name) === h);
  return match || null;
}

export function getContentById(id) {
  if (!id) return null;
  return contentsIndex[id] || null;
}

// Trova altri contenuti dello stesso creator (esclude quello corrente)
export function getOtherContentsFromCreator(creatorHandle, excludeId, limit = 3) {
  const creator = getCreatorByHandle(creatorHandle);
  if (!creator) return [];
  return creator.contents.filter((c) => c.id !== excludeId).slice(0, limit);
}

// =============================================================================
// Creator metrics — returns zero/empty state until a real aggregation backend
// is wired. A newly registered creator must see no demo numbers.
// When Supabase metrics land, replace this with a real query keyed on user.id.
// =============================================================================
export function getCreatorMetrics(/* user */) {
  return {
    revenue: 0,
    revenueTrend: null,
    activeFans: 0,
    fansTrend: null,
    conversionRate: 0,
    conversionTrend: null,
    newSubs: 0,
    newSubsTrend: null,
    revenueChart: [],
    funnel: [
      { stage: "Visitatori", count: 0, color: "bg-muted-foreground" },
      { stage: "Free Fan", count: 0, color: "bg-accent" },
      { stage: "Trial", count: 0, color: "bg-chart-4" },
      { stage: "Abbonati", count: 0, color: "bg-primary" },
      { stage: "Premium", count: 0, color: "bg-chart-3" },
    ],
    topFans: [],
    hasData: false,
  };
}

// =============================================================================
// Dashboard data (mock) — deprecato, mantenuto solo per riferimento storico.
// Non importarlo in nuovi componenti: usa getCreatorMetrics(user).
// =============================================================================
export const dashboardData = {
  revenue: 8420,
  revenueTrend: "+12%",
  activeFans: 2400,
  fansTrend: "+8%",
  conversionRate: 35,
  conversionTrend: "+3%",
  newSubs: 145,
  newSubsTrend: "+22%",
  revenueChart: [
    { month: "Ott", value: 4200 },
    { month: "Nov", value: 5100 },
    { month: "Dic", value: 6300 },
    { month: "Gen", value: 5800 },
    { month: "Feb", value: 7200 },
    { month: "Mar", value: 8420 },
  ],
  funnel: [
    { stage: "Visitatori", count: 18500, color: "bg-muted-foreground" },
    { stage: "Free Fan", count: 6200, color: "bg-accent" },
    { stage: "Trial", count: 1800, color: "bg-chart-4" },
    { stage: "Abbonati", count: 840, color: "bg-primary" },
    { stage: "Premium", count: 320, color: "bg-chart-3" },
  ],
  topFans: [
    { name: "Giovanni M.", email: "g.m@email.com", spent: "2.400 T", status: "Premium", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" },
    { name: "Alessia P.", email: "a.p@email.com", spent: "1.800 T", status: "Abbonato", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face" },
    { name: "Davide R.", email: "d.r@email.com", spent: "1.200 T", status: "Premium", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face" },
    { name: "Chiara L.", email: "c.l@email.com", spent: "950 T", status: "Abbonato", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face" },
    { name: "Matteo G.", email: "m.g@email.com", spent: "800 T", status: "Trial", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face" },
  ],
};

// =============================================================================
// Retro-compat: `creatorProfile` restava come export default per Sara Rossi.
// Mantenuto per non rompere chiamate legacy finché non migrate.
// =============================================================================
export const creatorProfile = creatorsCatalog.sararossi;
