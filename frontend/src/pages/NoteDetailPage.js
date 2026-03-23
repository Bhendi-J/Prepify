import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';
import './NoteDetailPage.css';
import './FlashcardsPage.css';
import './QuizzesPage.css';

// ─── Flip Card Component ────────────────────────────────────────────────────
function FlashcardCard({ fc }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className={`fc-card ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
      <div className="fc-card-inner">
        <div className="fc-card-front">
          <span className="fc-label">Question</span>
          <span className="fc-question">{fc.question}</span>
        </div>
        <div className="fc-card-back">
          <span className="fc-label">Answer</span>
          <span className="fc-answer">{fc.answer}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Quiz Question Component ────────────────────────────────────────────────
function QuizQuestion({ q, idx, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (opt) => {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
    onAnswer(opt === q.answer);
  };

  const getClass = (opt) => {
    if (!answered) return '';
    if (opt === q.answer) return 'correct';
    if (opt === selected && opt !== q.answer) return 'incorrect';
    return '';
  };

  return (
    <div className="quiz-question-block">
      <div className="quiz-question-num">Question {idx + 1}</div>
      <div className="quiz-question-text">{q.question}</div>
      <div className="quiz-options">
        {q.options?.map((opt, i) => (
          <div key={i} className={`quiz-option ${getClass(opt)}`} onClick={() => handleSelect(opt)}>
            <span className="quiz-option-letter">{String.fromCharCode(65 + i)}</span>
            <span>{opt}</span>
          </div>
        ))}
      </div>
      {answered && (
        <div className={`quiz-feedback ${selected === q.answer ? 'correct' : 'incorrect'}`}>
          {selected === q.answer ? 'Correct!' : `Incorrect. Answer: ${q.answer}`}
        </div>
      )}
    </div>
  );
}


// ─── Main NoteDetailPage ────────────────────────────────────────────────────
function NoteDetailPage() {
  const { noteId } = useParams();
  const [note, setNote] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizScores, setQuizScores] = useState({});
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchNote = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/api/notes/${noteId}`);
      setNote(res.data);
      setEditTitle(res.data.filename);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchNote();
  }, [currentUser, noteId]);

  const handleSaveTitle = async () => {
    setIsEditingTitle(false);
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === note.filename) return;
    try {
      await apiClient.patch(`/api/notes/${noteId}`, { filename: trimmed });
      setNote(prev => ({ ...prev, filename: trimmed }));
    } catch (err) {
      console.error(err);
      setEditTitle(note.filename);
    }
  };

  const handleGenerateFlashcards = async () => {
    try {
      setIsGenerating(true);
      await apiClient.post(`/api/notes/${noteId}/flashcards`);
      await fetchNote();
      setActiveTab('flashcards');
    } catch (err) {
      alert('Failed to generate. Is Ollama running?');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateQuiz = async () => {
    try {
      setIsGenerating(true);
      await apiClient.post(`/api/notes/${noteId}/quiz`);
      await fetchNote();
      setActiveTab('quiz');
    } catch (err) {
      alert('Failed to generate. Is Ollama running?');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!currentUser) return null;
  if (isLoading) return <p style={{color: 'var(--text-secondary)', marginTop: '3rem'}}>Loading note...</p>;
  if (!note) return <p>Note not found.</p>;

  const handleAddToTasks = async () => {
    try {
      await apiClient.post('/api/todos', { text: `Review: ${note.filename}`, note_id: note.id });
      alert('Added to your Daily Checkpoints!');
    } catch (e) {
      console.error(e);
      alert('Failed to add to tasks.');
    }
  };

  const fcSets = note.flashcard_sets || [];
  const quizSets = note.quiz_sets || [];
  const latestFC = fcSets.length > 0 ? fcSets[0] : null;
  const latestQuiz = quizSets.length > 0 ? quizSets[0] : null;

  const totalQuizQ = latestQuiz?.content?.length || 0;
  const correctCount = Object.values(quizScores).filter(Boolean).length;
  const progress = totalQuizQ > 0 ? (Object.keys(quizScores).length / totalQuizQ) * 100 : 0;

  return (
    <div className="note-detail">
      <div className="note-detail-header">
        <button className="note-detail-back" onClick={() => navigate(-1)}>← Back</button>
        
        {isEditingTitle ? (
          <input
            className="note-detail-title"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
            autoFocus
            style={{ background: 'transparent', border: 'none', borderBottom: '2px solid var(--accent)', outline: 'none', color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif", width: '100%' }}
          />
        ) : (
          <h1 className="note-detail-title" onClick={() => setIsEditingTitle(true)} style={{ cursor: 'pointer' }} title="Click to rename">
            {note.filename} <span style={{ fontSize: '0.7em', opacity: 0.4 }}>(Edit)</span>
          </h1>
        )}
        
        <span className="note-detail-meta" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>
            Uploaded {new Date(note.date_posted).toLocaleDateString()}
            {` · ${fcSets.length} flashcard set${fcSets.length !== 1 ? 's' : ''}`}
            {` · ${quizSets.length} quiz${quizSets.length !== 1 ? 'zes' : ''}`}
          </span>
          <button className="btn btn-ghost" onClick={handleAddToTasks} style={{ padding: '4px 12px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.2)' }}>
            + Add to Daily Checkpoints
          </button>
        </span>
      </div>

      {/* Tabs */}
      <div className="note-tabs">
        <button className={`note-tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
          Summary
        </button>
        <button className={`note-tab ${activeTab === 'flashcards' ? 'active' : ''}`} onClick={() => setActiveTab('flashcards')}>
          Flashcards {fcSets.length > 0 && `(${fcSets.length})`}
        </button>
        <button className={`note-tab ${activeTab === 'quiz' ? 'active' : ''}`} onClick={() => setActiveTab('quiz')}>
          Quiz {quizSets.length > 0 && `(${quizSets.length})`}
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* ── Summary Tab ── */}
        {activeTab === 'summary' && (
          <div className="summary-content glass-panel">
            {note.original_content}
          </div>
        )}

        {/* ── Flashcards Tab ── */}
        {activeTab === 'flashcards' && (
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h3 style={{margin: 0}}>Study Flashcards</h3>
              <button className="btn" onClick={handleGenerateFlashcards} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : '+ Generate New Set'}
              </button>
            </div>

            {latestFC ? (
              <>
                <p className="fc-hint">💡 Click any card to flip it and reveal the answer</p>
                <div className="detail-fc-grid">
                  {latestFC.content?.map((fc, i) => <FlashcardCard key={i} fc={fc} />)}
                </div>
              </>
            ) : (
              <div className="glass-panel generate-section">
                <p>No flashcards yet for this note.</p>
                <button className="btn" onClick={handleGenerateFlashcards} disabled={isGenerating}>
                  {isGenerating ? 'Generating...' : 'Generate Flashcards'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Quiz Tab ── */}
        {activeTab === 'quiz' && (
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h3 style={{margin: 0}}>Take a Quiz</h3>
              <button className="btn" style={{backgroundColor: '#818cf8'}} onClick={handleGenerateQuiz} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : '+ Generate New Quiz'}
              </button>
            </div>

            {latestQuiz ? (
              <>
                <div className="quiz-score-bar">
                  <span className="quiz-score-label">Score</span>
                  <span className="quiz-score-value">{correctCount}/{totalQuizQ}</span>
                  <div className="quiz-score-progress">
                    <div className="quiz-score-fill" style={{width: `${progress}%`}} />
                  </div>
                </div>
                <div className="detail-quiz-list">
                  {latestQuiz.content?.map((q, i) => (
                    <QuizQuestion key={i} q={q} idx={i} onAnswer={(c) => setQuizScores(p => ({...p, [i]: c}))} />
                  ))}
                </div>
              </>
            ) : (
              <div className="glass-panel generate-section">
                <p>No quizzes yet for this note.</p>
                <button className="btn" style={{backgroundColor: '#818cf8'}} onClick={handleGenerateQuiz} disabled={isGenerating}>
                  {isGenerating ? 'Generating...' : 'Generate Quiz'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NoteDetailPage;
