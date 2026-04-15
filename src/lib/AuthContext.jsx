import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from "react";
import { authService } from "./auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const mounted = useRef(true);

  const applyUser = useCallback((u) => {
    if (!mounted.current) return;
    setUser(u);
    setIsLoadingAuth(false);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const u = await authService.me();
      applyUser(u);
    } catch {
      applyUser(null);
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
        authError: null,
        login,
        register,
        logout,
        updateUser,
        refresh,
        navigateToLogin: () => {
          window.location.href = "/fan-login";
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
