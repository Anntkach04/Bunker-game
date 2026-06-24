import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getToken, setToken, clearToken } from '../api.js';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TONES = [
  { value: 'motivational', label: 'Motivational' },
  { value: 'reflective', label: 'Reflective' },
  { value: 'tough_love', label: 'Tough love' },
];

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const inputCls =
  'mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400';

export default function Dashboard() {
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [emails, setEmails] = useState([]);
  const [openedEmail, setOpenedEmail] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [mailMode, setMailMode] = useState('preview');
  const [status, setStatus] = useState({ msg: '', kind: 'info' });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('customize');

  // Accept a magic-link token from the URL (?token=...).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      setToken(urlToken);
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  const loadEmails = useCallback(async () => {
    const { emails } = await api.listEmails();
    setEmails(emails);
  }, []);

  const refreshPreview = useCallback(async () => {
    try {
      const { html } = await api.preview();
      setPreviewHtml(html);
    } catch {
      /* ignore preview errors */
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      navigate('/');
      return;
    }
    (async () => {
      try {
        const [{ subscriber }, health] = await Promise.all([api.me(), api.health()]);
        setSub(subscriber);
        setMailMode(health.mailMode);
        await Promise.all([loadEmails(), refreshPreview()]);
      } catch (err) {
        setStatus({ msg: err.message, kind: 'error' });
        clearToken();
        navigate('/');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, loadEmails, refreshPreview]);

  function setField(key, value) {
    setSub((s) => ({ ...s, [key]: value }));
  }
  function setCategory(idx, patch) {
    setSub((s) => ({
      ...s,
      categories: s.categories.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  }
  function addGoal() {
    setSub((s) => ({ ...s, goals: [...s.goals, ''] }));
  }
  function setGoal(idx, value) {
    setSub((s) => ({ ...s, goals: s.goals.map((g, i) => (i === idx ? value : g)) }));
  }
  function removeGoal(idx) {
    setSub((s) => ({ ...s, goals: s.goals.filter((_, i) => i !== idx) }));
  }

  async function save(extra = {}) {
    setStatus({ msg: 'Saving…', kind: 'info' });
    try {
      const payload = {
        name: sub.name,
        vision: sub.vision,
        tone: sub.tone,
        frequency: sub.frequency,
        sendDow: Number(sub.sendDow),
        sendHour: Number(sub.sendHour),
        goals: sub.goals,
        categories: sub.categories,
        status: sub.status,
        ...extra,
      };
      const { subscriber } = await api.updateMe(payload);
      setSub(subscriber);
      await refreshPreview();
      setStatus({ msg: 'Saved.', kind: 'success' });
    } catch (err) {
      setStatus({ msg: err.message, kind: 'error' });
    }
  }

  async function sendNow() {
    setStatus({ msg: 'Sending this week’s letter…', kind: 'info' });
    try {
      const { mailMode } = await api.sendNow();
      setMailMode(mailMode);
      await loadEmails();
      setTab('inbox');
      setStatus({
        msg: mailMode === 'smtp' ? 'Sent to your inbox.' : 'Delivered to your in-app inbox (preview mode).',
        kind: 'success',
      });
    } catch (err) {
      setStatus({ msg: err.message, kind: 'error' });
    }
  }

  async function testScheduler() {
    setStatus({ msg: 'Scheduling a send for the next scheduler tick…', kind: 'info' });
    try {
      await api.scheduleTest();
      const before = emails.length;
      // Poll for up to ~75s for the cron scheduler to deliver automatically.
      for (let i = 0; i < 25; i += 1) {
        await new Promise((r) => setTimeout(r, 3000));
        const { emails: latest } = await api.listEmails();
        if (latest.length > before) {
          setEmails(latest);
          setTab('inbox');
          setStatus({ msg: 'The scheduler delivered your letter automatically. 🎉', kind: 'success' });
          const { subscriber } = await api.me();
          setSub(subscriber);
          return;
        }
      }
      setStatus({ msg: 'Still waiting on the scheduler — check the inbox shortly.', kind: 'info' });
    } catch (err) {
      setStatus({ msg: err.message, kind: 'error' });
    }
  }

  async function openEmail(id) {
    const { email } = await api.getEmail(id);
    setOpenedEmail(email);
  }

  const nextSend = useMemo(() => (sub?.nextSendAt ? new Date(sub.nextSendAt).toLocaleString() : '—'), [sub]);
  const lastSend = useMemo(
    () => (sub?.lastSentAt ? new Date(sub.lastSentAt).toLocaleString() : 'never'),
    [sub],
  );

  if (loading || !sub) {
    return <div className="grid min-h-screen place-items-center text-slate-400">Loading your dashboard…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-400">Future Self</div>
          <h1 className="text-2xl font-bold text-slate-50">Your dashboard</h1>
          <p className="text-sm text-slate-400">{sub.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              mailMode === 'smtp' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
            }`}
            title={mailMode === 'smtp' ? 'Real emails are being sent over SMTP' : 'No SMTP configured — emails are captured in your in-app inbox'}
          >
            {mailMode === 'smtp' ? 'Live email' : 'Preview mode'}
          </span>
          <button
            onClick={() => {
              clearToken();
              navigate('/');
            }}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="fs-card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Next letter</div>
          <div className="mt-1 font-semibold text-slate-100">{sub.status === 'paused' ? 'Paused' : nextSend}</div>
        </div>
        <div className="fs-card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Last sent</div>
          <div className="mt-1 font-semibold text-slate-100">{lastSend}</div>
        </div>
        <div className="fs-card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Cadence</div>
          <div className="mt-1 font-semibold capitalize text-slate-100">
            {sub.frequency}
            {sub.frequency === 'weekly' ? ` · ${DOW[sub.sendDow]}` : ''} · {String(sub.sendHour).padStart(2, '0')}:00
          </div>
        </div>
      </div>

      {status.msg && (
        <p
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            status.kind === 'error'
              ? 'bg-red-500/10 text-red-300'
              : status.kind === 'success'
                ? 'bg-emerald-500/10 text-emerald-300'
                : 'bg-slate-500/10 text-slate-300'
          }`}
        >
          {status.msg}
        </p>
      )}

      <nav className="mt-6 flex gap-2 border-b border-slate-800">
        {[
          ['customize', 'Customize'],
          ['preview', 'Preview'],
          ['inbox', `Inbox (${emails.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === key ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'customize' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="fs-card space-y-4 p-6">
            <h2 className="text-lg font-bold text-slate-50">Who you are becoming</h2>
            <Field label="Name">
              <input className={inputCls} value={sub.name} onChange={(e) => setField('name', e.target.value)} />
            </Field>
            <Field label="Your 5-year vision">
              <textarea
                rows={5}
                className={inputCls}
                value={sub.vision}
                onChange={(e) => setField('vision', e.target.value)}
              />
            </Field>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Goals</span>
                <button onClick={addGoal} className="text-sm text-emerald-300 hover:text-emerald-200">
                  + Add goal
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {sub.goals.length === 0 && <p className="text-sm text-slate-500">No goals yet.</p>}
                {sub.goals.map((g, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className={inputCls + ' mt-0'}
                      value={g}
                      onChange={(e) => setGoal(i, e.target.value)}
                      placeholder="e.g. Launch my own product"
                    />
                    <button
                      onClick={() => removeGoal(i)}
                      className="rounded-lg border border-slate-700 px-3 text-slate-400 hover:border-red-500 hover:text-red-300"
                      aria-label="Remove goal"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="fs-card space-y-4 p-6">
            <h2 className="text-lg font-bold text-slate-50">Delivery & voice</h2>
            <Field label="Tone of voice">
              <select className={inputCls} value={sub.tone} onChange={(e) => setField('tone', e.target.value)}>
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Frequency">
                <select
                  className={inputCls}
                  value={sub.frequency}
                  onChange={(e) => setField('frequency', e.target.value)}
                >
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
              </Field>
              <Field label="Hour">
                <select className={inputCls} value={sub.sendHour} onChange={(e) => setField('sendHour', e.target.value)}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {sub.frequency === 'weekly' && (
              <Field label="Day of week">
                <select className={inputCls} value={sub.sendDow} onChange={(e) => setField('sendDow', e.target.value)}>
                  {DOW.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Status">
              <select className={inputCls} value={sub.status} onChange={(e) => setField('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </Field>

            <div>
              <span className="text-sm font-medium text-slate-300">Life areas to include</span>
              <div className="mt-2 space-y-3">
                {sub.categories.map((c, i) => (
                  <div key={c.key || i} className="rounded-lg border border-slate-800 p-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!c.enabled}
                        onChange={(e) => setCategory(i, { enabled: e.target.checked })}
                      />
                      <span className="font-medium text-slate-200">{c.label}</span>
                    </label>
                    {c.enabled && (
                      <textarea
                        rows={2}
                        className={inputCls}
                        placeholder={`What does "${c.label}" look like for you?`}
                        value={c.note}
                        onChange={(e) => setCategory(i, { note: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="lg:col-span-2 flex flex-wrap gap-3">
            <button
              onClick={() => save()}
              className="rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Save changes
            </button>
            <button
              onClick={sendNow}
              className="rounded-lg border border-emerald-500/60 px-5 py-2.5 font-semibold text-emerald-300 hover:bg-emerald-500/10"
            >
              Send this week’s letter now
            </button>
            <button
              onClick={testScheduler}
              className="rounded-lg border border-slate-700 px-5 py-2.5 font-medium text-slate-300 hover:border-slate-500"
              title="Queues a send for the next scheduler tick to demonstrate automated delivery"
            >
              Test the scheduler
            </button>
          </div>
        </div>
      )}

      {tab === 'preview' && (
        <div className="mt-6 fs-card overflow-hidden p-2">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-slate-400">Live preview of your next letter</span>
            <button onClick={refreshPreview} className="text-sm text-emerald-300 hover:text-emerald-200">
              Refresh
            </button>
          </div>
          <iframe title="Newsletter preview" srcDoc={previewHtml} className="h-[70vh] w-full rounded-lg bg-white" />
        </div>
      )}

      {tab === 'inbox' && (
        <div className="mt-6 grid gap-4 md:grid-cols-[320px_1fr]">
          <div className="fs-card max-h-[70vh] overflow-auto p-2">
            {emails.length === 0 && <p className="p-4 text-sm text-slate-500">No letters yet. Send one to see it here.</p>}
            {emails.map((e) => (
              <button
                key={e.id}
                onClick={() => openEmail(e.id)}
                className={`block w-full rounded-lg px-3 py-3 text-left hover:bg-slate-800/60 ${
                  openedEmail?.id === e.id ? 'bg-slate-800/80' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-200">{e.subject}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                      e.status === 'sent'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : e.status === 'failed'
                          ? 'bg-red-500/15 text-red-300'
                          : 'bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    {e.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{new Date(e.created_at).toLocaleString()}</div>
              </button>
            ))}
          </div>
          <div className="fs-card overflow-hidden p-2">
            {openedEmail ? (
              <iframe title="Letter" srcDoc={openedEmail.html} className="h-[70vh] w-full rounded-lg bg-white" />
            ) : (
              <div className="grid h-[70vh] place-items-center text-slate-500">Select a letter to read it.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
