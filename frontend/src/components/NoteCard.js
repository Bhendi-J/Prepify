import React, { useState } from 'react';
import apiClient from '../api/axiosConfig';

function NoteCard({ note, onRefresh }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const formattedDate = new Date(note.date_posted).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await apiClient.delete(`/api/notes/${note.id}`);
      onRefresh(); // Trigger parent MyNotesPage.js to reload the notes instantly
    } catch (error) {
      console.error("Failed to delete note:", error);
      alert("Failed to delete the note. Please try again.");
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="note-card glass-panel">
      
      <div className="note-header">
        <h3 className="note-title">{note.filename}</h3>
        <span className="note-date">{formattedDate}</span>
      </div>

      {isExpanded && (
        <div className="text-content-wrapper" style={{marginBottom: '1.5rem', marginTop: '0.5rem'}}>
          {note.original_content || 'No content to display.'}
        </div>
      )}

      <div style={{flexGrow: 1}}></div>

      <div className="note-actions">
        {showConfirm ? (
          <div style={{display: 'flex', alignItems: 'center', width: '100%', gap: '15px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)'}}>
            <span style={{color: '#f87171', fontSize: '0.95rem', fontWeight: '500'}}>Delete this note permanently?</span>
            <div style={{marginLeft: 'auto', display: 'flex', gap: '10px'}}>
              <button className="btn btn-ghost" onClick={() => setShowConfirm(false)} disabled={isDeleting} style={{padding: '8px 14px', fontSize: '0.85rem'}}>
                Cancel
              </button>
              <button className="btn" onClick={handleDelete} disabled={isDeleting} style={{backgroundColor: '#ef4444', padding: '8px 14px', fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'}}>
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? 'Hide Note' : 'View Note'}
            </button>
            <button className="btn" onClick={() => alert('Flashcard Generator coming soon!')}>
              Generate Flashcards
            </button>
            <button className="btn" style={{backgroundColor: '#818cf8', boxShadow: '0 4px 12px rgba(129, 140, 248, 0.3)'}} onClick={() => alert('Quiz Generator coming soon!')}>
              Generate Quiz
            </button>
            <button 
              className="btn btn-ghost" 
              style={{color: '#f87171', borderColor: 'transparent', marginLeft: 'auto'}} 
              onClick={() => setShowConfirm(true)}
            >
              Delete
            </button>
          </>
        )}
      </div>
      
    </div>
  );
}

export default NoteCard;