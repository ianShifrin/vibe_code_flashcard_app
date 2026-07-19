import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

  it('restarts with the full deck after "Go Again" is clicked following a "Study Missed Cards" round', async () => {
    // This test verifies that handleGoAgain() shuffles the FULL cards deck,
    // not just activeCards (which shrinks to missed-only after Study Missed Cards).
    // If handleGoAgain incorrectly used shuffle(activeCards), the counter would show "1 / 2" instead of "1 / 5".
    const fiveCards = [
      { id: 1, question: 'Q1', answer: 'A1' },
      { id: 2, question: 'Q2', answer: 'A2' },
      { id: 3, question: 'Q3', answer: 'A3' },
      { id: 4, question: 'Q4', answer: 'A4' },
      { id: 5, question: 'Q5', answer: 'A5' },
    ];
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fiveCards),
    });
    render(<App />);
    await waitFor(() => screen.getByText('Q1'));

    // Grade all five cards: miss cards at indices 1 and 3 (Q2 and Q4)
    // Card 1 — correct
    fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));

    // Card 2 — missed
    fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
    fireEvent.click(screen.getByRole('button', { name: /missed it/i }));

    // Card 3 — correct
    fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));

    // Card 4 — missed
    fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
    fireEvent.click(screen.getByRole('button', { name: /missed it/i }));

    // Card 5 — correct
    fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));

    // Summary: 3 out of 5 correct
    expect(screen.getByText('You got 3 out of 5 correct.')).toBeInTheDocument();

    // Click "Study Missed Cards" — activeCards shrinks to 2-card missed subset
    fireEvent.click(screen.getByRole('button', { name: /study missed cards/i }));

    // Verify we're in missed-cards round: 1 / 2 (not 1 / 5)
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    // Grade both missed cards
    fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));

    fireEvent.click(screen.getByRole('button', { name: /flip card/i }));
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));

    // Missed-cards round summary: 2 out of 2
    expect(screen.getByText('You got 2 out of 2 correct.')).toBeInTheDocument();

    // Click "Go Again" — must shuffle FULL 5-card deck, not just the 2-card missed subset
    fireEvent.click(screen.getByRole('button', { name: /go again/i }));

    // KEY ASSERTION: Back to full deck (1 / 5), not missed subset (1 / 2)
    // This fails if handleGoAgain incorrectly uses shuffle(activeCards)
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
  });
});
