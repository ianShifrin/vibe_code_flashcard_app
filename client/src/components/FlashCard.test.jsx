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
