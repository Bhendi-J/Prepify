import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';
import './QuizzesPage.css';

function QuizQuestion({ q, idx, onAnswer }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (opt) => {
    if (answered) return;
    setSelectedOption(opt);
    setAnswered(true);
    const isCorrect = opt === q.answer;
    onAnswer(isCorrect);
  };

  const getOptionClass = (opt) => {
    if (!answered) return selectedOption === opt ? 'selected' : '';
    if (opt === q.answer) return 'correct';
    if (opt === selectedOption && opt !== q.answer) return 'incorrect';
    return '';
  };

  return (
    <div className="quiz-question-block">
      <div className="quiz-question-num">Question {idx + 1}</div>
      <div className="quiz-question-text">{q.question}</div>
      <div className="quiz-options">
        {q.options && q.options.map((opt, o_idx) => (
          <div
            key={o_idx}
            className={`quiz-option ${getOptionClass(opt)}`}
            onClick={() => handleSelect(opt)}
          >
            <span className="quiz-option-letter">{String.fromCharCode(65 + o_idx)}</span>
            <span>{opt}</span>
          </div>
        ))}
      </div>
      {answered && (
        <div className={`quiz-feedback ${selectedOption === q.answer ? 'correct' : 'incorrect'}`}>
          {selectedOption === q.answer
            ? 'Correct!'
            : `Incorrect. The answer is: ${q.answer}`}
        </div>
      )}
    </div>
  );
}

function QuizSetCard({ set }) {
  const [scores, setScores] = useState({});
  const totalQuestions = set.content ? set.content.length : 0;

  const handleAnswer = (qIdx, isCorrect) => {
    setScores(prev => ({ ...prev, [qIdx]: isCorrect }));
  };

  const answeredCount = Object.keys(scores).length;
  const correctCount = Object.values(scores).filter(Boolean).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <div className="quiz-set">
      <div className="quiz-set-header">
        <h3 className="quiz-set-title">{set.title}</h3>
        <span className="quiz-set-meta">{totalQuestions} questions · {new Date(set.date_posted).toLocaleDateString()}</span>
      </div>

      <div className="quiz-score-bar">
        <span className="quiz-score-label">Score</span>
        <span className="quiz-score-value">{correctCount}/{totalQuestions}</span>
        <div className="quiz-score-progress">
          <div className="quiz-score-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {set.content && set.content.map((q, idx) => (
        <QuizQuestion
          key={idx}
          q={q}
          idx={idx}
          onAnswer={(isCorrect) => handleAnswer(idx, isCorrect)}
        />
      ))}
    </div>
  );
}

function QuizzesPage() {
  const [quizSets, setQuizSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setError('');
        setIsLoading(true);
        const response = await apiClient.get('/api/quizzes');
        setQuizSets(response.data);
      } catch (err) {
        setError('Failed to fetch your quizzes.');
      } finally {
        setIsLoading(false);
      }
    };
    if (currentUser) fetchQuizzes();
  }, [currentUser]);

  if (!currentUser) {
    return <h2 style={{textAlign: 'center', marginTop: '4rem'}}>Please log in to view your quizzes.</h2>;
  }

  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <h1>My Quizzes</h1>
        <p>Test your understanding and track your progress.</p>
      </div>

      {isLoading && <p style={{color: 'var(--text-secondary)'}}>Loading quizzes...</p>}
      {error && <div className="error-msg">{error}</div>}

      {!isLoading && quizSets.length === 0 && (
        <div className="glass-panel quiz-empty">
          <h3>No quizzes yet</h3>
          <p>Go to My Notes and click "Generate Quiz" on any note to create one!</p>
        </div>
      )}

      {quizSets.map(set => (
        <QuizSetCard key={set.id} set={set} />
      ))}
    </div>
  );
}

export default QuizzesPage;
