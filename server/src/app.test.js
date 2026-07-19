import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './app.js';

describe('GET /api/ping', () => {
  it('responds with a pong message', async () => {
    const response = await request(app).get('/api/ping');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'pong' });
  });
});
