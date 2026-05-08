# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

This is "БУНКЕР" (Bunker) — a Ukrainian-language multiplayer social deduction party game. The entire application is a single `index.html` file with inline CSS and JavaScript. Firebase Realtime Database (loaded via CDN) provides the real-time multiplayer backend.

### Running the development server

Serve the project with any static HTTP server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/` in a browser. There is no build step, no transpilation, and no local dependencies to install.

### Key notes

- **No package manager**: There is no `package.json`, `requirements.txt`, or any dependency file. All external libraries (Firebase SDK) are loaded from CDN.
- **No build system**: The app runs directly from the HTML file — no bundler, compiler, or transpiler.
- **No linting/testing framework**: There are no configured lint tools or automated test suites in this repository.
- **Firebase dependency**: The app uses Firebase Realtime Database (project: `bunker-game-67f85`) for multiplayer state. The Firebase config is hardcoded in the `<script>` section (~line 589). The database has open read/write rules.
- **Single-file architecture**: All HTML, CSS, and JavaScript reside in `index.html` (~1440 lines).
