const { Router } = require("express");
const crypto = require("crypto");
const { pool } = require("../db");
const auth = require("../middleware/auth");

const router = Router();

function generateCode() {
  return crypto.randomBytes(4).toString("hex");
}

router.get("/", auth, async (req, res) => {
  const result = await pool.query(
    `SELECT u.* FROM universes u
     JOIN universe_members um ON u.id = um.universe_id
     WHERE um.user_id = $1`,
    [req.user.id]
  );
  res.json(result.rows);
});

router.post("/", auth, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Universe name required" });
  }

  let invite_code = generateCode();
  let exists = await pool.query("SELECT id FROM universes WHERE invite_code = $1", [invite_code]);
  while (exists.rows.length > 0) {
    invite_code = generateCode();
    exists = await pool.query("SELECT id FROM universes WHERE invite_code = $1", [invite_code]);
  }

  const result = await pool.query(
    "INSERT INTO universes (name, invite_code) VALUES ($1, $2) RETURNING *",
    [name, invite_code]
  );

  const universe = result.rows[0];

  await pool.query(
    "INSERT INTO universe_members (universe_id, user_id, role) VALUES ($1, $2, 'owner')",
    [universe.id, req.user.id]
  );

  await pool.query("INSERT INTO rooms (universe_id) VALUES ($1)", [universe.id]);

  res.json(universe);
});

router.post("/join/:code", auth, async (req, res) => {
  const result = await pool.query("SELECT * FROM universes WHERE invite_code = $1", [req.params.code]);
  const universe = result.rows[0];

  if (!universe) {
    return res.status(404).json({ error: "Invalid invite code" });
  }

  const memberCount = await pool.query(
    "SELECT COUNT(*)::int as count FROM universe_members WHERE universe_id = $1",
    [universe.id]
  );

  if (memberCount.rows[0].count >= 2) {
    return res.status(400).json({ error: "This universe is already full" });
  }

  const existing = await pool.query(
    "SELECT * FROM universe_members WHERE universe_id = $1 AND user_id = $2",
    [universe.id, req.user.id]
  );

  if (existing.rows.length === 0) {
    await pool.query(
      "INSERT INTO universe_members (universe_id, user_id, role) VALUES ($1, $2, 'partner')",
      [universe.id, req.user.id]
    );
  }

  res.json(universe);
});

router.get("/:id", auth, async (req, res) => {
  const member = await pool.query(
    "SELECT * FROM universe_members WHERE universe_id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  );

  if (member.rows.length === 0) {
    return res.status(403).json({ error: "Not a member of this universe" });
  }

  const uniResult = await pool.query("SELECT * FROM universes WHERE id = $1", [req.params.id]);
  if (uniResult.rows.length === 0) {
    return res.status(404).json({ error: "Universe not found" });
  }

  const universe = uniResult.rows[0];

  const members = await pool.query(
    `SELECT u.id, u.username, um.role FROM users u
     JOIN universe_members um ON u.id = um.user_id
     WHERE um.universe_id = $1`,
    [req.params.id]
  );

  const starCount = await pool.query(
    "SELECT COUNT(*)::int as count FROM stars WHERE universe_id = $1",
    [req.params.id]
  );

  res.json({ ...universe, members: members.rows, starCount: starCount.rows[0].count });
});

module.exports = router;
