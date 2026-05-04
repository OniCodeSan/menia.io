// =============================================================================
// Access middleware — single source of truth for "can user X consume Y?".
// All checks hit the DB directly via the supabase service-role client passed in.
// No fallback, no caching: keep the surface small until we measure load.
// =============================================================================

const UUID_RE = /^[a-f0-9-]{36}$/i;
const isUuid = (s) => typeof s === "string" && UUID_RE.test(s);

async function hasActiveSubscription(supabase, user_id, creator_id) {
  if (!isUuid(user_id) || !isUuid(creator_id)) return false;
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, expires_at")
    .eq("fan_id", user_id)
    .eq("creator_id", creator_id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[access:subscription]", error.message);
    return false;
  }
  if (!data) return false;
  if (data.expires_at && new Date(data.expires_at).toISOString() <= nowIso) return false;
  return true;
}

// Global platform subscription (all-courses paywall €0.99/mese).
// Date-based: status alone non basta perché un cron giornaliero potrebbe
// non aver ancora "expired" un record con trial_end < now.
async function hasActivePlatformAccess(supabase, user_id) {
  if (!isUuid(user_id)) return false;
  const { data, error } = await supabase
    .from("platform_subscriptions")
    .select("status, trial_end, current_period_end")
    .eq("user_id", user_id)
    .maybeSingle();
  if (error) {
    console.warn("[access:platform]", error.message);
    return false;
  }
  if (!data) return false;
  const now = Date.now();
  if (data.status === "trial" && data.trial_end && new Date(data.trial_end).getTime() > now) return true;
  if (data.status === "active" && data.current_period_end && new Date(data.current_period_end).getTime() > now) return true;
  return false;
}

async function hasCourseAccess(supabase, user_id, course_id) {
  if (!isUuid(user_id) || !isUuid(course_id)) return false;

  // Owner shortcut
  const { data: course, error: courseErr } = await supabase
    .from("courses")
    .select("creator_id")
    .eq("id", course_id)
    .maybeSingle();
  if (courseErr) {
    console.warn("[access:course]", courseErr.message);
    return false;
  }
  if (!course) return false;
  if (course.creator_id === user_id) return true;

  // Direct grant
  const { data, error } = await supabase
    .from("course_access")
    .select("user_id")
    .eq("user_id", user_id)
    .eq("course_id", course_id)
    .maybeSingle();
  if (error) {
    console.warn("[access:course_access]", error.message);
    return false;
  }
  return !!data;
}

async function hasLiveEventAccess(supabase, user_id, live_event_id) {
  if (!isUuid(user_id) || !isUuid(live_event_id)) return false;

  const { data: ev, error: evErr } = await supabase
    .from("live_events")
    .select("creator_id, price")
    .eq("id", live_event_id)
    .maybeSingle();
  if (evErr) {
    console.warn("[access:live_event]", evErr.message);
    return false;
  }
  if (!ev) return false;
  if (ev.creator_id === user_id) return true;
  if (Number(ev.price || 0) === 0) return true; // free events open to everyone

  const { data, error } = await supabase
    .from("live_access")
    .select("user_id")
    .eq("user_id", user_id)
    .eq("live_event_id", live_event_id)
    .maybeSingle();
  if (error) {
    console.warn("[access:live_access]", error.message);
    return false;
  }
  return !!data;
}

module.exports = {
  hasActiveSubscription,
  hasActivePlatformAccess,
  hasCourseAccess,
  hasLiveEventAccess,
  isUuid,
};
