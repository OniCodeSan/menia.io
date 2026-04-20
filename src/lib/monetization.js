import { supabase, hasSupabase } from "./supabase";

export async function processSubscription(fanId, creatorId, tier = "base") {
  if (!hasSupabase) throw new Error("Supabase non disponibile");

  const { data, error } = await supabase.rpc("rpc_subscribe", {
    p_creator_id: creatorId,
    p_tier: tier,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function processContentUnlock(fanId, postId) {
  if (!hasSupabase) throw new Error("Supabase non disponibile");

  const { data, error } = await supabase.rpc("rpc_unlock_content", {
    p_post_id: postId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function processPaidMessage(fanId, creatorId) {
  if (!hasSupabase) throw new Error("Supabase non disponibile");

  const { data, error } = await supabase.rpc("rpc_paid_message", {
    p_creator_id: creatorId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function processLiveAccess(fanId, liveId, amount) {
  if (!hasSupabase) throw new Error("Supabase non disponibile");
  if (!liveId) throw new Error("Live non valida");
  if (amount <= 0) throw new Error("Importo non valido");

  const { data, error } = await supabase.rpc("rpc_live_access", {
    p_live_id: liveId,
    p_amount: amount,
  });
  if (error) throw new Error(error.message);
  return { alreadyOwned: data?.already_owned || false };
}

export async function processDonation(fanId, creatorId, amount, liveId = null) {
  if (!hasSupabase) throw new Error("Supabase non disponibile");
  if (amount <= 0 || amount > 100000) throw new Error("Importo non valido");

  const { data, error } = await supabase.rpc("rpc_donate", {
    p_creator_id: creatorId,
    p_amount: amount,
    p_live_id: liveId,
  });
  if (error) throw new Error(error.message);
  return data;
}
