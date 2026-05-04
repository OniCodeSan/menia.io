import { ShieldAlert, Ban, AlertTriangle, FileText, Users } from "lucide-react";

export default function ContentPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="w-7 h-7 text-primary" />
        <div>
          <h1 className="font-heading text-2xl font-bold">Content Policy</h1>
          <p className="text-xs text-muted-foreground">Ultimo aggiornamento: 30 aprile 2026</p>
        </div>
      </div>

      <div className="bg-card border border-border/30 rounded-2xl p-6 space-y-6">
        <section>
          <p className="text-sm leading-relaxed">
            Menia è una piattaforma di formazione che ospita corsi, lezioni video, materiali
            didattici, live e community gestite dai formatori. Tutti i contenuti — testo, video,
            immagini, allegati (PDF, DOC, XLS, PPT, ZIP, ecc.), post di community e materiali
            promozionali — devono rispettare le regole indicate qui di seguito. La violazione
            comporta la rimozione del contenuto e, nei casi gravi, la sospensione o chiusura
            permanente dell'account.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg flex items-center gap-2 mb-3">
            <Ban className="w-5 h-5 text-destructive" /> Contenuti vietati
          </h2>
          <ul className="text-sm space-y-2 list-disc list-inside leading-relaxed">
            <li><strong>Contenuti per adulti, espliciti o sessuali</strong>: nudità totale o parziale, contenuti suggestivi o destinati a un'audience adulta, simulazioni di atti sessuali. Menia non ospita contenuti adult.</li>
            <li><strong>Sfruttamento, abuso o messa in pericolo di minori</strong>: tolleranza zero. Segnalazione immediata alle autorità competenti.</li>
            <li><strong>Violenza esplicita</strong>, gore, automutilazione, contenuti che promuovono o glorificano il suicidio.</li>
            <li><strong>Discriminazione, hate speech, incitamento all'odio</strong> o alla violenza basato su etnia, religione, genere, orientamento sessuale, disabilità o nazionalità.</li>
            <li><strong>Attività illegali</strong>: vendita di sostanze illegali, armi, frodi finanziarie, schemi piramidali (Ponzi, MLM ingannevoli), doxing, hacking offensivo, distribuzione di software o contenuti pirata.</li>
            <li><strong>Disinformazione pericolosa</strong> in ambito sanitario, finanziario, legale o scientifico che possa causare danni reali agli studenti (es. consigli medici non qualificati, garanzie di guadagno, schemi di evasione fiscale).</li>
            <li><strong>Violazioni di copyright, marchio o diritti d'immagine</strong>: il formatore garantisce di possedere o avere licenza per ogni materiale caricato (video, immagini, brani, slide, citazioni di libri, ecc.).</li>
            <li><strong>Spam, pratiche commerciali ingannevoli, claim non veritieri</strong>: titoli, descrizioni e FAQ devono riflettere il reale contenuto del corso. Vietati slogan tipo "guadagni garantiti", "diventerai milionario in 30 giorni", "1.000 € al mese senza fare nulla".</li>
            <li><strong>Materiale generato da AI presentato come umano</strong> senza disclosure quando rilevante per l'insegnamento (es. caso studio falsi, screenshot fabbricati).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-primary" /> Responsabilità del formatore
          </h2>
          <ul className="text-sm space-y-2 list-disc list-inside leading-relaxed">
            <li>Il formatore è l'unico responsabile dei contenuti che pubblica, dei diritti d'autore, di immagine e di marchio associati, e delle informazioni promesse nelle sales page del corso.</li>
            <li>Le promesse formative devono essere veritiere, ragionevoli e supportabili. Sono vietati claim ingannevoli relativi a guadagni, risultati professionali o di salute.</li>
            <li>I prezzi indicati sul corso (sia sulla card che nella sales page) devono coincidere con quelli del provider di pagamento esterno.</li>
            <li>Rimborsi, controversie e chargeback sono gestiti direttamente fra formatore e studente attraverso il provider di pagamento esterno scelto dal formatore. Menia non è parte di queste transazioni.</li>
            <li>Il formatore deve mantenere aggiornati i contenuti, rispondere alle domande degli studenti in tempi ragionevoli e onorare gli orari delle live programmate.</li>
            <li>I file caricati come allegati (PDF, DOC, XLS, PPT, ZIP, TXT, CSV, max 25MB) devono rispettare le stesse regole dei contenuti pubblici e non devono contenere malware o dati riservati di terzi.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-chart-3" /> Comportamento degli studenti
          </h2>
          <ul className="text-sm space-y-2 list-disc list-inside leading-relaxed">
            <li>Lo studente non può ridistribuire, condividere o rivendere i contenuti acquistati (download di video o materiali, condivisione delle credenziali con terzi, ripubblicazione su altri canali).</li>
            <li>Nelle community e nelle live è richiesto un comportamento rispettoso. Sono vietati insulti, molestie, spam, promozione non autorizzata di altri prodotti.</li>
            <li>La condivisione delle proprie credenziali account comporta la sospensione dell'accesso senza diritto a rimborso.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-chart-4" /> Diritto di rimozione e sospensione
          </h2>
          <p className="text-sm leading-relaxed">
            Menia si riserva il diritto, a propria insindacabile discrezione, di rimuovere qualunque
            contenuto che violi questa policy, le condizioni d'uso o le leggi applicabili, anche
            senza preavviso. Account che violano ripetutamente la policy possono essere sospesi
            temporaneamente o chiusi in modo permanente. Le violazioni gravi (in particolare
            contenuti che coinvolgono minori, frodi sistematiche, contenuti illegali) comportano
            la chiusura immediata, la conservazione delle prove e la segnalazione alle autorità
            competenti.
          </p>
        </section>

        <section>
          <h2 className="font-heading font-bold text-lg mb-3">Segnalazioni</h2>
          <p className="text-sm leading-relaxed">
            Per segnalare un contenuto che ritieni violi questa policy scrivi a{" "}
            <a href="mailto:abuse@menia.io" className="text-primary hover:underline">abuse@menia.io</a>{" "}
            indicando l'URL del contenuto, una breve descrizione e (se possibile) una prova
            (screenshot, link). Esamineremo ogni segnalazione entro 72 ore lavorative e ti
            comunicheremo l'esito. Le segnalazioni in malafede o ripetute possono comportare
            la chiusura dell'account del segnalante.
          </p>
        </section>
      </div>
    </div>
  );
}
