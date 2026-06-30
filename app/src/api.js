const API_URL = import.meta.env.VITE_API_URL || "";
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3001`;

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export const api = {
  login: (username, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  register: (username, password) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  getUniverses: () => request("/api/universes"),

  createUniverse: (name) =>
    request("/api/universes", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  joinUniverse: (id) =>
    request(`/api/universes/${id}/join`, { method: "POST" }),

  joinByCode: (code) =>
    request(`/api/universes/join/${code}`, { method: "POST" }),

  getUniverse: (id) => request(`/api/universes/${id}`),

  getStars: (universeId) => request(`/api/stars/${universeId}`),

  createStar: (universeId, star) =>
    request(`/api/stars/${universeId}`, {
      method: "POST",
      body: JSON.stringify(star),
    }),

  updateStar: (universeId, starId, updates) =>
    request(`/api/stars/${universeId}/${starId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  deleteStar: (universeId, starId) =>
    request(`/api/stars/${universeId}/${starId}`, {
      method: "DELETE",
    }),

  getRoom: (universeId) => request(`/api/rooms/${universeId}`),

  saveRoom: (universeId, data) =>
    request(`/api/rooms/${universeId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export function connectWS(universeId, onMessage) {
  const token = localStorage.getItem("token");
  let ws;
  let closed = false;

  try {
    ws = new WebSocket(`${WS_URL}?token=${token}&universe=${universeId}`);
  } catch (e) {
    console.warn("WebSocket connection failed:", e);
    return { close: () => {} };
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.warn("WebSocket message parse error:", e);
    }
  };

  ws.onerror = (e) => {
    console.warn("WebSocket error");
  };

  ws.onclose = () => {
    if (!closed) {
      setTimeout(() => {
        if (!closed) {
          const newWs = connectWS(universeId, onMessage);
          Object.assign(ws, newWs);
        }
      }, 3000);
    }
  };

  return {
    close: () => {
      closed = true;
      ws.close();
    },
    get readyState() {
      return ws.readyState;
    },
    send(data) {
      if (ws.readyState === 1) ws.send(data);
    },
  };
}
