const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'futureself.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL,
    access_token  TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL DEFAULT '',
    vision        TEXT NOT NULL DEFAULT '',
    tone          TEXT NOT NULL DEFAULT 'motivational',
    frequency     TEXT NOT NULL DEFAULT 'weekly',
    send_dow      INTEGER NOT NULL DEFAULT 1,
    send_hour     INTEGER NOT NULL DEFAULT 9,
    goals         TEXT NOT NULL DEFAULT '[]',
    categories    TEXT NOT NULL DEFAULT '[]',
    status        TEXT NOT NULL DEFAULT 'active',
    last_sent_at  TEXT,
    next_send_at  TEXT,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS emails (
    id            TEXT PRIMARY KEY,
    subscriber_id TEXT NOT NULL,
    to_email      TEXT NOT NULL,
    subject       TEXT NOT NULL,
    html          TEXT NOT NULL,
    text          TEXT NOT NULL,
    status        TEXT NOT NULL,
    error         TEXT,
    created_at    TEXT NOT NULL,
    FOREIGN KEY (subscriber_id) REFERENCES subscribers(id)
  );
`);

module.exports = { db, DATA_DIR };
