export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-heading text-2xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-xs text-muted-foreground mb-6">Ultimo aggiornamento: 30 aprile 2026</p>
      <div className="bg-card border border-border/30 rounded-2xl p-6 space-y-5 text-sm leading-relaxed">

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">1. Titolare del trattamento</h2>
          <p>
            Il titolare del trattamento dei dati personali è Menia, contattabile all'indirizzo{" "}
            <a href="mailto:privacy@menia.io" className="text-primary hover:underline">privacy@menia.io</a>.
            La presente informativa è resa ai sensi del Regolamento UE 2016/679 (GDPR) e del Codice
            Privacy italiano (D.lgs. 196/2003 e successive modifiche).
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">2. Categorie di dati raccolti</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Dati di registrazione</strong>: email, nome, data di nascita, ruolo (studente/formatore).</li>
            <li><strong>Dati di profilo</strong>: handle, biografia, immagine profilo, immagine di copertina (volontari).</li>
            <li><strong>Contenuti pubblicati dai formatori</strong>: titoli e descrizioni dei corsi, lezioni (testo, video, immagini, allegati come PDF/DOC/XLS/PPT/ZIP/TXT/CSV), live, post di community, sales page (cosa imparerai, per chi è, FAQ, bonus).</li>
            <li><strong>Dati relativi all'abbonamento del formatore</strong>: piano attivo (Base/Starter/Grow/Master), data di sottoscrizione, scadenza, riferimento esterno al pagamento (es. ID transazione del provider).</li>
            <li><strong>Accessi ai contenuti</strong>: log di concessione accesso a corsi e live, sorgente del pagamento (manuale/webhook), riferimento esterno.</li>
            <li><strong>KPI e metriche aggregate</strong>: numero di visualizzazioni, conversioni stimate, segmentazione del formatore (starter/growing/pro/elite), bozze automatiche dei corsi (autosave). Questi dati servono al formatore per ottimizzare i propri contenuti e a Menia per il ranking dei corsi.</li>
            <li><strong>Log tecnici</strong>: indirizzo IP, user agent, timestamp di accesso e operazioni rilevanti (login, registrazione, modifiche al profilo).</li>
            <li><strong>Cookie</strong>: di sessione, di preferenza e — solo previo consenso — di analisi. Vedi la <a href="/cookie-policy" className="text-primary hover:underline">Cookie Policy</a>.</li>
            <li><strong>Comunicazioni</strong>: messaggi inviati al supporto, segnalazioni di abuso, richieste GDPR.</li>
          </ul>
          <p className="mt-2">
            <strong>Menia non raccoglie né conserva dati di carte di credito o coordinate
            bancarie</strong>: i pagamenti dei corsi avvengono interamente sui provider esterni
            scelti dal formatore.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">3. Finalità e basi giuridiche</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Erogazione del servizio</strong> (creazione account, pubblicazione corsi, accesso ai contenuti acquistati, gestione community e live) — base giuridica: esecuzione di un contratto (art. 6.1.b GDPR).</li>
            <li><strong>Sicurezza, prevenzione abusi, antifrode</strong> — base giuridica: legittimo interesse del titolare (art. 6.1.f).</li>
            <li><strong>Adempimenti contabili e fiscali</strong> relativi all'abbonamento dei formatori — base giuridica: obbligo legale (art. 6.1.c).</li>
            <li><strong>Analisi di utilizzo</strong> (cookie analytics, KPI aggregati anonimizzati) — base giuridica: consenso (art. 6.1.a), revocabile in ogni momento dalle <a href="/privacy-settings" className="text-primary hover:underline">impostazioni privacy</a>.</li>
            <li><strong>Comunicazioni di marketing</strong> (es. newsletter, novità prodotto) — base giuridica: consenso, revocabile.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">4. Pagamenti e provider esterni</h2>
          <p>
            I pagamenti per l'accesso ai corsi e alle live sono gestiti direttamente dai provider
            scelti dal formatore (Stripe Payment Link, Gumroad, Lemon Squeezy o altri). Quando
            clicchi sul link di pagamento di un corso, vieni reindirizzato sulla piattaforma del
            provider, che applica la propria informativa privacy. Menia riceve dal formatore (o
            dal webhook del provider) solo l'esito del pagamento e un riferimento esterno
            (transaction ID) per attivare il tuo accesso.
          </p>
          <p className="mt-2">
            L'abbonamento mensile dei formatori (Base/Starter/Grow/Master) è anch'esso gestito
            tramite link di pagamento esterno. Menia conserva solo i dati di stato (piano,
            scadenza, riferimento), non i dati della carta.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">5. Destinatari e fornitori</h2>
          <p>
            I dati possono essere trattati per nostro conto da fornitori (responsabili del
            trattamento) che ci forniscono servizi tecnologici:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li><strong>Supabase</strong> (database, autenticazione, storage di video, immagini e allegati)</li>
            <li><strong>Hetzner</strong> (infrastruttura server in EU)</li>
            <li><strong>Provider email</strong> per comunicazioni transazionali</li>
            <li><strong>Provider di pagamento</strong> scelti dai formatori (Stripe, Gumroad, Lemon Squeezy, ecc.) — autonomi titolari per la propria parte di trattamento</li>
            <li><strong>Sentry</strong> (monitoraggio errori, anonimizzato)</li>
          </ul>
          <p className="mt-2">
            I dati non vengono ceduti né venduti a terze parti per finalità di marketing.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">6. Trasferimenti extra-UE</h2>
          <p>
            Quando un fornitore opera al di fuori dello Spazio Economico Europeo, il trasferimento
            avviene con garanzie adeguate, tipicamente le Clausole Contrattuali Standard approvate
            dalla Commissione Europea (art. 46 GDPR). Puoi richiedere copia delle garanzie scrivendo
            a <a href="mailto:privacy@menia.io" className="text-primary hover:underline">privacy@menia.io</a>.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">7. Periodo di conservazione</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Dati di account e profilo</strong>: per tutta la durata dell'iscrizione, fino alla richiesta di cancellazione (eseguita entro 30 giorni).</li>
            <li><strong>Contenuti pubblicati</strong>: fino alla cancellazione da parte del formatore o dell'account.</li>
            <li><strong>Log tecnici e log di consenso</strong>: 12 mesi.</li>
            <li><strong>Bozze automatiche dei corsi (autosave)</strong>: massimo 5 versioni più recenti, eliminate da cron giornaliero.</li>
            <li><strong>Dati contabili</strong> (abbonamenti formatori, fatture): 10 anni come da normativa fiscale.</li>
            <li><strong>Dati di accessi cancellati</strong>: anonimizzati entro 30 giorni dalla richiesta di chiusura account, salvo obblighi di conservazione di legge.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">8. Diritti dell'interessato</h2>
          <p>
            In qualunque momento puoi esercitare i diritti previsti dagli artt. 15-22 GDPR:
            accesso, rettifica, cancellazione (diritto all'oblio), limitazione, portabilità,
            opposizione, revoca del consenso.
          </p>
          <p className="mt-2">
            Puoi farlo direttamente dalle <a href="/privacy-settings" className="text-primary hover:underline">Impostazioni Privacy</a> del
            tuo account (export dati in formato JSON, richiesta di cancellazione, gestione consensi)
            oppure scrivendo a <a href="mailto:privacy@menia.io" className="text-primary hover:underline">privacy@menia.io</a>.
            Risponderemo entro 30 giorni.
          </p>
          <p className="mt-2">
            Hai inoltre diritto di proporre reclamo all'autorità di controllo competente (in Italia:
            Garante per la Protezione dei Dati Personali — <a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer" className="text-primary hover:underline">www.garanteprivacy.it</a>).
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">9. Minori</h2>
          <p>
            L'iscrizione come studente è consentita dai 16 anni in su; come formatore dai 18 anni.
            Effettuiamo una verifica dell'età al momento della registrazione. Se rileviamo un
            account intestato a un minore al di sotto dell'età minima, lo sospendiamo e lo
            cancelliamo entro 30 giorni.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">10. Modifiche alla policy</h2>
          <p>
            Aggiornamenti significativi saranno comunicati via email e tramite avviso in
            piattaforma. La data di "ultimo aggiornamento" in cima a questa pagina indica la
            versione attualmente in vigore.
          </p>
        </section>
      </div>
    </div>
  );
}
