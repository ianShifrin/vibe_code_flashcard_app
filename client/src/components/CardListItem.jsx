import PropTypes from 'prop-types';

function CardListItem({ card, isSelected, onToggle }) {
  const truncatedAnswer =
    card.answer.length > 60 ? card.answer.slice(0, 60) + '…' : card.answer;

  return (
    <li onClick={onToggle} style={{ cursor: 'pointer', listStyle: 'none' }}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        onClick={e => e.stopPropagation()}
        aria-label={`Select card: ${card.question}`}
      />
      <span>{card.question}</span>
      <span>{truncatedAnswer}</span>
    </li>
  );
}

CardListItem.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.number.isRequired,
    question: PropTypes.string.isRequired,
    answer: PropTypes.string.isRequired,
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default CardListItem;
