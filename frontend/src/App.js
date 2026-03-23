import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import DashboardPage from './pages/DashboardPage';
import LibraryPage from './pages/LibraryPage';
import FolderDetailPage from './pages/FolderDetailPage';
import NoteDetailPage from './pages/NoteDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AccountPage from './pages/AccountPage';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Navbar />
        <div className="container">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/library/:folderId" element={<FolderDetailPage />} />
            <Route path="/notes/:noteId" element={<NoteDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
