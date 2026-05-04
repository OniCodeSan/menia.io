const API_BASE = import.meta.env.VITE_API_URL || "";

function getToken() {
  try {
    const stored = JSON.parse(localStorage.getItem("menia:admin:token") || "null");
    return stored?.access_token || null;
  } catch {
    return null;
  }
}

async function request(method, path, body = null) {
  const token = await getToken();
  if (!token) throw new Error("Non autenticato");

  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}/api/admin${path}`, opts);

  if (res.headers.get("content-type")?.includes("text/csv")) {
    return res;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Errore ${res.status}`);
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),

  getDashboard: () => request("GET", "/dashboard"),

  getUsers: (params) => request("GET", `/users?${new URLSearchParams(params)}`),
  getUser: (id) => request("GET", `/users/${id}`),
  setUserStatus: (id, status) => request("POST", `/users/${id}/status`, { status }),
  setUserRole: (id, role) => request("POST", `/users/${id}/role`, { role }),
  forceLogout: (id) => request("POST", `/users/${id}/force-logout`),
  resetPassword: (id) => request("POST", `/users/${id}/reset-password`),

  adjustWallet: (userId, amount, reason, walletType) =>
    request("POST", "/wallet/adjust", { userId, amount, reason, walletType }),
  getWallet: (userId) => request("GET", `/wallet/${userId}`),
  getTransactions: (userId, params) =>
    request("GET", `/wallet/${userId}/transactions?${new URLSearchParams(params)}`),

  getOrders: (params) => request("GET", `/orders?${new URLSearchParams(params)}`),
  confirmOrder: (id) => request("POST", `/orders/${id}/confirm`),
  failOrder: (id) => request("POST", `/orders/${id}/fail`),

  getPayouts: (params) => request("GET", `/payouts?${new URLSearchParams(params)}`),
  payoutAction: (id, action, reason) => request("POST", `/payouts/${id}/action`, { action, reason }),

  getCreators: (params) => request("GET", `/creators?${new URLSearchParams(params)}`),
  setCreatorPlan: (id, plan) => request("POST", `/creators/${id}/plan`, { plan }),
  suspendCreator: (id, suspended) => request("POST", `/creators/${id}/suspend`, { suspended }),

  getReports: (params) => request("GET", `/reports?${new URLSearchParams(params)}`),
  reportAction: (id, action, userAction) => request("POST", `/reports/${id}/action`, { action, userAction }),

  sendNotification: (data) => request("POST", "/notifications", data),
  getNotifications: (params) => request("GET", `/notifications?${new URLSearchParams(params)}`),

  getConfig: () => request("GET", "/config"),
  updateConfig: (updates) => request("POST", "/config", { updates }),

  getAuditLog: (params) => request("GET", `/audit-log?${new URLSearchParams(params)}`),

  getSignupMetrics: (days) => request("GET", `/metrics/signups?days=${days}`),
  getTokenFlowMetrics: (days) => request("GET", `/metrics/token-flow?days=${days}`),

  async exportCsv(type) {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/api/admin/export/${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Errore export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
