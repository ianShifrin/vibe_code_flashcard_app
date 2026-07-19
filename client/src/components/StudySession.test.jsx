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
