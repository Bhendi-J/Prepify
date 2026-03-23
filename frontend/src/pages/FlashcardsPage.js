import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';
import './FlashcardsPage.css';

function FlashcardCard({ fc }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className={`fc-card ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
      <div className="fc-card-inner">
        <div className="fc-card-front">
          <span className="fc-label">Question</span>
          <span className="fc-question">{fc.question}</span>
        </div>
        <div className="fc-card-back">
          <span className="fc-label">Answer</span>
          <span className="fc-answer">{fc.answer}</span>
        </div>
      </div>
    </div>
  );
}

function FlashcardsPage() {
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        setError('');
        setIsLoading(true);
        const response = await apiClient.get('/api/flashcards');
        setFlashcardSets(response.data);
      } catch (err) {
        setError('Failed to fetch your flashcards.');
      } finally {
        setIsLoading(false);
      }
    };
    if (currentUser) fetchFlashcards();
  }, [currentUser]);

  if (!currentUser) {
    return <h2 style={{textAlign: 'center', marginTop: '4rem'}}>Please log in to view your flashcards.</h2>;
  }

  return (
    <div className="fc-page">
      <div className="fc-header">
        <h1>My Flashcards</h1>
        <p>Master your knowledge with active recall. Click a card to flip it.</p>
      </div>

      {isLoading && <p style={{color: 'var(--text-secondary)'}}>Loading flashcards...</p>}
      {error && <div className="error-msg">{error}</div>}

      {!isLoading && flashcardSets.length === 0 && (
        <div className="glass-panel fc-empty">
          <h3>No flashcards yet</h3>
          <p>Go to My Notes and click "Generate Flashcards" on any note to create a set!</p>
        </div>
      )}

      {flashcardSets.map(set => (
        <div key={set.id} className="fc-set">
          <div className="fc-set-header">
            <h3 className="fc-set-title">{set.title}</h3>
            <span className="fc-set-meta">{set.content ? set.content.length : 0} cards · {new Date(set.date_posted).toLocaleDateString()}</span>
          </div>
          <div className="fc-grid">
            {set.content && set.content.map((fc, idx) => (
              <FlashcardCard key={idx} fc={fc} />
            ))}
          </div>
          <p className="fc-hint">💡 Click any card to reveal the answer</p>
        </div>
      ))}
    </div>
  );
}

export default FlashcardsPage;
