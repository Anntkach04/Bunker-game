const test = require('node:test');
const assert = require('node:assert');
const { computeNextSendAt } = require('../schedule.cjs');
const { composeNewsletter } = require('../newsletter.cjs');

test('weekly next send lands on the requested day of week', () => {
  const from = new Date('2026-06-24T12:00:00'); // a Wednesday
  const next = new Date(computeNextSendAt({ frequency: 'weekly', send_dow: 1, send_hour: 9 }, from));
  assert.strictEqual(next.getDay(), 1); // Monday
  assert.strictEqual(next.getHours(), 9);
  assert.ok(next > from);
});

test('daily next send is always in the future', () => {
  const from = new Date('2026-06-24T12:00:00');
  const next = new Date(computeNextSendAt({ frequency: 'daily', send_dow: 0, send_hour: 8 }, from));
  assert.ok(next > from);
  assert.strictEqual(next.getHours(), 8);
});

test('newsletter composes subject and includes vision text', () => {
  const sub = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    vision: 'Lead a research lab and run a marathon.',
    tone: 'motivational',
    goals: JSON.stringify(['Ship a product', 'Run 3x/week']),
    categories: JSON.stringify([{ key: 'career', label: 'Career', note: 'Promotion', enabled: true }]),
    created_at: new Date().toISOString(),
    access_token: 'abc',
  };
  const { subject, html, text } = composeNewsletter(sub);
  assert.match(subject, /Week \d+/);
  assert.match(html, /research lab/);
  assert.match(text, /Ship a product/);
});
