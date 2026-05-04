// Inline SVG version of the Menia logo.
// Inline (vs. <img src=".../menia-logo.svg">) so it scales crisply without
// extra HTTP requests and so consumers can pass `className` for sizing.
export default function MeniaLogo({ className = "w-6 h-6", ...rest }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Menia"
      {...rest}
    >
      <line x1="28" y1="28" x2="28" y2="75" stroke="#2563EB" strokeWidth="9" strokeLinecap="round" />
      <line x1="28" y1="28" x2="50" y2="65" stroke="#2563EB" strokeWidth="9" strokeLinecap="round" />
      <line x1="50" y1="65" x2="72" y2="28" stroke="#0F172A" strokeWidth="9" strokeLinecap="round" />
      <line x1="72" y1="28" x2="72" y2="75" stroke="#0F172A" strokeWidth="9" strokeLinecap="round" />
      <circle cx="28" cy="28" r="7" fill="#2563EB" />
      <circle cx="28" cy="75" r="7" fill="#2563EB" />
      <circle cx="50" cy="65" r="7" fill="#2563EB" />
      <circle cx="72" cy="28" r="7" fill="#0F172A" />
      <circle cx="72" cy="75" r="7" fill="#0F172A" />
    </svg>
  );
}
