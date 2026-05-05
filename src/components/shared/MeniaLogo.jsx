// Menia logo: image-based (era SVG inline punto-linea). Il file vive in
// /public/menia-logo.png. Stesso component API (className, props) → niente
// refactor sui call-site (Navbar, CreatorSidebar, ecc.).
export default function MeniaLogo({ className = "w-6 h-6", ...rest }) {
  return (
    <img
      src="/menia-logo.png"
      alt="Menia"
      className={`${className} object-contain`}
      loading="eager"
      decoding="async"
      {...rest}
    />
  );
}
