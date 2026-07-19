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

describe('POST /api/cards', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await seed();
  });

  it('returns 201 with the created card', async () => {
    const response = await request(app)
      .post('/api/cards')
      .send({ question: 'What is React?', answer: 'A JavaScript library for building UIs.' });
    expect(response.status).toBe(201);
    expect(typeof response.body.id).toBe('number');
    expect(response.body.question).toBe('What is React?');
    expect(response.body.answer).toBe('A JavaScript library for building UIs.');
  });

  it('returns 400 when question is missing', async () => {
    const response = await request(app)
      .post('/api/cards')
      .send({ answer: 'Some answer' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when answer is empty string', async () => {
    const response = await request(app)
      .post('/api/cards')
      .send({ question: 'Some question', answer: '' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when question exceeds 500 characters', async () => {
    const response = await request(app)
      .post('/api/cards')
      .send({ question: 'Q'.repeat(501), answer: 'Some answer' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toMatch(/500 characters/);
  });
});

describe('DELETE /api/cards/:id', () => {
  let cardId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    const card = await Card.create({ question: 'Temp Q', answer: 'Temp A' });
    cardId = card.id;
  });

  it('returns 200 { ok: true } for an existing card', async () => {
    const response = await request(app).delete(`/api/cards/${cardId}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('returns 404 for an id that does not exist', async () => {
    const response = await request(app).delete('/api/cards/999999');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toBe('Card not found.');
  });
});
