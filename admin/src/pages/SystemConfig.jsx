import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Save, Settings } from "lucide-react";

const CONFIG_FIELDS = [
  { key: "platform_fee_percent", label: "Fee piattaforma (%)", type: "number" },
  { key: "token_buy_rate_eur", label: "Prezzo acquisto token (EUR)", type: "number", step: "0.001" },
  { key: "token_sell_rate_eur", label: "Prezzo vendita token (EUR)", type: "number", step: "0.001" },
  { key: "max_donation_tokens", label: "Max donazione (token)", type: "number" },
  { key: "max_live_price_tokens", label: "Max prezzo live (token)", type: "number" },
  { key: "min_payout_tokens", label: "Min payout (token)", type: "number" },
];

const FEATURE_FLAGS = [
  { key: "live_streaming", label: "Live Streaming" },
  { key: "donations", label: "Donazioni" },
  { key: "subscriptions", label: "Abbonamenti" },
  { key: "messaging", label: "Messaggistica" },
];

export default function SystemConfig() {
  const [config, setConfig] = useState({});
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getConfig();
      setConfig(res.config || {});
      const f = res.config?.features;
      setFeatures(typeof f === "object" ? f : {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getValue = (key) => {
    const v = config[key];
    if (typeof v === "string") return v.replace(/^"|"$/g, "");
    return v ?? "";
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const updates = {};
      CONFIG_FIELDS.forEach(({ key }) => {
        const el = document.getElementById(`cfg-${key}`);
        if (el) updates[key] = el.value;
      });
      updates.features = features;
      await api.updateConfig(updates);
      setMsg("Configurazione salvata");
      load();
    } catch (err) {
      setMsg(`Errore: ${err.message}`);
    } finally {
      setSaving(false);
    }
    setTimeout(() => setMsg(""), 3000);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-bold flex items-center gap-2"><Settings size={22} /> Configurazione Sistema</h1>

      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm ${msg.startsWith("Errore") ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
          {msg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card space-y-4">
          <h3 className="text-sm font-medium text-gray-400">Parametri economici</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {CONFIG_FIELDS.map(({ key, label, type, step }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  id={`cfg-${key}`}
                  type={type}
                  step={step}
                  defaultValue={getValue(key)}
                  className="input"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="text-sm font-medium text-gray-400">Feature Flags</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {FEATURE_FLAGS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 p-3 bg-surface rounded-lg cursor-pointer hover:bg-surface-hover transition-colors">
                <input
                  type="checkbox"
                  checked={features[key] ?? true}
                  onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">{label}</span>
                <span className={`ml-auto badge ${features[key] !== false ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                  {features[key] !== false ? "ON" : "OFF"}
                </span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={16} /> {saving ? "Salvataggio..." : "Salva configurazione"}
        </button>
      </form>
    </div>
  );
}
