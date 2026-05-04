export default function CookiePolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-heading text-2xl font-bold mb-6">Cookie Policy</h1>
      <p className="text-xs text-muted-foreground mb-6">Ultimo aggiornamento: 30 aprile 2026</p>
      <div className="bg-card border border-border/30 rounded-2xl p-6 space-y-5 text-sm leading-relaxed">

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">Cosa sono i cookie</h2>
          <p>
            I cookie sono piccoli file di testo che il sito salva sul tuo dispositivo per ricordare
            informazioni utili al funzionamento (es. la tua sessione di accesso) e, solo previo
            consenso, per analisi anonima dell'uso. Menia utilizza un numero limitato di cookie
            ed equivalenti tecnici (localStorage / sessionStorage), descritti qui sotto.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">1. Cookie tecnici (necessari)</h2>
          <p>
            Sempre attivi, non richiedono consenso ai sensi dell'art. 122 del Codice Privacy.
            Servono al funzionamento essenziale della piattaforma:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Sessione di autenticazione</strong> (Supabase Auth): ti tiene loggato dopo l'accesso. Durata: fino al logout o scadenza del token (tipicamente 1 ora con refresh automatico).</li>
            <li><strong>Token di refresh</strong>: rinnova la sessione senza richiedere nuovo login. Durata: fino a 30 giorni.</li>
            <li><strong>Sicurezza CSRF</strong>: protegge da richieste fraudolente cross-site.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">2. Cookie di preferenza</h2>
          <p>
            Sempre attivi, salvano le tue impostazioni:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Lingua</strong> dell'interfaccia (default italiano).</li>
            <li><strong>Stato del banner consensi</strong>: ricorda la scelta sui cookie analytics per non riproporre il banner ad ogni visita. Durata: 12 mesi.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">3. Cookie di analisi (opzionali)</h2>
          <p>
            <strong>Disattivati di default. Si attivano solo se accetti dal banner.</strong> Servono
            a capire in modo aggregato quali pagine vengono visitate, gli errori incontrati e le
            performance del sito. I dati sono trattati in forma anonima.
          </p>
          <p className="mt-2">
            Se non presti consenso, queste analisi non vengono raccolte e l'esperienza nel sito
            non cambia. Puoi revocare il consenso in qualsiasi momento dal banner cookie o dalle{" "}
            <a href="/privacy-settings" className="text-primary hover:underline">Impostazioni Privacy</a>.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">4. Cookie di terze parti</h2>
          <p>
            Menia <strong>non utilizza cookie pubblicitari</strong> né di profilazione di terze
            parti. Le uniche terze parti che possono impostare cookie tecnici in fase di interazione
            sono:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Supabase</strong> (autenticazione, sessione) — necessari al servizio.</li>
            <li><strong>Provider di pagamento esterni</strong> (Stripe, Gumroad, Lemon Squeezy o altri scelti dal formatore): impostano i propri cookie solo quando vieni reindirizzato sulle loro pagine al momento del pagamento. Si applica la privacy policy del provider.</li>
            <li><strong>Sentry</strong> (monitoraggio errori): non usa cookie traccianti, raccoglie crash report tecnici anonimi.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">5. Come gestire i cookie</h2>
          <p>
            Puoi modificare le preferenze in qualsiasi momento:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Dal banner cookie (cliccando "Modifica preferenze" in fondo a ogni pagina).</li>
            <li>Dalle <a href="/privacy-settings" className="text-primary hover:underline">Impostazioni Privacy</a> del tuo account.</li>
            <li>Dalle impostazioni del browser (cancellazione cookie esistenti, blocco selettivo).</li>
          </ul>
          <p className="mt-2">
            Disabilitare i cookie tecnici comporta l'impossibilità di accedere al tuo account e di
            utilizzare le funzioni che richiedono autenticazione.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">6. Contatti</h2>
          <p>
            Per domande sui cookie scrivi a{" "}
            <a href="mailto:privacy@menia.io" className="text-primary hover:underline">privacy@menia.io</a>.
            Per maggiori dettagli sul trattamento dei dati personali consulta la{" "}
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
