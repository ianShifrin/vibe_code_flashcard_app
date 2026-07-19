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

  it('resets the form when the modal re-opens', () => {
    const { rerender } = render(
      <AddCardModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />
    );
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'Old text' } });
    rerender(<AddCardModal isOpen={false} onClose={vi.fn()} onSaved={vi.fn()} />);
    rerender(<AddCardModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByLabelText('Question')).toHaveValue('');
  });

  it('shows a validation error when question exceeds 500 characters', () => {
    render(<AddCardModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Question'), {
      target: { value: 'Q'.repeat(501) },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByText('Question must be 500 characters or fewer.')).toBeInTheDocument();
  });
});
