import { Cookie, Mail } from "lucide-react";
import SEO from "@/components/shared/SEO";
import { useLanguage } from "@/lib/LanguageContext";

export default function CookiePolicy() {
  const { t } = useLanguage();
  const cp = t.cookiePolicy;

  const SECTIONS = [
    {
      title: cp.s1title,
      body: <p>{cp.s1body}</p>,
    },
    {
      title: cp.s2title,
      body: (
        <>
          <p className="mb-2">{cp.s2intro}</p>
          <table className="w-full text-sm border border-border/30 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-secondary/30">
                <th className="text-left px-3 py-2 font-semibold">{cp.thCookie}</th>
                <th className="text-left px-3 py-2 font-semibold">{cp.thPurpose}</th>
                <th className="text-left px-3 py-2 font-semibold">{cp.thDuration}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              <tr><td className="px-3 py-2">tokaro:sb</td><td className="px-3 py-2">{cp.techCookie1purpose}</td><td className="px-3 py-2">{cp.techCookie1duration}</td></tr>
              <tr><td className="px-3 py-2">tokaro:cookie_consent</td><td className="px-3 py-2">{cp.techCookie2purpose}</td><td className="px-3 py-2">{cp.techCookie2duration}</td></tr>
              <tr><td className="px-3 py-2">tokaro:lang</td><td className="px-3 py-2">{cp.techCookie3purpose}</td><td className="px-3 py-2">{cp.techCookie3duration}</td></tr>
            </tbody>
          </table>
        </>
      ),
    },
    {
      title: cp.s3title,
      body: (
        <>
          <p className="mb-2">{cp.s3intro}</p>
          <table className="w-full text-sm border border-border/30 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-secondary/30">
                <th className="text-left px-3 py-2 font-semibold">{cp.thCookie}</th>
                <th className="text-left px-3 py-2 font-semibold">{cp.thPurpose}</th>
                <th className="text-left px-3 py-2 font-semibold">{cp.thDuration}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              <tr><td className="px-3 py-2">_ga</td><td className="px-3 py-2">{cp.analyticsCookie1purpose}</td><td className="px-3 py-2">{cp.analyticsCookie1duration}</td></tr>
              <tr><td className="px-3 py-2">_ga_*</td><td className="px-3 py-2">{cp.analyticsCookie2purpose}</td><td className="px-3 py-2">{cp.analyticsCookie2duration}</td></tr>
            </tbody>
          </table>
        </>
      ),
    },
    {
      title: cp.s4title,
      body: (
        <>
          <p className="mb-2">{cp.s4intro}</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Supabase</strong> — {cp.s4supabase} <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{cp.s4supabaseLink}</a></li>
            <li><strong>Google</strong> — {cp.s4google} <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{cp.s4googleLink}</a></li>
          </ul>
        </>
      ),
    },
    {
      title: cp.s5title,
      body: (
        <>
          <p className="mb-2">{cp.s5intro}</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>{cp.s5banner}</strong> — {cp.s5bannerDesc}</li>
            <li><strong>{cp.s5browser}</strong> — {cp.s5browserDesc}</li>
          </ul>
        </>
      ),
    },
    {
      title: cp.s6title,
      body: (
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>{cp.s6technical}</strong>: {cp.s6technicalDesc}</li>
          <li><strong>{cp.s6analytics}</strong>: {cp.s6analyticsDesc}</li>
        </ul>
      ),
    },
    {
      title: cp.s7title,
      body: <p>{cp.s7body}</p>,
    },
  ];

  return (
    <div className="min-h-screen">
      <SEO title={cp.title} description={cp.seoDescription} url="/cookie-policy" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-chart-4/10 border border-chart-4/20 flex items-center justify-center">
            <Cookie className="w-5 h-5 text-chart-4" />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">{cp.title}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">{cp.lastUpdate}</p>

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

        <div className="mt-10 p-5 rounded-2xl bg-chart-4/5 border border-chart-4/20 flex items-start gap-3">
          <Mail className="w-5 h-5 text-chart-4 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">{cp.contactTitle}</p>
            <p className="text-muted-foreground">
              {cp.contactText}{" "}
              <a href="mailto:privacy@tokaro.fans" className="text-primary hover:underline">
                privacy@tokaro.fans
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
