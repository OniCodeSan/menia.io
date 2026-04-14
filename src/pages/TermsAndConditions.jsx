export default function TermsAndConditions() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-heading text-3xl font-bold mb-2">Termini e Condizioni di Utilizzo</h1>
      <p className="text-sm text-muted-foreground mb-10">Ultimo aggiornamento: Aprile 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-foreground">

        <p className="text-muted-foreground leading-relaxed">
          Benvenuto su Tokaro.fans ("Tokaro", "Piattaforma", "noi", "ci", "nostro"). L'accesso e l'utilizzo della piattaforma sono regolati dai presenti Termini e Condizioni ("Termini"). Utilizzando Tokaro.fans, l'utente accetta integralmente quanto qui stabilito.
        </p>

        <Section title="1. Definizioni">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong className="text-foreground">Piattaforma:</strong> il sito web Tokaro.fans e i relativi servizi digitali.</li>
            <li><strong className="text-foreground">Utente:</strong> qualsiasi persona che accede o utilizza la piattaforma.</li>
            <li><strong className="text-foreground">Creator:</strong> utente che pubblica contenuti e li rende disponibili a pagamento.</li>
            <li><strong className="text-foreground">Fan:</strong> utente che acquista token o accede ai contenuti dei creator.</li>
            <li><strong className="text-foreground">Token:</strong> unità digitale di credito utilizzabile esclusivamente all'interno della piattaforma.</li>
            <li><strong className="text-foreground">Contenuti:</strong> materiali caricati dai creator, inclusi testi, immagini, video, audio e live streaming.</li>
          </ul>
        </Section>

        <Section title="2. Idoneità e Registrazione">
          <p className="text-muted-foreground mb-2">Per utilizzare Tokaro è necessario:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Avere almeno 18 anni.</li>
            <li>Fornire informazioni veritiere e aggiornate.</li>
            <li>Mantenere riservate le proprie credenziali di accesso.</li>
            <li>Accettare le procedure di verifica dell'identità (KYC) per i creator.</li>
          </ul>
          <p className="text-muted-foreground mt-2">Tokaro si riserva il diritto di sospendere o chiudere account che violino tali requisiti.</p>
        </Section>

        <Section title="3. Servizi Offerti">
          <p className="text-muted-foreground mb-2">Tokaro consente ai creator di:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
            <li>Pubblicare contenuti digitali.</li>
            <li>Monetizzare attraverso token, abbonamenti e donazioni.</li>
            <li>Interagire con i fan tramite messaggi e live streaming.</li>
          </ul>
          <p className="text-muted-foreground mb-2">I fan possono:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Acquistare token.</li>
            <li>Accedere ai contenuti dei creator.</li>
            <li>Supportare economicamente i creator.</li>
          </ul>
        </Section>

        <Section title="4. Struttura dei Costi per i Creator">
          <p className="font-semibold text-foreground mb-1">4.1 Periodo di prova</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
            <li>I creator con più di 100 follower beneficiano di un periodo di prova gratuito di 30 giorni.</li>
            <li>I creator con fino a 100 follower possono utilizzare la piattaforma gratuitamente.</li>
          </ul>
          <p className="font-semibold text-foreground mb-3">4.2 Piani tariffari</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border/40 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="text-left px-4 py-3 font-semibold">Numero di follower</th>
                  <th className="text-left px-4 py-3 font-semibold">Costo mensile</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["0 – 100", "Gratuito"],
                  ["101 – 1.000", "€10"],
                  ["1.001 – 5.000", "€30"],
                  ["5.001 – 10.000", "€50"],
                  ["10.001 – 30.000", "€80"],
                  ["30.001 – 100.000", "€100"],
                  ["100.001 – 500.000", "€200"],
                  ["Oltre 500.000", "€300"],
                ].map(([range, cost], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-card/30" : "bg-card/10"}>
                    <td className="px-4 py-2.5 text-muted-foreground">{range}</td>
                    <td className="px-4 py-2.5 font-semibold text-foreground">{cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground mt-3">Tokaro si riserva il diritto di verificare il numero di follower tramite API ufficiali o controlli manuali.</p>
        </Section>

        <Section title="5. Sistema di Token">
          <p className="font-semibold text-foreground mb-1">5.1 Acquisto</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
            <li>I token rappresentano crediti digitali utilizzabili esclusivamente all'interno della piattaforma.</li>
            <li>Tokaro applica una commissione del 10% sul cambio da valuta reale a token.</li>
          </ul>
          <p className="font-semibold text-foreground mb-1">5.2 Utilizzo</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
            <li>I token possono essere utilizzati per acquistare contenuti, abbonamenti o effettuare donazioni.</li>
            <li>I token non costituiscono valuta elettronica o criptovaluta.</li>
          </ul>
          <p className="font-semibold text-foreground mb-1">5.3 Rimborso</p>
          <p className="text-muted-foreground">Salvo quanto previsto dalla legge, i token acquistati non sono rimborsabili e non possono essere convertiti nuovamente in denaro dai fan.</p>
        </Section>

        <Section title="6. Pagamenti e Payout ai Creator">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>I creator ricevono il 100% del valore dei token spesi dai fan, al netto delle eventuali commissioni di pagamento o prelievo.</li>
            <li>I payout sono soggetti a verifiche di sicurezza e conformità normativa (KYC/AML).</li>
            <li>Tokaro può applicare una commissione di prelievo per coprire i costi operativi.</li>
          </ul>
        </Section>

        <Section title="7. Contenuti e Proprietà Intellettuale">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>I creator mantengono la titolarità dei diritti sui propri contenuti.</li>
            <li>Con il caricamento dei contenuti, il creator concede a Tokaro una licenza non esclusiva per ospitare e distribuire tali contenuti sulla piattaforma.</li>
            <li>È vietata la riproduzione, distribuzione o condivisione non autorizzata dei contenuti da parte degli utenti.</li>
          </ul>
        </Section>

        <Section title="8. Contenuti Vietati">
          <p className="text-muted-foreground mb-2">È severamente vietata la pubblicazione di contenuti che:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-3">
            <li>Violino leggi o diritti di terzi.</li>
            <li>Coinvolgano minori o sfruttamento.</li>
            <li>Promuovano violenza, odio o discriminazione.</li>
            <li>Violino diritti di proprietà intellettuale.</li>
            <li>Contengano materiale illegale o fraudolento.</li>
          </ul>
          <p className="text-muted-foreground">Tokaro si riserva il diritto di rimuovere tali contenuti e sospendere gli account coinvolti.</p>
        </Section>

        <Section title="9. Migrazione dei Contenuti da Altre Piattaforme">
          <p className="text-muted-foreground mb-2">La migrazione dei contenuti è consentita solo se:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Il creator è titolare dei diritti.</li>
            <li>È stato fornito consenso esplicito e documentato.</li>
            <li>Sono rispettati i termini di servizio delle piattaforme di origine.</li>
          </ul>
        </Section>

        <Section title="10. Sospensione e Chiusura dell'Account">
          <p className="text-muted-foreground mb-2">Tokaro può sospendere o terminare un account in caso di:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-3">
            <li>Violazione dei presenti Termini.</li>
            <li>Attività fraudolente o sospette.</li>
            <li>Mancato pagamento delle tariffe previste.</li>
            <li>Richiesta delle autorità competenti.</li>
          </ul>
          <p className="text-muted-foreground">Gli utenti possono richiedere la chiusura del proprio account in qualsiasi momento.</p>
        </Section>

        <Section title="11. Limitazione di Responsabilità">
          <p className="text-muted-foreground mb-2">Tokaro agisce come intermediario tecnologico tra creator e fan e non è responsabile per:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>La qualità o la legalità dei contenuti pubblicati.</li>
            <li>Eventuali perdite economiche derivanti dall'utilizzo della piattaforma.</li>
            <li>Interruzioni temporanee del servizio per motivi tecnici o di manutenzione.</li>
          </ul>
        </Section>

        <Section title="12. Protezione dei Dati Personali">
          <p className="text-muted-foreground">Il trattamento dei dati personali avviene nel rispetto del Regolamento (UE) 2016/679 (GDPR). Per maggiori informazioni, consultare la Privacy Policy della piattaforma.</p>
        </Section>

        <Section title="13. Modifiche ai Termini">
          <p className="text-muted-foreground">Tokaro si riserva il diritto di modificare i presenti Termini in qualsiasi momento. Le modifiche saranno comunicate agli utenti e diventeranno efficaci dalla data di pubblicazione.</p>
        </Section>

        <Section title="14. Legge Applicabile e Foro Competente">
          <p className="text-muted-foreground">I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente in via esclusiva il foro del luogo in cui ha sede legale Tokaro, salvo diversa disposizione di legge a tutela dei consumatori.</p>
        </Section>

        <Section title="15. Contatti">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Email: <a href="mailto:support@tokaro.fans" className="text-primary hover:underline">support@tokaro.fans</a></li>
            <li>Sito web: <a href="https://www.tokaro.fans" className="text-primary hover:underline">https://www.tokaro.fans</a></li>
          </ul>
        </Section>

        <Section title="16. Mancato Pagamento della Fee del Creator">
          <p className="font-semibold text-foreground mb-1">16.1 Sospensione dell'account</p>
          <p className="text-muted-foreground mb-2">Nel caso in cui il Creator non provveda al pagamento della fee mensile entro la data di scadenza, Tokaro si riserva il diritto di:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
            <li>Sospendere temporaneamente l'account del Creator.</li>
            <li>Disabilitare la pubblicazione di nuovi contenuti.</li>
            <li>Limitare l'accesso ai contenuti da parte dei fan.</li>
            <li>Impedire l'avvio di nuove transazioni economiche.</li>
          </ul>
          <p className="text-muted-foreground mb-4">La sospensione non comporta la cancellazione immediata dell'account o dei contenuti.</p>

          <p className="font-semibold text-foreground mb-1">16.2 Periodo di tolleranza (Grace Period)</p>
          <p className="text-muted-foreground mb-4">Tokaro può concedere un periodo di tolleranza di 7–14 giorni dalla data di scadenza del pagamento, durante il quale il Creator potrà regolarizzare la propria posizione senza ulteriori conseguenze. Durante questo periodo alcune funzionalità potrebbero essere limitate.</p>

          <p className="font-semibold text-foreground mb-1">16.3 Fondi maturati dal Creator</p>
          <p className="text-muted-foreground mb-2">I fondi accumulati dal Creator e derivanti dai token spesi dai fan:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
            <li>Rimangono di proprietà del Creator anche in caso di sospensione dell'account.</li>
            <li>Possono essere prelevati, a condizione che il Creator completi con successo le procedure KYC/AML e non siano presenti attività fraudolente o violazioni dei Termini.</li>
            <li>Non possono essere utilizzati per compensare automaticamente la fee non pagata, salvo esplicito consenso del Creator.</li>
          </ul>

          <p className="font-semibold text-foreground mb-1">16.4 Blocco temporaneo dei payout</p>
          <p className="text-muted-foreground mb-2">Tokaro si riserva il diritto di sospendere temporaneamente i payout nei seguenti casi:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
            <li>Mancato pagamento della fee oltre il periodo di tolleranza.</li>
            <li>Necessità di verifiche amministrative, fiscali o di sicurezza.</li>
            <li>Presunte attività fraudolente o violazioni dei Termini.</li>
          </ul>
          <p className="text-muted-foreground mb-4">Una volta regolarizzato il pagamento, i payout verranno riattivati.</p>

          <p className="font-semibold text-foreground mb-1">16.5 Compensazione automatica (opzionale)</p>
          <p className="text-muted-foreground mb-2">Qualora il Creator fornisca esplicito consenso, Tokaro potrà:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
            <li>Dedurre automaticamente l'importo della fee mensile dai fondi disponibili nel saldo del Creator.</li>
            <li>Informare preventivamente il Creator dell'avvenuta compensazione tramite notifica email o dashboard.</li>
          </ul>

          <p className="font-semibold text-foreground mb-1">16.6 Chiusura dell'account per morosità</p>
          <p className="text-muted-foreground mb-2">Nel caso in cui il mancato pagamento persista per un periodo superiore a 60 giorni, Tokaro si riserva il diritto di:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
            <li>Procedere alla chiusura dell'account.</li>
            <li>Rimuovere i contenuti dalla piattaforma.</li>
            <li>Consentire comunque al Creator di richiedere il prelievo dei fondi maturati, salvo obblighi di legge o verifiche pendenti.</li>
          </ul>

          <p className="font-semibold text-foreground mb-1">16.7 Accesso ai contenuti da parte dei fan</p>
          <p className="text-muted-foreground mb-2">Durante il periodo di sospensione:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Gli abbonamenti attivi dei fan potranno essere temporaneamente sospesi.</li>
            <li>Tokaro si riserva il diritto di adottare misure di tutela per i fan, inclusi eventuali rimborsi o estensioni degli abbonamenti, ove applicabile.</li>
          </ul>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="font-heading text-lg font-bold mb-3 text-foreground border-b border-border/30 pb-2">{title}</h2>
      {children}
    </div>
  );
}