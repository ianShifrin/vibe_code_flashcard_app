import express from 'express';
import { Card, sequelize, seed } from './db.js';

const app = express();

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.get('/api/cards', async (req, res) => {
  try {
    const cards = await Card.findAll({
      attributes: ['id', 'question', 'answer'],
      order: [['id', 'ASC']],
    });
    res.json(cards);
  } catch {
    res
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load cards.' } });
  }
});

// Only available in non-production for E2E test setup
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/test/reset', async (req, res) => {
    try {
      await sequelize.sync({ force: true });
      await seed();
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Reset failed.' } });
    }
  });
}

export default app;
