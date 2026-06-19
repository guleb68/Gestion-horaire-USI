(() => {
  const productionApiUrl = "https://horaire-usi-api.onrender.com";
  const localOverride = ["127.0.0.1", "localhost"].includes(window.location.hostname)
    ? new URLSearchParams(window.location.search).get("api")
    : "";
  const API_BASE_URL = localOverride || productionApiUrl;
  const TOKEN_KEY = "horaire-usi-session-v1";

  function token() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token()) headers.set("Authorization", `Bearer ${token()}`);
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    let payload = null;
    try { payload = await response.json(); } catch {}
    if (!response.ok) {
      if (response.status === 401 && token()) {
        sessionStorage.removeItem(TOKEN_KEY);
        window.dispatchEvent(new CustomEvent("horaire:session-expired"));
      }
      const error = new Error(payload?.detail || `Erreur du serveur (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  window.HoraireApi = {
    baseUrl: API_BASE_URL,
    hasSession: () => Boolean(token()),
    login: async (code, password) => {
      const result = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ code, password }),
      });
      sessionStorage.setItem(TOKEN_KEY, result.access_token);
      return result.user;
    },
    logout: () => sessionStorage.removeItem(TOKEN_KEY),
    me: () => request("/api/me"),
    users: () => request("/api/users"),
    saveUser: (user) => request("/api/admin/users", { method: "POST", body: JSON.stringify(user) }),
    schedule: (year) => request(`/api/schedules?year=${encodeURIComponent(year)}`),
    replaceSchedule: (year, weeks) => request(`/api/admin/schedules/${encodeURIComponent(year)}`, {
      method: "POST",
      body: JSON.stringify({ weeks }),
    }),
    swaps: () => request("/api/swaps"),
    createSwap: (swap) => request("/api/swaps", { method: "POST", body: JSON.stringify(swap) }),
    directSwap: (swap) => request("/api/admin/swaps/direct", { method: "POST", body: JSON.stringify(swap) }),
    decideSwap: (id, decision) => request(`/api/swaps/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    }),
    audit: () => request("/api/audit"),
  };
})();
