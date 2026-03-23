import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';
import FileUploadForm from '../components/FileUploadForm';
import './LibraryPage.css';

function FolderDetailPage() {
  const { folderId } = useParams();
  const [folderData, setFolderData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchFolder = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/api/folders/${folderId}/notes`);
      setFolderData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    if (currentUser) fetchFolder();
  }, [currentUser, fetchFolder]);

  const handleUpload = async (file) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('note_file', file);
      formData.append('folder_id', folderId);
      await apiClient.post('/api/upload', formData);
      fetchFolder();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="folder-detail-page">
      <div className="folder-detail-header">
        <button className="folder-detail-back" onClick={() => navigate('/library')}>
          ← Back to Library
        </button>
        <h1>{folderData?.folder?.name || 'Loading...'}</h1>
        <p style={{color: 'var(--text-secondary)', margin: 0}}>
          {folderData?.notes?.length || 0} notes in this folder
        </p>
      </div>

      {/* Upload into this folder */}
      <div className="glass-panel" style={{padding: '1.5rem', marginBottom: '2rem'}}>
        <h4 style={{margin: '0 0 0.75rem 0', fontSize: '0.95rem'}}>Upload to this folder</h4>
        <FileUploadForm onUpload={handleUpload} isLoading={isUploading} />
      </div>

      {isLoading && <p style={{color: 'var(--text-secondary)'}}>Loading notes...</p>}

      {!isLoading && folderData?.notes?.length === 0 && (
        <div className="glass-panel" style={{textAlign: 'center', padding: '4rem 2rem'}}>
          <h3>This folder is empty</h3>
          <p style={{color: 'var(--text-secondary)'}}>Upload a document above to add your first note!</p>
        </div>
      )}

      <div className="notes-list">
        {folderData?.notes?.map(note => (
          <div key={note.id} className="note-list-item glass-panel" onClick={() => navigate(`/notes/${note.id}`)}>
            <div className="note-list-info">
              <h4>{note.filename}</h4>
              <small>{new Date(note.date_posted).toLocaleDateString()}</small>
            </div>
            <div className="note-badges">
              {note.has_flashcards && <span className="badge badge-fc">Flashcards</span>}
              {note.has_quiz && <span className="badge badge-quiz">Quiz</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FolderDetailPage;
