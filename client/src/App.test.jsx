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
});
