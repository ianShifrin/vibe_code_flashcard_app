import app from './app.js';
import { sequelize, Card, seed } from './db.js';

const PORT = 3001;

async function start() {
  await sequelize.sync();

  // Seed sample cards if none exist (development only)
  if (process.env.NODE_ENV !== 'production') {
    const count = await Card.count();
    if (count === 0) {
      await seed();
    }
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start();
