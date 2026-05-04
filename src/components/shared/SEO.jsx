import { Helmet } from "react-helmet-async";

const DEFAULTS = {
  siteName: "Menia.io",
  title: "Menia.io — Formazione online dai migliori formatori",
  description: "Menia.io è la piattaforma di formazione online: corsi e community con i migliori formatori italiani. Un solo abbonamento, accesso a tutto il catalogo.",
  image: "https://menia.io/menia-logo.png",
  url: "https://menia.io",
};

export default function SEO({ title, description, image, url, type = "website" }) {
  const fullTitle = title ? `${title} | ${DEFAULTS.siteName}` : DEFAULTS.title;
  const desc = description || DEFAULTS.description;
  const img = image || DEFAULTS.image;
  const canonical = url ? `${DEFAULTS.url}${url}` : DEFAULTS.url;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={DEFAULTS.siteName} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  );
}
