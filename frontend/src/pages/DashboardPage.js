import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';
import FileUploadForm from '../components/FileUploadForm';
import NoteCard from '../components/NoteCard';
import './DashboardPage.css';

function DashboardPage() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useContext(AuthContext);

  // Function to fetch notes from the backend
  const fetchNotes = async () => {
    try {
      setError('');
      setIsLoading(true);
      const response = await apiClient.get('/api/notes');
      setNotes(response.data);
    } catch (err) {
      setError('Failed to fetch notes. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch notes when the component mounts
  useEffect(() => {
    fetchNotes();
  }, []);

  // Handle new file uploads
  const handleFileUpload = async (file) => {
    // FIX: Create a new FormData object
    const formData = new FormData();
    // FIX: Append the file to the form data
    formData.append('note_file', file);
  
    try {
      // Now this line will work correctly
      await apiClient.post('/api/upload', formData);
      fetchNotes();
    } catch (err) {
      // Check if the error response from the server has a specific message
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('An unknown error occurred during upload.');
      }
      console.error(err);
    }
  };

  if (!currentUser) {
    return <h2>Please log in to see your dashboard.</h2>;
  }

  return (
    <div>
      <h1>Welcome to your Dashboard, {currentUser.username}!</h1>
      
      {/* Section for Uploading New Notes */}
      <div className="content-section">
        <h3>Upload a New Note</h3>
        <FileUploadForm onUpload={handleFileUpload} />
      </div>

      {/* Section for Displaying Existing Notes */}
      <div className="content-section">
        <h3>Your Study Notes</h3>
        {isLoading && <p>Loading notes...</p>}
        {error && <p className="error-message">{error}</p>}
        
        {!isLoading && notes.length === 0 && (
          <p>You haven't uploaded any notes yet. Upload one to get started!</p>
        )}
        
        <div className="notes-grid">
          {notes.map(note => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;