export default function TermsAndConditions() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-heading text-2xl font-bold mb-6">Termini e Condizioni d'uso</h1>
      <p className="text-xs text-muted-foreground mb-6">Ultimo aggiornamento: 30 aprile 2026</p>
      <div className="bg-card border border-border/30 rounded-2xl p-6 space-y-5 text-sm leading-relaxed">

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">1. Oggetto del servizio</h2>
          <p>
            Menia è una piattaforma di formazione online che permette ai formatori (di seguito anche
            "creator") di pubblicare <strong>corsi</strong> con lezioni video e materiali didattici
            (PDF, slide, fogli di calcolo, dispense) e gestire una <strong>community privata</strong>
            per i propri studenti.
            Menia fornisce esclusivamente l'infrastruttura tecnologica: <strong>non incassa
            direttamente i pagamenti</strong> dei corsi, che vengono gestiti dal formatore tramite
            provider esterni (Stripe Payment Link, Gumroad, Lemon Squeezy o altri di sua scelta).
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">2. Account e ruoli</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Studente</strong> (account "fan" nel sistema): chi acquista o accede ai corsi. Età minima: 16 anni.</li>
            <li><strong>Formatore</strong> (account "creator" nel sistema): chi pubblica corsi e contenuti. Età minima: 18 anni.</li>
          </ul>
          <p className="mt-2">
            È richiesta la fornitura di informazioni accurate (email, nome, data di nascita).
            L'utente è responsabile della sicurezza delle credenziali e di ogni attività svolta dal
            proprio account.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">3. Piani per formatori</h2>
          <p>
            La pubblicazione e gestione dei contenuti formativi è soggetta a un piano di abbonamento
            mensile a carico del formatore:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Base</strong> — €4,99/mese — 1 corso</li>
            <li><strong>Starter</strong> — €14,90/mese — 5 corsi</li>
            <li><strong>Grow</strong> — €29,90/mese — 15 corsi</li>
            <li><strong>Master</strong> — pacchetto su misura, attivato tramite contatto diretto con Menia</li>
          </ul>
          <p className="mt-2">
            L'abbonamento è mensile, rinnovabile automaticamente, e si attiva tramite link di
            pagamento esterno o, in casi specifici, su attivazione manuale dopo verifica del
            pagamento. La cancellazione comporta il mantenimento del piano fino alla scadenza
            corrente; il formatore conserva sempre i propri contenuti già pubblicati ma può
            essere soggetto a limiti del piano inferiore alla riattivazione.
          </p>
          <p className="mt-2">
            <strong>Diritto di recesso (consumatori UE):</strong> il formatore consumatore può
            recedere entro 14 giorni dalla sottoscrizione di un piano scrivendo a{" "}
            <a href="mailto:legal@menia.io" className="text-primary hover:underline">legal@menia.io</a>,
            salvo esecuzione anticipata del servizio espressamente richiesta. In quest'ultimo caso
            l'utente è tenuto al pagamento proporzionale al periodo già fruito.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">4. Pagamenti dei corsi</h2>
          <p>
            I pagamenti per l'accesso ai corsi avvengono <strong>esclusivamente tramite il
            link di pagamento esterno</strong> indicato dal formatore. Menia non incassa, non
            conserva dati di carte di credito, non gestisce rimborsi e non applica commissioni
            sulle vendite del formatore.
          </p>
          <p className="mt-2">
            Una volta completato il pagamento sul provider esterno, l'accesso al contenuto viene
            abilitato dal team Menia (manualmente, dopo verifica) o automaticamente tramite
            webhook quando configurato dal formatore. Eventuali rimborsi, controversie sui
            pagamenti, addebiti errati o chargeback devono essere risolti direttamente fra studente
            e formatore tramite il provider di pagamento utilizzato.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">5. Contenuti e Content Policy</h2>
          <p>
            Tutti i contenuti caricati dal formatore (testo, video, immagini, allegati, post di
            community) devono rispettare la <a href="/policy" className="text-primary hover:underline">Content Policy</a>{" "}
            di Menia. La piattaforma non ammette contenuti per adulti, espliciti, illegali,
            discriminatori o che violino diritti di terzi. La violazione comporta la rimozione
            immediata del contenuto e, nei casi gravi, la sospensione o chiusura permanente
            dell'account.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">6. Diritti e responsabilità del formatore</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Il formatore conserva ogni diritto d'autore sui contenuti pubblicati e concede a Menia una licenza non esclusiva, gratuita e revocabile per ospitare, distribuire e mostrare tali contenuti agli studenti, nei limiti necessari all'erogazione del servizio.</li>
            <li>Il formatore è l'unico responsabile della qualità, accuratezza e legalità dei contenuti, nonché della titolarità dei diritti d'immagine, marchio e copyright.</li>
            <li>Il formatore è responsabile della veridicità delle promesse formative e commerciali (titoli, descrizioni, sales page, FAQ). Non sono ammessi claim ingannevoli (es: "guadagni garantiti").</li>
            <li>Il formatore è tenuto a rispondere in modo professionale alle richieste degli studenti e a tenere aggiornati i contenuti.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">7. Limitazione di responsabilità</h2>
          <p>
            Menia fornisce la piattaforma "così com'è" (as is) e "come disponibile" (as available).
            Non garantisce risultati formativi, finanziari, professionali o di carriera derivanti
            dall'utilizzo dei contenuti. Menia non è parte dei contratti fra studente e formatore
            e non è responsabile per controversie relative a qualità, contenuto o prezzi dei corsi,
            che dovranno essere risolte direttamente fra le parti.
          </p>
          <p className="mt-2">
            Menia non garantisce la continuità ininterrotta del servizio e si riserva il diritto
            di effettuare manutenzioni programmate o straordinarie senza preavviso.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">8. Sospensione e chiusura account</h2>
          <p>
            Menia può sospendere o chiudere account che violano questi termini, la Content Policy
            o le leggi applicabili. In caso di violazioni gravi (contenuti illeciti, sfruttamento
            di minori, frode), la chiusura è immediata e senza preavviso, con eventuale segnalazione
            alle autorità competenti.
          </p>
          <p className="mt-2">
            Il mancato pagamento dell'abbonamento del formatore comporta il declassamento al piano
            Base o, in mancanza, la sospensione delle funzioni di pubblicazione. I contenuti già
            pubblicati restano accessibili agli studenti che hanno già pagato l'accesso.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">9. Modifiche ai termini</h2>
          <p>
            Menia può aggiornare questi termini per esigenze normative, tecniche o di servizio.
            Le modifiche sostanziali saranno comunicate via email e tramite avviso in piattaforma
            con almeno 15 giorni di preavviso. L'uso continuato della piattaforma dopo le modifiche
            costituisce accettazione delle stesse.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">10. Legge applicabile e foro competente</h2>
          <p>
            Questi termini sono disciplinati dalla legge italiana. Per ogni controversia con un
            consumatore è competente il foro di residenza del consumatore stesso, ai sensi del
            Codice del Consumo. Per controversie con utenti professionali è competente in via
            esclusiva il foro di Milano.
          </p>
          <p className="mt-2">
            È fatto salvo il diritto del consumatore di rivolgersi alla piattaforma di risoluzione
            online delle controversie della Commissione Europea (
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              ec.europa.eu/consumers/odr
            </a>).
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-2">11. Contatti</h2>
          <p>
            Per domande sui termini scrivi a{" "}
            <a href="mailto:legal@menia.io" className="text-primary hover:underline">legal@menia.io</a>.
            Per segnalazioni sui contenuti:{" "}
            <a href="mailto:abuse@menia.io" className="text-primary hover:underline">abuse@menia.io</a>.
            Per privacy:{" "}
            <a href="mailto:privacy@menia.io" className="text-primary hover:underline">privacy@menia.io</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
