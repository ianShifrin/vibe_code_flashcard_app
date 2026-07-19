import PropTypes from 'prop-types';

function SessionSummary({ total, correct, missedCards, onStudyMissed, onDone }) {
  return (
    <div>
      <h2>Session Complete</h2>
      <p>You got {correct} out of {total} correct.</p>
      {missedCards.length > 0 && (
        <button onClick={() => onStudyMissed(missedCards)}>
          Study Missed Cards
        </button>
      )}
      <button onClick={onDone}>Done</button>
    </div>
  );
}

SessionSummary.propTypes = {
  total: PropTypes.number.isRequired,
  correct: PropTypes.number.isRequired,
  missedCards: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      question: PropTypes.string.isRequired,
      answer: PropTypes.string.isRequired,
    })
  ).isRequired,
  onStudyMissed: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default SessionSummary;
