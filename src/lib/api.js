import { supabase } from "./supabase";

// =============================================================================
// API client — thin wrapper over the T1 backend.
// Auth: Bearer JWT from Supabase session injected automatically.
// =============================================================================

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = "GET", body, requireAuth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (requireAuth) Object.assign(headers, await authHeaders());
  else {
    // Best-effort: include auth if available so endpoints can personalize
    Object.assign(headers, await authHeaders());
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try { payload = await res.json(); } catch {}

  if (!res.ok) {
    const msg = payload?.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

// ----------------------------- Courses --------------------------------------
export const coursesApi = {
  list: ({ limit = 50, offset = 0, sort } = {}) => {
    const params = new URLSearchParams({ limit, offset });
    if (sort) params.set("sort", sort);
    return request(`/courses?${params}`);
  },
  get: (id) => request(`/courses/${id}`),
  create: (course) => request("/courses", { method: "POST", body: course, requireAuth: true }),
  update: (id, patch) => request(`/courses/${id}`, { method: "PATCH", body: patch, requireAuth: true }),
  saveDraft: (course, lessons) =>
    request("/courses/save-draft", { method: "POST", body: { course, lessons }, requireAuth: true }),
  getDraft: (id) => request(`/courses/${id}/draft`, { requireAuth: true }),
};

// ----------------------------- Course lessons -------------------------------
export const lessonsApi = {
  create: (lesson) => request("/course-lessons", { method: "POST", body: lesson, requireAuth: true }),
  update: (id, patch) => request(`/course-lessons/${id}`, { method: "PATCH", body: patch, requireAuth: true }),
  remove: (id) => request(`/course-lessons/${id}`, { method: "DELETE", requireAuth: true }),
};

// ----------------------------- Live events ----------------------------------
export const liveEventsApi = {
  list: ({ limit = 50, offset = 0, status } = {}) => {
    const params = new URLSearchParams({ limit, offset });
    if (status) params.set("status", status);
    return request(`/live-events?${params}`);
  },
  get: (id) => request(`/live-events/${id}`),
  create: (event) => request("/live-events", { method: "POST", body: event, requireAuth: true }),
  update: (id, patch) => request(`/live-events/${id}`, { method: "PATCH", body: patch, requireAuth: true }),
  start: (id) => request(`/live-events/${id}/start`, { method: "POST", requireAuth: true }),
  end:   (id) => request(`/live-events/${id}/end`,   { method: "POST", requireAuth: true }),
  chat:  (id, message) =>
    request(`/live-events/${id}/chat`, {
      method: "POST",
      body: { message },
      requireAuth: true,
    }),
  joinToken: (id) =>
    request(`/live-events/${id}/join-token`, { method: "POST", requireAuth: true }),
};

// ----------------------------- Community ------------------------------------
export const communityApi = {
  list: (creatorId, { limit = 50, offset = 0 } = {}) =>
    request(`/community/${creatorId}?limit=${limit}&offset=${offset}`),
  create: (post) => request("/community/posts", { method: "POST", body: post, requireAuth: true }),
  remove: (id) => request(`/community/posts/${id}`, { method: "DELETE", requireAuth: true }),
};

// ----------------------------- Creators -------------------------------------
export const creatorsApi = {
  get: (idOrHandle) => request(`/creators/${idOrHandle}`),
};

// ----------------------------- Admin (grants) -------------------------------
export const adminApi = {
  grantCourseAccess: (body) => request("/admin/grant-course-access", { method: "POST", body, requireAuth: true }),
  revokeCourseAccess: (body) => request("/admin/revoke-course-access", { method: "POST", body, requireAuth: true }),
  grantLiveAccess: (body) => request("/admin/grant-live-access", { method: "POST", body, requireAuth: true }),
  revokeLiveAccess: (body) => request("/admin/revoke-live-access", { method: "POST", body, requireAuth: true }),
  grantSubscription: (body) => request("/admin/grant-subscription", { method: "POST", body, requireAuth: true }),
  revokeSubscription: (body) => request("/admin/revoke-subscription", { method: "POST", body, requireAuth: true }),
  grantCreatorPlan: (body) => request("/admin/grant-creator-plan", { method: "POST", body, requireAuth: true }),
  revokeCreatorPlan: (body) => request("/admin/revoke-creator-plan", { method: "POST", body, requireAuth: true }),
};

// ----------------------------- Creator KPI ----------------------------------
export const kpiApi = {
  get: () => request("/creator/kpi", { requireAuth: true }),
  history: (days = 30) => request(`/creator/kpi/history?days=${days}`, { requireAuth: true }),
  segment: () => request("/creator/segment", { requireAuth: true }),
  conversion: () => request("/creator/conversion", { requireAuth: true }),
  suggestions: () => request("/creator/suggestions", { requireAuth: true }),
  subscribePlan: (plan_id) => request("/creator/subscribe-plan", { method: "POST", body: { plan_id }, requireAuth: true }),
  activatePlanTest: (plan_id) => request("/creator/activate-plan-test", { method: "POST", body: { plan_id }, requireAuth: true }),
  promoStatus: () => request("/creator/promo-status"),
  claimPromo: (external_payment_link) =>
    request("/creator/claim-promo", { method: "POST", body: { external_payment_link }, requireAuth: true }),
  trackView: (kind, creator_id) =>
    request("/creator/views", { method: "POST", body: { kind, creator_id } })
      .catch(() => {}),
};

// ----------------------------- Plans (catalog) ------------------------------
export const plansApi = {
  list: () => request("/plans"),
};

// ----------------------------- Upload (videos) ------------------------------
async function uploadVideoOnce(file, onProgress) {
  const fd = new FormData();
  fd.append("file", file, file.name || "video.mp4");
  const headers = await authHeaders();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/upload/video`);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else {
          const err = new Error(body.error || `HTTP ${xhr.status}`);
          err.status = xhr.status;
          reject(err);
        }
      } catch {
        const err = new Error(`HTTP ${xhr.status}`);
        err.status = xhr.status;
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error("Errore di rete durante l'upload"));
    xhr.ontimeout = () => reject(new Error("Timeout upload"));
    xhr.send(fd);
  });
}

export const uploadApi = {
  async video(file, onProgress, { retries = 3 } = {}) {
    let lastErr;
    for (let attempt = 0; attempt < retries; attempt++) {
      try { return await uploadVideoOnce(file, onProgress); }
      catch (err) {
        lastErr = err;
        if (err.status >= 400 && err.status < 500) throw err;
        if (attempt < retries - 1) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    throw lastErr;
  },

  // Upload an image (max 5MB). Returns { url, path, size, mime }
  async image(file) {
    const fd = new FormData();
    fd.append("file", file, file.name || "image");
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/upload/image`, {
      method: "POST",
      headers,
      body: fd,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    return body;
  },

  // Upload a document (PDF/DOC/XLS/PPT/ZIP/TXT/CSV, max 25MB).
  // Returns { url, path, name, size, mime } — `name` keeps original filename.
  async document(file) {
    const fd = new FormData();
    fd.append("file", file, file.name || "documento");
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/upload/document`, {
      method: "POST",
      headers,
      body: fd,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    return body;
  },
};

// ----------------------------- Billing --------------------------------------
export const billingApi = {
  getMine: () => request("/billing/me/subscription", { requireAuth: true }),
  startCheckout: () => request("/billing/me/subscription/checkout", { method: "POST", requireAuth: true }),
  cancel: () => request("/billing/me/subscription/cancel", { method: "POST", requireAuth: true }),
};

// ----------------------------- Social ---------------------------------------
export const socialApi = {
  follow: (creatorId) => request(`/social/follow/${creatorId}`, { method: "POST", requireAuth: true }),
  unfollow: (creatorId) => request(`/social/follow/${creatorId}`, { method: "DELETE", requireAuth: true }),
  followStatus: (creatorId) => request(`/social/follow/${creatorId}/status`, { requireAuth: true }),
  getFollowers: ({ limit = 100 } = {}) => request(`/social/me/followers?limit=${limit}`, { requireAuth: true }),
  getFollowing: () => request(`/social/me/following`, { requireAuth: true }),
  broadcast: ({ title, body }) => request(`/social/broadcasts`, { method: "POST", body: { title, body }, requireAuth: true }),
  listBroadcasts: ({ limit = 20 } = {}) => request(`/social/broadcasts?limit=${limit}`, { requireAuth: true }),
};

// ----------------------------- Notifications -------------------------------
export const notificationsApi = {
  list: ({ limit = 30, before } = {}) => {
    const p = new URLSearchParams({ limit });
    if (before) p.set("before", before);
    return request(`/notifications/me?${p}`, { requireAuth: true });
  },
  unreadCount: () => request("/notifications/unread-count", { requireAuth: true }),
  markRead:    (id) => request(`/notifications/${id}/read`, { method: "POST", requireAuth: true }),
  markAllRead: () => request(`/notifications/mark-all-read`, { method: "POST", requireAuth: true }),
};

// ----------------------------- Preferences ---------------------------------
export const preferencesApi = {
  get: () => request("/preferences/me", { requireAuth: true }),
  mute: (creatorId) => request(`/preferences/mute/${creatorId}`, { method: "POST", requireAuth: true }),
  unmute: (creatorId) => request(`/preferences/mute/${creatorId}`, { method: "DELETE", requireAuth: true }),
};
