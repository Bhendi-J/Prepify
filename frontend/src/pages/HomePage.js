import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import FileUploadForm from '../components/FileUploadForm';
import ResultsDisplay from '../components/ResultsDisplay';
import apiClient from '../api/axiosConfig';

function HomePage() {
  const [extractedText, setExtractedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { currentUser, loading } = useContext(AuthContext);

  // Add this line to debug and see the user state in your console
  console.log('Current User State on HomePage:', currentUser);

  const handleFileUpload = async (file) => {
    // This check now correctly prevents the upload if you're not logged in
    if (!currentUser) {
      setError('You must be logged in to process a note.');
      navigate('/login');
      return;
    }

    const formData = new FormData();
    formData.append('note_file', file);

    setIsLoading(true);
    setError('');
    setExtractedText('');
    try {
      const response = await apiClient.post('/api/upload', formData);
      setExtractedText(response.data.extracted_text);
    } catch (err) {
      setError('An error occurred during file upload. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return <div>Checking authentication...</div>;
  }

  return (
    <div>
      <h1>Upload Your Note</h1>
      {currentUser ? (
        <p>Upload an image or PDF of your study notes to get started.</p>
      ) : (
        <p>Please log in to upload your study notes.</p>
      )}
      <FileUploadForm onUpload={handleFileUpload} isLoading={isLoading} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ResultsDisplay text={extractedText} />
    </div>
  );
}

export default HomePage;