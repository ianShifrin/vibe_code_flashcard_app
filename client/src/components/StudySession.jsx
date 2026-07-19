import { useState } from 'react';
import PropTypes from 'prop-types';
import FlashCard from './FlashCard.jsx';
import SessionSummary from './SessionSummary.jsx';

function StudySession({ cards, onStudyMissed, onDone }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [graded, setGraded] = useState([]);
  const [phase, setPhase] = useState('studying');

  function handleFlip() {
    setIsFlipped(true);
  }

  function handleGrade(result) {
    const newGraded = [...graded, result];
    const nextIndex = currentIndex + 1;

    if (nextIndex >= cards.length) {
      setGraded(newGraded);
      setPhase('summary');
    } else {
      setGraded(newGraded);
      setCurrentIndex(nextIndex);
      setIsFlipped(false);
    }
  }

  if (phase === 'summary') {
    const correct = graded.filter(r => r === 'correct').length;
    const missedCards = cards.filter((_, i) => graded[i] === 'missed');
    return (
      <SessionSummary
        total={cards.length}
        correct={correct}
        missedCards={missedCards}
        onStudyMissed={onStudyMissed}
        onDone={onDone}
      />
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div>
      <p>{currentIndex + 1} / {cards.length}</p>
      <FlashCard
        question={currentCard.question}
        answer={currentCard.answer}
        isFlipped={isFlipped}
        onFlip={handleFlip}
      />
      {isFlipped && (
        <div>
          <button onClick={() => handleGrade('correct')}>Got it</button>
          <button onClick={() => handleGrade('missed')}>Missed it</button>
        </div>
      )}
    </div>
  );
}

StudySession.propTypes = {
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      question: PropTypes.string.isRequired,
      answer: PropTypes.string.isRequired,
    })
  ).isRequired,
  onStudyMissed: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default StudySession;
