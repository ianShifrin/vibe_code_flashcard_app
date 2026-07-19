import express from 'express';
import { z } from 'zod';
import { Card, sequelize, seed } from './db.js';

const app = express();
app.use(express.json());

const CardSchema = z.object({
  question: z
    .string({ required_error: 'Question is required.' })
    .trim()
    .min(1, 'Question is required.')
    .max(500, 'Question must be 500 characters or fewer.'),
  answer: z
    .string({ required_error: 'Answer is required.' })
    .trim()
    .min(1, 'Answer is required.')
    .max(500, 'Answer must be 500 characters or fewer.'),
});

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

app.post('/api/cards', async (req, res) => {
  const result = CardSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues[0].message;
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });
  }
  try {
    const card = await Card.create(result.data);
    res.status(201).json({ id: card.id, question: card.question, answer: card.answer });
  } catch {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save card.' } });
  }
});

app.delete('/api/cards/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const card = await Card.findByPk(id);
    if (!card) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Card not found.' } });
    }
    await card.destroy();
    res.json({ ok: true });
  } catch {
    res
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete card.' } });
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
