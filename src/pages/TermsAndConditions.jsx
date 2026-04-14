import { useLanguage } from "@/lib/LanguageContext";

const PLANS = [
  ["0 – 100", "Gratuito / Free / Gratuit / Kostenlos / Gratis / Бесплатно"],
  ["101 – 1.000", "€10"],
  ["1.001 – 5.000", "€30"],
  ["5.001 – 10.000", "€50"],
  ["10.001 – 30.000", "€80"],
  ["30.001 – 100.000", "€100"],
  ["100.001 – 500.000", "€200"],
  ["> 500.000", "€300"],
];

function Section({ title, children }) {
  return (
    <div>
      <h2 className="font-heading text-lg font-bold mb-3 text-foreground border-b border-border/30 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function List({ items }) {
  return (
    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

export default function TermsAndConditions() {
  const { t } = useLanguage();
  const tc = t.terms;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-heading text-3xl font-bold mb-2">{tc.title}</h1>
      <p className="text-sm text-muted-foreground mb-10">{tc.lastUpdated}</p>

      <div className="space-y-8">
        <p className="text-muted-foreground leading-relaxed">{tc.intro}</p>

        <Section title={tc.s1.title}>
          <List items={tc.s1.items} />
        </Section>

        <Section title={tc.s2.title}>
          <p className="text-muted-foreground mb-2">{tc.s2.intro}</p>
          <List items={tc.s2.items} />
          <p className="text-muted-foreground mt-2">{tc.s2.outro}</p>
        </Section>

        <Section title={tc.s3.title}>
          <p className="text-muted-foreground mb-2">{tc.s3.creatorIntro}</p>
          <List items={tc.s3.creatorItems} />
          <p className="text-muted-foreground mt-4 mb-2">{tc.s3.fanIntro}</p>
          <List items={tc.s3.fanItems} />
        </Section>

        <Section title={tc.s4.title}>
          <p className="font-semibold text-foreground mb-1">{tc.s4.trialTitle}</p>
          <List items={tc.s4.trialItems} />
          <p className="font-semibold text-foreground mt-4 mb-3">{tc.s4.plansTitle}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border/40 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="text-left px-4 py-3 font-semibold">{tc.s4.colFollowers}</th>
                  <th className="text-left px-4 py-3 font-semibold">{tc.s4.colCost}</th>
                </tr>
              </thead>
              <tbody>
                {PLANS.map(([range, cost], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-card/30" : "bg-card/10"}>
                    <td className="px-4 py-2.5 text-muted-foreground">{range}</td>
                    <td className="px-4 py-2.5 font-semibold text-foreground">{cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground mt-3">{tc.s4.outro}</p>
        </Section>

        <Section title={tc.s5.title}>
          <p className="font-semibold text-foreground mb-1">{tc.s5.buyTitle}</p>
          <List items={tc.s5.buyItems} />
          <p className="font-semibold text-foreground mt-4 mb-1">{tc.s5.useTitle}</p>
          <List items={tc.s5.useItems} />
          <p className="font-semibold text-foreground mt-4 mb-1">{tc.s5.refundTitle}</p>
          <p className="text-muted-foreground">{tc.s5.refundText}</p>
        </Section>

        <Section title={tc.s6.title}>
          <List items={tc.s6.items} />
        </Section>

        <Section title={tc.s7.title}>
          <List items={tc.s7.items} />
        </Section>

        <Section title={tc.s8.title}>
          <p className="text-muted-foreground mb-2">{tc.s8.intro}</p>
          <List items={tc.s8.items} />
          <p className="text-muted-foreground mt-2">{tc.s8.outro}</p>
        </Section>

        <Section title={tc.s9.title}>
          <p className="text-muted-foreground mb-2">{tc.s9.intro}</p>
          <List items={tc.s9.items} />
        </Section>

        <Section title={tc.s10.title}>
          <p className="text-muted-foreground mb-2">{tc.s10.intro}</p>
          <List items={tc.s10.items} />
          <p className="text-muted-foreground mt-2">{tc.s10.outro}</p>
        </Section>

        <Section title={tc.s11.title}>
          <p className="text-muted-foreground mb-2">{tc.s11.intro}</p>
          <List items={tc.s11.items} />
        </Section>

        <Section title={tc.s12.title}>
          <p className="text-muted-foreground">{tc.s12.text}</p>
        </Section>

        <Section title={tc.s13.title}>
          <p className="text-muted-foreground">{tc.s13.text}</p>
        </Section>

        <Section title={tc.s14.title}>
          <p className="text-muted-foreground">{tc.s14.text}</p>
        </Section>

        <Section title={tc.s15.title}>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Email: <a href="mailto:support@tokaro.fans" className="text-primary hover:underline">support@tokaro.fans</a></li>
            <li>Website: <a href="https://www.tokaro.fans" className="text-primary hover:underline">tokaro.fans</a></li>
          </ul>
        </Section>

        <Section title={tc.s16.title}>
          {[
            { title: tc.s16.s1title, intro: tc.s16.s1intro, items: tc.s16.s1items, outro: tc.s16.s1outro },
            { title: tc.s16.s2title, text: tc.s16.s2text },
            { title: tc.s16.s3title, intro: tc.s16.s3intro, items: tc.s16.s3items },
            { title: tc.s16.s4title, intro: tc.s16.s4intro, items: tc.s16.s4items, outro: tc.s16.s4outro },
            { title: tc.s16.s5title, intro: tc.s16.s5intro, items: tc.s16.s5items },
            { title: tc.s16.s6title, intro: tc.s16.s6intro, items: tc.s16.s6items },
            { title: tc.s16.s7title, intro: tc.s16.s7intro, items: tc.s16.s7items },
          ].map((sub, i) => (
            <div key={i} className={i > 0 ? "mt-5" : ""}>
              <p className="font-semibold text-foreground mb-1">{sub.title}</p>
              {sub.intro && <p className="text-muted-foreground mb-2">{sub.intro}</p>}
              {sub.text && <p className="text-muted-foreground">{sub.text}</p>}
              {sub.items && <List items={sub.items} />}
              {sub.outro && <p className="text-muted-foreground mt-2">{sub.outro}</p>}
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}