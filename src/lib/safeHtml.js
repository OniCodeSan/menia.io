// Client-side HTML sanitization for user-generated lesson bodies.
//
// Defense-in-depth: the server already runs sanitize-html on POST/PATCH
// (server/course-lessons.js), but rendering through DOMPurify here protects
// against legacy rows that pre-date server sanitization and from any
// gap between TipTap output and the server allow-list.
//
// Output is a string of safe HTML to be passed to dangerouslySetInnerHTML.

import DOMPurify from "dompurify";

const CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "u", "s", "b", "i",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "a", "hr",
  ],
  ALLOWED_ATTR: ["href", "title", "target", "rel"],
  ALLOWED_URI_REGEXP: /^(?:https:|mailto:)/i,
  // Force-rel + force-target on every anchor.
  ADD_ATTR: ["target", "rel"],
};

// Hook to enforce target=_blank + rel=noopener on every anchor that survives.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function safeLessonHtml(raw) {
  if (!raw || typeof raw !== "string") return "";
  return DOMPurify.sanitize(raw, CONFIG);
}
