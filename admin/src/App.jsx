import { useState, useEffect, createContext, useContext, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import Layout from "./components/Layout";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Users = lazy(() => import("./pages/Users"));
const UserDetail = lazy(() => import("./pages/UserDetail"));
const Wallets = lazy(() => import("./pages/Wallets"));
const Orders = lazy(() => import("./pages/Orders"));
const Payouts = lazy(() => import("./pages/Payouts"));
const Creators = lazy(() => import("./pages/Creators"));
const Moderation = lazy(() => import("./pages/Moderation"));
const Notifications = lazy(() => import("./pages/Notifications"));
const SystemConfig = lazy(() => import("./pages/SystemConfig"));
const AuditLog = lazy(() => import("./pages/AuditLog"));

const Loader = ({ msg }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-3">
    <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    {msg && <p className="text-xs text-gray-500">{msg}</p>}
  </div>
);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = JSON.parse(localStorage.getItem("menia:admin:token") || "null");
        if (stored?.access_token && stored?.user?.id) {
          const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
          const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${stored.user.id}&select=id,full_name,email,role,avatar_url`, {
            headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${stored.access_token}` },
          });
          if (profileRes.ok) {
            const profiles = await profileRes.json();
            if (profiles?.[0]?.role === "admin") {
              setUser({ ...stored.user, profile: profiles[0] });
            }
          }
        }
      } catch {}
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const profile = await loadProfile(session.user.id);
        if (profile?.role === "admin") {
          setUser({ ...session.user, profile });
        } else {
          await supabase.auth.signOut();
          setUser(null);
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(id) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, avatar_url")
      .eq("id", id)
      .maybeSingle();
    return data;
  }

  async function login(email, password) {
    setError("Step 1: Invio credenziali...");

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body: JSON.stringify({ email, password }),
    });

    if (!authRes.ok) {
      const err = await authRes.json().catch(() => ({}));
      setError("Step 1 FAIL: " + (err.error_description || err.msg || authRes.status));
      throw new Error(err.error_description || err.msg || "Login fallito");
    }

    const authData = await authRes.json();
    setError("Step 2: Login OK, token ottenuto — carico profilo...");

    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authData.user.id}&select=id,full_name,email,role,avatar_url`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${authData.access_token}` },
    });

    const profiles = await profileRes.json();
    const profile = profiles?.[0] || null;
    setError("Step 3: Profilo=" + JSON.stringify(profile));

    if (!profile || profile.role !== "admin") {
      throw new Error("Non admin: " + (profile?.role || "null"));
    }

    localStorage.setItem("menia:admin:token", JSON.stringify(authData));
    setUser({ ...authData.user, profile });
    setError(null);
  }

  async function logout() {
    localStorage.removeItem("menia:admin:token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading, error } = useAuth();
  if (loading) return <Loader msg="Connessione..." />;
  if (error) return (
    <div className="flex items-center justify-center h-screen">
      <div className="card text-center max-w-md">
        <p className="text-red-400 mb-2">Errore: {error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary text-sm">Ricarica</button>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="users" element={<Users />} />
                    <Route path="users/:id" element={<UserDetail />} />
                    <Route path="wallets" element={<Wallets />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="payouts" element={<Payouts />} />
                    <Route path="creators" element={<Creators />} />
                    <Route path="moderation" element={<Moderation />} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="config" element={<SystemConfig />} />
                    <Route path="audit-log" element={<AuditLog />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
