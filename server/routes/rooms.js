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
    return res.status(403).json({ error: "Not a member" });
  }

  let result = await pool.query("SELECT * FROM rooms WHERE universe_id = $1", [req.params.universeId]);

  if (result.rows.length === 0) {
    await pool.query("INSERT INTO rooms (universe_id) VALUES ($1)", [req.params.universeId]);
    result = await pool.query("SELECT * FROM rooms WHERE universe_id = $1", [req.params.universeId]);
  }

  const room = result.rows[0];
  res.json({
    ...room,
    objects: JSON.parse(room.objects || "[]"),
  });
}));

router.put("/:universeId", auth, asyncHandler(async (req, res) => {
  const member = await pool.query(
    "SELECT * FROM universe_members WHERE universe_id = $1 AND user_id = $2",
    [req.params.universeId, req.user.id]
  );

  if (member.rows.length === 0) {
    return res.status(403).json({ error: "Not a member" });
  }

  const { wallColor, floorColor, objects } = req.body;

  await pool.query(
    `UPDATE rooms SET
      wall_color = COALESCE($1, wall_color),
      floor_color = COALESCE($2, floor_color),
      objects = COALESCE($3, objects),
      updated_at = now()::text
    WHERE universe_id = $4`,
    [
      wallColor ?? null,
      floorColor ?? null,
      objects ? JSON.stringify(objects) : null,
      req.params.universeId,
    ]
  );

  const result = await pool.query("SELECT * FROM rooms WHERE universe_id = $1", [req.params.universeId]);
  const room = result.rows[0];

  if (req.app.locals.broadcast) {
    req.app.locals.broadcast(req.params.universeId, {
      type: "ROOM_SYNC",
      room: {
        wallColor: room.wall_color,
        floorColor: room.floor_color,
        objects: JSON.parse(room.objects || "[]"),
      },
    });
  }

  res.json({
    ...room,
    objects: JSON.parse(room.objects || "[]"),
  });
}));

module.exports = router;
