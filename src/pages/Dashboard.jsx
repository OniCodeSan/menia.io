import AuthGuard from "../components/shared/AuthGuard";
import { motion } from "framer-motion";
import { DollarSign, Users, TrendingUp, UserPlus, Upload, Settings, MessageCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "../components/dashboard/StatCard";
import SchedulerCalendar from "../components/dashboard/SchedulerCalendar";
import AnalyticsDashboard from "../components/dashboard/AnalyticsDashboard";
import LoyaltySystem from "../components/dashboard/LoyaltySystem";
import RevenueChart from "../components/dashboard/RevenueChart";
import FunnelVisual from "../components/dashboard/FunnelVisual";
import FanCRM from "../components/dashboard/FanCRM";
import { fetchCreatorMetrics } from "../lib/creatorMetrics";
import NotificationsDropdown from "../components/dashboard/NotificationsDropdown";
import SettingsPanel from "../components/dashboard/SettingsPanel";
import PublishContent from "../components/dashboard/PublishContent";
import MyPosts from "../components/dashboard/MyPosts";
import VerificationPanel from "../components/dashboard/VerificationPanel";
import SubscriptionManager from "../components/dashboard/SubscriptionManager";
import CreatorWallet from "../components/dashboard/CreatorWallet";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchCreatorMetrics(user.id).then(setMetrics);
  }, [user]);

  const [billingReturnOrder, setBillingReturnOrder] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'publish') {
      setActiveTab('publish');
      window.history.replaceState({}, '', '/dashboard');
    }
    if (params.get('tab') === 'settings') {
      setActiveTab('settings');
      const orderId = params.get('order');
      if (orderId) setBillingReturnOrder(orderId);
      window.history.replaceState({}, '', '/dashboard');
    }

    const handler = () => setActiveTab('publish');
    window.addEventListener('navbar:publish', handler);
    return () => window.removeEventListener('navbar:publish', handler);
  }, []);

  return (
    <AuthGuard allowedRoles={["creator", "admin"]}>
    <div className="min-h-screen">
      {/* Dashboard header */}
      <div className="border-b border-border/30 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-bold">Dashboard Creator</h1>
              <p className="text-sm text-muted-foreground">Panoramica delle tue performance</p>
            </div>
            <div className="flex gap-3">
              <NotificationsDropdown />
              <Button size="sm" className="bg-primary hover:bg-primary/90 glow-primary" onClick={() => setActiveTab('publish')}>
                <Upload className="w-4 h-4 mr-2" />
                Pubblica
              </Button>
            </div>
          </div>

          {/* Tab nav */}
          <div className="flex gap-1 mt-5 bg-secondary/40 p-1 rounded-xl overflow-x-auto max-w-full scrollbar-none">
            {[
              { id: "overview", label: "Overview" },
              { id: "analytics", label: "Analytics" },
              { id: "loyalty", label: "Fan" },
              { id: "subscriptions", label: "Abbonamenti" },
              { id: "calendar", label: "Calendario" },
              { id: "publish", label: "Pubblica" },
              { id: "content", label: "Contenuti" },
              { id: "verification", label: "Verifica & KYC" },
              { id: "wallet", label: "Wallet Creator" },
              { id: "settings", label: "Impostazioni" },
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === "overview" ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard title="Token Guadagnati" value={metrics ? `${metrics.revenue.toLocaleString()} T` : "—"} trend={metrics?.revenueTrend} icon={DollarSign} delay={0} />
              <StatCard title="Fan Attivi" value={metrics ? metrics.activeFans.toLocaleString() : "—"} trend={metrics?.fansTrend} icon={Users} delay={0.05} />
              <StatCard title="Conversione" value={metrics ? `${metrics.conversionRate}%` : "—"} trend={metrics?.conversionTrend} icon={TrendingUp} delay={0.1} />
              <StatCard title="Nuovi Abbonati" value={metrics ? metrics.newSubs : "—"} trend={metrics?.newSubsTrend} icon={UserPlus} delay={0.15} />
            </div>
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <RevenueChart metrics={metrics} />
              <FunnelVisual metrics={metrics} />
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2"><FanCRM metrics={metrics} /></div>
              <div className="space-y-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-card/50 border border-border/30 rounded-2xl p-6">
                  <h3 className="font-heading font-bold text-base mb-4">Azioni Rapide</h3>
                  <div className="space-y-3">
                    {[
                      { icon: Upload, label: "Nuovo contenuto", color: "text-primary" },

                      { icon: MessageCircle, label: "Messaggio broadcast", color: "text-chart-4" },
                      { icon: Calendar, label: "Programma post", color: "text-chart-3", onClick: () => setActiveTab("calendar") },
                      { icon: Settings, label: "Impostazioni", color: "text-muted-foreground", onClick: () => setActiveTab("settings") },
                    ].map((action) => (
                      <button key={action.label} onClick={action.onClick} className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left">
                        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                          <action.icon className={`w-4 h-4 ${action.color}`} />
                        </div>
                        <span className="text-sm font-medium">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </>
        ) : activeTab === "analytics" ? (
          <AnalyticsDashboard metrics={metrics} />
        ) : activeTab === "loyalty" ? (
          <LoyaltySystem />
        ) : activeTab === "subscriptions" ? (
          <SubscriptionManager />
        ) : activeTab === "publish" ? (
          <PublishContent
            onPublished={() => setPostsRefreshKey((k) => k + 1)}
            onNavigateContent={() => setActiveTab("content")}
          />
        ) : activeTab === "content" ? (
          <MyPosts refreshKey={postsRefreshKey} />
        ) : activeTab === "verification" ? (
          <VerificationPanel />
        ) : activeTab === "wallet" ? (
          <CreatorWallet user={user} />
        ) : activeTab === "settings" ? (
          <SettingsPanel returnOrderId={billingReturnOrder} />
        ) : (
          <SchedulerCalendar />
        )}
      </div>
    </div>
    </AuthGuard>
  );
}