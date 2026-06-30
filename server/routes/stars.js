const { Router } = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = Router();

router.get("/:universeId", auth, (req, res) => {
  const member = db
    .prepare("SELECT * FROM universe_members WHERE universe_id = ? AND user_id = ?")
    .get(req.params.universeId, req.user.id);

  if (!member) {
    return res.status(403).json({ error: "Not a member of this universe" });
  }

  const stars = db
    .prepare("SELECT * FROM stars WHERE universe_id = ? ORDER BY created_at DESC")
    .all(req.params.universeId);

  res.json(stars);
});

router.post("/:universeId", auth, (req, res) => {
  const member = db
    .prepare("SELECT * FROM universe_members WHERE universe_id = ? AND user_id = ?")
    .get(req.params.universeId, req.user.id);

  if (!member) {
    return res.status(403).json({ error: "Not a member of this universe" });
  }

  const {
    type, title, message, completion, difficulty,
    timeSpent, size, color, x, y, assets,
  } = req.body;

  if (!type || !title) {
    return res.status(400).json({ error: "Type and title required" });
  }

  const result = db
    .prepare(
      `INSERT INTO stars (universe_id, creator_id, type, title, message, completion, difficulty, time_spent, size, color, x, y, assets)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.params.universeId,
      req.user.id,
      type,
      title,
      message || "",
      completion || 100,
      difficulty || 1,
      timeSpent || 0,
      size || "small",
      color || "#ffd700",
      x ?? Math.random(),
      y ?? Math.random(),
      JSON.stringify(assets || [])
    );

  const star = db.prepare("SELECT * FROM stars WHERE id = ?").get(result.lastInsertRowid);

  if (req.app.locals.broadcast) {
    req.app.locals.broadcast(req.params.universeId, {
      type: "STAR_CREATED",
      star,
    });
  }

  res.json(star);
});

router.put("/:universeId/:starId", auth, (req, res) => {
  const member = db
    .prepare("SELECT * FROM universe_members WHERE universe_id = ? AND user_id = ?")
    .get(req.params.universeId, req.user.id);

  if (!member) {
    return res.status(403).json({ error: "Not a member of this universe" });
  }

  const existing = db
    .prepare("SELECT * FROM stars WHERE id = ? AND universe_id = ?")
    .get(req.params.starId, req.params.universeId);

  if (!existing) {
    return res.status(404).json({ error: "Star not found" });
  }

  const {
    type, title, message, completion, difficulty,
    timeSpent, size, color, x, y, assets,
  } = req.body;

  db.prepare(
    `UPDATE stars SET
      type = COALESCE(?, type),
      title = COALESCE(?, title),
      message = COALESCE(?, message),
      completion = COALESCE(?, completion),
      difficulty = COALESCE(?, difficulty),
      time_spent = COALESCE(?, time_spent),
      size = COALESCE(?, size),
      color = COALESCE(?, color),
      x = COALESCE(?, x),
      y = COALESCE(?, y),
      assets = COALESCE(?, assets)
    WHERE id = ? AND universe_id = ?`
  ).run(
    type ?? null,
    title ?? null,
    message ?? null,
    completion ?? null,
    difficulty ?? null,
    timeSpent ?? null,
    size ?? null,
    color ?? null,
    x ?? null,
    y ?? null,
    assets ? JSON.stringify(assets) : null,
    req.params.starId,
    req.params.universeId
  );

  const star = db.prepare("SELECT * FROM stars WHERE id = ?").get(req.params.starId);

  if (req.app.locals.broadcast) {
    req.app.locals.broadcast(req.params.universeId, {
      type: "STAR_UPDATED",
      star,
    });
  }

  res.json(star);
});

router.delete("/:universeId/:starId", auth, (req, res) => {
  const member = db
    .prepare("SELECT * FROM universe_members WHERE universe_id = ? AND user_id = ?")
    .get(req.params.universeId, req.user.id);

  if (!member) {
    return res.status(403).json({ error: "Not a member of this universe" });
  }

  const star = db
    .prepare("SELECT * FROM stars WHERE id = ? AND universe_id = ?")
    .get(req.params.starId, req.params.universeId);

  if (!star) {
    return res.status(404).json({ error: "Star not found" });
  }

  db.prepare("DELETE FROM stars WHERE id = ?").run(req.params.starId);

  if (req.app.locals.broadcast) {
    req.app.locals.broadcast(req.params.universeId, {
      type: "STAR_DELETED",
      starId: Number(req.params.starId),
    });
  }

  res.json({ ok: true });
});

module.exports = router;
