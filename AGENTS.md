# AGENTS.md

This repository contains two independent things:

1. `index.html` — a standalone static "БУНКЕР" (Bunker) party game (root).
2. `future-self/` — a full-stack "Future Self" weekly newsletter web app (added separately).

## Future Self newsletter app (`future-self/`)

Full-stack app: an Express + better-sqlite3 API with a node-cron scheduler, and a Vite + React + Tailwind frontend.

- Install deps: `cd future-self && npm install` (compiles the native `better-sqlite3`).
- Run dev (both servers): `cd future-self && npm run dev` — Vite client on `http://localhost:5173`, Express API on `http://localhost:4000`. The Vite dev server proxies `/api` to the API, so use the `5173` URL in the browser.
- Lint: `npm run lint`. Tests: `npm test` (node:test). Build: `npm run build`; serve build + API together with `npm start`.

### Cursor Cloud specific instructions

- Email delivery: if `SMTP_HOST` (and friends) are set in `future-self/.env`, real emails are sent via nodemailer/SMTP. If not, the app runs in **PREVIEW mode** — newsletters are fully composed and stored, and are viewable in the dashboard "Inbox" tab — so the whole pipeline works end-to-end with zero credentials. See `future-self/.env.example`.
- The weekly scheduler is a `node-cron` job inside the Express process (default tick every minute, `SCHEDULER_CRON`). It only runs while the API process is up; it is not serverless.
- Auth is passwordless: signup returns an `accessToken` (magic-link style) stored in `localStorage`; the dashboard is reachable via `/dashboard?token=...`. There are no passwords.
- To demonstrate automated (non-manual) delivery quickly, the dashboard "Test the scheduler" button (backed by the dev-only `POST /api/me/schedule-test`, disabled when `NODE_ENV=production`) queues a send for the next cron tick rather than sending immediately.
- SQLite data lives in `future-self/data/` (gitignored). Deleting it resets all subscribers/emails.
