import { Sequelize, DataTypes } from 'sequelize';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve to server/flashcards.db in production, :memory: in tests
const storage =
  process.env.NODE_ENV === 'test'
    ? ':memory:'
    : join(__dirname, '../flashcards.db');

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false,
});

export const Card = sequelize.define('Card', {
  question: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true },
  },
  answer: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true },
  },
});

export async function seed() {
  await Card.bulkCreate([
    {
      question: 'What is JSX?',
      answer: 'A syntax extension for JavaScript used with React.',
    },
    {
      question: 'What does useState return?',
      answer: 'An array with the current state value and a setter function.',
    },
    {
      question: 'What is a React prop?',
      answer: 'Data passed from a parent component to a child component.',
    },
  ]);
}
