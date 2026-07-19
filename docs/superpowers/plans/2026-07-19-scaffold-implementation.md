# Full-Stack Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn this empty repo into a working npm-workspace scaffold with a Vite/React client, an Express/ESM server, shared lint/format/git-hook tooling, and a Playwright e2e setup — no flashcard features yet, just a scaffold where `npm run dev`, linting, and all three test layers work end-to-end.

**Architecture:** Root npm workspace with two packages (`client`, `server`) plus a root-level `e2e/` Playwright suite that drives the running client. Client and server are fully independent at runtime, connected only by the Vite dev-server proxy (`/api` → `http://localhost:3001`) and, in production, by whatever reverse proxy/static host is chosen later (out of scope here).

**Tech Stack:** npm workspaces, Vite + React 18 (JS/JSX, no TypeScript), Express 4 (ESM) + zod, Vitest + Testing Library (client) and Vitest + supertest (server), Playwright, ESLint (flat config) + Prettier, Husky + lint-staged, concurrently.

## Global Constraints

- Root `package.json` declares `"workspaces": ["client", "server"]`.
- Root `npm run dev` runs server + client concurrently via `concurrently`.
- Root dev dependencies: `concurrently`, `eslint`, `prettier`, `husky`, `lint-staged`, `@playwright/test`.
- `lint-staged` runs `eslint` on `**/*.{js,jsx}`.
- `client/` dependencies: `react`, `react-dom`, `prop-types`.
- `client/` dev dependencies: `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.
- `client/vite.config.js` proxies `/api` to `http://localhost:3001`; Vitest configured with `environment: "jsdom"` and `setupFiles: ["./src/test-setup.js"]`.
- Vite's default dev server port is `5173` (unmodified default — not overridden anywhere in this plan).
- `server/` is Node ESM (`"type": "module"`), listens on port `3001`.
- `server/` dependencies: `express`, `zod`.
- `server/` dev dependencies: `vitest`, `supertest`.
- `server/` dev script: `node --watch src/index.js`.
- Server is split into `server/src/app.js` (creates the Express app, registers routes, exports the app — no `listen()` call) and `server/src/index.js` (imports the app, calls `app.listen()`).
- First route: `GET /api/ping` → `{ "message": "pong" }`.
- `e2e/` lives at the repo root (sibling to `client/` and `server/`), with `playwright.config.js` also at the repo root.
- From `CLAUDE.md`'s protected conventions (added by the project owner partway through this build, not modifiable without asking): "Pre-commit: Runs lint + unit + API tests + e2e. Never bypass with --no-verify." (Task 8 implements this; Tasks 1–7 predate its discovery.)

---

## Task 1: Root and workspace package manifests

**Files:**
- Create: `package.json` (root)
- Create: `.gitignore`
- Create: `client/package.json`
- Create: `server/package.json`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: two npm workspaces (`client`, `server`) linked under the root, each with a `dev` script and a `test` script that later tasks will populate with real behavior. Root has a `dev` script name reserved (wired to `concurrently` in Task 4) and no dependencies installed yet.

- [ ] **Step 1: Create the root `package.json`**

```json
{
  "name": "vibe-code-flashcard-app",
  "private": true,
  "version": "1.0.0",
  "workspaces": [
    "client",
    "server"
  ],
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"npm run dev --workspace=server\" \"npm run dev --workspace=client\""
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
.env
*.log
test-results/
playwright-report/
```

- [ ] **Step 3: Create `client/package.json`**

```json
{
  "name": "client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  }
}
```

- [ ] **Step 4: Create `server/package.json`**

```json
{
  "name": "server",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "test": "vitest run"
  }
}
```

- [ ] **Step 5: Install to link the workspaces and verify**

Run: `npm install`
Expected: completes without error, creates root `node_modules/` and `package-lock.json`.

Run: `npm ls --workspaces`
Expected: output lists both `client@0.0.0` and `server@0.0.0`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore client/package.json server/package.json
git commit -m "chore: scaffold root npm workspace with client and server packages"
```

---

## Task 2: Server — Express app with `/api/ping`

**Files:**
- Create: `server/src/app.js`
- Create: `server/src/index.js`
- Test: `server/src/app.test.js`

**Interfaces:**
- Consumes: `server/package.json` scripts from Task 1 (`test`, `dev`).
- Produces: `app.js` default-exports an Express `app` instance with `GET /api/ping` registered and no `listen()` call, so it can be imported directly by tests and by `index.js`.

- [ ] **Step 1: Install server dependencies**

Run: `npm install express zod --workspace=server`
Run: `npm install -D vitest supertest --workspace=server`

- [ ] **Step 2: Write the failing test**

```js
// server/src/app.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './app.js';

describe('GET /api/ping', () => {
  it('responds with a pong message', async () => {
    const response = await request(app).get('/api/ping');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'pong' });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test --workspace=server`
Expected: FAIL — `app.js` does not exist yet (`Cannot find module './app.js'` or similar).

- [ ] **Step 4: Implement `server/src/app.js`**

```js
import express from 'express';

const app = express();

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

export default app;
```

- [ ] **Step 5: Implement `server/src/index.js`**

```js
import app from './app.js';

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test --workspace=server`
Expected: PASS — 1 test passed.

- [ ] **Step 7: Commit**

```bash
git add server/package.json server/package-lock.json server/src/app.js server/src/index.js server/src/app.test.js
git commit -m "feat(server): add Express app with GET /api/ping"
```

---

## Task 3: Client — Vite + React app shell

**Files:**
- Create: `client/index.html`
- Create: `client/vite.config.js`
- Create: `client/src/main.jsx`
- Create: `client/src/App.jsx`
- Create: `client/src/test-setup.js`
- Test: `client/src/App.test.jsx`

**Interfaces:**
- Consumes: `client/package.json` scripts from Task 1 (`test`, `dev`, `build`).
- Produces: `App.jsx` default-exports a React component rendering an `<h1>Flashcard App</h1>` heading, mounted by `main.jsx` into `#root`. `vite.config.js` is the single source of truth for both the dev proxy (consumed implicitly by any future fetch calls to `/api/*`) and the Vitest config (consumed by every future client test file via `test-setup.js`).

- [ ] **Step 1: Install client dependencies**

Run: `npm install react react-dom prop-types --workspace=client`
Run: `npm install -D vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom --workspace=client`

- [ ] **Step 2: Create `client/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Flashcard App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `client/vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
  },
});
```

- [ ] **Step 4: Create `client/src/test-setup.js`**

```js
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Write the failing test**

```jsx
// client/src/App.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App', () => {
  it('renders the app heading', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /flashcard app/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test --workspace=client`
Expected: FAIL — `App.jsx` does not exist yet.

- [ ] **Step 7: Implement `client/src/App.jsx`**

```jsx
function App() {
  return (
    <main>
      <h1>Flashcard App</h1>
    </main>
  );
}

export default App;
```

- [ ] **Step 8: Implement `client/src/main.jsx`**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm run test --workspace=client`
Expected: PASS — 1 test passed.

- [ ] **Step 10: Commit**

```bash
git add client/package.json client/package-lock.json client/index.html client/vite.config.js client/src/main.jsx client/src/App.jsx client/src/App.test.jsx client/src/test-setup.js
git commit -m "feat(client): add Vite + React app shell with Vitest smoke test"
```

---

## Task 4: Root dev orchestration, ESLint, and Prettier

**Files:**
- Modify: `package.json` (root) — add `lint` script
- Create: `eslint.config.js`
- Create: `.prettierrc`
- Create: `.prettierignore`

**Interfaces:**
- Consumes: `concurrently` script wiring from Task 1's root `package.json`; `client`/`server` dev servers from Tasks 2–3.
- Produces: a root `npm run lint` command usable by later tasks (lint-staged in Task 5 shells out to `eslint` directly, not through this script, but both must stay consistent with the same `eslint.config.js`).

- [ ] **Step 1: Install root dev dependencies**

Run: `npm install -D concurrently eslint prettier`

- [ ] **Step 2: Create `eslint.config.js`**

```js
export default [
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-unused-vars': 'warn',
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**', 'playwright-report/**', 'test-results/**'],
  },
];
```

- [ ] **Step 3: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5"
}
```

- [ ] **Step 4: Create `.prettierignore`**

```
node_modules
dist
package-lock.json
```

- [ ] **Step 5: Add the `lint` script to root `package.json`**

```json
{
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"npm run dev --workspace=server\" \"npm run dev --workspace=client\"",
    "lint": "eslint ."
  }
}
```

- [ ] **Step 6: Verify linting passes**

Run: `npm run lint`
Expected: exits with code 0, no errors printed.

- [ ] **Step 7: Verify the dev script boots both servers**

Run:
```bash
npm run dev &
DEV_PID=$!
sleep 3
curl -s http://localhost:3001/api/ping
echo
curl -s http://localhost:5173/ | grep -o '<title>[^<]*</title>'
kill $DEV_PID
```
Expected: first curl prints `{"message":"pong"}`; second prints `<title>Flashcard App</title>`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json eslint.config.js .prettierrc .prettierignore
git commit -m "chore: add ESLint flat config, Prettier, and a working npm run dev"
```

---

## Task 5: Husky + lint-staged pre-commit hook

**Files:**
- Modify: `package.json` (root) — add `prepare` script and `lint-staged` config
- Create: `.husky/pre-commit`

**Interfaces:**
- Consumes: `eslint.config.js` from Task 4 (lint-staged runs `eslint --fix` against it).
- Produces: a pre-commit hook that every subsequent `git commit` in this plan (Tasks 6 onward) passes through, so later commit steps double as this task's regression test.

- [ ] **Step 1: Install dependencies**

Run: `npm install -D husky lint-staged`

- [ ] **Step 2: Initialize husky**

Run: `npx husky init`
Expected: creates `.husky/pre-commit` and adds `"prepare": "husky"` to root `package.json` scripts.

- [ ] **Step 3: Point the pre-commit hook at lint-staged**

Replace the contents of `.husky/pre-commit` with:

```
npx lint-staged
```

- [ ] **Step 4: Add the `lint-staged` config to root `package.json`**

```json
{
  "lint-staged": {
    "**/*.{js,jsx}": "eslint --fix"
  }
}
```

- [ ] **Step 5: Verify the hook runs on a real commit**

```bash
git add package.json package-lock.json .husky/pre-commit
git commit -m "chore: run eslint on staged files via husky and lint-staged"
```
Expected: commit output shows `lint-staged` running (e.g. a `✔ Running tasks...` / `eslint --fix` line) before the commit is created, and the commit succeeds.

---

## Task 6: Playwright end-to-end smoke test

**Files:**
- Create: `playwright.config.js` (root)
- Create: `e2e/home.spec.js`
- Modify: `package.json` (root) — add `test:e2e` script

**Interfaces:**
- Consumes: root `npm run dev` from Task 4 (Playwright's `webServer` boots it automatically) and the `<h1>Flashcard App</h1>` heading rendered by `client/src/App.jsx` from Task 3.
- Produces: nothing consumed by other tasks — this is the last task in the plan.

- [ ] **Step 1: Install Playwright and its browser binary**

Run: `npm install -D @playwright/test`
Run: `npx playwright install --with-deps chromium`

- [ ] **Step 2: Create `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  use: {
    baseURL: 'http://localhost:5173',
  },
});
```

- [ ] **Step 3: Write the e2e test**

```js
// e2e/home.spec.js
import { test, expect } from '@playwright/test';

test('home page shows the app heading', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /flashcard app/i })).toBeVisible();
});
```

- [ ] **Step 4: Add the `test:e2e` script to root `package.json`**

```json
{
  "scripts": {
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 5: Run the e2e test**

Run: `npm run test:e2e`
Expected: Playwright boots `npm run dev` automatically, then reports `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json playwright.config.js e2e/home.spec.js
git commit -m "test(e2e): add Playwright smoke test for the home page"
```

---

## Task 7: Update CLAUDE.md with real commands and architecture

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: every script name and file path established in Tasks 1–6.
- Produces: nothing (documentation-only, final task).

- [ ] **Step 1: Replace the "Project status" section**

Edit `CLAUDE.md` to replace the existing "Project status" section (the paragraph describing the repo as empty, plus the "no commands" note) with:

```markdown
## Project status

This is an npm-workspace full-stack scaffold: a Vite + React client and an Express (ESM) server, with Playwright e2e tests at the root. No flashcard features are implemented yet — this is scaffolding only.

## Commands

- `npm run dev` — runs the client (Vite, port 5173) and server (Express, port 3001) concurrently
- `npm run lint` — runs ESLint across the whole repo
- `npm run test --workspace=client` — runs client unit tests (Vitest + Testing Library)
- `npm run test --workspace=server` — runs server unit tests (Vitest + supertest)
- `npm run test:e2e` — runs Playwright e2e tests (boots `npm run dev` automatically)
- To run a single test file: `npm run test --workspace=client -- src/App.test.jsx` (or the equivalent path under `server/`)

## Architecture

- `client/` — Vite + React (JS/JSX). `src/main.jsx` mounts `src/App.jsx`. `vite.config.js` proxies `/api/*` to the server on port 3001 and configures Vitest.
- `server/` — Express, Node ESM. `src/app.js` builds and exports the Express app (routes live here); `src/index.js` imports it and calls `.listen()`. First route: `GET /api/ping`.
- `e2e/` — Playwright tests driving the client through a real browser; `playwright.config.js` at the repo root boots `npm run dev` as its web server.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with real commands and architecture"
```

---

## Task 8: Expand pre-commit hook to run tests

**Files:**
- Modify: `.husky/pre-commit`

**Interfaces:**
- Consumes: `lint-staged` wiring from Task 5; `test` scripts from `client/package.json` and `server/package.json` (Tasks 2–3); `test:e2e` script from Task 6.
- Produces: nothing (last task).

**Why:** `CLAUDE.md`'s protected conventions section (not modifiable without asking — added by the project owner mid-build) states: "Pre-commit: Runs lint + unit + API tests + e2e. Never bypass with --no-verify." Task 5 only wired lint-staged; this task closes the gap.

- [ ] **Step 1: Replace the contents of `.husky/pre-commit`**

```sh
npx lint-staged &&
npm run test --workspace=server &&
npm run test --workspace=client &&
npm run test:e2e
```

Each command is chained with `&&` so the hook stops at (and blocks the commit on) the first failure.

- [ ] **Step 2: Verify the hook runs all four checks on a real commit**

```bash
git add .husky/pre-commit
git commit -m "chore: run unit and e2e tests in pre-commit alongside lint-staged"
```
Expected: commit output shows, in order, lint-staged running, the server Vitest suite passing, the client Vitest suite passing, and the Playwright e2e suite passing (booting `npm run dev` itself), then the commit succeeds. If any step fails, the commit must be aborted — do not bypass with `--no-verify` to force it through.
