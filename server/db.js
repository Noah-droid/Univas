const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT DEFAULT (now()::text)
      );

      CREATE TABLE IF NOT EXISTS universes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        invite_code TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT (now()::text)
      );

      CREATE TABLE IF NOT EXISTS universe_members (
        universe_id INTEGER NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'partner',
        joined_at TEXT DEFAULT (now()::text),
        PRIMARY KEY (universe_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS stars (
        id SERIAL PRIMARY KEY,
        universe_id INTEGER NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
        creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        completion INTEGER DEFAULT 100,
        difficulty INTEGER DEFAULT 1,
        time_spent INTEGER DEFAULT 0,
        size TEXT DEFAULT 'small',
        color TEXT DEFAULT '#ffd700',
        x REAL,
        y REAL,
        assets TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (now()::text)
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        universe_id INTEGER UNIQUE NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
        wall_color TEXT DEFAULT '#0d1117',
        floor_color TEXT DEFAULT '#1a1520',
        objects TEXT DEFAULT '[]',
        updated_at TEXT DEFAULT (now()::text)
      );
    `);
    console.log("Database tables initialized");
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
