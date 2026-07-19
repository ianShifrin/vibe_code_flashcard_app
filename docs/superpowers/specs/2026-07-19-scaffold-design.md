# Scaffold Design — Full-Stack npm Workspace

## Purpose

Turn this empty repo (README + CLAUDE.md only) into a working full-stack scaffold: an npm workspace with a Vite/React client, an Express/ESM server, shared lint/format tooling, and a Playwright e2e setup. No flashcard features yet — the goal is a scaffold where `npm run dev`, linting, and tests all work end-to-end.

## Root workspace (`package.json`)

- `"workspaces": ["client", "server"]`
- Scripts:
  - `"dev"`: `concurrently` runs client + server dev servers
- Dev dependencies: `concurrently`, `eslint`, `prettier`, `husky`, `lint-staged`, `@playwright/test`
- `lint-staged` config: run eslint on `**/*.{js,jsx}`
- Husky pre-commit hook wired to run `lint-staged`

## `client/` — Vite + React frontend

- Dependencies: `react`, `react-dom`, `prop-types`
- Dev dependencies: `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`
- `vite.config.js`:
  - Dev server proxy: `/api` → `http://localhost:3001`
  - Vitest config: `environment: "jsdom"`, `setupFiles: ["src/test-setup.js"]`
- `src/test-setup.js` — imports `@testing-library/jest-dom`
- `src/main.jsx` — mounts `<App />` into `#root`
- `src/App.jsx` — minimal placeholder component (no flashcard UI yet)
- `index.html` — Vite entry point

## `server/` — Express backend (Node ESM), port 3001

- `"type": "module"` in `server/package.json`
- Dependencies: `express`, `zod`
- Dev dependencies: `vitest`, `supertest`
- Scripts: `"dev"`: `node --watch src/index.js`
- `src/app.js` — creates the Express app, registers routes, exports the app (no `listen()` call — keeps it testable with supertest)
- `src/index.js` — imports the app from `app.js`, calls `app.listen(3001)`
- Routes: `GET /api/ping` → `{ message: "pong" }`

## `e2e/` — Playwright

- Lives at repo root (sibling to `client/` and `server/`), not inside either workspace
- `playwright.config.js` at repo root, pointing at the client dev server (with `webServer` config to boot `npm run dev` or the client alone) and `e2e/` as the test directory

## Out of scope

- No database, no auth, no flashcard data model or CRUD routes
- No TypeScript — plain JS/JSX throughout
- No CI config (not requested)

## Testing

- Client: Vitest + Testing Library wired up, no tests written yet beyond what's needed to prove the setup works (may add a trivial smoke test for `App.jsx`)
- Server: Vitest + supertest wired up; a smoke test for `GET /api/ping` proves `app.js`/`index.js` split works
- E2E: Playwright config in place; a trivial smoke test hitting the client home page
