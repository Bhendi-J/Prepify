import React from 'react';
import './NoteCard.css'; // We'll create this CSS file next

function NoteCard({ note }) {
  // Format the date to be more readable
  const formattedDate = new Date(note.date_posted).toLocaleDateString();

  return (
    <div className="note-card">
      <h3>{note.filename}</h3>
      <p>Uploaded on: {formattedDate}</p>
      <div className="note-card-actions">
        <button className="btn-view">View Note</button>
        <button className="btn-delete">Delete</button>
      </div>
    </div>
  );
}

export default NoteCard;