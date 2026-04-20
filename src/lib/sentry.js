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
