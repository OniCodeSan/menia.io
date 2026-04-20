import { Shield, Mail } from "lucide-react";
import SEO from "@/components/shared/SEO";
import { useLanguage } from "@/lib/LanguageContext";

export default function PrivacyPolicy() {
  const { t } = useLanguage();
  const p = t.privacy;

  const SECTIONS = [
    {
      title: p.s1title,
      body: (
        <p>{p.s1body} <a href="mailto:privacy@tokaro.fans" className="text-primary hover:underline">privacy@tokaro.fans</a>.</p>
      ),
    },
    {
      title: p.s2title,
      body: (
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>{p.s2account}</strong>: {p.s2accountDesc}</li>
          <li><strong>{p.s2usage}</strong>: {p.s2usageDesc}</li>
          <li><strong>{p.s2payment}</strong>: {p.s2paymentDesc}</li>
          <li><strong>{p.s2technical}</strong>: {p.s2technicalDesc}</li>
        </ul>
      ),
    },
    {
      title: p.s3title,
      body: (
        <ul className="list-disc pl-5 space-y-1.5">
          {p.s3items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      ),
    },
    { title: p.s4title, body: <p>{p.s4body}</p> },
    {
      title: p.s5title,
      body: (
        <>
          <p className="mb-2">{p.s5intro}</p>
          <ul className="list-disc pl-5 space-y-1.5">
            {p.s5items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </>
      ),
    },
    { title: p.s6title, body: <p>{p.s6body}</p> },
    { title: p.s7title, body: <p>{p.s7body}</p> },
    { title: p.s8title, body: <p>{p.s8body}</p> },
  ];

  return (
    <div className="min-h-screen">
      <SEO title={p.title} description={p.seoDescription} url="/privacy" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">{p.title}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">{p.lastUpdate}</p>

        <div className="space-y-8">
          {SECTIONS.map((sec) => (
            <section key={sec.title} className="bg-card/40 border border-border/30 rounded-2xl p-5 sm:p-6">
              <h2 className="font-heading font-bold text-lg mb-3">{sec.title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                {sec.body}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 p-5 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
          <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">{p.contactTitle}</p>
            <p className="text-muted-foreground">
              {p.contactText}{" "}
              <a href="mailto:privacy@tokaro.fans" className="text-primary hover:underline">
                privacy@tokaro.fans
              </a>{" "}
              {p.contactResponse}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
