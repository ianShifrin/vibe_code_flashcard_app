# Admin Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin mode toggled from the main page that lets users add cards via a modal and bulk-delete cards via checkboxes.

**Architecture:** `App` gains a `view` state (`'study'` | `'admin'`) and a toggle button. When `view === 'admin'`, it renders `AdminPage` (which uses `CardListItem` rows and an `AddCardModal`). `App` owns re-fetching via `onCardsChanged`; the server gets two new routes (`POST /api/cards`, `DELETE /api/cards/:id`) validated with Zod.

**Tech Stack:** Express (ESM) + Zod + Sequelize/SQLite, React 19 (JSX), Vitest + Testing Library, Playwright.

## Global Constraints

- ESM everywhere (`"type": "module"` in all package.json files).
- Zod validation at the API route boundary. `zod` is already in `server/package.json`.
- Error responses: `{ error: { code, message } }`.
- PropTypes required on every component.
- TDD: write failing test → confirm fail → implement → confirm pass → commit.
- Server tests: each `describe` that touches the DB calls `sequelize.sync({ force: true })` + `seed()` (or creates needed records) in `beforeAll`. `NODE_ENV=test` uses `:memory:` SQLite.
- Run server tests: `npm run test --workspace=server`. Run client tests: `npm run test --workspace=client`. Run E2E: `npm run test:e2e`.
- Never use `--no-verify` on commits.
- Exact error message strings (copy verbatim):
  - Validation field errors: `"Question is required."` / `"Answer is required."` / `"Question must be 500 characters or fewer."` / `"Answer must be 500 characters or fewer."`
  - Submit error in modal: `"Failed to save card. Please try again."`
  - Delete batch error: `"X card(s) could not be deleted. Please try again."` (X = count)
  - 404: `"Card not found."`
  - 500 on save: `"Failed to save card."`
  - 500 on delete: `"Failed to delete card."`

---

## File Map

**New files:**
- `client/src/components/CardListItem.jsx`
- `client/src/components/CardListItem.test.jsx`
- `client/src/components/AddCardModal.jsx`
- `client/src/components/AddCardModal.test.jsx`
- `client/src/components/AdminPage.jsx`
- `client/src/components/AdminPage.test.jsx`
- `e2e/admin.spec.js`

**Modified files:**
- `server/src/app.js` — add `express.json()`, `POST /api/cards`, `DELETE /api/cards/:id`
- `server/src/app.test.js` — add tests for new routes
- `client/src/App.jsx` — add `view` state, `cards` state, toggle button, `handleCardsChanged`, render `AdminPage`
- `client/src/App.test.jsx` — add toggle behavior tests

---

### Task 1: POST /api/cards and DELETE /api/cards/:id

**Files:**
- Modify: `server/src/app.js`
- Modify: `server/src/app.test.js`

**Interfaces:**
- Consumes: `Card` model from `./db.js` (already imported)
- Produces:
  - `POST /api/cards` body `{ question, answer }` → `201 { id, question, answer }` or `400 { error }` or `500 { error }`
  - `DELETE /api/cards/:id` → `200 { ok: true }` or `404 { error }` or `500 { error }`

- [ ] **Step 1: Write failing server tests for the new routes**

Add the following two `describe` blocks to `server/src/app.test.js` (after the existing blocks — keep all existing content):

```js
describe('POST /api/cards', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await seed();
  });

  it('returns 201 with the created card', async () => {
    const response = await request(app)
      .post('/api/cards')
      .send({ question: 'What is React?', answer: 'A JavaScript library for building UIs.' });
    expect(response.status).toBe(201);
    expect(typeof response.body.id).toBe('number');
    expect(response.body.question).toBe('What is React?');
    expect(response.body.answer).toBe('A JavaScript library for building UIs.');
  });

  it('returns 400 when question is missing', async () => {
    const response = await request(app)
      .post('/api/cards')
      .send({ answer: 'Some answer' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when answer is empty string', async () => {
    const response = await request(app)
      .post('/api/cards')
      .send({ question: 'Some question', answer: '' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when question exceeds 500 characters', async () => {
    const response = await request(app)
      .post('/api/cards')
      .send({ question: 'Q'.repeat(501), answer: 'Some answer' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toMatch(/500 characters/);
  });
});

describe('DELETE /api/cards/:id', () => {
  let cardId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    const card = await Card.create({ question: 'Temp Q', answer: 'Temp A' });
    cardId = card.id;
  });

  it('returns 200 { ok: true } for an existing card', async () => {
    const response = await request(app).delete(`/api/cards/${cardId}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('returns 404 for an id that does not exist', async () => {
    const response = await request(app).delete('/api/cards/999999');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toBe('Card not found.');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test --workspace=server
```

Expected: FAIL — `POST /api/cards` returns 404 (route not defined yet).

- [ ] **Step 3: Add express.json(), POST /api/cards, and DELETE /api/cards/:id to server/src/app.js**

Replace the full contents of `server/src/app.js`:

```js
import express from 'express';
import { z } from 'zod';
import { Card, sequelize, seed } from './db.js';

const app = express();
app.use(express.json());

const CardSchema = z.object({
  question: z
    .string({ required_error: 'Question is required.' })
    .trim()
    .min(1, 'Question is required.')
    .max(500, 'Question must be 500 characters or fewer.'),
  answer: z
    .string({ required_error: 'Answer is required.' })
    .trim()
    .min(1, 'Answer is required.')
    .max(500, 'Answer must be 500 characters or fewer.'),
});

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

app.post('/api/cards', async (req, res) => {
  const result = CardSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.errors[0].message;
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });
  }
  try {
    const card = await Card.create(result.data);
    res.status(201).json({ id: card.id, question: card.question, answer: card.answer });
  } catch {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save card.' } });
  }
});

app.delete('/api/cards/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const card = await Card.findByPk(id);
    if (!card) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Card not found.' } });
    }
    await card.destroy();
    res.json({ ok: true });
  } catch {
    res
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete card.' } });
  }
});

// Only available in non-production for E2E test setup
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/test/reset', async (req, res) => {
    try {
      await sequelize.sync({ force: true });
      await seed();
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Reset failed.' } });
    }
  });
}

export default app;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test --workspace=server
```

Expected: PASS — all tests (ping + GET /api/cards × 3 + POST /api/cards × 4 + DELETE × 2).

- [ ] **Step 5: Commit**

```bash
git add server/src/app.js server/src/app.test.js
git commit -m "feat: add POST and DELETE /api/cards endpoints"
```

---

### Task 2: CardListItem component

**Files:**
- Create: `client/src/components/CardListItem.jsx`
- Create: `client/src/components/CardListItem.test.jsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `CardListItem` — props `{ card: { id: number, question: string, answer: string }, isSelected: bool, onToggle: fn }`. Renders a checkbox, question, and answer truncated at 60 chars. Clicking the row calls `onToggle`.

- [ ] **Step 1: Write the failing CardListItem tests**

Create `client/src/components/CardListItem.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CardListItem from './CardListItem.jsx';

const card = { id: 1, question: 'What is JSX?', answer: 'Short answer.' };
const longCard = { id: 2, question: 'Q', answer: 'A'.repeat(61) };

describe('CardListItem', () => {
  it('renders the question text', () => {
    render(<CardListItem card={card} isSelected={false} onToggle={vi.fn()} />);
    expect(screen.getByText('What is JSX?')).toBeInTheDocument();
  });

  it('renders the full answer when it is 60 characters or fewer', () => {
    render(<CardListItem card={card} isSelected={false} onToggle={vi.fn()} />);
    expect(screen.getByText('Short answer.')).toBeInTheDocument();
  });

  it('renders the answer truncated at 60 characters with an ellipsis when longer', () => {
    render(<CardListItem card={longCard} isSelected={false} onToggle={vi.fn()} />);
    expect(screen.getByText('A'.repeat(60) + '…')).toBeInTheDocument();
  });

  it('calls onToggle when the row is clicked', () => {
    const onToggle = vi.fn();
    render(<CardListItem card={card} isSelected={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('What is JSX?'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('reflects isSelected on the checkbox', () => {
    render(<CardListItem card={card} isSelected={true} onToggle={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test --workspace=client -- src/components/CardListItem.test.jsx
```

Expected: FAIL — `Cannot find module './CardListItem.jsx'`

- [ ] **Step 3: Create CardListItem.jsx**

Create `client/src/components/CardListItem.jsx`:

```jsx
import PropTypes from 'prop-types';

function CardListItem({ card, isSelected, onToggle }) {
  const truncatedAnswer =
    card.answer.length > 60 ? card.answer.slice(0, 60) + '…' : card.answer;

  return (
    <li onClick={onToggle} style={{ cursor: 'pointer', listStyle: 'none' }}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        onClick={e => e.stopPropagation()}
        aria-label={`Select card: ${card.question}`}
      />
      <span>{card.question}</span>
      <span>{truncatedAnswer}</span>
    </li>
  );
}

CardListItem.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.number.isRequired,
    question: PropTypes.string.isRequired,
    answer: PropTypes.string.isRequired,
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default CardListItem;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test --workspace=client -- src/components/CardListItem.test.jsx
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add client/src/components/CardListItem.jsx client/src/components/CardListItem.test.jsx
git commit -m "feat: add CardListItem component"
```

---

### Task 3: AddCardModal component

**Files:**
- Create: `client/src/components/AddCardModal.jsx`
- Create: `client/src/components/AddCardModal.test.jsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `AddCardModal` — props `{ isOpen: bool, onClose: fn, onSaved: fn }`. Controlled modal: renders nothing when `isOpen` is false. Contains a form with Question and Answer textareas. On success calls `onSaved()`. Escape key calls `onClose()`. Validates client-side before submitting.

- [ ] **Step 1: Write the failing AddCardModal tests**

Create `client/src/components/AddCardModal.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddCardModal from './AddCardModal.jsx';

describe('AddCardModal', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AddCardModal isOpen={false} onClose={vi.fn()} onSaved={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the form when isOpen is true', () => {
    render(<AddCardModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Question')).toBeInTheDocument();
    expect(screen.getByLabelText('Answer')).toBeInTheDocument();
  });

  it('shows a validation error when question is empty on submit', () => {
    render(<AddCardModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByText('Question is required.')).toBeInTheDocument();
  });

  it('shows a validation error when answer is empty on submit', () => {
    render(<AddCardModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'Some question' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByText('Answer is required.')).toBeInTheDocument();
  });

  it('calls onSaved after a successful POST', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true });
    const onSaved = vi.fn();
    render(<AddCardModal isOpen={true} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'Q' } });
    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('shows a submit error and keeps modal open on POST failure', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });
    render(<AddCardModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'Q' } });
    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() =>
      expect(
        screen.getByText('Failed to save card. Please try again.')
      ).toBeInTheDocument()
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<AddCardModal isOpen={true} onClose={onClose} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<AddCardModal isOpen={true} onClose={onClose} onSaved={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test --workspace=client -- src/components/AddCardModal.test.jsx
```

Expected: FAIL — `Cannot find module './AddCardModal.jsx'`

- [ ] **Step 3: Create AddCardModal.jsx**

Create `client/src/components/AddCardModal.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

function AddCardModal({ isOpen, onClose, onSaved }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef(null);

  // Reset form state each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setQuestion('');
      setAnswer('');
      setErrors({});
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Close on Escape; trap focus inside the modal
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, textarea, input, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function validate() {
    const newErrors = {};
    if (!question.trim()) {
      newErrors.question = 'Question is required.';
    } else if (question.length > 500) {
      newErrors.question = 'Question must be 500 characters or fewer.';
    }
    if (!answer.trim()) {
      newErrors.answer = 'Answer is required.';
    } else if (answer.length > 500) {
      newErrors.answer = 'Answer must be 500 characters or fewer.';
    }
    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer }),
      });
      if (!res.ok) throw new Error('Server error');
      onSaved();
    } catch {
      setSubmitError('Failed to save card. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Add card" ref={dialogRef}>
      <h2>Add Card</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="question">Question</label>
          <textarea
            id="question"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            autoFocus
          />
          {errors.question && <p role="alert">{errors.question}</p>}
        </div>
        <div>
          <label htmlFor="answer">Answer</label>
          <textarea
            id="answer"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
          />
          {errors.answer && <p role="alert">{errors.answer}</p>}
        </div>
        {submitError && <p role="alert">{submitError}</p>}
        <button type="submit" disabled={isSubmitting}>Save</button>
        <button type="button" onClick={onClose}>Cancel</button>
      </form>
    </div>
  );
}

AddCardModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

export default AddCardModal;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test --workspace=client -- src/components/AddCardModal.test.jsx
```

Expected: PASS — 8 tests

- [ ] **Step 5: Commit**

```bash
git add client/src/components/AddCardModal.jsx client/src/components/AddCardModal.test.jsx
git commit -m "feat: add AddCardModal component"
```

---

### Task 4: AdminPage component

**Files:**
- Create: `client/src/components/AdminPage.jsx`
- Create: `client/src/components/AdminPage.test.jsx`

**Interfaces:**
- Consumes:
  - `CardListItem` from `./CardListItem.jsx` — props `{ card, isSelected: bool, onToggle: fn }`
  - `AddCardModal` from `./AddCardModal.jsx` — props `{ isOpen: bool, onClose: fn, onSaved: fn }`
- Produces: `AdminPage` — props `{ cards: Array<{ id: number, question: string, answer: string }>, onCardsChanged: fn }`. Renders the card list with checkboxes, a "Select all" checkbox, a "Delete Selected" button (disabled when nothing checked), and an "Add Card" button that opens the modal.

- [ ] **Step 1: Write the failing AdminPage tests**

Create `client/src/components/AdminPage.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPage from './AdminPage.jsx';

const cards = [
  { id: 1, question: 'Q1', answer: 'A1' },
  { id: 2, question: 'Q2', answer: 'A2' },
];

describe('AdminPage', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a row for each card', () => {
    render(<AdminPage cards={cards} onCardsChanged={vi.fn()} />);
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Q2')).toBeInTheDocument();
  });

  it('"Delete Selected" is disabled when no cards are checked', () => {
    render(<AdminPage cards={cards} onCardsChanged={vi.fn()} />);
    expect(screen.getByRole('button', { name: /delete selected/i })).toBeDisabled();
  });

  it('"Delete Selected" is enabled after a card is checked', () => {
    render(<AdminPage cards={cards} onCardsChanged={vi.fn()} />);
    fireEvent.click(screen.getByText('Q1'));
    expect(screen.getByRole('button', { name: /delete selected/i })).not.toBeDisabled();
  });

  it('calls onCardsChanged after successful deletion', async () => {
    global.fetch.mockResolvedValue({ ok: true });
    const onCardsChanged = vi.fn();
    render(<AdminPage cards={cards} onCardsChanged={onCardsChanged} />);
    fireEvent.click(screen.getByText('Q1'));
    fireEvent.click(screen.getByRole('button', { name: /delete selected/i }));
    await waitFor(() => expect(onCardsChanged).toHaveBeenCalledTimes(1));
  });

  it('shows an error banner when a delete request fails', async () => {
    global.fetch.mockResolvedValue({ ok: false });
    render(<AdminPage cards={cards} onCardsChanged={vi.fn()} />);
    fireEvent.click(screen.getByText('Q1'));
    fireEvent.click(screen.getByRole('button', { name: /delete selected/i }));
    await waitFor(() =>
      expect(screen.getByText(/could not be deleted/i)).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test --workspace=client -- src/components/AdminPage.test.jsx
```

Expected: FAIL — `Cannot find module './AdminPage.jsx'`

- [ ] **Step 3: Create AdminPage.jsx**

Create `client/src/components/AdminPage.jsx`:

```jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import CardListItem from './CardListItem.jsx';
import AddCardModal from './AddCardModal.jsx';

function AdminPage({ cards, onCardsChanged }) {
  const [selected, setSelected] = useState(new Set());
  const [deleteError, setDeleteError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const allSelected = cards.length > 0 && selected.size === cards.length;

  function handleToggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(cards.map(c => c.id)));
    }
  }

  async function handleDeleteSelected() {
    const ids = [...selected];
    let failures = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' });
        if (!res.ok) failures++;
      } catch {
        failures++;
      }
    }
    setSelected(new Set());
    onCardsChanged();
    if (failures > 0) {
      setDeleteError(`${failures} card(s) could not be deleted. Please try again.`);
    } else {
      setDeleteError(null);
    }
  }

  return (
    <div>
      <h2>Admin</h2>
      {deleteError && <p role="alert">{deleteError}</p>}
      <button onClick={() => setIsModalOpen(true)}>Add Card</button>
      <button
        onClick={handleDeleteSelected}
        disabled={selected.size === 0}
      >
        Delete Selected
      </button>
      <ul style={{ padding: 0 }}>
        <li style={{ listStyle: 'none' }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            aria-label="Select all cards"
          />
          <span>Select all</span>
        </li>
        {cards.map(card => (
          <CardListItem
            key={card.id}
            card={card}
            isSelected={selected.has(card.id)}
            onToggle={() => handleToggle(card.id)}
          />
        ))}
      </ul>
      <AddCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          setIsModalOpen(false);
          onCardsChanged();
        }}
      />
    </div>
  );
}

AdminPage.propTypes = {
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      question: PropTypes.string.isRequired,
      answer: PropTypes.string.isRequired,
    })
  ).isRequired,
  onCardsChanged: PropTypes.func.isRequired,
};

export default AdminPage;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test --workspace=client -- src/components/AdminPage.test.jsx
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add client/src/components/AdminPage.jsx client/src/components/AdminPage.test.jsx
git commit -m "feat: add AdminPage component"
```

---

### Task 5: App integration

**Files:**
- Modify: `client/src/App.jsx`
- Modify: `client/src/App.test.jsx`

**Interfaces:**
- Consumes: `AdminPage` from `./components/AdminPage.jsx` — props `{ cards: Array<Card>, onCardsChanged: fn }`
- Produces: Updated `App` with:
  - `view` state: `'study'` | `'admin'`, default `'study'`
  - `cards` state: full fetched card list (separate from `activeCards` which narrows during missed-card study)
  - `handleCardsChanged()`: re-fetches via `fetchCards()`, resets `sessionKey`
  - Toggle button: label `"Admin"` when `view === 'study'`, `"Study"` when `view === 'admin'`
  - `AdminPage` rendered when `view === 'admin'`; also shown in `'empty'` status so user can add cards

- [ ] **Step 1: Write the failing App tests**

Add the following tests to `client/src/App.test.jsx` (after the existing `afterEach` and tests, inside the existing `describe('App', ...)` block):

```jsx
  it('renders an "Admin" toggle button when cards are loaded', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCards),
    });
    render(<App />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /admin/i })).toBeInTheDocument()
    );
  });

  it('switches to admin view when the toggle button is clicked', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCards),
    });
    render(<App />);
    await waitFor(() => screen.getByRole('button', { name: /admin/i }));
    fireEvent.click(screen.getByRole('button', { name: /admin/i }));
    expect(screen.getByRole('button', { name: /add card/i })).toBeInTheDocument();
  });

  it('switches back to study view when the toggle is clicked again', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCards),
    });
    render(<App />);
    await waitFor(() => screen.getByRole('button', { name: /admin/i }));
    fireEvent.click(screen.getByRole('button', { name: /admin/i }));
    fireEvent.click(screen.getByRole('button', { name: /study/i }));
    await waitFor(() =>
      expect(screen.getByText('What is JSX?')).toBeInTheDocument()
    );
  });
```

Also add `fireEvent` to the `@testing-library/react` import at the top of `App.test.jsx`:

```jsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test --workspace=client -- src/App.test.jsx
```

Expected: FAIL — tests that query for the "Admin" toggle button will fail since it doesn't exist yet.

- [ ] **Step 3: Update App.jsx**

Replace the full contents of `client/src/App.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react';
import StudySession from './components/StudySession.jsx';
import AdminPage from './components/AdminPage.jsx';

function App() {
  const [status, setStatus] = useState('loading');
  const [cards, setCards] = useState([]);
  const [activeCards, setActiveCards] = useState([]);
  const [sessionKey, setSessionKey] = useState(0);
  const [view, setView] = useState('study');

  const fetchCards = useCallback(() => {
    fetch('/api/cards')
      .then(res => {
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then(data => {
        if (data.length === 0) {
          setStatus('empty');
        } else {
          setCards(data);
          setActiveCards(data);
          setStatus('ready');
        }
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  function handleStudyMissed(missedCards) {
    setActiveCards(missedCards);
    setSessionKey(k => k + 1);
  }

  function handleDone() {
    setStatus('done');
  }

  function handleCardsChanged() {
    setSessionKey(k => k + 1);
    fetchCards();
  }

  function toggleView() {
    setView(v => (v === 'study' ? 'admin' : 'study'));
  }

  if (status === 'loading') {
    return <main><p>Loading...</p></main>;
  }

  if (status === 'error') {
    return <main><p>Failed to load cards. Please try again.</p></main>;
  }

  if (status === 'done') {
    return <main><h1>Flashcard App</h1><p>Good work!</p></main>;
  }

  if (status === 'empty') {
    return (
      <main>
        <h1>Flashcard App</h1>
        <button onClick={toggleView}>{view === 'study' ? 'Admin' : 'Study'}</button>
        {view === 'admin' ? (
          <AdminPage cards={cards} onCardsChanged={handleCardsChanged} />
        ) : (
          <p>No cards found.</p>
        )}
      </main>
    );
  }

  return (
    <main>
      <h1>Flashcard App</h1>
      <button onClick={toggleView}>{view === 'study' ? 'Admin' : 'Study'}</button>
      {view === 'admin' ? (
        <AdminPage cards={cards} onCardsChanged={handleCardsChanged} />
      ) : (
        <StudySession
          key={sessionKey}
          cards={activeCards}
          onStudyMissed={handleStudyMissed}
          onDone={handleDone}
        />
      )}
    </main>
  );
}

export default App;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test --workspace=client -- src/App.test.jsx
```

Expected: PASS — all 8 tests (5 existing + 3 new)

- [ ] **Step 5: Run the full client suite to confirm no regressions**

```bash
npm run test --workspace=client
```

Expected: PASS — all tests

- [ ] **Step 6: Commit**

```bash
git add client/src/App.jsx client/src/App.test.jsx
git commit -m "feat: integrate AdminPage into App with view toggle"
```

---

### Task 6: E2E tests

**Files:**
- Create: `e2e/admin.spec.js`

**Interfaces:**
- Consumes: Running dev server with `POST /api/test/reset` endpoint (added in previous flashcard study plan). Seed data: 3 cards — "What is JSX?", "What does useState return?", "What is a React prop?".
- Toggle button: `role="button"` with name matching `/admin/i` or `/study/i`.
- "Add Card" button in AdminPage; "Save" / "Cancel" buttons in modal.
- Card checkboxes: `aria-label="Select card: <question>"`.
- "Delete Selected" button.

- [ ] **Step 1: Write the E2E tests**

Create `e2e/admin.spec.js`:

```js
import { test, expect } from '@playwright/test';

test.describe('admin page', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3001/api/test/reset');
  });

  test('toggles to admin view showing the card list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /admin/i }).click();
    await expect(page.getByRole('button', { name: /add card/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /delete selected/i })).toBeVisible();
  });

  test('toggles from admin back to study view', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /admin/i }).click();
    await page.getByRole('button', { name: /study/i }).click();
    await expect(page.getByRole('button', { name: /flip card/i })).toBeVisible();
  });

  test('adds a card via the modal and it appears in the list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /admin/i }).click();
    await page.getByRole('button', { name: /add card/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Question').fill('What is Vite?');
    await page.getByLabel('Answer').fill('A fast frontend build tool.');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText('What is Vite?')).toBeVisible();
  });

  test('selects a card and deletes it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /admin/i }).click();
    await page.getByLabel(/select card: What is JSX\?/i).check();
    await page.getByRole('button', { name: /delete selected/i }).click();
    await expect(page.getByText('What is JSX?')).not.toBeVisible();
  });

  test('adds a card then studies it in study mode', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /admin/i }).click();
    await page.getByRole('button', { name: /add card/i }).click();
    await page.getByLabel('Question').fill('What is Vite?');
    await page.getByLabel('Answer').fill('A fast frontend build tool.');
    await page.getByRole('button', { name: /save/i }).click();
    await page.getByRole('button', { name: /study/i }).click();
    // Deck now has 4 cards
    await expect(page.getByText(/\/ 4/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the E2E tests**

```bash
npm run test:e2e
```

Expected: PASS — 11 tests total (5 new admin tests + 6 existing study-flow tests)

- [ ] **Step 3: Commit**

```bash
git add e2e/admin.spec.js
git commit -m "test: add E2E tests for admin page"
```
