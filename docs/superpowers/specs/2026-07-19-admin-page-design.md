# Admin Page — Design Spec

**Date:** 2026-07-19

## Overview

An admin mode toggled from the main page that lets users add new flashcards via a modal form and bulk-delete existing cards via checkboxes. The study view and admin view share the same card state managed by `App`.

---

## API

### `POST /api/cards`

Creates a new card.

**Request body:**
```json
{ "question": "string", "answer": "string" }
```

**Validation (Zod at route boundary):**
- `question`: required, non-empty string, max 500 characters
- `answer`: required, non-empty string, max 500 characters

**Response (201):**
```json
{ "id": 4, "question": "...", "answer": "..." }
```

**Response (400 — validation failure):**
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "question is required." } }
```

**Response (500):**
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "Failed to save card." } }
```

---

### `DELETE /api/cards/:id`

Deletes the card with the given id.

**Response (200):**
```json
{ "ok": true }
```

**Response (404):**
```json
{ "error": { "code": "NOT_FOUND", "message": "Card not found." } }
```

**Response (500):**
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "Failed to delete card." } }
```

---

## Component Architecture

```
App  (view: 'study' | 'admin')
 ├── [header toggle button]
 ├── StudySession  (when view === 'study')
 └── AdminPage  (when view === 'admin')
      ├── [Select all checkbox]
      ├── CardListItem  (× N)
      ├── [Delete Selected button]
      ├── [Add Card button]
      └── AddCardModal  (isOpen, onClose, onSaved)
```

### `App`

- Adds `view` state: `'study'` | `'admin'`, default `'study'`.
- Adds a toggle button in the header area: label shows "Admin" when `view === 'study'`, "Study" when `view === 'admin'`.
- When `view === 'admin'`, renders `AdminPage` instead of `StudySession`.
- Passes `cards` (already fetched) and `onCardsChanged` to `AdminPage`.
- `onCardsChanged`: re-fetches `GET /api/cards` and updates `cards` state. Switching views clears no state — study session progress is lost if the user navigates away from study mode mid-session (acceptable; no warning needed).

### `AdminPage`

- **Props:** `cards: Array<{ id, question, answer }>`, `onCardsChanged: fn`
- **State:** `selected: Set<number>` (ids of checked cards), `deleteError: string | null`
- Renders a list of `CardListItem` for each card.
- "Select all" checkbox at top: checks/unchecks all cards.
- "Delete Selected" button: disabled when `selected.size === 0`. On click, sends `DELETE /api/cards/:id` for each selected id sequentially. On completion: calls `onCardsChanged()`, clears `selected`. If any requests fail: shows `deleteError` banner with count of failures; successful deletions still apply.
- "Add Card" button: sets `isModalOpen = true`.
- `AddCardModal` rendered with `isOpen={isModalOpen}`, `onClose={() => setIsModalOpen(false)}`, `onSaved={() => { setIsModalOpen(false); onCardsChanged(); }}`.

### `AddCardModal`

- **Props:** `isOpen: bool`, `onClose: fn`, `onSaved: fn`
- **State:** `question: string`, `answer: string`, `errors: { question?: string, answer?: string }`, `submitError: string | null`, `isSubmitting: bool`
- Renders nothing when `isOpen` is false.
- Two `<textarea>` fields: Question and Answer.
- **Client-side validation on submit:**
  - Both fields required (error: `"Question is required."` / `"Answer is required."`)
  - Neither may be whitespace-only (same error message)
  - Max 500 characters each (error: `"Question must be 500 characters or fewer."` / `"Answer must be 500 characters or fewer."`)
  - Errors shown inline beneath each field.
- On valid submit: sets `isSubmitting = true`, calls `POST /api/cards`. On success: calls `onSaved()`. On failure: sets `submitError = "Failed to save card. Please try again."`, keeps form open with existing input intact.
- "Cancel" button calls `onClose()`.
- Modal closes on Escape key press.
- Modal traps focus while open (no focus escaping to background).
- Form resets (clears fields and errors) when modal opens.

### `CardListItem`

- **Props:** `card: { id, question, answer }`, `isSelected: bool`, `onToggle: fn`
- Pure presentational. Renders a checkbox, the question text, and the answer truncated at 60 characters (appends "…" if truncated).
- Clicking anywhere on the row (or just the checkbox) calls `onToggle`.

---

## Error Handling

- **Delete batch failure:** `AdminPage` shows an inline error banner: `"X card(s) could not be deleted. Please try again."` Successfully deleted cards are removed from the list immediately.
- **Add card failure:** `AddCardModal` shows `"Failed to save card. Please try again."` beneath the form buttons. Form stays open, input preserved.
- **No loading state in AdminPage:** Cards are passed in from `App`, which already manages fetch lifecycle. `onCardsChanged` triggers a re-fetch in `App`; the admin list updates when the new `cards` prop arrives.

---

## Testing

### Server unit tests (Vitest + Supertest)

`POST /api/cards`:
- Returns 201 with `{ id, question, answer }` when body is valid.
- Returns 400 when `question` is missing.
- Returns 400 when `answer` is empty string.
- Returns 400 when `question` exceeds 500 characters.

`DELETE /api/cards/:id`:
- Returns 200 `{ ok: true }` for an existing card.
- Returns 404 for an id that does not exist.

### Client unit tests (Vitest + Testing Library)

`AddCardModal`:
- Renders nothing when `isOpen` is false.
- Renders form when `isOpen` is true.
- Shows validation error when question field is empty on submit.
- Shows validation error when answer field is empty on submit.
- Calls `onSaved` and `onClose` after a successful POST.
- Shows submit error and keeps modal open on POST failure.
- Calls `onClose` when Cancel is clicked.
- Calls `onClose` when Escape key is pressed.

`AdminPage`:
- Renders a row for each card.
- "Delete Selected" button is disabled when no cards are checked.
- "Delete Selected" button is enabled after a card is checked.
- Calls `onCardsChanged` after successful deletion.
- Shows error banner when a delete request fails.

`CardListItem`:
- Renders question text.
- Renders truncated answer (≤ 60 chars + "…" when longer).
- Calls `onToggle` when clicked.

`App` (additions):
- Renders toggle button.
- Switches to AdminPage when toggle is clicked.
- Switches back to study view when toggle is clicked again.

### E2E tests (Playwright)

- Toggle to admin view → verify card list is visible.
- Toggle to admin and back → study view re-appears.
- Add a card via modal → it appears in the admin list.
- Select a card and delete it → it disappears from the list.
- Full round-trip: add card → return to study → study the new card.
