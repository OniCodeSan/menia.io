import { useCallback, useEffect, useRef } from "react";

// Debounced autosave con arming esplicito.
//
// Le euristiche basate su confronto JSON / grace window non distinguono
// affidabilmente "load del server" da "edit utente": setState ravvicinati
// fatti dal codice di init/recovery sembrano edit. Soluzione robusta:
// il consumer chiama markDirty() SOLO quando arriva un edit utente vero.
//
// Restituisce una funzione `markDirty()` che, quando chiamata, arma il
// timer di save. Senza markDirty() nessun POST viene mai inviato, anche
// se `data` cambia mille volte per init/sync server.
export default function useAutosave(data, saveFn, { delay = 2000, enabled = true } = {}) {
  const timerRef = useRef(null);
  const dataRef = useRef(data);
  const saveFnRef = useRef(saveFn);
  const enabledRef = useRef(enabled);

  // Mantieni i ref aggiornati senza re-armare il timer.
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { saveFnRef.current = saveFn; }, [saveFn]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const markDirty = useCallback(() => {
    if (!enabledRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await saveFnRef.current(dataRef.current);
      } catch (err) {
        console.warn("[autosave]", err?.message || err);
      }
    }, delay);
  }, [delay]);

  // Cleanup on unmount: cancella il timer pendente.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return markDirty;
}
