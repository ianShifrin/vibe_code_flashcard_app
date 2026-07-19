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
});
