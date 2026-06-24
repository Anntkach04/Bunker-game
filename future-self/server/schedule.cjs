// Computes the next datetime a subscriber should receive their newsletter.
// Uses the server's local time. frequency is "weekly" or "daily".
function computeNextSendAt(sub, fromDate = new Date()) {
  const from = new Date(fromDate.getTime());
  const hour = clampInt(sub.send_hour, 0, 23, 9);

  if (sub.frequency === 'daily') {
    const candidate = new Date(from);
    candidate.setHours(hour, 0, 0, 0);
    if (candidate <= from) candidate.setDate(candidate.getDate() + 1);
    return candidate.toISOString();
  }

  // weekly
  const targetDow = clampInt(sub.send_dow, 0, 6, 1);
  const candidate = new Date(from);
  candidate.setHours(hour, 0, 0, 0);
  let dayDiff = (targetDow - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + dayDiff);
  if (candidate <= from) candidate.setDate(candidate.getDate() + 7);
  return candidate.toISOString();
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

module.exports = { computeNextSendAt, clampInt };
