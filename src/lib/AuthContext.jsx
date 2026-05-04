import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from "react";
import { authService, isAuthBroken, readSyncSessionUser } from "./auth";

const AuthContext = createContext(null);

function AuthErrorBanner() {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 99999,
      background: "#dc2626", color: "#fff", padding: "12px 16px",
      textAlign: "center", fontSize: "14px", fontFamily: "system-ui, sans-serif",
    }}>
      <strong>Errore di autenticazione</strong> — Alcune funzionalità potrebbero non funzionare.{" "}
      <button
        onClick={() => {
          Object.keys(localStorage)
            .filter((k) => k.startsWith("menia:sb"))
            .forEach((k) => localStorage.removeItem(k));
          window.location.reload();
        }}
        style={{
          background: "#fff", color: "#dc2626", border: "none", borderRadius: "4px",
          padding: "4px 12px", cursor: "pointer", fontWeight: 600, marginLeft: "8px",
        }}
      >
        Ripara e ricarica
      </button>
    </div>
  );
}

export const AuthProvider = ({ children }) => {
  // Lazy initializer: legge la session da localStorage SINCRONO, prima
  // del primo render. Se la session esiste, `user` è popolato al primo
  // commit (FanDashboard può montare le sue query immediatamente, senza
  // attendere la microtask di refresh()).
  const [user, setUser] = useState(readSyncSessionUser);
  const [isLoadingAuth, setIsLoadingAuth] = useState(() => user === null);
  const [authError, setAuthError] = useState(null);
  const mounted = useRef(true);

  const applyUser = useCallback((u) => {
    if (!mounted.current) return;
    setUser(u);
    setIsLoadingAuth(false);
  }, []);

  const refresh = useCallback(async () => {
    try {
      if (authService.meFast) {
        const quickUser = await authService.meFast();
        if (quickUser) {
          // meFast() ha già fornito user dall'auth session: non lanciamo
          // anche me() qui, altrimenti facciamo fetch del profilo due volte
          // (una qui + una in onAuthChange INITIAL_SESSION). Lasciamo
          // l'evento onAuthChange come unica fonte del fullUser.
          applyUser(quickUser);
          return;
        }
      }
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("auth timeout")), 8000));
      const u = await Promise.race([authService.me(), timeout]);
      applyUser(u);
    } catch (err) {
      if (isAuthBroken()) {
        applyUser(null);
        setAuthError(err?.message || "Auth broken");
      } else {
        if (!mounted.current) return;
        setIsLoadingAuth(false);
      }
    }
  }, [applyUser]);

  useEffect(() => {
    mounted.current = true;
    refresh();

    let unsubscribe = () => {};
    if (typeof authService.onAuthChange === "function") {
      unsubscribe = authService.onAuthChange((u) => applyUser(u));
    } else {
      const handler = () => refresh();
      window.addEventListener("storage", handler);
      unsubscribe = () => window.removeEventListener("storage", handler);
    }

    return () => {
      mounted.current = false;
      unsubscribe?.();
    };
  }, [applyUser, refresh]);

  const login = useCallback(async (credentials) => {
    const u = await authService.login(credentials);
    applyUser(u);
    return u;
  }, [applyUser]);

  const register = useCallback(async (data) => {
    const u = await authService.register(data);
    applyUser(u);
    return u;
  }, [applyUser]);

  const logout = useCallback(async () => {
    await authService.logout();
    applyUser(null);
  }, [applyUser]);

  const updateUser = useCallback(async (patch) => {
    const u = await authService.updateMe(patch);
    applyUser(u);
    return u;
  }, [applyUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        login,
        register,
        logout,
        updateUser,
        refresh,
        navigateToLogin: () => {
          window.location.href = "/student-login";
        },
      }}
    >
      {authError && <AuthErrorBanner />}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
