import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import FileUploadForm from '../components/FileUploadForm';
import './DashboardPage.css';

function FolderPicker({ selectedFolderId, onSelect }) {
  const [folders, setFolders] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    apiClient.get('/api/folders').then(res => setFolders(res.data)).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await apiClient.post('/api/folders', { name: newName.trim() });
      setFolders(prev => [res.data, ...prev]);
      onSelect(res.data.id);
      setNewName('');
      setShowCreate(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        Save to folder
      </label>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <select value={selectedFolderId || ''} onChange={e => onSelect(e.target.value ? parseInt(e.target.value) : null)} className="form-control" style={{ flex: 1, cursor: 'pointer' }}>
          <option value="">No folder (unfiled)</option>
          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <button type="button" className="btn btn-ghost" style={{ whiteSpace: 'nowrap', padding: '10px 16px' }} onClick={() => setShowCreate(!showCreate)}>+ New</button>
      </div>
      {showCreate && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', animation: 'fadeIn 0.2s ease' }}>
          <input type="text" className="form-control" placeholder="Folder name..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} style={{ flex: 1 }} autoFocus />
          <button type="button" className="btn" style={{ padding: '10px 20px' }} onClick={handleCreate}>Create</button>
        </div>
      )}
    </div>
  );
}

function DashboardPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [error, setError] = useState('');
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleFileUpload = async (file) => {
    try {
      setIsUploading(true);
      setError('');
      setUploadMsg('');
      const formData = new FormData();
      formData.append('note_file', file);
      if (selectedFolderId) formData.append('folder_id', selectedFolderId);
      const response = await apiClient.post('/api/upload', formData);
      const noteId = response.data.note_id;
      const title = response.data.title || 'your note';
      setUploadMsg(`Successfully processed "${title}"`);
      if (noteId) setTimeout(() => navigate(`/notes/${noteId}`), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="dashboard">
      {/* Hero section for everyone */}
      <div style={{ textAlign: 'center', marginTop: currentUser ? '2rem' : '5rem', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: currentUser ? '2.4rem' : '3rem', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {currentUser ? 'Upload & Summarize' : 'Transform Docs into Knowledge'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '550px', margin: '0.5rem auto 0' }}>
          {currentUser
            ? 'Drop a document below to summarize it, then generate flashcards and quizzes.'
            : 'Summarize documents, generate flashcards, and create quizzes directly in your browser.'}
        </p>
      </div>

      {!currentUser ? (
        <div style={{ textAlign: 'center' }}>
          <button className="btn" onClick={() => navigate('/login')} style={{ padding: '14px 32px', fontSize: '1.05rem' }}>Get Started</button>
          <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', maxWidth: '700px', margin: '4rem auto 0' }}>
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="feature-icon" style={{ marginBottom: '0.75rem', fontWeight: 'bold', color: '#6366f1' }}>Summary</div>
              <h4 style={{ marginBottom: '0.5rem' }}>Understand Faster</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Upload any document and get an instant summary.</p>
            </div>
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="feature-icon" style={{ marginBottom: '0.75rem', fontWeight: 'bold', color: '#818cf8' }}>Flashcards</div>
              <h4 style={{ marginBottom: '0.5rem' }}>Active Recall</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Generate flip cards for efficient studying.</p>
            </div>
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="feature-icon" style={{ marginBottom: '0.75rem', fontWeight: 'bold', color: '#34d399' }}>Quizzes</div>
              <h4 style={{ marginBottom: '0.5rem' }}>Test Knowledge</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Test your understanding with interactive MCQs.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-upload glass-panel">
          <FolderPicker selectedFolderId={selectedFolderId} onSelect={setSelectedFolderId} />
          {error && <div className="error-msg">{error}</div>}
          {uploadMsg && (
            <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', marginBottom: '1rem', animation: 'fadeIn 0.3s ease' }}>
              {uploadMsg}
            </div>
          )}
          <FileUploadForm onUpload={handleFileUpload} isLoading={isUploading} />
        </div>
      )}
    </div>
  );
}

export default DashboardPage;