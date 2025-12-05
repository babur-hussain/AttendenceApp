from __future__ import annotations

import aiosqlite
from typing import Optional
from .config import DB_PATH


SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
CREATE TABLE IF NOT EXISTS audit_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'in' | 'out'
  raw_toon TEXT NOT NULL,
  ts DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_records(ts);

CREATE TABLE IF NOT EXISTS nonces (
  nonce TEXT PRIMARY KEY,
  ts DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS heartbeats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT,
  payload TEXT,
  ts DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT,
  cmd_id TEXT,
  cmd_type TEXT,
  payload TEXT,
  ts DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS firmware_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT,
  fw_id TEXT,
  action TEXT, -- check|download|apply|ack
  status TEXT, -- ok|error
  details TEXT,
  ts DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT,
  level TEXT,
  message TEXT,
  ts DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()


async def add_nonce(nonce: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("INSERT OR REPLACE INTO nonces(nonce) VALUES(?)", (nonce,))
        await db.commit()


async def nonce_used(nonce: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT 1 FROM nonces WHERE nonce=?", (nonce,)) as cur:
            row = await cur.fetchone()
            return row is not None


async def audit(kind: str, direction: str, raw_toon: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO audit_records(kind, direction, raw_toon) VALUES(?,?,?)",
            (kind, direction, raw_toon),
        )
        await db.commit()
