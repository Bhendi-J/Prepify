import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import './LibraryPage.css';

function LibraryPage() {
  const [folders, setFolders] = useState([]);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchFolders = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/api/folders');
      setFolders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchFolders();
  }, [currentUser]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await apiClient.post('/api/folders', { name: newName.trim() });
      setNewName('');
      fetchFolders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e, folderId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this folder and all its contents?')) return;
    try {
      await apiClient.delete(`/api/folders/${folderId}`);
      fetchFolders();
    } catch (err) {
      console.error(err);
    }
  };

  if (!currentUser) {
    return <h2 style={{textAlign: 'center', marginTop: '4rem'}}>Please log in to access your library.</h2>;
  }

  return (
    <div className="library-page">
      <div className="library-header">
        <div>
          <h1>My Library</h1>
          <p>Organize your study materials into folders.</p>
        </div>
        <form className="create-folder-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="New folder name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <button type="submit" className="btn">+ Create</button>
        </form>
      </div>

      {isLoading && <p style={{color: 'var(--text-secondary)'}}>Loading...</p>}

      {!isLoading && folders.length === 0 && (
        <div className="glass-panel" style={{textAlign: 'center', padding: '5rem 2rem'}}>
          <h3>No folders yet</h3>
          <p style={{color: 'var(--text-secondary)'}}>Create your first folder above to start organizing your notes!</p>
        </div>
      )}

      <div className="folders-grid">
        {folders.map(f => (
          <div key={f.id} className="folder-card glass-panel" onClick={() => navigate(`/library/${f.id}`)}>
            <span className="folder-icon">Folder</span>
            <h3 className="folder-name">{f.name}</h3>
            <span className="folder-meta">{f.note_count} {f.note_count === 1 ? 'note' : 'notes'}</span>
            <div className="folder-actions">
              <button className="btn btn-ghost" style={{padding: '6px 12px', fontSize: '0.8rem', color: '#f87171'}} onClick={(e) => handleDelete(e, f.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LibraryPage;
