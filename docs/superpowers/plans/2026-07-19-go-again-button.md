# "Go Again" Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Go Again" button to the post-session summary screen that restarts the full original deck, shuffled, regardless of whether the finished round was the full deck or a "missed cards" round.

**Architecture:** `App.jsx` owns the full `cards` list and a new `handleGoAgain()` handler that shuffles it (via a new pure `shuffle()` utility) and resets the active session. The `onGoAgain` callback is threaded, unchanged, through `StudySession` down to `SessionSummary`, which renders an always-visible "Go Again" button.

**Tech Stack:** React (Vite), Vitest + Testing Library (client unit tests), Playwright (e2e).

## Global Constraints

- Test-first (TDD). Tests come first, always.
- Build production grade code.
- Use best practices for readability in React.
- Write for a junior-to-mid dev. Clear and conventional over clever.
- Use pragmatic error handling.
- Write e2e tests for critical paths in the application.
- (Optional) Why-comments. Short explanations where they help a beginner.
- Errors: Return `{ error: { code, message } }`; 404 for unknown routes/resources. (No API changes in this feature — included for completeness.)
- Pre-commit runs lint + unit + API tests + e2e. Never bypass with `--no-verify`.
- No new dependencies, no API changes, no data model changes.

---

### Task 1: `shuffle` utility

**Files:**
- Create: `client/src/utils/shuffle.js`
- Test: `client/src/utils/shuffle.test.js`

**Interfaces:**
- Produces: `shuffle(array)` — pure function, exported as default from `client/src/utils/shuffle.js`. Takes an array, returns a **new** array containing the same elements in randomized order. Does not mutate the input.

- [ ] **Step 1: Write the failing tests**

Create `client/src/utils/shuffle.test.js`:

```js
import { describe, it, expect } from 'vitest';
import shuffle from './shuffle.js';

describe('shuffle', () => {
  it('returns an array with the same length as the input', () => {
    const input = [1, 2, 3, 4, 5];
    expect(shuffle(input)).toHaveLength(5);
  });

  it('returns an array containing the same elements as the input', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it('returns a new array instance, not the same reference', () => {
    const input = [1, 2, 3];
    expect(shuffle(input)).not.toBe(input);
  });

  it('handles an empty array', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('handles a single-element array', () => {
    expect(shuffle([1])).toEqual([1]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test --workspace=client -- src/utils/shuffle.test.js`
Expected: FAIL — `Failed to resolve import "./shuffle.js"` (file doesn't exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `client/src/utils/shuffle.js`:

```js
// Fisher-Yates shuffle. Returns a new array; never mutates the input.
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default shuffle;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=client -- src/utils/shuffle.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/shuffle.js client/src/utils/shuffle.test.js
git commit -m "feat(client): add shuffle utility"
```

---

### Task 2: `SessionSummary` — "Go Again" button

**Files:**
- Modify: `client/src/components/SessionSummary.jsx`
- Test: `client/src/components/SessionSummary.test.jsx`

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces: `SessionSummary` now requires an `onGoAgain` prop (function). Renders a button with accessible name "Go Again" that calls `onGoAgain()` with no arguments when clicked. This button is always rendered (not conditional like "Study Missed Cards").

- [ ] **Step 1: Write the failing tests**

Add to `client/src/components/SessionSummary.test.jsx` (inside the existing `describe('SessionSummary', ...)` block — add `onGoAgain={vi.fn()}` to every existing `render(<SessionSummary ... />)` call's props too, since it becomes a required prop):

```js
  it('always shows the "Go Again" button', () => {
    render(
      <SessionSummary
        total={3}
        correct={3}
        missedCards={[]}
        onStudyMissed={vi.fn()}
        onGoAgain={vi.fn()}
        onDone={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /go again/i })).toBeInTheDocument();
  });

  it('calls onGoAgain when "Go Again" is clicked', () => {
    const onGoAgain = vi.fn();
    render(
      <SessionSummary
        total={3}
        correct={2}
        missedCards={[]}
        onStudyMissed={vi.fn()}
        onGoAgain={onGoAgain}
        onDone={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /go again/i }));
    expect(onGoAgain).toHaveBeenCalledTimes(1);
  });
```

Also update every pre-existing `render(<SessionSummary .../>)` call in this file to include `onGoAgain={vi.fn()}`, so those tests still pass once `onGoAgain` becomes a required prop.

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npm run test --workspace=client -- src/components/SessionSummary.test.jsx`
Expected: FAIL — the two new tests fail because no "Go Again" button is rendered yet.

- [ ] **Step 3: Implement the button**

Replace the contents of `client/src/components/SessionSummary.jsx`:

```jsx
import PropTypes from 'prop-types';

function SessionSummary({ total, correct, missedCards, onStudyMissed, onGoAgain, onDone }) {
  return (
    <div>
      <h2>Session Complete</h2>
      <p>You got {correct} out of {total} correct.</p>
      {missedCards.length > 0 && (
        <button onClick={() => onStudyMissed(missedCards)}>
          Study Missed Cards
        </button>
      )}
      <button onClick={onGoAgain}>Go Again</button>
      <button onClick={onDone}>Done</button>
    </div>
  );
}

SessionSummary.propTypes = {
  total: PropTypes.number.isRequired,
  correct: PropTypes.number.isRequired,
  missedCards: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      question: PropTypes.string.isRequired,
      answer: PropTypes.string.isRequired,
    })
  ).isRequired,
  onStudyMissed: PropTypes.func.isRequired,
  onGoAgain: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default SessionSummary;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=client -- src/components/SessionSummary.test.jsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/SessionSummary.jsx client/src/components/SessionSummary.test.jsx
git commit -m "feat(client): add Go Again button to SessionSummary"
```

---

### Task 3: `StudySession` — forward `onGoAgain`

**Files:**
- Modify: `client/src/components/StudySession.jsx`
- Test: `client/src/components/StudySession.test.jsx`

**Interfaces:**
- Consumes: `SessionSummary` now requires `onGoAgain` (from Task 2).
- Produces: `StudySession` now requires an `onGoAgain` prop (function) and forwards it unchanged to `SessionSummary`.

- [ ] **Step 1: Write the failing test**

In `client/src/components/StudySession.test.jsx`, add `onGoAgain={vi.fn()}` to every existing `render(<StudySession .../>)` call (it becomes a required prop), and add this new test inside the `describe` block:

```js
  it('calls onGoAgain when "Go Again" is clicked on the summary screen', () => {
    const onGoAgain = vi.fn();
    render(
      <StudySession cards={cards} onStudyMissed={vi.fn()} onGoAgain={onGoAgain} onDone={vi.fn()} />
    );
    // Grade all cards to reach summary
    fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    // Summary — click Go Again
    fireEvent.click(screen.getByRole('button', { name: /go again/i }));
    expect(onGoAgain).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: Run the tests to verify the new one fails**

Run: `npm run test --workspace=client -- src/components/StudySession.test.jsx`
Expected: FAIL — `onGoAgain` prop-type warning aside, the new test fails because `StudySession` doesn't pass `onGoAgain` through to `SessionSummary`, so no "Go Again" button exists to click (or the click has no effect).

- [ ] **Step 3: Forward the prop**

In `client/src/components/StudySession.jsx`, update the function signature and the `SessionSummary` render (around lines 6 and 30-41):

```jsx
function StudySession({ cards, onStudyMissed, onGoAgain, onDone }) {
```

```jsx
  if (phase === 'summary') {
    const correct = graded.filter(r => r === 'correct').length;
    const missedCards = cards.filter((_, i) => graded[i] === 'missed');
    return (
      <SessionSummary
        total={cards.length}
        correct={correct}
        missedCards={missedCards}
        onStudyMissed={onStudyMissed}
        onGoAgain={onGoAgain}
        onDone={onDone}
      />
    );
  }
```

And update `StudySession.propTypes` to add:

```jsx
  onGoAgain: PropTypes.func.isRequired,
```

(placed alongside the existing `onStudyMissed` / `onDone` entries).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace=client -- src/components/StudySession.test.jsx`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/StudySession.jsx client/src/components/StudySession.test.jsx
git commit -m "feat(client): forward onGoAgain through StudySession"
```

---

### Task 4: `App` — shuffle full deck and restart on "Go Again"

**Files:**
- Modify: `client/src/App.jsx`
- Test: `client/src/App.test.jsx`

**Interfaces:**
- Consumes: `shuffle(array)` from `client/src/utils/shuffle.js` (Task 1). `StudySession` now requires `onGoAgain` (Task 3).
- Produces: `App` passes `onGoAgain={handleGoAgain}` to `StudySession`, where `handleGoAgain()` sets `activeCards` to `shuffle(cards)` (the full original deck) and remounts the session.

- [ ] **Step 1: Write the failing test**

Add to `client/src/App.test.jsx`, inside the existing `describe('App', ...)` block. This uses a larger mock deck so shuffling is meaningfully observable, and grades every card to reach the summary screen:

```js
  it('restarts with the full deck after "Go Again" is clicked', async () => {
    const threeCards = [
      { id: 1, question: 'Q1', answer: 'A1' },
      { id: 2, question: 'Q2', answer: 'A2' },
      { id: 3, question: 'Q3', answer: 'A3' },
    ];
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(threeCards),
    });
    render(<App />);
    await waitFor(() => screen.getByText('Q1'));

    // Grade all three cards to reach the summary
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
      fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    }

    expect(screen.getByText('You got 3 out of 3 correct.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /go again/i }));

    // Back in a fresh study session with all 3 cards again
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace=client -- src/App.test.jsx`
Expected: FAIL — `StudySession` requires `onGoAgain` (prop-types warning) and no "Go Again" click handler exists in `App`, so clicking it does nothing and the assertion for `'1 / 3'` fails (still on the summary screen).

- [ ] **Step 3: Implement `handleGoAgain` and wire it up**

In `client/src/App.jsx`, add the import at the top:

```js
import shuffle from './utils/shuffle.js';
```

Add `handleGoAgain` alongside the existing `handleStudyMissed` (after line 37):

```js
  function handleGoAgain() {
    setActiveCards(shuffle(cards));
    setSessionKey(k => k + 1);
  }
```

Pass it to `StudySession` in the final render block (around line 85-90):

```jsx
        <StudySession
          key={sessionKey}
          cards={activeCards}
          onStudyMissed={handleStudyMissed}
          onGoAgain={handleGoAgain}
          onDone={handleDone}
        />
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace=client -- src/App.test.jsx`
Expected: PASS (all tests, including the new one).

- [ ] **Step 5: Run the full client test suite**

Run: `npm run test --workspace=client`
Expected: PASS — all client unit tests pass (`shuffle`, `SessionSummary`, `StudySession`, `App`, and unrelated existing suites).

- [ ] **Step 6: Commit**

```bash
git add client/src/App.jsx client/src/App.test.jsx
git commit -m "feat(client): restart full shuffled deck on Go Again"
```

---

### Task 5: E2E test for the full "Go Again" flow

**Files:**
- Modify: `e2e/study-flow.spec.js`

**Interfaces:**
- Consumes: the running app (client + server via `npm run dev`, booted automatically by Playwright's config), seeded with 3 cards via `POST /api/test/reset` (existing seed: "What is JSX?", and two others — see existing tests in this file for the seeded question/answer text).

- [ ] **Step 1: Write the failing e2e test**

Add to `e2e/study-flow.spec.js`, inside the existing `test.describe('flashcard study flow', ...)` block, after the `'re-studies only missed cards...'` test:

```js
  test('restarts the full deck after clicking "Go Again"', async ({ page }) => {
    await page.goto('/');

    // Card 1 — correct
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /got it/i }).click();

    // Card 2 — correct
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /got it/i }).click();

    // Card 3 — missed
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /missed it/i }).click();

    await expect(page.getByText('You got 2 out of 3 correct.')).toBeVisible();

    await page.getByRole('button', { name: /go again/i }).click();

    // Fresh session with the full deck of 3 again
    await expect(page.getByText('1 / 3')).toBeVisible();

    // Can complete this new session and reach a fresh summary
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /got it/i }).click();
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /got it/i }).click();
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /got it/i }).click();

    await expect(page.getByText('You got 3 out of 3 correct.')).toBeVisible();
  });
```

- [ ] **Step 2: Run the e2e test to verify it passes**

Note: unlike Tasks 1-4, this step doesn't follow red-green TDD. The "Go Again" feature is already fully implemented by the end of Task 4 — this e2e test is a regression check confirming the full stack (client + server) supports the flow end-to-end, not a driver for new implementation.

Run: `npm run test:e2e -- e2e/study-flow.spec.js`
Expected: PASS. If it fails, re-check that Tasks 1-4 were completed and committed first.

- [ ] **Step 3: Run the full e2e suite to confirm no regressions**

Run: `npm run test:e2e`
Expected: PASS — all e2e tests pass (12 tests: the 11 existing plus the new one).

- [ ] **Step 4: Commit**

```bash
git add e2e/study-flow.spec.js
git commit -m "test(e2e): cover restarting the full deck via Go Again"
```

---

## Final Verification

- [ ] Run `npm run lint` — expect no errors.
- [ ] Run `npm run test --workspace=client` — expect all pass.
- [ ] Run `npm run test --workspace=server` — expect all pass (unaffected by this feature, confirms no regressions).
- [ ] Run `npm run test:e2e` — expect all pass.
