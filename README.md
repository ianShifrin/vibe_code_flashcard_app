# vibe_code_flashcarp_app
class test project
* Test App for Class
** This app was built in a workshop to test out Claude Code.

## Setup

```sh
npm install
```

## Run

```sh
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001 (`GET /api/ping`)

## Test

```sh
npm run lint                     # ESLint across the repo
npm run test --workspace=client  # client unit tests
npm run test --workspace=server  # server unit tests
npm run test:e2e                 # Playwright e2e tests
```
