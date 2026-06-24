# AGENTS.md

## Project overview

"БУНКЕР" (Bunker) is a Ukrainian-language multiplayer social-deduction party game. The
entire application is a single self-contained static file: `index.html` (HTML + inline
CSS + vanilla JS). There is no package manager, build step, automated tests, or lint
config. Real-time multiplayer rooms are synced via **Firebase Realtime Database**, with
the Firebase Web SDK loaded from Google's CDN and the project config hardcoded in
`index.html` (`FIREBASE_CONFIG`).

## Cursor Cloud specific instructions

- There are no dependencies to install and nothing to build/lint/test. The only "service"
  is the static `index.html`. Serve it with any static HTTP server, e.g. from the repo
  root: `python3 -m http.server 8000` then open `http://localhost:8000/`. Prefer an HTTP
  server over `file://` so the Firebase SDK loads cleanly.
- The app needs internet access at runtime: the Firebase JS SDK is CDN-loaded
  (`https://www.gstatic.com/firebasejs/...`) and the app initializes Firebase on page load.
- IMPORTANT (non-obvious): the full game flow — creating/joining a room and dealing cards —
  requires the configured Firebase Realtime Database to allow anonymous read/write. The
  hardcoded project (`bunker-game-67f85`) currently returns `PERMISSION_DENIED` on writes,
  so "Create room" fails with `Помилка запису в Firebase: PERMISSION_DENIED`. To exercise
  end-to-end multiplayer you must point `FIREBASE_CONFIG` at a Firebase project whose
  Realtime Database rules are public (`{ "rules": { ".read": true, ".write": true } }`),
  as documented in the comment above `FIREBASE_CONFIG` in `index.html`. This is an
  external setup step in the Firebase console and cannot be done from the VM.
- State is per-tab via `sessionStorage`, so multiple tabs act as independent players when
  simulating a multi-device game.
