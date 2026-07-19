import express from 'express';
import { Card } from './db.js';

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

export default app;
