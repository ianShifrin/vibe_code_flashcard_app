import { describe, it, expect } from 'vitest';
import shuffle from './shuffle.js';

describe('shuffle', () => {
  it('returns an array with the same length as the input', () => {
    const input = [1, 2, 3, 4, 5];
    expect(shuffle(input)).toHaveLength(5);
  });

  it('returns an array containing the same elements as the input', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it('returns a new array instance, not the same reference', () => {
    const input = [1, 2, 3];
    expect(shuffle(input)).not.toBe(input);
  });

  it('handles an empty array', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('handles a single-element array', () => {
    expect(shuffle([1])).toEqual([1]);
  });
});
