import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import AuthGuard from "../components/shared/AuthGuard";
import UserWallet from "../components/wallet/UserWallet";
import { useAuth } from "@/lib/AuthContext";
import { supabase, hasSupabase } from "@/lib/supabase";
import { walletService } from "@/lib/wallet";
import { storageService } from "@/lib/storage";
import { Loader2 } from "lucide-react";
import { Heart, Crown, Play, Radio, MessageCircle, Search, ArrowRight, User, Camera, Save, Check } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SEO from "@/components/shared/SEO";

export default function FanDashboard() {
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "abbonamenti");
  const [subscriptions, setSubscriptions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ full_name: "", handle: "", bio: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const avatarRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    (async () => {
      const results = await Promise.allSettled([
        hasSupabase
          ? supabase
              .from("subscriptions")
              .select("id, tier, status, started_at, expires_at, creator_id, profiles!subscriptions_creator_id_fkey(full_name, handle, avatar_url, category)")
              .eq("fan_id", currentUser.id)
              .eq("status", "active")
          : Promise.resolve({ data: [] }),
        walletService.listTransactions(currentUser.id, "user"),
        walletService.getUserWallet(currentUser.id),
      ]);

      if (cancelled) return;

      const subs = results[0].status === "fulfilled" ? (results[0].value.data || []) : [];
      const txs = results[1].status === "fulfilled" ? results[1].value : [];
      const w = results[2].status === "fulfilled" ? results[2].value : null;
      const prof = currentUser;

      setSubscriptions(subs.map((s) => {
        const p = s.profiles || {};
        return {
          id: s.id,
          creatorId: s.creator_id,
          name: p.full_name || "Creator",
          handle: p.handle || "",
          avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || "C")}&background=7c3aed&color=fff&size=80`,
          category: p.category || "",
          tier: s.tier,
          expiresAt: s.expires_at,
        };
      }));
      setTransactions(txs.slice(0, 20));
      setWallet(w);
      if (prof) {
        setProfile(prof);
        setProfileForm({ full_name: prof.full_name || "", handle: prof.handle || "", bio: prof.bio || "" });
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [currentUser]);


  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveProfile = async () => {
    if (!currentUser || !hasSupabase) return;
    setSaving(true);
    try {
      let avatar_url = profile?.avatar_url;

      if (avatarFile) {
        const uploaded = await storageService.upload(avatarFile, "avatars");
        if (uploaded?.url) avatar_url = uploaded.url;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name.trim(),
          handle: profileForm.handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
          bio: profileForm.bio.trim(),
          avatar_url,
        })
        .eq("id", currentUser.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, ...profileForm, avatar_url }));
      setAvatarFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert("Errore nel salvataggio: " + (err.message || "riprova"));
    } finally {
      setSaving(false);
    }
  };

  const filteredSubs = subscriptions.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalTokens = subscriptions.reduce((sum, s) => {
    return sum + (s.tier === "premium" ? 200 : 100);
  }, 0);

  const stats = [
    { label: "Abbonamenti attivi", value: String(subscriptions.length), icon: Crown, color: "text-chart-4", bg: "bg-chart-4/10" },
    { label: "Saldo Token", value: wallet ? wallet.balance.toLocaleString() : "—", icon: Play, color: "text-primary", bg: "bg-primary/10" },
    { label: "Token spesi", value: wallet ? (wallet.total_spent || 0).toLocaleString() : "—", icon: Radio, color: "text-chart-5", bg: "bg-chart-5/10" },
    { label: "Transazioni", value: String(transactions.length), icon: MessageCircle, color: "text-accent", bg: "bg-accent/10" },
  ];

  const currentAvatar = avatarPreview || profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileForm.full_name || "U")}&background=7c3aed&color=fff&size=120`;

  return (
    <AuthGuard allowedRoles={["fan", "user"]}>
    <div className="min-h-screen">
      <SEO title="Dashboard Fan" description="Gestisci il tuo account, abbonamenti e token su Tokaro.fans" url="/fan-dashboard" />
      <div className="border-b border-border/30 bg-card/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-bold">La mia Dashboard</h1>
              <p className="text-sm text-muted-foreground">I tuoi abbonamenti, token e attività</p>
            </div>
            <Link to="/explore">
              <Button size="sm" className="bg-primary hover:bg-primary/90 glow-primary">
                <Search className="w-4 h-4 mr-2" />
                Scopri nuovi creator
              </Button>
            </Link>
          </div>

          <div className="flex gap-1 mt-5 bg-secondary/40 p-1 rounded-xl overflow-x-auto scrollbar-none">
            {[
              { id: "abbonamenti", label: "Abbonamenti" },
              { id: "transazioni", label: "Transazioni" },
              { id: "wallet", label: "Wallet" },
              { id: "profilo", label: "Profilo" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card/50 border border-border/30 rounded-2xl p-4 flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-heading font-bold">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{s.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Subscriptions tab */}
            {activeTab === "abbonamenti" && (
              <div className="space-y-4">
                {subscriptions.length > 0 && (
                  <Input
                    placeholder="Cerca tra i tuoi abbonamenti..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-secondary/30 border-border/30 h-9 max-w-xs text-sm"
                  />
                )}

                {filteredSubs.length === 0 && subscriptions.length === 0 ? (
                  <div className="text-center py-16">
                    <Crown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-heading font-bold text-lg mb-2">Nessun abbonamento attivo</h3>
                    <p className="text-sm text-muted-foreground mb-6">Scopri i creator e abbonati ai tuoi preferiti!</p>
                    <Link to="/explore">
                      <Button className="bg-primary hover:bg-primary/90 glow-primary">
                        Esplora creator <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {filteredSubs.map((s, i) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex items-center gap-4 p-4 bg-card/50 border border-border/30 rounded-2xl"
                      >
                        <Link to={`/creator/${s.handle}`}>
                          <img src={s.avatar} alt={s.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/creator/${s.handle}`} className="hover:text-primary transition-colors">
                            <p className="text-sm font-semibold">{s.name}</p>
                          </Link>
                          <p className="text-xs text-muted-foreground">{s.category || `@${s.handle}`}</p>
                          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            s.tier === "premium"
                              ? "bg-chart-4/10 border-chart-4/30 text-chart-4"
                              : "bg-primary/10 border-primary/30 text-primary"
                          }`}>
                            Piano {s.tier === "premium" ? "Premium" : "Base"}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold">
                            {s.tier === "premium" ? "200" : "100"} T
                            <span className="text-xs font-normal text-muted-foreground">/mese</span>
                          </p>
                          {s.expiresAt && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Scade: {new Date(s.expiresAt).toLocaleDateString("it-IT")}
                            </p>
                          )}
                          <Link to={`/creator/${s.handle}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-border/50 mt-1.5">
                              Vai al profilo
                            </Button>
                          </Link>
                        </div>
                      </motion.div>
                    ))}

                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-center">
                      <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="text-sm font-semibold mb-1">Totale mensile: {totalTokens} Token</p>
                      <p className="text-xs text-muted-foreground">{subscriptions.length} abbonament{subscriptions.length === 1 ? "o" : "i"} attiv{subscriptions.length === 1 ? "o" : "i"}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Transactions tab */}
            {activeTab === "transazioni" && (
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="text-center py-16">
                    <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-heading font-bold text-lg mb-2">Nessuna transazione</h3>
                    <p className="text-sm text-muted-foreground">Le tue transazioni appariranno qui.</p>
                  </div>
                ) : (
                  transactions.map((tx, i) => (
                    <motion.div
                      key={tx.id || i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-4 bg-card/50 border border-border/30 rounded-2xl"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === "topup" ? "bg-chart-3/10" : "bg-chart-5/10"
                      }`}>
                        {tx.type === "topup" ? (
                          <ArrowRight className="w-5 h-5 text-chart-3 rotate-[-90deg]" />
                        ) : (
                          <ArrowRight className="w-5 h-5 text-chart-5 rotate-90" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description || (tx.type === "topup" ? "Ricarica" : "Spesa")}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {tx.created_date ? new Date(tx.created_date).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                        </p>
                      </div>
                      <p className={`text-sm font-bold shrink-0 ${tx.type === "topup" ? "text-chart-3" : "text-chart-5"}`}>
                        {tx.type === "topup" ? "+" : ""}{tx.amount} T
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Wallet tab */}
            {activeTab === "wallet" && (
              <UserWallet user={currentUser} />
            )}

            {/* Profile tab */}
            {activeTab === "profilo" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-lg mx-auto space-y-6"
              >
                <div className="bg-card/50 border border-border/30 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-primary" />
                    <h2 className="font-heading font-bold text-lg">Il tuo profilo</h2>
                  </div>

                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative group">
                      <img
                        src={currentAvatar}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover border-2 border-border/30"
                      />
                      <button
                        onClick={() => avatarRef.current?.click()}
                        className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Camera className="w-6 h-6 text-white" />
                      </button>
                      <input
                        ref={avatarRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Clicca per cambiare la foto</p>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1.5">Nome completo</label>
                      <Input
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                        placeholder="Il tuo nome"
                        className="bg-secondary/30 border-border/30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1.5">Handle</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                        <Input
                          value={profileForm.handle}
                          onChange={(e) => setProfileForm(f => ({ ...f, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                          placeholder="tuohandle"
                          className="bg-secondary/30 border-border/30 pl-8"
                          maxLength={30}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Solo lettere minuscole, numeri e underscore</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1.5">Bio</label>
                      <textarea
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                        placeholder="Parlaci di te..."
                        rows={3}
                        maxLength={300}
                        className="w-full rounded-lg border border-border/30 bg-secondary/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <p className="text-[11px] text-muted-foreground text-right">{profileForm.bio.length}/300</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1.5">Email</label>
                      <Input
                        value={currentUser?.email || profile?.email || ""}
                        disabled
                        className="bg-secondary/20 border-border/20 text-muted-foreground cursor-not-allowed"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">L'email non può essere modificata da qui</p>
                    </div>
                  </div>

                  <Button
                    onClick={saveProfile}
                    disabled={saving}
                    className="w-full bg-primary hover:bg-primary/90 font-semibold h-11"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : saved ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {saving ? "Salvataggio..." : saved ? "Salvato!" : "Salva modifiche"}
                  </Button>
                </div>

                {/* Account info */}
                <div className="bg-card/50 border border-border/30 rounded-2xl p-6 space-y-3">
                  <h3 className="font-heading font-bold text-sm">Info account</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ruolo</span>
                      <span className="font-medium capitalize">{profile?.role || "fan"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Membro dal</span>
                      <span className="font-medium">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("it-IT", { month: "long", year: "numeric" }) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
    </AuthGuard>
  );
}
