# Flashcard Study Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a study-mode flashcard feature that loads cards from SQLite, presents them one at a time with a 3D flip animation, lets users self-grade, and offers to re-study missed cards.

**Architecture:** The server exposes `GET /api/cards` backed by Sequelize + SQLite. The client fetches cards on mount and passes them to `StudySession`, which orchestrates the study flow using `FlashCard` (pure UI) and `SessionSummary` (end-of-deck screen). `App` handles fetch state and restarts the session with missed cards when requested.

**Tech Stack:** Express (ESM), Sequelize + sqlite3, React 19 (JSX), Vitest + Testing Library, Playwright.

## Global Constraints

- ESM everywhere (`"type": "module"` in all package.json files).
- Server tests use `NODE_ENV=test` and `:memory:` SQLite; every `describe` block that touches the DB calls `sequelize.sync({ force: true })` + `seed()` in `beforeAll`.
- Error responses: `{ error: { code, message } }`.
- PropTypes required on every component.
- TDD: write failing test → confirm it fails → implement → confirm it passes → commit.
- Never use `--no-verify` on commits.
- `npm run test --workspace=client` runs client tests; `npm run test --workspace=server` runs server tests.

---

## File Map

**New files:**
- `server/src/db.js` — Sequelize instance, Card model, seed function
- `client/src/components/FlashCard.jsx` — pure 3D flip card UI
- `client/src/components/FlashCard.css` — flip animation styles
- `client/src/components/SessionSummary.jsx` — end-of-deck score + actions
- `client/src/components/StudySession.jsx` — study flow orchestrator
- `client/src/components/FlashCard.test.jsx`
- `client/src/components/SessionSummary.test.jsx`
- `client/src/components/StudySession.test.jsx`
- `e2e/study-flow.spec.js`

**Modified files:**
- `server/package.json` — add sequelize, sqlite3
- `server/src/app.js` — add `GET /api/cards`
- `server/src/app.test.js` — add `GET /api/cards` tests
- `server/src/index.js` — sync DB and seed on startup
- `client/src/App.jsx` — fetch cards, manage phases
- `client/src/App.test.jsx` — replace existing test with new tests

---

### Task 1: Card model, GET /api/cards, and server tests

**Files:**
- Create: `server/src/db.js`
- Modify: `server/src/app.js`
- Modify: `server/src/app.test.js`
- Modify: `server/src/index.js`
- Modify: `server/package.json`

**Interfaces:**
- Produces: `Card` Sequelize model with `{ id, question, answer }`, `sequelize` instance, `seed()` function — all exported from `server/src/db.js`
- Produces: `GET /api/cards` → `200 [{ id, question, answer }, ...]` or `500 { error: { code, message } }`

- [ ] **Step 1: Install Sequelize and sqlite3**

```bash
npm install sequelize sqlite3 --workspace=server
```

Expected: packages added to `server/package.json` dependencies, no errors.

- [ ] **Step 2: Write the failing server tests for GET /api/cards**

Replace the full contents of `server/src/app.test.js`:

```js
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './app.js';
import { sequelize, seed } from './db.js';

describe('GET /api/ping', () => {
  it('responds with a pong message', async () => {
    const response = await request(app).get('/api/ping');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'pong' });
  });
});

describe('GET /api/cards', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await seed();
  });

  it('returns 200 with an array of cards', async () => {
    const response = await request(app).get('/api/cards');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('each card has id, question, and answer fields', async () => {
    const response = await request(app).get('/api/cards');
    const card = response.body[0];
    expect(typeof card.id).toBe('number');
    expect(typeof card.question).toBe('string');
    expect(typeof card.answer).toBe('string');
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npm run test --workspace=server
```

Expected: FAIL — `Cannot find module './db.js'`

- [ ] **Step 4: Create server/src/db.js**

```js
import { Sequelize, DataTypes } from 'sequelize';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve to server/flashcards.db in production, :memory: in tests
const storage =
  process.env.NODE_ENV === 'test'
    ? ':memory:'
    : join(__dirname, '../flashcards.db');

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false,
});

export const Card = sequelize.define('Card', {
  question: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true },
  },
  answer: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true },
  },
});

export async function seed() {
  await Card.bulkCreate([
    {
      question: 'What is JSX?',
      answer: 'A syntax extension for JavaScript used with React.',
    },
    {
      question: 'What does useState return?',
      answer: 'An array with the current state value and a setter function.',
    },
    {
      question: 'What is a React prop?',
      answer: 'Data passed from a parent component to a child component.',
    },
  ]);
}
```

- [ ] **Step 5: Add GET /api/cards to server/src/app.js**

Replace the full contents of `server/src/app.js`:

```js
import express from 'express';
import { Card } from './db.js';

const app = express();

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.get('/api/cards', async (req, res) => {
  try {
    const cards = await Card.findAll({
      attributes: ['id', 'question', 'answer'],
      order: [['id', 'ASC']],
    });
    res.json(cards);
  } catch {
    res
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load cards.' } });
  }
});

export default app;
```

- [ ] **Step 6: Update server/src/index.js to sync DB and seed on startup**

Replace the full contents of `server/src/index.js`:

```js
import app from './app.js';
import { sequelize, Card, seed } from './db.js';

const PORT = 3001;

async function start() {
  await sequelize.sync();

  // Seed sample cards if none exist (development only)
  if (process.env.NODE_ENV !== 'production') {
    const count = await Card.count();
    if (count === 0) {
      await seed();
    }
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start();
```

- [ ] **Step 7: Run tests to confirm they pass**

```bash
npm run test --workspace=server
```

Expected: PASS — 3 tests (ping + 2 cards tests)

- [ ] **Step 8: Commit**

```bash
git add server/package.json server/package-lock.json server/src/db.js server/src/app.js server/src/app.test.js server/src/index.js
git commit -m "feat: add Card model and GET /api/cards endpoint"
```

---

### Task 2: FlashCard component

**Files:**
- Create: `client/src/components/FlashCard.jsx`
- Create: `client/src/components/FlashCard.css`
- Create: `client/src/components/FlashCard.test.jsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `FlashCard` component — props `{ question: string, answer: string, isFlipped: bool, onFlip: fn }`. Controlled: the parent decides when `isFlipped` is true. Clicking the card fires `onFlip`.

- [ ] **Step 1: Write the failing FlashCard tests**

Create `client/src/components/FlashCard.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FlashCard from './FlashCard.jsx';

const defaultProps = {
  question: 'What is JSX?',
  answer: 'A syntax extension for JavaScript.',
  isFlipped: false,
  onFlip: vi.fn(),
};

describe('FlashCard', () => {
  it('renders the question text', () => {
    render(<FlashCard {...defaultProps} />);
    expect(screen.getByText('What is JSX?')).toBeInTheDocument();
  });

  it('renders the answer text', () => {
    render(<FlashCard {...defaultProps} isFlipped={true} />);
    expect(screen.getByText('A syntax extension for JavaScript.')).toBeInTheDocument();
  });

  it('calls onFlip when the card is clicked', () => {
    const onFlip = vi.fn();
    render(<FlashCard {...defaultProps} onFlip={onFlip} />);
    fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it('applies the flipped CSS class when isFlipped is true', () => {
    const { container } = render(<FlashCard {...defaultProps} isFlipped={true} />);
    expect(container.querySelector('.flashcard__inner--flipped')).toBeInTheDocument();
  });

  it('does not apply the flipped CSS class when isFlipped is false', () => {
    const { container } = render(<FlashCard {...defaultProps} isFlipped={false} />);
    expect(container.querySelector('.flashcard__inner--flipped')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test --workspace=client -- src/components/FlashCard.test.jsx
```

Expected: FAIL — `Cannot find module './FlashCard.jsx'`

- [ ] **Step 3: Create FlashCard.css**

Create `client/src/components/FlashCard.css`:

```css
.flashcard {
  width: 400px;
  height: 250px;
  perspective: 1000px;
  cursor: pointer;
}

.flashcard__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s ease;
  transform-style: preserve-3d;
}

.flashcard__inner--flipped {
  transform: rotateY(180deg);
}

.flashcard__face {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  border: 2px solid #ccc;
  border-radius: 12px;
  background: white;
  backface-visibility: hidden;
  box-sizing: border-box;
  font-size: 1.2rem;
  text-align: center;
}

.flashcard__face--back {
  transform: rotateY(180deg);
  background: #f0f8ff;
}
```

- [ ] **Step 4: Create FlashCard.jsx**

Create `client/src/components/FlashCard.jsx`:

```jsx
import PropTypes from 'prop-types';
import './FlashCard.css';

function FlashCard({ question, answer, isFlipped, onFlip }) {
  return (
    <div
      className="flashcard"
      onClick={onFlip}
      role="button"
      aria-label="Flip card"
    >
      <div className={`flashcard__inner${isFlipped ? ' flashcard__inner--flipped' : ''}`}>
        <div className="flashcard__face flashcard__face--front">
          <p>{question}</p>
        </div>
        <div className="flashcard__face flashcard__face--back">
          <p>{answer}</p>
        </div>
      </div>
    </div>
  );
}

FlashCard.propTypes = {
  question: PropTypes.string.isRequired,
  answer: PropTypes.string.isRequired,
  isFlipped: PropTypes.bool.isRequired,
  onFlip: PropTypes.func.isRequired,
};

export default FlashCard;
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm run test --workspace=client -- src/components/FlashCard.test.jsx
```

Expected: PASS — 5 tests

- [ ] **Step 6: Commit**

```bash
git add client/src/components/FlashCard.jsx client/src/components/FlashCard.css client/src/components/FlashCard.test.jsx
git commit -m "feat: add FlashCard component with 3D flip animation"
```

---

### Task 3: SessionSummary component

**Files:**
- Create: `client/src/components/SessionSummary.jsx`
- Create: `client/src/components/SessionSummary.test.jsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `SessionSummary` component — props `{ total: number, correct: number, missedCards: Array<{ id, question, answer }>, onStudyMissed: fn, onDone: fn }`. Shows score, "Study Missed Cards" button (only when `missedCards.length > 0`), and "Done" button.

- [ ] **Step 1: Write the failing SessionSummary tests**

Create `client/src/components/SessionSummary.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SessionSummary from './SessionSummary.jsx';

const missedCard = { id: 2, question: 'Q2', answer: 'A2' };

describe('SessionSummary', () => {
  it('displays the score', () => {
    render(
      <SessionSummary
        total={3}
        correct={2}
        missedCards={[]}
        onStudyMissed={vi.fn()}
        onDone={vi.fn()}
      />
    );
    expect(screen.getByText('You got 2 out of 3 correct.')).toBeInTheDocument();
  });

  it('hides "Study Missed Cards" when there are no missed cards', () => {
    render(
      <SessionSummary
        total={3}
        correct={3}
        missedCards={[]}
        onStudyMissed={vi.fn()}
        onDone={vi.fn()}
      />
    );
    expect(
      screen.queryByRole('button', { name: /study missed cards/i })
    ).not.toBeInTheDocument();
  });

  it('shows "Study Missed Cards" when there are missed cards', () => {
    render(
      <SessionSummary
        total={3}
        correct={2}
        missedCards={[missedCard]}
        onStudyMissed={vi.fn()}
        onDone={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /study missed cards/i })
    ).toBeInTheDocument();
  });

  it('calls onStudyMissed with missedCards when "Study Missed Cards" is clicked', () => {
    const onStudyMissed = vi.fn();
    render(
      <SessionSummary
        total={3}
        correct={2}
        missedCards={[missedCard]}
        onStudyMissed={onStudyMissed}
        onDone={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /study missed cards/i }));
    expect(onStudyMissed).toHaveBeenCalledWith([missedCard]);
  });

  it('calls onDone when "Done" is clicked', () => {
    const onDone = vi.fn();
    render(
      <SessionSummary
        total={3}
        correct={3}
        missedCards={[]}
        onStudyMissed={vi.fn()}
        onDone={onDone}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test --workspace=client -- src/components/SessionSummary.test.jsx
```

Expected: FAIL — `Cannot find module './SessionSummary.jsx'`

- [ ] **Step 3: Create SessionSummary.jsx**

Create `client/src/components/SessionSummary.jsx`:

```jsx
import PropTypes from 'prop-types';

function SessionSummary({ total, correct, missedCards, onStudyMissed, onDone }) {
  return (
    <div>
      <h2>Session Complete</h2>
      <p>You got {correct} out of {total} correct.</p>
      {missedCards.length > 0 && (
        <button onClick={() => onStudyMissed(missedCards)}>
          Study Missed Cards
        </button>
      )}
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
  onDone: PropTypes.func.isRequired,
};

export default SessionSummary;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test --workspace=client -- src/components/SessionSummary.test.jsx
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add client/src/components/SessionSummary.jsx client/src/components/SessionSummary.test.jsx
git commit -m "feat: add SessionSummary component"
```

---

### Task 4: StudySession component

**Files:**
- Create: `client/src/components/StudySession.jsx`
- Create: `client/src/components/StudySession.test.jsx`

**Interfaces:**
- Consumes: `FlashCard` from Task 2; `SessionSummary` from Task 3
- Produces: `StudySession` component — props `{ cards: Array<{ id, question, answer }>, onStudyMissed: fn, onDone: fn }`. Manages study flow from first card to summary. On completing the deck, renders `SessionSummary` and passes `onStudyMissed` and `onDone` through.

- [ ] **Step 1: Write the failing StudySession tests**

Create `client/src/components/StudySession.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StudySession from './StudySession.jsx';

const cards = [
  { id: 1, question: 'Q1', answer: 'A1' },
  { id: 2, question: 'Q2', answer: 'A2' },
];

describe('StudySession', () => {
  it('shows the first card question', () => {
    render(<StudySession cards={cards} onStudyMissed={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText('Q1')).toBeInTheDocument();
  });

  it('hides grading buttons before the card is flipped', () => {
    render(<StudySession cards={cards} onStudyMissed={vi.fn()} onDone={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /got it/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /missed it/i })).not.toBeInTheDocument();
  });

  it('shows grading buttons after the card is flipped', () => {
    render(<StudySession cards={cards} onStudyMissed={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
    expect(screen.getByRole('button', { name: /got it/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /missed it/i })).toBeInTheDocument();
  });

  it('advances to the next card after grading', () => {
    render(<StudySession cards={cards} onStudyMissed={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(screen.getByText('Q2')).toBeInTheDocument();
  });

  it('shows the summary after the last card is graded', () => {
    render(<StudySession cards={cards} onStudyMissed={vi.fn()} onDone={vi.fn()} />);
    // Card 1 — correct
    fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    // Card 2 — missed
    fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
    fireEvent.click(screen.getByRole('button', { name: /missed it/i }));
    expect(screen.getByText('You got 1 out of 2 correct.')).toBeInTheDocument();
  });

  it('shows the card counter', () => {
    render(<StudySession cards={cards} onStudyMissed={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test --workspace=client -- src/components/StudySession.test.jsx
```

Expected: FAIL — `Cannot find module './StudySession.jsx'`

- [ ] **Step 3: Create StudySession.jsx**

Create `client/src/components/StudySession.jsx`:

```jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import FlashCard from './FlashCard.jsx';
import SessionSummary from './SessionSummary.jsx';

function StudySession({ cards, onStudyMissed, onDone }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [graded, setGraded] = useState([]);
  const [phase, setPhase] = useState('studying');

  function handleFlip() {
    setIsFlipped(true);
  }

  function handleGrade(result) {
    const newGraded = [...graded, result];
    const nextIndex = currentIndex + 1;

    if (nextIndex >= cards.length) {
      setGraded(newGraded);
      setPhase('summary');
    } else {
      setGraded(newGraded);
      setCurrentIndex(nextIndex);
      setIsFlipped(false);
    }
  }

  if (phase === 'summary') {
    const correct = graded.filter(r => r === 'correct').length;
    const missedCards = cards.filter((_, i) => graded[i] === 'missed');
    return (
      <SessionSummary
        total={cards.length}
        correct={correct}
        missedCards={missedCards}
        onStudyMissed={onStudyMissed}
        onDone={onDone}
      />
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div>
      <p>{currentIndex + 1} / {cards.length}</p>
      <FlashCard
        question={currentCard.question}
        answer={currentCard.answer}
        isFlipped={isFlipped}
        onFlip={handleFlip}
      />
      {isFlipped && (
        <div>
          <button onClick={() => handleGrade('correct')}>Got it</button>
          <button onClick={() => handleGrade('missed')}>Missed it</button>
        </div>
      )}
    </div>
  );
}

StudySession.propTypes = {
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      question: PropTypes.string.isRequired,
      answer: PropTypes.string.isRequired,
    })
  ).isRequired,
  onStudyMissed: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default StudySession;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test --workspace=client -- src/components/StudySession.test.jsx
```

Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add client/src/components/StudySession.jsx client/src/components/StudySession.test.jsx
git commit -m "feat: add StudySession component"
```

---

### Task 5: App integration

**Files:**
- Modify: `client/src/App.jsx`
- Modify: `client/src/App.test.jsx`

**Interfaces:**
- Consumes: `StudySession` from Task 4 — props `{ cards, onStudyMissed, onDone }`
- Produces: `App` — fetches `GET /api/cards`, manages `status` (`loading | error | empty | ready | done`) and `activeCards`. Passes a stable `key` to `StudySession` so React remounts it when the user starts studying missed cards (resetting all state cleanly).

- [ ] **Step 1: Write the failing App tests**

Replace the full contents of `client/src/App.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App.jsx';

const mockCards = [
  { id: 1, question: 'What is JSX?', answer: 'A syntax extension for JavaScript.' },
];

describe('App', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a loading indicator initially', () => {
    global.fetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<App />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders an error message when fetch fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));
    render(<App />);
    await waitFor(() =>
      expect(
        screen.getByText('Failed to load cards. Please try again.')
      ).toBeInTheDocument()
    );
  });

  it('renders "No cards found." when the API returns an empty array', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    render(<App />);
    await waitFor(() =>
      expect(screen.getByText('No cards found.')).toBeInTheDocument()
    );
  });

  it('renders the first card question when cards load successfully', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCards),
    });
    render(<App />);
    await waitFor(() =>
      expect(screen.getByText('What is JSX?')).toBeInTheDocument()
    );
  });

  it('renders an error message when the server responds with a non-ok status', async () => {
    global.fetch.mockResolvedValue({ ok: false });
    render(<App />);
    await waitFor(() =>
      expect(
        screen.getByText('Failed to load cards. Please try again.')
      ).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test --workspace=client -- src/App.test.jsx
```

Expected: FAIL — tests that expect 'Loading...' and fetch-based outcomes will fail against the existing static App.

- [ ] **Step 3: Update App.jsx**

Replace the full contents of `client/src/App.jsx`:

```jsx
import { useState, useEffect } from 'react';
import StudySession from './components/StudySession.jsx';

function App() {
  const [status, setStatus] = useState('loading');
  const [activeCards, setActiveCards] = useState([]);
  // Incrementing this key forces StudySession to remount when studying missed cards
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    fetch('/api/cards')
      .then(res => {
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then(data => {
        if (data.length === 0) {
          setStatus('empty');
        } else {
          setActiveCards(data);
          setStatus('ready');
        }
      })
      .catch(() => setStatus('error'));
  }, []);

  function handleStudyMissed(missedCards) {
    setActiveCards(missedCards);
    setSessionKey(k => k + 1);
  }

  function handleDone() {
    setStatus('done');
  }

  if (status === 'loading') {
    return <main><p>Loading...</p></main>;
  }

  if (status === 'error') {
    return <main><p>Failed to load cards. Please try again.</p></main>;
  }

  if (status === 'empty') {
    return <main><p>No cards found.</p></main>;
  }

  if (status === 'done') {
    return <main><h1>Flashcard App</h1><p>Good work!</p></main>;
  }

  return (
    <main>
      <h1>Flashcard App</h1>
      <StudySession
        key={sessionKey}
        cards={activeCards}
        onStudyMissed={handleStudyMissed}
        onDone={handleDone}
      />
    </main>
  );
}

export default App;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test --workspace=client -- src/App.test.jsx
```

Expected: PASS — 5 tests

- [ ] **Step 5: Run all client tests to confirm nothing regressed**

```bash
npm run test --workspace=client
```

Expected: PASS — all tests

- [ ] **Step 6: Commit**

```bash
git add client/src/App.jsx client/src/App.test.jsx
git commit -m "feat: integrate StudySession into App with fetch and phase management"
```

---

### Task 6: E2E tests

**Files:**
- Create: `e2e/study-flow.spec.js`

**Interfaces:**
- Consumes: The running dev server with seeded cards (seed data defined in Task 1: "What is JSX?", "What does useState return?", "What is a React prop?")

Note: The empty-deck scenario is fully covered by unit tests in Task 5. The E2E suite focuses on the critical happy path and the missed-card re-study flow.

- [ ] **Step 1: Write the E2E test**

Create `e2e/study-flow.spec.js`:

```js
import { test, expect } from '@playwright/test';

test.describe('flashcard study flow', () => {
  test('loads cards and shows the first question', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('What is JSX?')).toBeVisible();
    await expect(page.getByText('1 / 3')).toBeVisible();
  });

  test('flipping a card reveals the answer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /flip card/i }).click();
    await expect(
      page.getByText('A syntax extension for JavaScript used with React.')
    ).toBeVisible();
  });

  test('grading buttons appear only after flip', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /got it/i })).not.toBeVisible();
    await page.getByRole('button', { name: /flip card/i }).click();
    await expect(page.getByRole('button', { name: /got it/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /missed it/i })).toBeVisible();
  });

  test('completes the deck and shows the summary', async ({ page }) => {
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
    await expect(
      page.getByRole('button', { name: /study missed cards/i })
    ).toBeVisible();
  });

  test('re-studies only missed cards after clicking "Study Missed Cards"', async ({ page }) => {
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

    // Start missed-card session
    await page.getByRole('button', { name: /study missed cards/i }).click();

    // Should now show the missed card, with a deck of 1
    await expect(page.getByText('What is a React prop?')).toBeVisible();
    await expect(page.getByText('1 / 1')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the E2E tests**

```bash
npm run test:e2e
```

Expected: PASS — 5 tests (4 new + existing home heading test)

- [ ] **Step 3: Commit**

```bash
git add e2e/study-flow.spec.js
git commit -m "test: add E2E tests for flashcard study flow"
```
