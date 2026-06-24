// Composes the weekly "letter from your future self" from a subscriber's inputs.

const TONES = {
  motivational: {
    label: 'Motivational',
    intro: (name) =>
      `Hey ${name || 'you'} — it's me, the you from five years ahead. I'm proud of the moves you're making this week. Keep stacking them.`,
    signoff: 'Keep going. Every small rep compounds.',
  },
  reflective: {
    label: 'Reflective',
    intro: (name) =>
      `Hi ${name || 'you'}. Take a breath. This is a note from your future self — a quiet moment to remember where you said you wanted to go.`,
    signoff: 'Be gentle with yourself, and stay honest about what matters.',
  },
  tough_love: {
    label: 'Tough love',
    intro: (name) =>
      `${name || 'Hey'} — no sugar-coating today. Your future self is watching, and the vision doesn't build itself. What did you actually do this week?`,
    signoff: 'Less scrolling. More building. You know what to do.',
  },
};

const WEEKLY_PROMPTS = [
  'What is one thing you can do this week that your future self will thank you for?',
  'Where did you spend energy this week that did NOT move you toward the vision?',
  'Who could you reach out to this week to get closer to your 5-year goals?',
  'What would the future-you be embarrassed that the present-you is still tolerating?',
  'What is the smallest next step on your most important goal?',
  'If this week were a chapter in your story, what would its title be?',
  'What habit, repeated for 5 years, would change everything?',
  'What are you avoiding because it is hard but you know it matters?',
];

function weeksSince(isoDate) {
  if (!isoDate) return 0;
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)));
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function composeNewsletter(sub) {
  const tone = TONES[sub.tone] || TONES.motivational;
  const week = weeksSince(sub.created_at) + 1;
  const goals = parseJson(sub.goals, []).filter(Boolean);
  const categories = parseJson(sub.categories, []).filter((c) => c && c.enabled && (c.note || c.label));
  const prompt = WEEKLY_PROMPTS[(week - 1) % WEEKLY_PROMPTS.length];
  const firstName = (sub.name || '').split(' ')[0];

  const subject = `Week ${week}: a letter from your future self`;

  const goalsHtml = goals.length
    ? `<ul style="margin:8px 0 0;padding-left:20px;color:#cbd5e1;">${goals
        .map((g) => `<li style="margin:4px 0;">${escapeHtml(g)}</li>`)
        .join('')}</ul>`
    : '<p style="margin:8px 0 0;color:#64748b;font-style:italic;">No goals added yet — add some in your dashboard.</p>';

  const categoriesHtml = categories.length
    ? categories
        .map(
          (c) => `
          <div style="margin-top:16px;padding:14px 16px;background:#0f172a;border:1px solid #1e293b;border-radius:12px;">
            <div style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#34d399;font-weight:700;">${escapeHtml(
              c.label || c.key,
            )}</div>
            <div style="margin-top:6px;color:#e2e8f0;font-size:15px;line-height:1.6;">${escapeHtml(
              c.note || '',
            )}</div>
          </div>`,
        )
        .join('')
    : '';

  const html = `
  <div style="margin:0;padding:0;background:#020617;">
    <div style="max-width:600px;margin:0 auto;padding:32px 20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#34d399;font-weight:700;">Future Self · Week ${week}</div>
        <h1 style="margin:8px 0 0;color:#f8fafc;font-size:26px;">A letter from the you of ${new Date(
          Date.now() + 5 * 365 * 24 * 60 * 60 * 1000,
        ).getFullYear()}</h1>
      </div>

      <div style="background:#0b1220;border:1px solid #1e293b;border-radius:16px;padding:24px;">
        <p style="margin:0;color:#e2e8f0;font-size:16px;line-height:1.7;">${escapeHtml(tone.intro(firstName))}</p>

        <h2 style="margin:24px 0 4px;color:#a7f3d0;font-size:15px;text-transform:uppercase;letter-spacing:.06em;">Your 5-year vision</h2>
        <p style="margin:0;color:#cbd5e1;font-size:15px;line-height:1.7;white-space:pre-wrap;">${
          escapeHtml(sub.vision) || '<span style="color:#64748b;font-style:italic;">You haven\'t written your vision yet.</span>'
        }</p>

        <h2 style="margin:24px 0 4px;color:#a7f3d0;font-size:15px;text-transform:uppercase;letter-spacing:.06em;">The goals you set</h2>
        ${goalsHtml}

        ${categoriesHtml ? `<h2 style="margin:24px 0 0;color:#a7f3d0;font-size:15px;text-transform:uppercase;letter-spacing:.06em;">Life areas in focus</h2>${categoriesHtml}` : ''}

        <div style="margin-top:24px;padding:18px 20px;background:linear-gradient(135deg,#065f46,#064e3b);border-radius:12px;">
          <div style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#6ee7b7;font-weight:700;">This week's reflection</div>
          <p style="margin:8px 0 0;color:#ecfdf5;font-size:16px;line-height:1.6;">${escapeHtml(prompt)}</p>
        </div>

        <p style="margin:24px 0 0;color:#94a3b8;font-size:15px;line-height:1.7;">${escapeHtml(tone.signoff)}</p>
        <p style="margin:18px 0 0;color:#e2e8f0;font-size:15px;">— Future ${escapeHtml(firstName || 'You')}</p>
      </div>

      <p style="text-align:center;margin:20px 0 0;color:#475569;font-size:12px;">
        You're getting this because you wrote to your future self.
        ${
          process.env.APP_BASE_URL
            ? `<br/><a href="${process.env.APP_BASE_URL}/dashboard?token=${encodeURIComponent(
                sub.access_token,
              )}" style="color:#34d399;">Customize your newsletter →</a>`
            : ''
        }
      </p>
    </div>
  </div>`;

  const text = [
    `Future Self · Week ${week}`,
    '',
    tone.intro(firstName),
    '',
    'YOUR 5-YEAR VISION',
    sub.vision || '(not written yet)',
    '',
    'GOALS',
    ...(goals.length ? goals.map((g) => `- ${g}`) : ['(none yet)']),
    '',
    ...(categories.length
      ? ['LIFE AREAS', ...categories.map((c) => `- ${c.label || c.key}: ${c.note || ''}`), '']
      : []),
    "THIS WEEK'S REFLECTION",
    prompt,
    '',
    tone.signoff,
    `— Future ${firstName || 'You'}`,
  ].join('\n');

  return { subject, html, text };
}

module.exports = { composeNewsletter, TONES, WEEKLY_PROMPTS, weeksSince };
