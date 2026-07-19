import { useState, useEffect, useCallback } from 'react';
import StudySession from './components/StudySession.jsx';
import AdminPage from './components/AdminPage.jsx';

function App() {
  const [status, setStatus] = useState('loading');
  const [cards, setCards] = useState([]);
  const [activeCards, setActiveCards] = useState([]);
  const [sessionKey, setSessionKey] = useState(0);
  const [view, setView] = useState('study');

  const fetchCards = useCallback(() => {
    fetch('/api/cards')
      .then(res => {
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then(data => {
        setCards(data);
        if (data.length === 0) {
          setStatus('empty');
        } else {
          setActiveCards(data);
          setStatus('ready');
        }
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  function handleStudyMissed(missedCards) {
    setActiveCards(missedCards);
    setSessionKey(k => k + 1);
  }

  function handleDone() {
    setStatus('done');
  }

  function handleCardsChanged() {
    setSessionKey(k => k + 1);
    fetchCards();
  }

  function toggleView() {
    setView(v => (v === 'study' ? 'admin' : 'study'));
  }

  if (status === 'loading') {
    return <main><p>Loading...</p></main>;
  }

  if (status === 'error') {
    return <main><p>Failed to load cards. Please try again.</p></main>;
  }

  if (status === 'done') {
    return <main><h1>Flashcard App</h1><p>Good work!</p></main>;
  }

  if (status === 'empty') {
    return (
      <main>
        <h1>Flashcard App</h1>
        <button onClick={toggleView}>{view === 'study' ? 'Admin' : 'Study'}</button>
        {view === 'admin' ? (
          <AdminPage cards={cards} onCardsChanged={handleCardsChanged} />
        ) : (
          <p>No cards found.</p>
        )}
      </main>
    );
  }

  return (
    <main>
      <h1>Flashcard App</h1>
      <button onClick={toggleView}>{view === 'study' ? 'Admin' : 'Study'}</button>
      {view === 'admin' ? (
        <AdminPage cards={cards} onCardsChanged={handleCardsChanged} />
      ) : (
        <StudySession
          key={sessionKey}
          cards={activeCards}
          onStudyMissed={handleStudyMissed}
          onDone={handleDone}
        />
      )}
    </main>
  );
}

export default App;
