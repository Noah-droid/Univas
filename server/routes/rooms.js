const { Router } = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = Router();

router.get("/:universeId", auth, (req, res) => {
  const member = db
    .prepare("SELECT * FROM universe_members WHERE universe_id = ? AND user_id = ?")
    .get(req.params.universeId, req.user.id);

  if (!member) {
    return res.status(403).json({ error: "Not a member" });
  }

  let room = db.prepare("SELECT * FROM rooms WHERE universe_id = ?").get(req.params.universeId);

  if (!room) {
    db.prepare("INSERT INTO rooms (universe_id) VALUES (?)").run(req.params.universeId);
    room = db.prepare("SELECT * FROM rooms WHERE universe_id = ?").get(req.params.universeId);
  }

  res.json({
    ...room,
    objects: JSON.parse(room.objects || "[]"),
  });
});

router.put("/:universeId", auth, (req, res) => {
  const member = db
    .prepare("SELECT * FROM universe_members WHERE universe_id = ? AND user_id = ?")
    .get(req.params.universeId, req.user.id);

  if (!member) {
    return res.status(403).json({ error: "Not a member" });
  }

  const { wallColor, floorColor, objects } = req.body;

  db.prepare(
    `UPDATE rooms SET
      wall_color = COALESCE(?, wall_color),
      floor_color = COALESCE(?, floor_color),
      objects = COALESCE(?, objects),
      updated_at = datetime('now')
    WHERE universe_id = ?`
  ).run(
    wallColor ?? null,
    floorColor ?? null,
    objects ? JSON.stringify(objects) : null,
    req.params.universeId
  );

  const room = db.prepare("SELECT * FROM rooms WHERE universe_id = ?").get(req.params.universeId);

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
});

module.exports = router;
