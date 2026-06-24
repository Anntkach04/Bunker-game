import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Landing() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    vision: '',
    frequency: 'weekly',
    sendDow: 1,
    sendHour: 9,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { subscriber } = await api.signup({
        ...form,
        sendDow: Number(form.sendDow),
        sendHour: Number(form.sendHour),
      });
      setToken(subscriber.accessToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <header className="flex items-center justify-between">
        <div className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-400">Future Self</div>
        <a href="/dashboard" className="text-sm text-slate-400 hover:text-emerald-300">
          I already have a dashboard →
        </a>
      </header>

      <section className="mt-14 grid items-start gap-10 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-50 md:text-5xl">
            Get a weekly letter from the <span className="text-emerald-400">you of 5 years from now.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            Write your 5-year vision once. Every week, your future self emails you a short, personalized nudge —
            built from your own goals, life areas, and tone of voice. Edit everything any time in your dashboard.
          </p>
          <ul className="mt-7 space-y-3 text-slate-300">
            {[
              'Describe the life you want in 5 years',
              'Pick the day & time your letter arrives',
              'Choose a tone: motivational, reflective, or tough love',
              'Customize goals and life areas whenever you want',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 flex-none rounded-full bg-emerald-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={onSubmit} className="fs-card p-6">
          <h2 className="text-xl font-bold text-slate-50">Start writing to your future self</h2>
          <p className="mt-1 text-sm text-slate-400">Takes about a minute. No password needed.</p>

          <label className="mt-5 block text-sm font-medium text-slate-300">Your name</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Ada"
          />

          <label className="mt-4 block text-sm font-medium text-slate-300">Email</label>
          <input
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="you@example.com"
          />

          <label className="mt-4 block text-sm font-medium text-slate-300">Your 5-year vision</label>
          <textarea
            required
            rows={4}
            className="mt-1 w-full resize-y rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
            value={form.vision}
            onChange={(e) => update('vision', e.target.value)}
            placeholder="In 5 years I lead a small design studio, run a half-marathon, and live near the coast..."
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300">Frequency</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                value={form.frequency}
                onChange={(e) => update('frequency', e.target.value)}
              >
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Hour</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                value={form.sendHour}
                onChange={(e) => update('sendHour', e.target.value)}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.frequency === 'weekly' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300">Day of week</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400"
                value={form.sendDow}
                onChange={(e) => update('sendDow', e.target.value)}
              >
                {DOW.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? 'Creating your dashboard…' : 'Start my future-self newsletter →'}
          </button>
        </form>
      </section>
    </div>
  );
}
