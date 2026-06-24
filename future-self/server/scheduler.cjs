const cron = require('node-cron');
const { db } = require('./db.cjs');
const { sendNewsletter } = require('./mailer.cjs');
const { computeNextSendAt } = require('./schedule.cjs');

const selectDue = db.prepare(`
  SELECT * FROM subscribers
  WHERE status = 'active' AND next_send_at IS NOT NULL AND next_send_at <= ?
`);
const updateAfterSend = db.prepare(`
  UPDATE subscribers SET last_sent_at = @last_sent_at, next_send_at = @next_send_at WHERE id = @id
`);

// Finds all subscribers whose next_send_at is due and sends their newsletter, then
// reschedules the next send. Returns the number of newsletters sent.
async function runDueNewsletters(now = new Date()) {
  const due = selectDue.all(now.toISOString());
  for (const sub of due) {
    await sendNewsletter(sub);
    updateAfterSend.run({
      id: sub.id,
      last_sent_at: now.toISOString(),
      next_send_at: computeNextSendAt(sub, now),
    });
    console.log(`[scheduler] sent week newsletter to ${sub.email}`);
  }
  return due.length;
}

function startScheduler() {
  const expression = process.env.SCHEDULER_CRON || '* * * * *';
  cron.schedule(expression, () => {
    runDueNewsletters().catch((err) => console.error('[scheduler] error', err));
  });
  console.log(`[scheduler] running with cron "${expression}"`);
}

module.exports = { startScheduler, runDueNewsletters };
