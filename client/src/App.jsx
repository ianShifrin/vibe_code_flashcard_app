import { useState, useEffect } from 'react';
import StudySession from './components/StudySession.jsx';

function App() {
  const [status, setStatus] = useState('loading');
  const [activeCards, setActiveCards] = useState([]);
  // Incrementing this key forces StudySession to remount when studying missed cards
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    fetch('/api/cards')
      .then(res => {
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then(data => {
        if (data.length === 0) {
          setStatus('empty');
        } else {
          setActiveCards(data);
          setStatus('ready');
        }
      })
      .catch(() => setStatus('error'));
  }, []);

  function handleStudyMissed(missedCards) {
    setActiveCards(missedCards);
    setSessionKey(k => k + 1);
  }

  function handleDone() {
    setStatus('done');
  }

  if (status === 'loading') {
    return <main><p>Loading...</p></main>;
  }

  if (status === 'error') {
    return <main><p>Failed to load cards. Please try again.</p></main>;
  }

  if (status === 'empty') {
    return <main><p>No cards found.</p></main>;
  }

  if (status === 'done') {
    return <main><h1>Flashcard App</h1><p>Good work!</p></main>;
  }

  return (
    <main>
      <h1>Flashcard App</h1>
      <StudySession
        key={sessionKey}
        cards={activeCards}
        onStudyMissed={handleStudyMissed}
        onDone={handleDone}
      />
    </main>
  );
}

export default App;
