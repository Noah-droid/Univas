const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");

function setupWebSocket(server, app) {
  const wss = new WebSocketServer({ server });

  const rooms = new Map();

  function broadcast(universeId, message, exclude) {
    const clients = rooms.get(String(universeId));
    if (!clients) return;
    const data = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === 1 && client !== exclude) {
        client.send(data);
      }
    }
  }

  app.locals.broadcast = broadcast;

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    const universeId = url.searchParams.get("universe");

    if (!token || !universeId) {
      ws.close(4001, "Missing token or universe");
      return;
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      ws.close(4002, "Invalid token");
      return;
    }

    const key = String(universeId);
    if (!rooms.has(key)) {
      rooms.set(key, new Set());
    }
    rooms.get(key).add(ws);

    ws.send(JSON.stringify({ type: "CONNECTED", userId: user.id, username: user.username }));

    broadcast(universeId, {
      type: "USER_JOINED",
      userId: user.id,
      username: user.username,
    }, ws);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw);

        const relay = {
          ...msg,
          userId: user.id,
          username: user.username,
        };

        if (msg.type === "CURSOR_MOVE") {
          broadcast(universeId, relay, ws);
        } else if (
          msg.type === "DRAW_STROKE" ||
          msg.type === "DRAW_CLEAR" ||
          msg.type === "PUZZLE_MOVE" ||
          msg.type === "PUZZLE_PLACE" ||
          msg.type === "ROOM_PLACE" ||
          msg.type === "ROOM_MOVE" ||
          msg.type === "ROOM_REMOVE" ||
          msg.type === "ROOM_SYNC" ||
          msg.type === "ROOM_WALL" ||
          msg.type === "ROOM_FLOOR"
        ) {
          broadcast(universeId, relay, ws);
        }
      } catch {}
    });

    ws.on("close", () => {
      rooms.get(key)?.delete(ws);
      if (rooms.get(key)?.size === 0) {
        rooms.delete(key);
      }
      broadcast(universeId, {
        type: "USER_LEFT",
        userId: user.id,
        username: user.username,
      });
    });
  });

  return wss;
}

module.exports = setupWebSocket;
