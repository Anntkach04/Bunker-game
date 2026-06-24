const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { db } = require('./db.cjs');
const { composeNewsletter } = require('./newsletter.cjs');

let transport = null;
let mode = 'preview';

function getTransport() {
  if (transport) return transport;

  if (process.env.SMTP_HOST) {
    mode = 'smtp';
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE) === 'true',
      auth:
        process.env.SMTP_USER || process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  } else {
    // No SMTP configured: PREVIEW mode. Messages are still fully rendered with nodemailer
    // (so formatting matches real delivery) but are captured locally instead of delivered.
    mode = 'preview';
    transport = nodemailer.createTransport({ jsonTransport: true });
  }
  return transport;
}

function getMode() {
  getTransport();
  return mode;
}

const insertEmail = db.prepare(`
  INSERT INTO emails (id, subscriber_id, to_email, subject, html, text, status, error, created_at)
  VALUES (@id, @subscriber_id, @to_email, @subject, @html, @text, @status, @error, @created_at)
`);

// Composes and "sends" the newsletter for a subscriber, logging the result to the emails table.
async function sendNewsletter(sub) {
  const { subject, html, text } = composeNewsletter(sub);
  const from = process.env.MAIL_FROM || 'Your Future Self <future@futureself.local>';
  const record = {
    id: crypto.randomUUID(),
    subscriber_id: sub.id,
    to_email: sub.email,
    subject,
    html,
    text,
    status: 'preview',
    error: null,
    created_at: new Date().toISOString(),
  };

  const tx = getTransport();
  try {
    await tx.sendMail({ from, to: sub.email, subject, html, text });
    record.status = getMode() === 'smtp' ? 'sent' : 'preview';
  } catch (err) {
    record.status = 'failed';
    record.error = err.message;
  }

  insertEmail.run(record);
  return record;
}

module.exports = { sendNewsletter, getMode };
