const { Router } = require("express");
const { pool } = require("../db");
const auth = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = Router();

router.get("/:universeId", auth, asyncHandler(async (req, res) => {
  const member = await pool.query(
    "SELECT * FROM universe_members WHERE universe_id = $1 AND user_id = $2",
    [req.params.universeId, req.user.id]
  );

  if (member.rows.length === 0) {
    return res.status(403).json({ error: "Not a member of this universe" });
  }

  const result = await pool.query(
    "SELECT * FROM stars WHERE universe_id = $1 ORDER BY created_at DESC",
    [req.params.universeId]
  );

  res.json(result.rows);
}));

router.post("/:universeId", auth, asyncHandler(async (req, res) => {
  const member = await pool.query(
    "SELECT * FROM universe_members WHERE universe_id = $1 AND user_id = $2",
    [req.params.universeId, req.user.id]
  );

  if (member.rows.length === 0) {
    return res.status(403).json({ error: "Not a member of this universe" });
  }

  const {
    type, title, message, completion, difficulty,
    timeSpent, size, color, x, y, assets,
  } = req.body;

  if (!type || !title) {
    return res.status(400).json({ error: "Type and title required" });
  }

  const result = await pool.query(
    `INSERT INTO stars (universe_id, creator_id, type, title, message, completion, difficulty, time_spent, size, color, x, y, assets)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
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
      JSON.stringify(assets || []),
    ]
  );

  const star = result.rows[0];

  if (req.app.locals.broadcast) {
    req.app.locals.broadcast(req.params.universeId, {
      type: "STAR_CREATED",
      star,
    });
  }

  res.json(star);
}));

router.put("/:universeId/:starId", auth, asyncHandler(async (req, res) => {
  const member = await pool.query(
    "SELECT * FROM universe_members WHERE universe_id = $1 AND user_id = $2",
    [req.params.universeId, req.user.id]
  );

  if (member.rows.length === 0) {
    return res.status(403).json({ error: "Not a member of this universe" });
  }

  const existing = await pool.query(
    "SELECT * FROM stars WHERE id = $1 AND universe_id = $2",
    [req.params.starId, req.params.universeId]
  );

  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Star not found" });
  }

  const {
    type, title, message, completion, difficulty,
    timeSpent, size, color, x, y, assets,
  } = req.body;

  const result = await pool.query(
    `UPDATE stars SET
      type = COALESCE($1, type),
      title = COALESCE($2, title),
      message = COALESCE($3, message),
      completion = COALESCE($4, completion),
      difficulty = COALESCE($5, difficulty),
      time_spent = COALESCE($6, time_spent),
      size = COALESCE($7, size),
      color = COALESCE($8, color),
      x = COALESCE($9, x),
      y = COALESCE($10, y),
      assets = COALESCE($11, assets)
    WHERE id = $12 AND universe_id = $13
    RETURNING *`,
    [
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
      req.params.universeId,
    ]
  );

  const star = result.rows[0];

  if (req.app.locals.broadcast) {
    req.app.locals.broadcast(req.params.universeId, {
      type: "STAR_UPDATED",
      star,
    });
  }

  res.json(star);
}));

router.delete("/:universeId/:starId", auth, asyncHandler(async (req, res) => {
  const member = await pool.query(
    "SELECT * FROM universe_members WHERE universe_id = $1 AND user_id = $2",
    [req.params.universeId, req.user.id]
  );

  if (member.rows.length === 0) {
    return res.status(403).json({ error: "Not a member of this universe" });
  }

  const existing = await pool.query(
    "SELECT * FROM stars WHERE id = $1 AND universe_id = $2",
    [req.params.starId, req.params.universeId]
  );

  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Star not found" });
  }

  await pool.query("DELETE FROM stars WHERE id = $1", [req.params.starId]);

  if (req.app.locals.broadcast) {
    req.app.locals.broadcast(req.params.universeId, {
      type: "STAR_DELETED",
      starId: Number(req.params.starId),
    });
  }

  res.json({ ok: true });
}));

module.exports = router;
