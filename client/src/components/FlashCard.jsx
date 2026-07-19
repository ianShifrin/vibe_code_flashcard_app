import PropTypes from 'prop-types';
import './FlashCard.css';

function FlashCard({ question, answer, isFlipped, onFlip }) {
  return (
    <div
      className="flashcard"
      onClick={onFlip}
      role="button"
      aria-label="Flip card"
    >
      <div className={`flashcard__inner${isFlipped ? ' flashcard__inner--flipped' : ''}`}>
        <div className="flashcard__face flashcard__face--front">
          <p>{question}</p>
        </div>
        <div className="flashcard__face flashcard__face--back">
          <p>{answer}</p>
        </div>
      </div>
    </div>
  );
}

FlashCard.propTypes = {
  question: PropTypes.string.isRequired,
  answer: PropTypes.string.isRequired,
  isFlipped: PropTypes.bool.isRequired,
  onFlip: PropTypes.func.isRequired,
};

export default FlashCard;
