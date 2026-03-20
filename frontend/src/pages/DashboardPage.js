import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';
import FileUploadForm from '../components/FileUploadForm';
import './DashboardPage.css'; // Optional local css if any

function DashboardPage() {
  const [error, setError] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { currentUser } = useContext(AuthContext);

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('note_file', file);

    try {
      setIsUploading(true);
      setError('');
      setExtractedText('');
      
      const response = await apiClient.post('/api/upload', formData);
      setExtractedText(response.data.extracted_text);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('An unknown error occurred during upload.');
      }
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="dashboard-hero" style={{marginTop: '4rem'}}>
        <h1>Sign in to Prepify</h1>
        <p>Your premium AI-powered knowledge base awaits.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-hero">
        <h1>Transform Docs into Knowledge</h1>
        <p>Instantly summarize your study materials and generate interactive study sets using our advanced AI.</p>
      </div>

      <div className="upload-module glass-panel">
        
        {error && <div className="error-msg">{error}</div>}
        
        <FileUploadForm onUpload={handleFileUpload} isLoading={isUploading} />
        
        {extractedText && (
          <div className="extracted-preview">
            <h4>Generated Summary</h4>
            <div className="text-content-wrapper">
              {extractedText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;