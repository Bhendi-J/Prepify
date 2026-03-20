import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';
import NoteCard from '../components/NoteCard';

function MyNotesPage() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useContext(AuthContext);

  const fetchNotes = async () => {
    try {
      setError('');
      setIsLoading(true);
      const response = await apiClient.get('/api/notes');
      setNotes(response.data);
    } catch (err) {
      setError('Failed to fetch your study notes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  if (!currentUser) {
    return <h2 style={{textAlign: 'center', marginTop: '4rem'}}>Please log in to view your notes.</h2>;
  }

  return (
    <div style={{animation: 'fadeIn 0.5s ease'}}>
      <div style={{marginBottom: '2rem'}}>
        <h1 style={{fontSize: '2.2rem', marginBottom: '0.5rem'}}>My Notes</h1>
        <p style={{color: 'var(--text-secondary)', fontSize: '1.05rem', margin: 0}}>Your personal library of summarized knowledge.</p>
      </div>

      {isLoading && <p style={{color: 'var(--text-secondary)'}}>Loading your premium notes...</p>}
      {error && <div className="error-msg">{error}</div>}

      {!isLoading && notes.length === 0 && (
        <div className="glass-panel" style={{textAlign: 'center', padding: '4rem 2rem', marginTop: '2rem'}}>
          <h3 style={{marginBottom: '0.5rem'}}>Your library is empty</h3>
          <p style={{color: 'var(--text-secondary)'}}>Upload a document from the Home page to start building your knowledge base!</p>
        </div>
      )}

      <div className="notes-grid">
        {notes.map(note => (
          <NoteCard key={note.id} note={note} onRefresh={fetchNotes} />
        ))}
      </div>
    </div>
  );
}

export default MyNotesPage;
