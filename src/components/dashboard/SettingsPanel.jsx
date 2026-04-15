import { useState } from "react";
import { motion } from "framer-motion";
import { User, Bell, CreditCard, Lock, Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const SECTIONS = [
  { id: "profile", label: "Profilo", icon: User },
  { id: "notifications", label: "Notifiche", icon: Bell },
  { id: "billing", label: "Pagamenti", icon: CreditCard },
  { id: "security", label: "Sicurezza", icon: Lock },
  { id: "appearance", label: "Aspetto", icon: Palette },
];

function ProfileSection() {
  return (
    <div className="space-y-5">
      <h3 className="font-heading font-bold text-base">Profilo Creator</h3>
      <div className="flex items-center gap-4">
        <img
          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face"
          alt="Avatar"
          className="w-16 h-16 rounded-full object-cover"
        />
        <div>
          <Button variant="outline" size="sm" className="border-border/50">Cambia foto</Button>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nome</Label>
          <Input defaultValue="Giulia M." className="bg-secondary/30 border-border/30 h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Username</Label>
          <Input defaultValue="@giulia.fit" className="bg-secondary/30 border-border/30 h-10" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Bio</Label>
          <textarea
            defaultValue="Creator fitness & wellness 🔥 Aiuto le persone a trasformarsi."
            className="w-full h-20 bg-secondary/30 border border-border/30 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input defaultValue="giulia@example.com" type="email" className="bg-secondary/30 border-border/30 h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Sito web</Label>
          <Input defaultValue="https://giulia.fit" className="bg-secondary/30 border-border/30 h-10" />
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Social</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Instagram</Label>
            <Input defaultValue="@giulia.fit" placeholder="@username" className="bg-secondary/30 border-border/30 h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">TikTok</Label>
            <Input defaultValue="@giuliafit" placeholder="@username" className="bg-secondary/30 border-border/30 h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">YouTube</Label>
            <Input defaultValue="" placeholder="https://youtube.com/@..." className="bg-secondary/30 border-border/30 h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Twitter / X</Label>
            <Input defaultValue="" placeholder="@username" className="bg-secondary/30 border-border/30 h-10" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsSection() {
  const items = [
    { label: "Nuovo abbonato", desc: "Ricevi una notifica quando qualcuno si abbona", defaultOn: true },
    { label: "Nuova donazione", desc: "Ricevi una notifica per ogni donazione ricevuta", defaultOn: true },
    { label: "Commenti ai post", desc: "Avvisi per nuovi commenti sui tuoi contenuti", defaultOn: false },
    { label: "Messaggi privati", desc: "Notifica per ogni nuovo messaggio ricevuto", defaultOn: true },
    { label: "Report settimanale", desc: "Riepilogo performance via email ogni lunedì", defaultOn: true },
    { label: "Aggiornamenti piattaforma", desc: "Novità e annunci da Unlockr", defaultOn: false },
  ];

  const [states, setStates] = useState(items.map(i => i.defaultOn));

  return (
    <div className="space-y-5">
      <h3 className="font-heading font-bold text-base">Notifiche</h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
            <Switch checked={states[i]} onCheckedChange={(v) => setStates(s => s.map((x, j) => j === i ? v : x))} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BillingSection() {
  return (
    <div className="space-y-5">
      <h3 className="font-heading font-bold text-base">Pagamenti & Abbonamento</h3>
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Piano Pro</p>
            <p className="text-xs text-muted-foreground mt-0.5">Rinnovo il 10 maggio 2026 · €29/mese</p>
          </div>
          <Button variant="outline" size="sm" className="border-border/50">Gestisci</Button>
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Metodo di pagamento</p>
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-7 bg-secondary rounded flex items-center justify-center text-xs font-bold">VISA</div>
            <div>
              <p className="text-sm font-medium">•••• •••• •••• 4242</p>
              <p className="text-xs text-muted-foreground">Scade 08/27</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-border/50 text-xs">Cambia</Button>
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prezzo abbonamento fan</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Piano mensile (€)</Label>
            <Input defaultValue="9.99" type="number" className="bg-secondary/30 border-border/30 h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Piano annuale (€)</Label>
            <Input defaultValue="89.99" type="number" className="bg-secondary/30 border-border/30 h-10" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="space-y-5">
      <h3 className="font-heading font-bold text-base">Sicurezza</h3>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Password attuale</Label>
          <Input type="password" placeholder="••••••••" className="bg-secondary/30 border-border/30 h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nuova password</Label>
          <Input type="password" placeholder="••••••••" className="bg-secondary/30 border-border/30 h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Conferma nuova password</Label>
          <Input type="password" placeholder="••••••••" className="bg-secondary/30 border-border/30 h-10" />
        </div>
      </div>
      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
        <div>
          <p className="text-sm font-medium">Autenticazione a due fattori</p>
          <p className="text-xs text-muted-foreground mt-0.5">Maggiore sicurezza per il tuo account</p>
        </div>
        <Switch defaultChecked={false} />
      </div>
    </div>
  );
}

function AppearanceSection() {
  const [accent, setAccent] = useState("purple");
  const colors = [
    { id: "purple", label: "Viola", cls: "bg-purple-500" },
    { id: "blue", label: "Blu", cls: "bg-blue-500" },
    { id: "pink", label: "Rosa", cls: "bg-pink-500" },
    { id: "teal", label: "Teal", cls: "bg-teal-500" },
  ];

  return (
    <div className="space-y-5">
      <h3 className="font-heading font-bold text-base">Aspetto</h3>
      <div>
        <p className="text-sm font-medium mb-3">Colore accento</p>
        <div className="flex gap-3">
          {colors.map(c => (
            <button
              key={c.id}
              onClick={() => setAccent(c.id)}
              className={`w-9 h-9 rounded-full ${c.cls} transition-all ${accent === c.id ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110" : "opacity-70 hover:opacity-100"}`}
              title={c.label}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
        <div>
          <p className="text-sm font-medium">Tema scuro</p>
          <p className="text-xs text-muted-foreground mt-0.5">Attivo per default su Unlockr</p>
        </div>
        <Switch defaultChecked={true} />
      </div>
    </div>
  );
}

const SECTION_CONTENT = {
  profile: ProfileSection,
  notifications: NotificationsSection,
  billing: BillingSection,
  security: SecuritySection,
  appearance: AppearanceSection,
};

export default function SettingsPanel() {
  const [activeSection, setActiveSection] = useState("profile");
  const ActiveComponent = SECTION_CONTENT[activeSection];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-lg">Impostazioni</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Gestisci il tuo profilo e le preferenze</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar */}
        <div className="sm:w-48 shrink-0">
          <nav className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible scrollbar-none">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeSection === s.id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-card/50 border border-border/30 rounded-2xl p-6">
          <ActiveComponent />
          <div className="mt-6 pt-5 border-t border-border/20 flex justify-end">
            <Button className="bg-primary hover:bg-primary/90 glow-primary font-semibold">
              <Save className="w-4 h-4 mr-2" />
              Salva modifiche
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}