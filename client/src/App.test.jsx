import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App', () => {
  it('renders the app heading', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /flashcard app/i })).toBeInTheDocument();
  });
});
