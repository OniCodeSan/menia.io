import { Helmet } from "react-helmet-async";

const DEFAULTS = {
  siteName: "Tokaro.fans",
  title: "Tokaro.fans — Monetizza la tua community con abbonamenti e contenuti esclusivi",
  description: "Tokaro.fans è la piattaforma per creator che vogliono monetizzare la propria community. Abbonamenti, contenuti premium, funnel automatici e CRM fan integrato.",
  image: "https://tokaro.fans/tokaro-logo.png",
  url: "https://tokaro.fans",
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
