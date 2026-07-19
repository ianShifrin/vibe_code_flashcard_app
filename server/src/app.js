import express from 'express';

const app = express();

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

export default app;
