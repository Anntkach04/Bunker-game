require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');

const { db } = require('./db.cjs');
const { sendNewsletter, getMode } = require('./mailer.cjs');
const { composeNewsletter } = require('./newsletter.cjs');
const { computeNextSendAt, clampInt } = require('./schedule.cjs');
const { startScheduler, runDueNewsletters } = require('./scheduler.cjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 4000);

const DEFAULT_CATEGORIES = [
  { key: 'career', label: 'Career', note: '', enabled: true },
  { key: 'health', label: 'Health & fitness', note: '', enabled: true },
  { key: 'relationships', label: 'Relationships', note: '', enabled: true },
  { key: 'finances', label: 'Finances', note: '', enabled: false },
  { key: 'growth', label: 'Personal growth', note: '', enabled: false },
];

const TONES = ['motivational', 'reflective', 'tough_love'];
const FREQUENCIES = ['weekly', 'daily'];

// ---- helpers ----
function publicSubscriber(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    accessToken: row.access_token,
    name: row.name,
    vision: row.vision,
    tone: row.tone,
    frequency: row.frequency,
    sendDow: row.send_dow,
    sendHour: row.send_hour,
    goals: safeParse(row.goals, []),
    categories: safeParse(row.categories, DEFAULT_CATEGORIES),
    status: row.status,
    lastSentAt: row.last_sent_at,
    nextSendAt: row.next_send_at,
    createdAt: row.created_at,
  };
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const findByToken = db.prepare('SELECT * FROM subscribers WHERE access_token = ?');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-access-token'];
  if (!token) return res.status(401).json({ error: 'Missing access token' });
  const row = findByToken.get(token);
  if (!row) return res.status(401).json({ error: 'Invalid access token' });
  req.subscriber = row;
  next();
}

function normalizeUpdate(body, current) {
  const tone = TONES.includes(body.tone) ? body.tone : current.tone;
  const frequency = FREQUENCIES.includes(body.frequency) ? body.frequency : current.frequency;
  const goals = Array.isArray(body.goals)
    ? body.goals.map((g) => String(g).trim()).filter(Boolean).slice(0, 25)
    : safeParse(current.goals, []);
  let categories = Array.isArray(body.categories) ? body.categories : safeParse(current.categories, DEFAULT_CATEGORIES);
  categories = categories
    .filter((c) => c && (c.key || c.label))
    .map((c) => ({
      key: String(c.key || c.label).toLowerCase().replace(/\s+/g, '_').slice(0, 40),
      label: String(c.label || c.key).slice(0, 60),
      note: String(c.note || '').slice(0, 2000),
      enabled: Boolean(c.enabled),
    }))
    .slice(0, 12);

  const status = body.status === 'paused' || body.status === 'active' ? body.status : current.status;

  return {
    name: typeof body.name === 'string' ? body.name.trim().slice(0, 80) : current.name,
    vision: typeof body.vision === 'string' ? body.vision.slice(0, 5000) : current.vision,
    tone,
    frequency,
    send_dow: clampInt(body.sendDow ?? current.send_dow, 0, 6, current.send_dow),
    send_hour: clampInt(body.sendHour ?? current.send_hour, 0, 23, current.send_hour),
    goals: JSON.stringify(goals),
    categories: JSON.stringify(categories),
    status,
  };
}

// ---- routes ----
app.get('/api/health', (req, res) => {
  res.json({ ok: true, mailMode: getMode() });
});

const insertSubscriber = db.prepare(`
  INSERT INTO subscribers (id, email, access_token, name, vision, tone, frequency, send_dow, send_hour, goals, categories, status, last_sent_at, next_send_at, created_at)
  VALUES (@id, @email, @access_token, @name, @vision, @tone, @frequency, @send_dow, @send_hour, @goals, @categories, 'active', NULL, @next_send_at, @created_at)
`);

app.post('/api/subscribers', (req, res) => {
  const body = req.body || {};
  if (!isValidEmail(body.email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (!body.vision || String(body.vision).trim().length < 10) {
    return res.status(400).json({ error: 'Tell us a bit more about your 5-year vision (at least 10 characters).' });
  }

  const now = new Date();
  const base = {
    id: crypto.randomUUID(),
    email: String(body.email).trim().toLowerCase(),
    access_token: crypto.randomBytes(24).toString('hex'),
    created_at: now.toISOString(),
    last_sent_at: null,
    status: 'active',
    name: '',
    vision: '',
    tone: 'motivational',
    frequency: 'weekly',
    send_dow: 1,
    send_hour: 9,
    goals: '[]',
    categories: JSON.stringify(DEFAULT_CATEGORIES),
  };
  const normalized = normalizeUpdate(body, base);
  const row = { ...base, ...normalized };
  row.next_send_at = computeNextSendAt(
    { frequency: row.frequency, send_dow: row.send_dow, send_hour: row.send_hour },
    now,
  );

  insertSubscriber.run(row);
  res.status(201).json({ subscriber: publicSubscriber(row) });
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ subscriber: publicSubscriber(req.subscriber) });
});

const updateSubscriber = db.prepare(`
  UPDATE subscribers SET
    name=@name, vision=@vision, tone=@tone, frequency=@frequency,
    send_dow=@send_dow, send_hour=@send_hour, goals=@goals, categories=@categories,
    status=@status, next_send_at=@next_send_at
  WHERE id=@id
`);

app.put('/api/me', authMiddleware, (req, res) => {
  const current = req.subscriber;
  const normalized = normalizeUpdate(req.body || {}, current);
  const next_send_at =
    normalized.status === 'paused'
      ? null
      : computeNextSendAt(
          { frequency: normalized.frequency, send_dow: normalized.send_dow, send_hour: normalized.send_hour },
          new Date(),
        );
  updateSubscriber.run({ ...normalized, id: current.id, next_send_at });
  res.json({ subscriber: publicSubscriber(findByToken.get(current.access_token)) });
});

// Live preview of the composed newsletter without sending/logging it.
app.get('/api/me/preview', authMiddleware, (req, res) => {
  const { subject, html, text } = composeNewsletter(req.subscriber);
  res.json({ subject, html, text });
});

// Send this week's newsletter immediately (manual trigger).
app.post('/api/me/send-now', authMiddleware, async (req, res) => {
  const record = await sendNewsletter(req.subscriber);
  db.prepare('UPDATE subscribers SET last_sent_at=? WHERE id=?').run(record.created_at, req.subscriber.id);
  res.json({ email: record, mailMode: getMode() });
});

const listEmails = db.prepare(
  'SELECT id, subject, status, created_at, to_email FROM emails WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 100',
);
const getEmail = db.prepare('SELECT * FROM emails WHERE id = ? AND subscriber_id = ?');

app.get('/api/me/emails', authMiddleware, (req, res) => {
  res.json({ emails: listEmails.all(req.subscriber.id) });
});

app.get('/api/me/emails/:id', authMiddleware, (req, res) => {
  const email = getEmail.get(req.params.id, req.subscriber.id);
  if (!email) return res.status(404).json({ error: 'Email not found' });
  res.json({ email });
});

// Test helper (disabled in production): force the next send to be due ~now so the cron
// scheduler picks it up on its next tick, demonstrating automated delivery.
app.post('/api/me/schedule-test', authMiddleware, (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Disabled in production' });
  const due = new Date(Date.now() - 1000).toISOString();
  db.prepare("UPDATE subscribers SET status='active', next_send_at=? WHERE id=?").run(due, req.subscriber.id);
  res.json({ ok: true, nextSendAt: due });
});

// Serve the built client in production (npm run build && npm start).
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

if (require.main === module) {
  startScheduler();
  app.listen(PORT, () => {
    console.log(`[server] API listening on http://localhost:${PORT} (mail mode: ${getMode()})`);
  });
}

module.exports = { app, runDueNewsletters };
