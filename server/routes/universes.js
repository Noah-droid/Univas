const { Router } = require("express");
const crypto = require("crypto");
const db = require("../db");
const auth = require("../middleware/auth");

const router = Router();

function generateCode() {
  return crypto.randomBytes(4).toString("hex");
}

router.get("/", auth, (req, res) => {
  const universes = db
    .prepare(
      `SELECT u.* FROM universes u
       JOIN universe_members um ON u.id = um.universe_id
       WHERE um.user_id = ?`
    )
    .all(req.user.id);

  res.json(universes);
});

router.post("/", auth, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Universe name required" });
  }

  let invite_code = generateCode();
  while (db.prepare("SELECT id FROM universes WHERE invite_code = ?").get(invite_code)) {
    invite_code = generateCode();
  }

  const result = db
    .prepare("INSERT INTO universes (name, invite_code) VALUES (?, ?)")
    .run(name, invite_code);

  db.prepare("INSERT INTO universe_members (universe_id, user_id, role) VALUES (?, ?, 'owner')").run(
    result.lastInsertRowid,
    req.user.id
  );

  db.prepare("INSERT INTO rooms (universe_id) VALUES (?)").run(result.lastInsertRowid);

  const universe = db.prepare("SELECT * FROM universes WHERE id = ?").get(result.lastInsertRowid);
  res.json(universe);
});

router.post("/join/:code", auth, (req, res) => {
  const universe = db.prepare("SELECT * FROM universes WHERE invite_code = ?").get(req.params.code);
  if (!universe) {
    return res.status(404).json({ error: "Invalid invite code" });
  }

  const memberCount = db
    .prepare("SELECT COUNT(*) as count FROM universe_members WHERE universe_id = ?")
    .get(universe.id).count;

  if (memberCount >= 2) {
    return res.status(400).json({ error: "This universe is already full" });
  }

  const existing = db
    .prepare("SELECT * FROM universe_members WHERE universe_id = ? AND user_id = ?")
    .get(universe.id, req.user.id);

  if (existing) {
    return res.json(universe);
  }

  db.prepare("INSERT INTO universe_members (universe_id, user_id, role) VALUES (?, ?, 'partner')").run(
    universe.id,
    req.user.id
  );

  res.json(universe);
});

router.get("/:id", auth, (req, res) => {
  const member = db
    .prepare("SELECT * FROM universe_members WHERE universe_id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);

  if (!member) {
    return res.status(403).json({ error: "Not a member of this universe" });
  }

  const universe = db.prepare("SELECT * FROM universes WHERE id = ?").get(req.params.id);
  if (!universe) {
    return res.status(404).json({ error: "Universe not found" });
  }

  const members = db
    .prepare(
      `SELECT u.id, u.username, um.role FROM users u
       JOIN universe_members um ON u.id = um.user_id
       WHERE um.universe_id = ?`
    )
    .all(req.params.id);

  const starCount = db
    .prepare("SELECT COUNT(*) as count FROM stars WHERE universe_id = ?")
    .get(req.params.id).count;

  res.json({ ...universe, members, starCount });
});

module.exports = router;
