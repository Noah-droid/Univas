require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { initDB } = require("./db");

const authRoutes = require("./routes/auth");
const universeRoutes = require("./routes/universes");
const starRoutes = require("./routes/stars");
const roomRoutes = require("./routes/rooms");
const setupWebSocket = require("./ws");

const app = express();
const server = http.createServer(app);

setupWebSocket(server, app);

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/universes", universeRoutes);
app.use("/api/stars", starRoutes);
app.use("/api/rooms", roomRoutes);

const distPath = path.join(__dirname, "..", "app", "dist");
app.use(express.static(distPath));
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 3001;

initDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Univas server running on http://localhost:${PORT}`);
      console.log(`WebSocket ready on ws://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
