import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 0.2,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      if (event.exception?.values?.some((v) => v.type === "ChunkLoadError")) return null;
      return event;
    },
  });
}

export { Sentry };

// Helper per registrare errori "silenziosi": quei catch() {} che soft-failano.
// Usage: .catch(silentReport("[ConversationList] fetch failed"))
// Ritorna una funzione che capture-a su Sentry SOLO se inizializzato.
// In dev senza DSN è un no-op silenzioso (niente console spam).
export const silentReport = (label) => (err) => {
  if (DSN) {
    Sentry.captureException(err, { tags: { silent: true, label } });
  } else if (import.meta.env.DEV) {
    console.warn(`[silent] ${label}`, err?.message || err);
  }
};

