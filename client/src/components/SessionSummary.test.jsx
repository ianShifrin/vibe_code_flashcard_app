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
