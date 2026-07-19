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
