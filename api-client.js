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

  const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  async function fetchWithTimeout(url, options = {}, timeout = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function wake() {
    const delays = [0, 1500, 2500, 4000, 6000, 8000, 10000, 12000, 15000];
    for (let attempt = 0; attempt < delays.length; attempt += 1) {
      if (delays[attempt]) await sleep(delays[attempt]);
      window.dispatchEvent(new CustomEvent("horaire:api-wakeup", { detail: { attempt: attempt + 1 } }));
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/health`, { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (response.ok && payload?.status === "ok") return;
      } catch {}
    }
    throw new Error("Le serveur ne s'est pas réveillé. Attendez quelques instants, puis réessayez.");
  }

  async function request(path, options = {}) {
    const { retry = false, ...fetchOptions } = options;
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token()) headers.set("Authorization", `Bearer ${token()}`);
    const attempts = retry ? 3 : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...fetchOptions, headers, cache: "no-store" }, 30000);
        let payload = null;
        try { payload = await response.json(); } catch {}
        if (response.ok && payload !== null) return payload;
        if (response.status === 401 && token()) {
          sessionStorage.removeItem(TOKEN_KEY);
          window.dispatchEvent(new CustomEvent("horaire:session-expired"));
        }
        if (attempt + 1 < attempts && [502, 503, 504].includes(response.status)) {
          await sleep(1500 * (attempt + 1));
          continue;
        }
        const error = new Error(payload?.detail || (response.ok ? "Réponse invalide du serveur" : `Erreur du serveur (${response.status})`));
        error.status = response.status;
        error.retryable = response.ok || [502, 503, 504].includes(response.status);
        throw error;
      } catch (error) {
        if (attempt + 1 >= attempts || error.retryable === false || (error.status && ![502, 503, 504].includes(error.status))) throw error;
        await sleep(1500 * (attempt + 1));
      }
    }
  }

  window.HoraireApi = {
    baseUrl: API_BASE_URL,
    hasSession: () => Boolean(token()),
    wake,
    login: async (code, password) => {
      const result = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ code, password }),
        retry: true,
      });
      if (!result?.access_token || !result?.user) throw new Error("La réponse de connexion est incomplète.");
      sessionStorage.setItem(TOKEN_KEY, result.access_token);
      return result.user;
    },
    logout: () => sessionStorage.removeItem(TOKEN_KEY),
    me: () => request("/api/me", { retry: true }),
    users: () => request("/api/users", { retry: true }),
    saveUser: (user) => request("/api/admin/users", { method: "POST", body: JSON.stringify(user) }),
    schedule: (year) => request(`/api/schedules?year=${encodeURIComponent(year)}`, { retry: true }),
    replaceSchedule: (year, weeks) => request(`/api/admin/schedules/${encodeURIComponent(year)}`, {
      method: "POST",
      body: JSON.stringify({ weeks }),
    }),
    swaps: () => request("/api/swaps", { retry: true }),
    createSwap: (swap) => request("/api/swaps", { method: "POST", body: JSON.stringify(swap) }),
    directSwap: (swap) => request("/api/admin/swaps/direct", { method: "POST", body: JSON.stringify(swap) }),
    decideSwap: (id, decision) => request(`/api/swaps/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    }),
    audit: () => request("/api/audit", { retry: true }),
  };
})();
