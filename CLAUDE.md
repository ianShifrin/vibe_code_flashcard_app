# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## DO NOT MODIFY THIS SECTION WITHOUT ASKING ME

- Every write-plan output must restate coding guidelines and conventions in a "Constraints" section — execute-plan subagents read the plan, not this file.

### Coding guidelines

- Test-first (TDD). Tests come first, always.
- Build production grade code
- Use best practices for readability in React, Express
- Validate frontend inputs. Required fields, types, length limits, basic format checks.
- Write for a junior-to-mid dev. Clear and conventional over clever.
- Use pragmatic error handling
- Write e2e tests for critical paths in the application
- (Optional) Why-comments. Short explanations where they help a beginner.
- Don't tell me what approaches you recommend until I ask for them

### Conventions

- Validation: Zod at the API route boundary (when added).
- ORM: Sequelize with SQLite dialect. Models in `server/src/db.js`. Storage: `server/flashcards.db` (production), `:memory:` (test via `NODE_ENV=test`).
- Tests: Vitest; API routes via Supertest. Test `beforeAll` calls `sequelize.sync({ force: true })` + `seed()`.
- E2E: Playwright, in /e2e (pre-commit for now).
- Errors: Return `{ error: { code, message } }`; 404 for unknown routes/resources.
- Pre-commit: Runs lint + unit + API tests + e2e. Never bypass with --no-verify.
