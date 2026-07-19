import { useState } from 'react';
import PropTypes from 'prop-types';
import CardListItem from './CardListItem.jsx';
import AddCardModal from './AddCardModal.jsx';

function AdminPage({ cards, onCardsChanged }) {
  const [selected, setSelected] = useState(new Set());
  const [deleteError, setDeleteError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const allSelected = cards.length > 0 && selected.size === cards.length;

  function handleToggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(cards.map(c => c.id)));
    }
  }

  async function handleDeleteSelected() {
    const ids = [...selected];
    let failures = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' });
        if (!res.ok) failures++;
      } catch {
        failures++;
      }
    }
    setSelected(new Set());
    onCardsChanged();
    if (failures > 0) {
      setDeleteError(`${failures} card(s) could not be deleted. Please try again.`);
    } else {
      setDeleteError(null);
    }
  }

  return (
    <div>
      <h2>Admin</h2>
      {deleteError && <p role="alert">{deleteError}</p>}
      <button onClick={() => setIsModalOpen(true)}>Add Card</button>
      <button
        onClick={handleDeleteSelected}
        disabled={selected.size === 0}
      >
        Delete Selected
      </button>
      <ul style={{ padding: 0 }}>
        <li style={{ listStyle: 'none' }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            aria-label="Select all cards"
          />
          <span>Select all</span>
        </li>
        {cards.map(card => (
          <CardListItem
            key={card.id}
            card={card}
            isSelected={selected.has(card.id)}
            onToggle={() => handleToggle(card.id)}
          />
        ))}
      </ul>
      <AddCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          setIsModalOpen(false);
          onCardsChanged();
        }}
      />
    </div>
  );
}

AdminPage.propTypes = {
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      question: PropTypes.string.isRequired,
      answer: PropTypes.string.isRequired,
    })
  ).isRequired,
  onCardsChanged: PropTypes.func.isRequired,
};

export default AdminPage;
