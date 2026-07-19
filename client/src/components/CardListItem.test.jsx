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
