const API_BASE = "https://free-board-ashen.vercel.app";

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include", // sends the httpOnly session cookie
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    window.location.href = "/";
    return null;
  }
  if (!res.ok) {
    const FRIENDLY_STATUS = {
      403: "You don't have permission to do this.",
      404: "That action isn't available right now.",
      422: "Please enter a valid name.",
      500: "Something went wrong. Please try again.",
    };
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || FRIENDLY_STATUS[res.status] || "Something went wrong. Please try again.");
  }
  if (res.status === 204) return null;
  return res.json();
}

const Api = {
  me: () => api("/auth/me"),
  logout: () => fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" }),
  setUsername: (username) => api("/users/username", { method: "POST", body: JSON.stringify({ username }) }),
  updateMyName: (display_name) => api("/users/me", { method: "PATCH", body: JSON.stringify({ display_name }) }),
  searchUsers: (q) => api(`/users/search?q=${encodeURIComponent(q)}`),
  addConnection: (id) => api(`/users/connections/${id}`, { method: "POST" }), // now sends a request, doesn't add instantly
  removeConnection: (id) => api(`/users/connections/${id}`, { method: "DELETE" }),
  unsendRequest: (id) => api(`/users/connections/${id}/request`, { method: "DELETE" }),
  listConnections: () => api("/users/connections"),
  incomingRequests: () => api("/users/connections/incoming"),
  acceptRequest: (requestId) => api(`/users/connections/requests/${requestId}/accept`, { method: "POST" }),
  declineRequest: (requestId) => api(`/users/connections/requests/${requestId}/decline`, { method: "POST" }),
  setNickname: (userId, nickname) => api(`/users/connections/${userId}/nickname`, { method: "PATCH", body: JSON.stringify({ nickname }) }),
  getTimetable: (userId) => api(`/timetable/${userId}`),
  saveTimetable: (cells) => api("/timetable/bulk", { method: "PUT", body: JSON.stringify({ cells }) }),
  clearTimetable: () => api("/timetable/clear", { method: "DELETE" }),   // "Clear All" (was missing)
  live: (day, slotIndex) => api(`/schedule/live?day=${day}&slot_index=${slotIndex}`),
  together: (ids) => api(`/schedule/together?user_ids=${ids.join(",")}`),
  getPeriods: (userId) => api(`/settings/periods/${userId}`), // per-user — matches the real backend design
  setPeriods: (slots) => api("/settings/periods", { method: "PUT", body: JSON.stringify({ slots }) }),
  // Groups (private shortcuts of people on my board)
  listGroups: () => api("/groups"),
  createGroup: (name, member_ids) => api("/groups", { method: "POST", body: JSON.stringify({ name, member_ids }) }),
  updateGroup: (id, name, member_ids) => api(`/groups/${id}`, { method: "PUT", body: JSON.stringify({ name, member_ids }) }),
  deleteGroup: (id) => api(`/groups/${id}`, { method: "DELETE" }),
};
