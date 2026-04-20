export function trackEvent(name, props) {
  if (window.gtag) {
    window.gtag("event", name, props || {});
  }
}
