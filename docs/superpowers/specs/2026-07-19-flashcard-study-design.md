# Flashcard Study Feature — Design Spec

**Date:** 2026-07-19

## Overview

A study-mode flashcard feature. Cards are loaded from a SQLite database via a REST API. The user studies one card at a time: they see the question, click the card to flip it (3D CSS animation) and reveal the answer, then self-grade as "Got it" or "Missed it". After finishing the deck, a summary screen shows their score and offers to re-study only the missed cards.

---

## Data Model

**Model:** `Card` (Sequelize, SQLite)

| Field | Type | Constraints |
|---|---|---|
| `id` | INTEGER | Primary key, auto-increment |
| `question` | STRING | Required, non-empty |
| `answer` | STRING | Required, non-empty |
| `createdAt` | DATE | Auto-managed by Sequelize |
| `updatedAt` | DATE | Auto-managed by Sequelize |

- Stored in `server/flashcards.db` in production.
- Uses `:memory:` SQLite in test (`NODE_ENV=test`), per project convention.
- Dev server seeds a small set of sample cards on startup so there is something to study immediately.

---

## API

### `GET /api/cards`

Returns all cards as a JSON array.

**Response (200):**
```json
[
  { "id": 1, "question": "What is JSX?", "answer": "A syntax extension for JavaScript used with React." },
  ...
]
```

**Response on error (500):**
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "Failed to load cards." } }
```

No pagination. Empty array `[]` is a valid success response (no cards seeded).

---

## Component Architecture

```
App
 └── StudySession (cards[])
      ├── FlashCard (question, answer, isFlipped, onFlip)
      └── [Got it / Missed it buttons]
 └── SessionSummary (total, correct, missedCards[], onStudyMissed, onDone)
```

### `App`

- Fetches `GET /api/cards` on mount.
- Renders a loading spinner while fetching.
- Renders an error message if the fetch fails.
- Renders "No cards found." if the API returns an empty array.
- Renders `StudySession` with the loaded cards once ready.
- On "Study Missed Cards", replaces `StudySession` with a new one seeded with missed cards only.

### `FlashCard`

- **Props:** `question` (string), `answer` (string), `isFlipped` (bool), `onFlip` (fn)
- Pure presentational — no internal state.
- Renders a 3D flip card using CSS `perspective` and `rotateY`.
  - Front face: displays `question`.
  - Back face: displays `answer`.
- Clicking anywhere on the card calls `onFlip`.
- Flip transition: ~0.6s CSS ease, `backface-visibility: hidden` on both faces.

### `StudySession`

- **Props:** `cards[]`
- **State:**
  - `currentIndex` — index of the active card (starts at 0).
  - `isFlipped` — whether the current card is showing its back (starts `false`).
  - `graded` — array of `"correct"` | `"missed"` results, one per card (built up as user grades).
  - `phase` — `"studying"` | `"summary"`.
- **Behavior:**
  - Renders `FlashCard` for `cards[currentIndex]`.
  - Handles `onFlip`: sets `isFlipped = true`. Card cannot be un-flipped.
  - "Got it" / "Missed it" buttons are hidden until `isFlipped` is `true`.
  - On grading: appends result to `graded`, resets `isFlipped = false`, advances `currentIndex`.
  - When `currentIndex` reaches `cards.length`: sets `phase = "summary"`.
  - In `summary` phase: renders `SessionSummary`.

### `SessionSummary`

- **Props:** `total` (number), `correct` (number), `missedCards[]`, `onStudyMissed` (fn), `onDone` (fn)
- Displays: "You got X out of Y correct."
- "Study Missed Cards" button — visible only if `missedCards.length > 0`, calls `onStudyMissed(missedCards)`.
- "Done" button — calls `onDone`.

---

## Error Handling

- Fetch failure in `App`: render `"Failed to load cards. Please try again."` with no retry button (keep it simple).
- Empty deck: render `"No cards found."` — no `StudySession` rendered.
- Server errors: return `{ error: { code, message } }` with appropriate HTTP status, per project convention.
- 404 for unknown routes.

---

## Testing

### Client unit tests (Vitest + Testing Library)

- `FlashCard`: flips on click; front face visible before flip, back face visible after.
- `StudySession`: grading buttons hidden before flip; visible after flip; advances to next card on grade; transitions to summary after last card.
- `SessionSummary`: displays correct score; "Study Missed Cards" button absent when no missed cards; calls `onStudyMissed` / `onDone` callbacks correctly.
- `App`: renders loading state; renders error on fetch failure; renders "No cards found" on empty response; renders `StudySession` on success.

### Server unit tests (Vitest + Supertest)

- `GET /api/cards`: returns 200 with array of seeded cards; each card has `id`, `question`, `answer`.

### E2E tests (Playwright)

- Full study flow: load app → see question → click card → see answer → grade → complete all cards → see summary with correct score → click "Study Missed Cards" → complete missed round.
- Empty deck: load app → see "No cards found."
