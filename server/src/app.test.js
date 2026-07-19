import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from './app.js';
import { sequelize, seed, Card } from './db.js';

describe('GET /api/ping', () => {
  it('responds with a pong message', async () => {
    const response = await request(app).get('/api/ping');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'pong' });
  });
});

describe('GET /api/cards', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await seed();
  });

  it('returns 200 with an array of cards', async () => {
    const response = await request(app).get('/api/cards');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('each card has id, question, and answer fields', async () => {
    const response = await request(app).get('/api/cards');
    const card = response.body[0];
    expect(typeof card.id).toBe('number');
    expect(typeof card.question).toBe('string');
    expect(typeof card.answer).toBe('string');
  });
});

describe('GET /api/cards (error path)', () => {
  it('returns 500 with error envelope when findAll throws', async () => {
    vi.spyOn(Card, 'findAll').mockRejectedValueOnce(new Error('DB failure'));
    const response = await request(app).get('/api/cards');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load cards.' },
    });
  });
});
