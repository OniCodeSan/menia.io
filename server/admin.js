// =============================================================================
// Admin API routes — /api/admin/*
// All routes require JWT with role=admin via requireAdminJWT middleware.
// Every mutation is audit-logged.
// =============================================================================

const express = require("express");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (v) => typeof v === "string" && UUID_RE.test(v);

module.exports = function createAdminRouter({ supabase, requireAdminJWT, emails }) {
  const router = express.Router();

  // -------------------------------------------------------------------------
  // Middleware — every admin route requires JWT + admin role
  // -------------------------------------------------------------------------
  router.use(async (req, res, next) => {
    const admin = await requireAdminJWT(req);
    if (!admin) return res.status(403).json({ error: "Non autorizzato" });
    req.admin = admin;
    next();
  });

  // -------------------------------------------------------------------------
  // Audit helper
  // -------------------------------------------------------------------------
  const audit = async (adminId, action, targetType, targetId, details = {}, ip = "") => {
    await supabase.from("audit_log").insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: String(targetId || ""),
      details,
      ip_address: ip,
    }).catch((e) => console.error("[audit]", e.message));
  };

  const clientIp = (req) => req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.ip || "";

  // =========================================================================
  // DASHBOARD
  // =========================================================================
  router.get("/dashboard", async (req, res) => {
    try {
      const [
        totalUsers, creators, fans, last24h,
        pendingOrders, failedOrders,
        pendingPayouts, pendingReports,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "creator"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "fan"),
        supabase.from("profiles").select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
        supabase.from("payment_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("payment_orders").select("id", { count: "exact", head: true }).eq("status", "failed"),
        supabase.from("payout_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      const { data: wallets } = await supabase
        .from("token_wallets")
        .select("wallet_type, balance, total_earned, total_spent");

      let circulatingTokens = 0, totalEarned = 0, totalSpent = 0;
      for (const w of wallets || []) {
        circulatingTokens += w.balance || 0;
        totalEarned += w.total_earned || 0;
        totalSpent += w.total_spent || 0;
      }

      const { data: paidPayouts } = await supabase
        .from("payout_requests")
        .select("euro_amount")
        .eq("status", "paid");
      let totalEuroPaid = 0;
      for (const p of paidPayouts || []) totalEuroPaid += Number(p.euro_amount || 0);

      res.json({
        users: { total: totalUsers.count ?? 0, creators: creators.count ?? 0, fans: fans.count ?? 0, last24h: last24h.count ?? 0 },
        orders: { pending: pendingOrders.count ?? 0, failed: failedOrders.count ?? 0 },
        payouts: { pending: pendingPayouts.count ?? 0 },
        reports: { pending: pendingReports.count ?? 0 },
        tokens: { circulating: circulatingTokens, totalEarned, totalSpent },
        revenue: { totalEuroPaid },
      });
    } catch (err) {
      console.error("[admin/dashboard]", err.message);
      res.status(500).json({ error: "Errore caricamento dashboard" });
    }
  });

  // =========================================================================
  // USERS
  // =========================================================================
  router.get("/users", async (req, res) => {
    try {
      const { search, role, status, plan, limit = "50", offset = "0" } = req.query;
      let q = supabase
        .from("profiles")
        .select("id, email, full_name, handle, role, plan, status, onboarding_complete, avatar_url, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (role) q = q.eq("role", role);
      if (status) q = q.eq("status", status);
      if (plan) q = q.eq("plan", plan);
      if (search) {
        const s = search.replace(/[%_]/g, "");
        q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,handle.ilike.%${s}%`);
      }

      const { data, count, error } = await q;
      if (error) throw error;
      res.json({ users: data || [], total: count ?? 0 });
    } catch (err) {
      console.error("[admin/users]", err.message);
      res.status(500).json({ error: "Errore lista utenti" });
    }
  });

  router.get("/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) return res.status(400).json({ error: "ID non valido" });

      const [profileRes, walletsRes, txRes, reportsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("token_wallets").select("*").eq("user_id", id),
        supabase.from("token_transactions").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
        supabase.from("user_reports").select("*").eq("target_id", id).order("created_at", { ascending: false }).limit(20),
      ]);

      if (!profileRes.data) return res.status(404).json({ error: "Utente non trovato" });

      const { data: authUser } = await supabase.auth.admin.getUserById(id);

      res.json({
        profile: profileRes.data,
        email: authUser?.user?.email || profileRes.data.email,
        wallets: walletsRes.data || [],
        transactions: txRes.data || [],
        reports: reportsRes.data || [],
        lastSignIn: authUser?.user?.last_sign_in_at || null,
        mfa: authUser?.user?.factors?.length > 0,
      });
    } catch (err) {
      console.error("[admin/users/:id]", err.message);
      res.status(500).json({ error: "Errore dettaglio utente" });
    }
  });

  router.post("/users/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) return res.status(400).json({ error: "ID non valido" });
      const { status } = req.body;
      const validStatuses = ["active", "warned", "suspended", "banned"];
      if (!validStatuses.includes(status)) return res.status(400).json({ error: "Status non valido" });

      const { error } = await supabase
        .from("profiles")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      if (status === "banned") {
        await supabase.auth.admin.updateUserById(id, { ban_duration: "876000h" });
      } else if (status === "active") {
        await supabase.auth.admin.updateUserById(id, { ban_duration: "none" });
      }

      await audit(req.admin.id, "user_status_change", "user", id, { status }, clientIp(req));
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/users/:id/status]", err.message);
      res.status(500).json({ error: "Errore aggiornamento status" });
    }
  });

  router.post("/users/:id/role", async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) return res.status(400).json({ error: "ID non valido" });
      const { role } = req.body;
      if (!["fan", "creator", "admin"].includes(role)) return res.status(400).json({ error: "Ruolo non valido" });

      const { error } = await supabase
        .from("profiles")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      await audit(req.admin.id, "user_role_change", "user", id, { role }, clientIp(req));
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/users/:id/role]", err.message);
      res.status(500).json({ error: "Errore aggiornamento ruolo" });
    }
  });

  router.post("/users/:id/force-logout", async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) return res.status(400).json({ error: "ID non valido" });

      await supabase.auth.admin.signOut(id, "global");
      await audit(req.admin.id, "user_force_logout", "user", id, {}, clientIp(req));
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/users/:id/force-logout]", err.message);
      res.status(500).json({ error: "Errore logout forzato" });
    }
  });

  router.post("/users/:id/reset-password", async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) return res.status(400).json({ error: "ID non valido" });

      const { data: authUser } = await supabase.auth.admin.getUserById(id);
      if (!authUser?.user?.email) return res.status(404).json({ error: "Email non trovata" });

      // Invalidate all sessions before sending reset link
      await supabase.auth.admin.signOut(id, "global").catch(() => {});

      await supabase.auth.resetPasswordForEmail(authUser.user.email, {
        redirectTo: `${process.env.FRONTEND_URL || "https://menia.io"}/reset-password`,
      });

      await audit(req.admin.id, "user_reset_password", "user", id, { sessions_revoked: true }, clientIp(req));
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/users/:id/reset-password]", err.message);
      res.status(500).json({ error: "Errore reset password" });
    }
  });

  // =========================================================================
  // WALLET / TOKEN
  // =========================================================================
  router.post("/wallet/adjust", async (req, res) => {
    try {
      const { userId, amount, reason, walletType = "user" } = req.body;
      if (!isUUID(userId)) return res.status(400).json({ error: "userId non valido" });
      const tokens = Math.floor(Number(amount));
      if (!tokens || tokens === 0 || Math.abs(tokens) > 1000000) {
        return res.status(400).json({ error: "amount deve essere intero non-zero, max ±1000000" });
      }
      if (!reason || reason.trim().length < 3) {
        return res.status(400).json({ error: "Motivo obbligatorio (min 3 caratteri)" });
      }
      if (!["user", "creator"].includes(walletType)) {
        return res.status(400).json({ error: "walletType deve essere user o creator" });
      }

      const { data: wallet } = await supabase
        .from("token_wallets")
        .select("*")
        .eq("user_id", userId)
        .eq("wallet_type", walletType)
        .maybeSingle();

      const currentBalance = wallet?.balance || 0;
      if (tokens < 0 && currentBalance + tokens < 0) {
        return res.status(400).json({ error: `Saldo insufficiente (attuale: ${currentBalance})` });
      }

      if (wallet) {
        const update = { balance: currentBalance + tokens, updated_at: new Date().toISOString() };
        if (tokens > 0) update.total_earned = (wallet.total_earned || 0) + tokens;
        if (tokens < 0) update.total_spent = (wallet.total_spent || 0) + Math.abs(tokens);
        await supabase.from("token_wallets").update(update).eq("id", wallet.id);
      } else {
        await supabase.from("token_wallets").insert({
          user_id: userId,
          wallet_type: walletType,
          balance: Math.max(0, tokens),
          total_earned: tokens > 0 ? tokens : 0,
          total_spent: tokens < 0 ? Math.abs(tokens) : 0,
        });
      }

      const txType = tokens > 0 ? "topup" : "refund";
      await supabase.from("token_transactions").insert({
        user_id: userId,
        wallet_type: walletType,
        type: txType,
        amount: tokens,
        description: `[Admin] ${reason.trim()}`,
      });

      await audit(req.admin.id, "wallet_adjust", "wallet", userId, { tokens, walletType, reason: reason.trim() }, clientIp(req));

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      if (authUser?.user?.email && tokens > 0) {
        emails.sendTokenPurchase({
          email: authUser.user.email,
          name: profile?.full_name,
          tokens,
          amountCents: 0,
        }).catch(() => {});
      }

      res.json({ ok: true, newBalance: currentBalance + tokens });
    } catch (err) {
      console.error("[admin/wallet/adjust]", err.message);
      res.status(500).json({ error: "Errore operazione wallet" });
    }
  });

  router.get("/wallet/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!isUUID(userId)) return res.status(400).json({ error: "ID non valido" });

      const { data: wallets } = await supabase
        .from("token_wallets")
        .select("*")
        .eq("user_id", userId);

      res.json({ wallets: wallets || [] });
    } catch (err) {
      console.error("[admin/wallet/:userId]", err.message);
      res.status(500).json({ error: "Errore wallet" });
    }
  });

  router.get("/wallet/:userId/transactions", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!isUUID(userId)) return res.status(400).json({ error: "ID non valido" });
      const { limit = "100", offset = "0", walletType } = req.query;

      let q = supabase
        .from("token_transactions")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (walletType) q = q.eq("wallet_type", walletType);
      const { data, count, error } = await q;
      if (error) throw error;
      res.json({ transactions: data || [], total: count ?? 0 });
    } catch (err) {
      console.error("[admin/wallet/:userId/transactions]", err.message);
      res.status(500).json({ error: "Errore transazioni" });
    }
  });

  // =========================================================================
  // ORDERS
  // =========================================================================
  router.get("/orders", async (req, res) => {
    try {
      const { status, limit = "50", offset = "0" } = req.query;
      let q = supabase
        .from("payment_orders")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);
      if (status) q = q.eq("status", status);
      const { data, count, error } = await q;
      if (error) throw error;

      const userIds = [...new Set((data || []).map((o) => o.user_id).filter(Boolean))];
      let profileMap = {};
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, handle")
          .in("id", userIds);
        profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      }

      res.json({
        orders: (data || []).map((o) => ({ ...o, profile: profileMap[o.user_id] || null })),
        total: count ?? 0,
      });
    } catch (err) {
      console.error("[admin/orders]", err.message);
      res.status(500).json({ error: "Errore lista ordini" });
    }
  });

  router.post("/orders/:id/confirm", async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) return res.status(400).json({ error: "ID non valido" });

      const { data: order } = await supabase.from("payment_orders").select("*").eq("id", id).maybeSingle();
      if (!order) return res.status(404).json({ error: "Ordine non trovato" });
      if (order.status !== "pending") return res.status(400).json({ error: `Ordine non pending (${order.status})` });

      if (order.order_type === "token_pack") {
        await supabase.rpc("srv_confirm_token_purchase", { p_order_id: id, p_provider_ref: "manual-admin" });
      } else if (order.order_type === "creator_plan") {
        await supabase.rpc("srv_confirm_plan_purchase", { p_order_id: id, p_provider_ref: "manual-admin" });
      }

      await audit(req.admin.id, "order_confirm", "order", id, { order_type: order.order_type }, clientIp(req));
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/orders/:id/confirm]", err.message);
      res.status(500).json({ error: "Errore conferma ordine" });
    }
  });

  router.post("/orders/:id/fail", async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) return res.status(400).json({ error: "ID non valido" });

      const { data: order } = await supabase.from("payment_orders").select("*").eq("id", id).maybeSingle();
      if (!order) return res.status(404).json({ error: "Ordine non trovato" });
      if (order.status !== "pending") return res.status(400).json({ error: `Ordine non pending (${order.status})` });

      await supabase.rpc("srv_fail_payment_order", { p_order_id: id, p_provider_ref: "manual-admin" });
      await audit(req.admin.id, "order_fail", "order", id, {}, clientIp(req));
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/orders/:id/fail]", err.message);
      res.status(500).json({ error: "Errore ordine" });
    }
  });

  // =========================================================================
  // PAYOUTS
  // =========================================================================
  router.get("/payouts", async (req, res) => {
    try {
      const { status, limit = "50", offset = "0" } = req.query;
      let q = supabase
        .from("payout_requests")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);
      if (status) q = q.eq("status", status);
      const { data, count, error } = await q;
      if (error) throw error;

      const creatorIds = [...new Set((data || []).map((p) => p.creator_id).filter(Boolean))];
      let profileMap = {};
      if (creatorIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, handle, payout_method")
          .in("id", creatorIds);
        profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      }

      res.json({
        payouts: (data || []).map((p) => ({ ...p, profile: profileMap[p.creator_id] || null })),
        total: count ?? 0,
      });
    } catch (err) {
      console.error("[admin/payouts]", err.message);
      res.status(500).json({ error: "Errore lista payouts" });
    }
  });

  router.post("/payouts/:id/action", async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) return res.status(400).json({ error: "ID non valido" });
      const { action, reason } = req.body;

      const statusMap = { approve: "processing", reject: "rejected", paid: "paid" };
      const newStatus = statusMap[action];
      if (!newStatus) return res.status(400).json({ error: "Azione non valida (approve, reject, paid)" });

      const { data: payout } = await supabase.from("payout_requests").select("*").eq("id", id).maybeSingle();
      if (!payout) return res.status(404).json({ error: "Payout non trovato" });

      const validTransitions = { pending: ["processing", "rejected"], processing: ["paid", "rejected"] };
      const allowed = validTransitions[payout.status] || [];
      if (!allowed.includes(newStatus)) {
        return res.status(400).json({ error: `Transizione non valida: ${payout.status} → ${newStatus}` });
      }

      if (action === "reject") {
        await supabase.rpc("wallet_refund_payout", {
          p_creator_id: payout.creator_id,
          p_token_amount: payout.token_amount,
        });
      }

      await supabase
        .from("payout_requests")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

      const { data: authUser } = await supabase.auth.admin.getUserById(payout.creator_id);
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", payout.creator_id).maybeSingle();
      if (authUser?.user?.email) {
        await emails.sendPayoutUpdate({
          email: authUser.user.email,
          name: profile?.full_name,
          tokenAmount: payout.token_amount,
          euroAmount: payout.euro_amount,
          status: newStatus,
          reason: reason || "",
        }).catch(() => {});
      }

      await audit(req.admin.id, `payout_${action}`, "payout", id, { newStatus, reason }, clientIp(req));
      res.json({ ok: true, status: newStatus });
    } catch (err) {
      console.error("[admin/payouts/:id/action]", err.message);
      res.status(500).json({ error: "Errore gestione payout" });
    }
  });

  // =========================================================================
  // CREATORS
  // =========================================================================
  router.get("/creators", async (req, res) => {
    try {
      const { search, plan, status, limit = "50", offset = "0" } = req.query;
      let q = supabase
        .from("profiles")
        .select("id, email, full_name, handle, plan, status, avatar_url, bio, category, created_at", { count: "exact" })
        .eq("role", "creator")
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (plan) q = q.eq("plan", plan);
      if (status) q = q.eq("status", status);
      if (search) {
        const s = search.replace(/[%_]/g, "");
        q = q.or(`full_name.ilike.%${s}%,handle.ilike.%${s}%`);
      }

      const { data, count, error } = await q;
      if (error) throw error;

      const ids = (data || []).map((c) => c.id);
      let walletMap = {};
      if (ids.length) {
        const { data: wallets } = await supabase
          .from("token_wallets")
          .select("user_id, balance, total_earned, total_spent")
          .eq("wallet_type", "creator")
          .in("user_id", ids);
        walletMap = Object.fromEntries((wallets || []).map((w) => [w.user_id, w]));
      }

      res.json({
        creators: (data || []).map((c) => ({
          ...c,
          wallet: walletMap[c.id] || { balance: 0, total_earned: 0, total_spent: 0 },
        })),
        total: count ?? 0,
      });
    } catch (err) {
      console.error("[admin/creators]", err.message);
      res.status(500).json({ error: "Errore lista creators" });
    }
  });

  router.post("/creators/:id/plan", async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) return res.status(400).json({ error: "ID non valido" });
      const { plan } = req.body;
      if (!["free", "start", "pro"].includes(plan)) return res.status(400).json({ error: "Piano non valido" });

      const { error } = await supabase
        .from("profiles")
        .update({ plan, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      await audit(req.admin.id, "creator_plan_change", "creator", id, { plan }, clientIp(req));
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/creators/:id/plan]", err.message);
      res.status(500).json({ error: "Errore aggiornamento piano" });
    }
  });

  router.post("/creators/:id/suspend", async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) return res.status(400).json({ error: "ID non valido" });
      const { suspended } = req.body;
      const newStatus = suspended ? "suspended" : "active";

      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      await audit(req.admin.id, suspended ? "creator_suspend" : "creator_unsuspend", "creator", id, {}, clientIp(req));
      res.json({ ok: true, status: newStatus });
    } catch (err) {
      console.error("[admin/creators/:id/suspend]", err.message);
      res.status(500).json({ error: "Errore sospensione creator" });
    }
  });

  // =========================================================================
  // MODERATION
  // =========================================================================
  router.get("/reports", async (req, res) => {
    try {
      const { status, limit = "50", offset = "0" } = req.query;
      let q = supabase
        .from("user_reports")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);
      if (status) q = q.eq("status", status);
      const { data, count, error } = await q;
      if (error) throw error;

      const ids = [...new Set(
        (data || []).flatMap((r) => [r.reporter_id, r.target_id, r.resolved_by].filter(Boolean))
      )];
      let profileMap = {};
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, handle, avatar_url, role, status")
          .in("id", ids);
        profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      }

      res.json({
        reports: (data || []).map((r) => ({
          ...r,
          reporter: profileMap[r.reporter_id] || null,
          target: profileMap[r.target_id] || null,
          resolver: r.resolved_by ? profileMap[r.resolved_by] || null : null,
        })),
        total: count ?? 0,
      });
    } catch (err) {
      console.error("[admin/reports]", err.message);
      res.status(500).json({ error: "Errore lista reports" });
    }
  });

  router.post("/reports/:id/action", async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUUID(id)) return res.status(400).json({ error: "ID non valido" });
      const { action, userAction } = req.body;

      if (!["dismiss", "resolve"].includes(action)) {
        return res.status(400).json({ error: "Azione non valida (dismiss, resolve)" });
      }

      const newStatus = action === "dismiss" ? "dismissed" : "resolved";
      const { data: report } = await supabase.from("user_reports").select("*").eq("id", id).maybeSingle();
      if (!report) return res.status(404).json({ error: "Report non trovato" });

      await supabase.from("user_reports").update({
        status: newStatus,
        action_taken: userAction || null,
        resolved_by: req.admin.id,
        resolved_at: new Date().toISOString(),
      }).eq("id", id);

      if (userAction && ["warned", "suspended", "banned"].includes(userAction)) {
        await supabase.from("profiles").update({
          status: userAction === "warned" ? "warned" : userAction === "suspended" ? "suspended" : "banned",
          updated_at: new Date().toISOString(),
        }).eq("id", report.target_id);

        if (userAction === "banned") {
          await supabase.auth.admin.updateUserById(report.target_id, { ban_duration: "876000h" });
        }
      }

      await audit(req.admin.id, `report_${action}`, "report", id, { userAction }, clientIp(req));
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/reports/:id/action]", err.message);
      res.status(500).json({ error: "Errore gestione report" });
    }
  });

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================
  router.post("/notifications", async (req, res) => {
    try {
      const { targetId, title, body, type = "info", isGlobal = false } = req.body;
      if (!title || title.trim().length < 2) return res.status(400).json({ error: "Titolo obbligatorio" });
      if (!isGlobal && !isUUID(targetId)) return res.status(400).json({ error: "targetId richiesto per notifiche non globali" });

      const { data, error } = await supabase.from("admin_notifications").insert({
        sender_id: req.admin.id,
        target_id: isGlobal ? null : targetId,
        title: title.trim(),
        body: (body || "").trim() || null,
        type,
        is_global: isGlobal,
      }).select().maybeSingle();
      if (error) throw error;

      await audit(req.admin.id, "notification_send", "notification", data?.id, { isGlobal, targetId: isGlobal ? "all" : targetId }, clientIp(req));
      res.json({ ok: true, notification: data });
    } catch (err) {
      console.error("[admin/notifications]", err.message);
      res.status(500).json({ error: "Errore invio notifica" });
    }
  });

  router.get("/notifications", async (req, res) => {
    try {
      const { limit = "50", offset = "0" } = req.query;
      const { data, count, error } = await supabase
        .from("admin_notifications")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);
      if (error) throw error;
      res.json({ notifications: data || [], total: count ?? 0 });
    } catch (err) {
      console.error("[admin/notifications]", err.message);
      res.status(500).json({ error: "Errore lista notifiche" });
    }
  });

  // =========================================================================
  // SYSTEM CONFIG
  // =========================================================================
  router.get("/config", async (req, res) => {
    try {
      const { data, error } = await supabase.from("system_config").select("*");
      if (error) throw error;
      const config = {};
      for (const row of data || []) config[row.key] = row.value;
      res.json({ config });
    } catch (err) {
      console.error("[admin/config]", err.message);
      res.status(500).json({ error: "Errore configurazione" });
    }
  });

  router.post("/config", async (req, res) => {
    try {
      const { updates } = req.body;
      if (!updates || typeof updates !== "object") return res.status(400).json({ error: "updates richiesto" });

      for (const [key, value] of Object.entries(updates)) {
        await supabase.from("system_config").upsert({
          key,
          value: typeof value === "string" ? JSON.stringify(value) : value,
          updated_by: req.admin.id,
          updated_at: new Date().toISOString(),
        });
      }

      await audit(req.admin.id, "config_update", "config", null, { keys: Object.keys(updates) }, clientIp(req));
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/config]", err.message);
      res.status(500).json({ error: "Errore aggiornamento configurazione" });
    }
  });

  // =========================================================================
  // SYSTEM HEALTH — semaphore for dashboard
  // =========================================================================
  router.get("/health", async (req, res) => {
    try {
      const checks = {};
      const STALE_MS = 26 * 60 * 60 * 1000;

      // 1. API health
      checks.api = { status: "ok", message: "API running" };

      // 2. Database connectivity
      const dbStart = Date.now();
      const { error: dbErr } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      checks.database = dbErr
        ? { status: "error", message: dbErr.message }
        : { status: "ok", latency_ms: Date.now() - dbStart };

      // 3. GDPR Cron
      const { data: cronJob, error: cronErr } = await supabase
        .from("cron_status")
        .select("*")
        .eq("job_name", "gdpr")
        .maybeSingle();
      if (cronErr && (cronErr.code === "PGRST205" || cronErr.code === "42P01")) {
        checks.cron = { status: "warn", message: "cron_status table missing" };
      } else if (!cronJob) {
        checks.cron = { status: "warn", message: "Never executed" };
      } else {
        const stale = Date.now() - new Date(cronJob.last_run).getTime() > STALE_MS;
        checks.cron = {
          status: cronJob.status === "success" && !stale ? "ok" : stale ? "error" : "error",
          last_run: cronJob.last_run,
          last_status: cronJob.status,
          duration_ms: cronJob.duration_ms,
          message: stale ? "STALE — last run > 26h ago" : cronJob.status !== "success" ? `Failed: ${cronJob.error}` : "OK",
        };
      }

      // 4. Pending deletion requests (GDPR compliance)
      const { count: pendingDeletions } = await supabase
        .from("deletion_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      const { count: overdueDeletions } = await supabase
        .from("deletion_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("scheduled_at", new Date().toISOString());
      checks.gdpr_deletions = {
        status: (overdueDeletions || 0) > 0 ? "warn" : "ok",
        pending: pendingDeletions || 0,
        overdue: overdueDeletions || 0,
      };

      // 5. Pending reports
      const { count: pendingReports } = await supabase
        .from("user_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      checks.moderation = {
        status: (pendingReports || 0) > 10 ? "warn" : "ok",
        pending_reports: pendingReports || 0,
      };

      // 6. Failed orders (last 24h)
      const { count: failedOrders } = await supabase
        .from("payment_orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", new Date(Date.now() - 86400000).toISOString());
      checks.payments = {
        status: (failedOrders || 0) > 5 ? "warn" : "ok",
        failed_24h: failedOrders || 0,
      };

      // 7. Login failures (last hour)
      const { count: loginFails } = await supabase
        .from("login_log")
        .select("id", { count: "exact", head: true })
        .eq("success", false)
        .gte("created_at", new Date(Date.now() - 3600000).toISOString());
      checks.auth = {
        status: (loginFails || 0) > 20 ? "warn" : "ok",
        failed_logins_1h: loginFails || 0,
      };

      // Overall
      const statuses = Object.values(checks).map(c => c.status);
      const overall = statuses.includes("error") ? "error" : statuses.includes("warn") ? "warn" : "ok";

      res.json({ status: overall, checks, timestamp: new Date().toISOString() });
    } catch (err) {
      console.error("[admin/health]", err.message);
      res.status(500).json({ status: "error", error: err.message });
    }
  });

  // =========================================================================
  // AUDIT LOG
  // =========================================================================
  router.get("/audit-log", async (req, res) => {
    try {
      const { action, adminId, limit = "100", offset = "0" } = req.query;
      let q = supabase
        .from("audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);
      if (action) q = q.eq("action", action);
      if (adminId && isUUID(adminId)) q = q.eq("admin_id", adminId);
      const { data, count, error } = await q;
      if (error) throw error;

      const ids = [...new Set((data || []).map((a) => a.admin_id).filter(Boolean))];
      let profileMap = {};
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
        profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      }

      res.json({
        logs: (data || []).map((l) => ({ ...l, admin: profileMap[l.admin_id] || null })),
        total: count ?? 0,
      });
    } catch (err) {
      console.error("[admin/audit-log]", err.message);
      res.status(500).json({ error: "Errore audit log" });
    }
  });

  // =========================================================================
  // AUDIT LOG — full export (JSON) for daily backup
  // =========================================================================
  router.get("/audit-log/export", async (req, res) => {
    try {
      const { from, to } = req.query;
      const since = from || new Date(Date.now() - 86400000).toISOString();
      const until = to || new Date().toISOString();

      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .gte("created_at", since)
        .lte("created_at", until)
        .order("created_at", { ascending: true })
        .limit(50000);
      if (error) throw error;

      const today = new Date().toISOString().slice(0, 10);
      await audit(req.admin.id, "audit_export", "audit_log", null, { from: since, to: until, count: data?.length }, clientIp(req));

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="audit-log-${today}.json"`);
      res.json({ exported_at: new Date().toISOString(), from: since, to: until, count: data?.length || 0, logs: data || [] });
    } catch (err) {
      console.error("[admin/audit-log/export]", err.message);
      res.status(500).json({ error: "Errore export audit log" });
    }
  });

  // =========================================================================
  // EXPORT CSV
  // =========================================================================
  const toCsv = (rows, columns) => {
    const header = columns.join(",");
    const lines = (rows || []).map((r) =>
      columns.map((c) => {
        const v = r[c];
        if (v == null) return "";
        let s = String(v).replace(/"/g, '""');
        // Prevent CSV injection: prefix formula-triggering chars with single quote
        if (/^[=+@\-]/.test(s)) s = "'" + s;
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
      }).join(",")
    );
    return [header, ...lines].join("\n");
  };

  router.get("/export/:type", async (req, res) => {
    try {
      const { type } = req.params;
      let csv = "";
      let filename = "";

      if (type === "users") {
        const { data } = await supabase
          .from("profiles")
          .select("id, email, full_name, handle, role, plan, status, onboarding_complete, created_at")
          .order("created_at", { ascending: false })
          .limit(10000);
        csv = toCsv(data, ["id", "email", "full_name", "handle", "role", "plan", "status", "onboarding_complete", "created_at"]);
        filename = "users.csv";
      } else if (type === "orders") {
        const { data } = await supabase
          .from("payment_orders")
          .select("id, user_id, order_type, amount_eur, token_amount, status, provider, created_at")
          .order("created_at", { ascending: false })
          .limit(10000);
        csv = toCsv(data, ["id", "user_id", "order_type", "amount_eur", "token_amount", "status", "provider", "created_at"]);
        filename = "orders.csv";
      } else if (type === "transactions") {
        const { data } = await supabase
          .from("token_transactions")
          .select("id, user_id, wallet_type, type, amount, description, created_at")
          .order("created_at", { ascending: false })
          .limit(50000);
        csv = toCsv(data, ["id", "user_id", "wallet_type", "type", "amount", "description", "created_at"]);
        filename = "transactions.csv";
      } else {
        return res.status(400).json({ error: "Tipo export non valido (users, orders, transactions)" });
      }

      await audit(req.admin.id, "export_csv", "export", type, {}, clientIp(req));
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      console.error("[admin/export]", err.message);
      res.status(500).json({ error: "Errore export" });
    }
  });

  // =========================================================================
  // METRICS (charts / timeseries)
  // =========================================================================
  router.get("/metrics/signups", async (req, res) => {
    try {
      const days = Math.min(Number(req.query.days) || 30, 365);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from("profiles")
        .select("created_at, role")
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const bucket = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setHours(0,0,0,0); d.setTime(d.getTime() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        bucket[key] = { date: key, fan: 0, creator: 0, total: 0 };
      }
      for (const row of data || []) {
        const key = (row.created_at || "").slice(0, 10);
        if (!bucket[key]) continue;
        const role = row.role === "creator" ? "creator" : "fan";
        bucket[key][role]++;
        bucket[key].total++;
      }
      res.json(Object.values(bucket));
    } catch (err) {
      console.error("[admin/metrics/signups]", err.message);
      res.status(500).json({ error: "Errore metriche signups" });
    }
  });

  router.get("/metrics/token-flow", async (req, res) => {
    try {
      const days = Math.min(Number(req.query.days) || 30, 365);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from("token_transactions")
        .select("created_at, type, amount")
        .gte("created_at", since);
      if (error) throw error;

      const bucket = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setHours(0,0,0,0); d.setTime(d.getTime() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        bucket[key] = { date: key, topup: 0, spend: 0, earn: 0, payout: 0 };
      }
      for (const row of data || []) {
        const key = (row.created_at || "").slice(0, 10);
        if (!bucket[key]) continue;
        const v = Math.abs(row.amount || 0);
        if (row.type in bucket[key]) bucket[key][row.type] += v;
      }
      res.json(Object.values(bucket));
    } catch (err) {
      console.error("[admin/metrics/token-flow]", err.message);
      res.status(500).json({ error: "Errore metriche token flow" });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /api/admin/email-test
  // Body: { to } — manda una mail di test per validare la config SMTP/Resend.
  // ---------------------------------------------------------------------------
  router.post("/email-test", async (req, res) => {
    if (!emails) return res.status(500).json({ error: "emails module not wired" });
    const { to } = req.body || {};
    if (!to || typeof to !== "string" || !to.includes("@")) {
      return res.status(400).json({ error: "to (email) richiesto" });
    }
    const r = await emails.sendCustom({
      to,
      subject: "[Menia] Test email — config check",
      html: `<p>Se ricevi questa email, la configurazione SMTP è corretta.</p>
             <p>Provider utilizzato: <code>${process.env.EMAIL_PROVIDER || "smtp2go"}</code></p>
             <p>From: <code>${process.env.EMAIL_FROM || "Menia.io <noreply@menia.io>"}</code></p>
             <p>Timestamp: ${new Date().toISOString()}</p>`,
      text: "Menia email config test — see HTML version",
    });
    if (r.ok) return res.json(r);
    return res.status(500).json(r);
  });

  return router;
};
