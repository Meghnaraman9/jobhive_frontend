// All API calls go through this module
const BASE = "https://jobhive-backend-zq1f.onrender.com/api";
function getToken() {
  return localStorage.getItem("jh_token");
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// Auth
export const authAPI = {
  signup: (name, email, password, role) =>
    request("POST", "/auth/signup", { name, email, password, role }),
  login: (email, password) =>
    request("POST", "/auth/login", { email, password }),
  me: () => request("GET", "/auth/me"),
};

// Jobs
export const jobsAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v && v !== "All")).toString();
    return request("GET", `/jobs${qs ? "?" + qs : ""}`);
  },
  get: (id) => request("GET", `/jobs/${id}`),
  create: (data) => request("POST", "/jobs", data),
  update: (id, data) => request("PUT", `/jobs/${id}`, data),
  delete: (id) => request("DELETE", `/jobs/${id}`),
  apply: (id) => request("POST", `/jobs/${id}/apply`),
  save: (id) => request("POST", `/jobs/${id}/save`),
};
