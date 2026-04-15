import { supabase, hasSupabase } from "./supabase";
import { db } from "./db";

// =============================================================================
// Wallet service — Supabase-backed con fallback localStorage per dev.
// NB: topUp client-side è temporaneo; in produzione l'accredito deve arrivare
//     solo dal webhook Stripe verificato lato server.
// =============================================================================

// ---------------------------------------------------------------------------
// Supabase impl
// ---------------------------------------------------------------------------
const getCurrentUserId = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
};

const ensureWalletRemote = async (userId, walletType = "user") => {
  const uid = userId || (await getCurrentUserId());
  if (!uid) return null;

  const { data: existing, error: selErr } = await supabase
    .from("token_wallets")
    .select("*")
    .eq("user_id", uid)
    .eq("wallet_type", walletType)
    .maybeSingle();
  if (selErr) console.warn("[wallet] select", selErr.message);
  if (existing) return existing;

  const { data: inserted, error: insErr } = await supabase
    .from("token_wallets")
    .insert({ user_id: uid, wallet_type: walletType, balance: 0, total_earned: 0, total_spent: 0 })
    .select()
    .maybeSingle();
  if (insErr) {
    console.warn("[wallet] insert", insErr.message);
    return null;
  }
  return inserted;
};

const supabaseImpl = {
  async getUserWallet(userId) {
    return await ensureWalletRemote(userId, "user");
  },

  async getCreatorWallet(userId) {
    return await ensureWalletRemote(userId, "creator");
  },

  async listTransactions(userId, walletType = "user") {
    const uid = userId || (await getCurrentUserId());
    if (!uid) return [];
    const { data, error } = await supabase
      .from("token_transactions")
      .select("*")
      .eq("user_id", uid)
      .eq("wallet_type", walletType)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.warn("[wallet] listTransactions", error.message);
      return [];
    }
    return (data || []).map((tx) => ({ ...tx, created_date: tx.created_at }));
  },

  async topUp(userId, amount, description = "Ricarica") {
    const wallet = await ensureWalletRemote(userId, "user");
    if (!wallet) throw new Error("Wallet non disponibile");
    const { data: updated, error: updErr } = await supabase
      .from("token_wallets")
      .update({
        balance: wallet.balance + amount,
        total_earned: (wallet.total_earned || 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .maybeSingle();
    if (updErr) throw new Error(updErr.message);

    await supabase.from("token_transactions").insert({
      user_id: wallet.user_id,
      wallet_type: "user",
      type: "topup",
      amount,
      description,
    });
    return updated;
  },

  async spend(userId, amount, description = "Spesa") {
    const wallet = await ensureWalletRemote(userId, "user");
    if (!wallet) throw new Error("Wallet non disponibile");
    if (wallet.balance < amount) throw new Error("Saldo insufficiente");
    const { data: updated, error: updErr } = await supabase
      .from("token_wallets")
      .update({
        balance: wallet.balance - amount,
        total_spent: (wallet.total_spent || 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .maybeSingle();
    if (updErr) throw new Error(updErr.message);

    await supabase.from("token_transactions").insert({
      user_id: wallet.user_id,
      wallet_type: "user",
      type: "spend",
      amount: -amount,
      description,
    });
    return updated;
  },

  async hasLiveAccess(userId, liveId) {
    const uid = userId || (await getCurrentUserId());
    if (!uid || !liveId) return false;
    const { data, error } = await supabase
      .from("token_transactions")
      .select("id")
      .eq("user_id", uid)
      .eq("type", "spend")
      .eq("ref_id", `live:${liveId}`)
      .limit(1);
    if (error) {
      console.warn("[wallet] hasLiveAccess", error.message);
      return false;
    }
    return (data || []).length > 0;
  },

  async purchaseLiveAccess(userId, liveId, amount, description = "Accesso live") {
    const uid = userId || (await getCurrentUserId());
    if (!uid) throw new Error("Nessun utente autenticato");
    if (!liveId) throw new Error("Live non valida");
    if (await this.hasLiveAccess(uid, liveId)) return { alreadyOwned: true };

    const wallet = await ensureWalletRemote(uid, "user");
    if (!wallet) throw new Error("Wallet non disponibile");
    if (wallet.balance < amount) throw new Error("Saldo insufficiente");

    const { error: updErr } = await supabase
      .from("token_wallets")
      .update({
        balance: wallet.balance - amount,
        total_spent: (wallet.total_spent || 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);
    if (updErr) throw new Error(updErr.message);

    await supabase.from("token_transactions").insert({
      user_id: uid,
      wallet_type: "user",
      type: "spend",
      amount: -amount,
      description,
      ref_id: `live:${liveId}`,
    });
    return { alreadyOwned: false };
  },

  async requestPayout(creatorId, tokenAmount, notes = "") {
    const uid = creatorId || (await getCurrentUserId());
    if (!uid) throw new Error("Nessun utente autenticato");
    const creatorWallet = await ensureWalletRemote(uid, "creator");
    if (!creatorWallet || creatorWallet.balance < tokenAmount) {
      throw new Error("Saldo creator insufficiente");
    }
    const euroAmount = Number((tokenAmount * 0.08).toFixed(2));
    const { data, error } = await supabase
      .from("payout_requests")
      .insert({
        creator_id: uid,
        token_amount: tokenAmount,
        euro_amount: euroAmount,
        status: "pending",
        notes,
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);

    await supabase
      .from("token_wallets")
      .update({
        balance: creatorWallet.balance - tokenAmount,
        total_spent: (creatorWallet.total_spent || 0) + tokenAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", creatorWallet.id);

    await supabase.from("token_transactions").insert({
      user_id: uid,
      wallet_type: "creator",
      type: "payout",
      amount: -tokenAmount,
      description: `Richiesta payout €${euroAmount}`,
    });

    return data;
  },

  async listPayouts(creatorId) {
    const uid = creatorId || (await getCurrentUserId());
    if (!uid) return [];
    const { data, error } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("creator_id", uid)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("[wallet] listPayouts", error.message);
      return [];
    }
    return data || [];
  },
};

// ---------------------------------------------------------------------------
// Local fallback
// ---------------------------------------------------------------------------
const ensureWalletLocal = (userId, walletType = "user") => {
  if (!userId) return null;
  let wallet = db.tokenWallets.find((w) => w.user_id === userId && w.wallet_type === walletType);
  if (!wallet) {
    wallet = db.tokenWallets.insert({
      user_id: userId,
      wallet_type: walletType,
      balance: 0,
      total_earned: 0,
      total_spent: 0,
    });
  }
  return wallet;
};

const localImpl = {
  async getUserWallet(userId) {
    return ensureWalletLocal(userId, "user");
  },
  async getCreatorWallet(userId) {
    return ensureWalletLocal(userId, "creator");
  },
  async listTransactions(userId, walletType = "user") {
    return db.tokenTransactions
      .filter({ user_id: userId, wallet_type: walletType })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  async topUp(userId, amount, description = "Ricarica") {
    const wallet = ensureWalletLocal(userId, "user");
    const updated = db.tokenWallets.update(wallet.id, {
      balance: wallet.balance + amount,
      total_earned: (wallet.total_earned || 0) + amount,
    });
    db.tokenTransactions.insert({
      user_id: userId,
      wallet_type: "user",
      type: "topup",
      amount,
      description,
      created_date: new Date().toISOString(),
    });
    return updated;
  },
  async spend(userId, amount, description = "Spesa") {
    const wallet = ensureWalletLocal(userId, "user");
    if (wallet.balance < amount) throw new Error("Saldo insufficiente");
    const updated = db.tokenWallets.update(wallet.id, {
      balance: wallet.balance - amount,
      total_spent: (wallet.total_spent || 0) + amount,
    });
    db.tokenTransactions.insert({
      user_id: userId,
      wallet_type: "user",
      type: "spend",
      amount: -amount,
      description,
      created_date: new Date().toISOString(),
    });
    return updated;
  },
  async hasLiveAccess(userId, liveId) {
    if (!userId || !liveId) return false;
    const rows = db.tokenTransactions.filter({ user_id: userId, type: "spend", ref_id: `live:${liveId}` });
    return rows.length > 0;
  },
  async purchaseLiveAccess(userId, liveId, amount, description = "Accesso live") {
    if (!userId) throw new Error("Nessun utente autenticato");
    if (!liveId) throw new Error("Live non valida");
    if (await this.hasLiveAccess(userId, liveId)) return { alreadyOwned: true };
    const wallet = ensureWalletLocal(userId, "user");
    if (wallet.balance < amount) throw new Error("Saldo insufficiente");
    db.tokenWallets.update(wallet.id, {
      balance: wallet.balance - amount,
      total_spent: (wallet.total_spent || 0) + amount,
    });
    db.tokenTransactions.insert({
      user_id: userId,
      wallet_type: "user",
      type: "spend",
      amount: -amount,
      description,
      ref_id: `live:${liveId}`,
      created_date: new Date().toISOString(),
    });
    return { alreadyOwned: false };
  },
  async requestPayout(creatorId, tokenAmount) {
    const wallet = ensureWalletLocal(creatorId, "creator");
    if (wallet.balance < tokenAmount) throw new Error("Saldo creator insufficiente");
    db.tokenWallets.update(wallet.id, {
      balance: wallet.balance - tokenAmount,
      total_spent: (wallet.total_spent || 0) + tokenAmount,
    });
    const euroAmount = Number((tokenAmount * 0.08).toFixed(2));
    return { id: crypto.randomUUID(), token_amount: tokenAmount, euro_amount: euroAmount, status: "pending", created_at: new Date().toISOString() };
  },
  async listPayouts() {
    return [];
  },
};

export const walletService = hasSupabase ? supabaseImpl : localImpl;
export const walletBackend = hasSupabase ? "supabase" : "local";

if (typeof window !== "undefined") {
  /** @type {any} */ (window).__tokaroWallet = walletService;
}
