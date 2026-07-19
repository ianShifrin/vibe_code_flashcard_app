# "Go Again" Button — Design Spec

**Date:** 2026-07-19

## Overview

After finishing a deck, the `SessionSummary` screen currently offers "Study Missed Cards" (only if any cards were missed) and "Done". This adds a "Go Again" button that restarts the study session with the **full original deck**, in **shuffled** order, regardless of whether the just-finished round was the full deck or a "missed cards" round. It is always visible on the summary screen, since a full deck always exists to restart.

---

## Constraints

Per project CLAUDE.md, restated here since execute-plan subagents read the plan, not CLAUDE.md:

### Coding guidelines

- Test-first (TDD). Tests come first, always.
- Build production grade code.
- Use best practices for readability in React, Express.
- Validate frontend inputs. Required fields, types, length limits, basic format checks.
- Write for a junior-to-mid dev. Clear and conventional over clever.
- Use pragmatic error handling.
- Write e2e tests for critical paths in the application.
- (Optional) Why-comments. Short explanations where they help a beginner.
- Don't tell me what approaches you recommend until I ask for them.

### Conventions

- Validation: Zod at the API route boundary (when added). (No API changes in this feature.)
- ORM: Sequelize with SQLite dialect. (No data model changes in this feature.)
- Tests: Vitest; API routes via Supertest. Test `beforeAll` calls `sequelize.sync({ force: true })` + `seed()`.
- E2E: Playwright, in `/e2e` (pre-commit for now).
- Errors: Return `{ error: { code, message } }`; 404 for unknown routes/resources.
- Pre-commit: Runs lint + unit + API tests + e2e. Never bypass with `--no-verify`.

---

## Component Architecture

```
App (owns `cards` = full deck, `activeCards` = current session's cards)
 └── StudySession (cards, onStudyMissed, onDone, onGoAgain)
      └── SessionSummary (total, correct, missedCards, onStudyMissed, onGoAgain, onDone)
```

No new components. No API or data model changes.

---

## Data Flow / Behavior

### `client/src/utils/shuffle.js` (new)

- Exports a pure function `shuffle(array)`.
- Implements Fisher-Yates shuffle.
- Returns a **new** array; does not mutate the input.
- Works on arrays of any length, including 0 and 1 (returns them unchanged/copy).

### `App.jsx`

- Adds `handleGoAgain()`:
  - Calls `shuffle(cards)` (the full original deck, not `activeCards`).
  - Sets `activeCards` to the shuffled result.
  - Increments `sessionKey` (remounts `StudySession` fresh, same pattern already used by `handleStudyMissed`).
- Passes `onGoAgain={handleGoAgain}` to `StudySession`.

### `StudySession.jsx`

- Accepts new prop `onGoAgain` (function, required).
- Forwards it unchanged to `SessionSummary` as `onGoAgain` — no logic here, same as existing `onDone` passthrough.

### `SessionSummary.jsx`

- Accepts new prop `onGoAgain` (function, required).
- Renders a "Go Again" button, **always visible** (unlike "Study Missed Cards", which stays conditional on `missedCards.length > 0`).
- Button order: "Study Missed Cards" (if applicable) → "Go Again" → "Done".
- Clicking "Go Again" calls `onGoAgain()`.

---

## Error Handling

- No new error states. Shuffling is a pure, synchronous, in-memory operation on data that's already loaded — nothing can fail.

---

## Testing

### Client unit tests (Vitest + Testing Library)

- `shuffle.js`:
  - Returns an array with the same length and same elements (as a multiset) as the input.
  - Does not mutate the original input array.
  - Handles empty array and single-element array without throwing.
- `SessionSummary`:
  - "Go Again" button always renders, regardless of `missedCards`.
  - Clicking "Go Again" calls `onGoAgain`.
- `StudySession`:
  - `onGoAgain` prop is forwarded to `SessionSummary` correctly (clicking the rendered "Go Again" button invokes the prop passed into `StudySession`).
- `App`:
  - After reaching summary and clicking "Go Again", a new session starts with the same number of cards as the original full deck (not the missed-only subset, if the prior round was a missed-cards round).

### E2E tests (Playwright)

- Full study flow: complete all cards → summary screen → click "Go Again" → new session starts, card count matches the original deck size, can be completed again to a new summary screen.
