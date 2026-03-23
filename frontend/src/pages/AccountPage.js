import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import './DashboardPage.css';
import './AccountPage.css';

/* ─── Improved Heatmap with month/day labels ──────────────────────────────── */
function Heatmap({ data }) {
  const today = new Date();
  const cells = [];
  const monthLabels = [];
  let lastMonth = -1;

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const count = data[key] || 0;
    const month = d.getMonth();

    if (month !== lastMonth) {
      const colIndex = 364 - i;
      const weekCol = Math.floor(colIndex / 7) + 1;
      monthLabels.push({ name: d.toLocaleString('default', { month: 'short' }), col: weekCol });
      lastMonth = month;
    }

    let level = '';
    if (count >= 5) level = 'level-4';
    else if (count >= 3) level = 'level-3';
    else if (count >= 2) level = 'level-2';
    else if (count >= 1) level = 'level-1';

    const dateStr = d.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
    cells.push(
      <div key={key} className={`hm-cell ${level}`} title={`${dateStr}: ${count} ${count === 1 ? 'activity' : 'activities'}`} />
    );
  }

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div className="heatmap-wrapper">
      <div className="hm-months">
        {monthLabels.map((m, i) => (
          <span key={i} style={{ gridColumnStart: m.col }}>{m.name}</span>
        ))}
      </div>
      <div className="hm-body">
        <div className="hm-days">
          {dayLabels.map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="hm-grid">{cells}</div>
      </div>
      <div className="hm-legend">
        <span>Less</span>
        <div className="hm-cell" />
        <div className="hm-cell level-1" />
        <div className="hm-cell level-2" />
        <div className="hm-cell level-3" />
        <div className="hm-cell level-4" />
        <span>More</span>
      </div>
    </div>
  );
}

/* ─── Premium SVG Line Chart for Weekly Trend ────────────────────────────────────── */
function LineChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count), 5); // ensure some height
  const w = 400;
  const h = 120;
  const padding = 20;
  const usableW = w - padding * 2;
  const usableH = h - padding * 2;

  // Calculate points
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * usableW;
    const y = h - padding - (d.count / max) * usableH;
    return `${x},${y}`;
  });

  // Create a smooth curve
  let dPath = `M ${points[0]}`;
  for (let i = 1; i < data.length; i++) {
    const prev = points[i - 1].split(',');
    const curr = points[i].split(',');
    const cp1x = parseFloat(prev[0]) + (parseFloat(curr[0]) - parseFloat(prev[0])) / 2;
    const cp1y = parseFloat(prev[1]);
    const cp2x = cp1x;
    const cp2y = parseFloat(curr[1]);
    dPath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr[0]},${curr[1]}`;
  }

  return (
    <div className="line-chart-container" style={{ position: 'relative', width: '100%', height: '200px' }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        {/* Grid lines */}
        {[0, 0.5, 1].map(pct => (
          <line
            key={pct}
            x1={padding}
            y1={h - padding - pct * usableH}
            x2={w - padding}
            y2={h - padding - pct * usableH}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}
        {/* Area under curve */}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={`${dPath} L ${points[points.length-1].split(',')[0]},${h - padding} L ${padding},${h - padding} Z`} fill="url(#areaGradient)" />
        {/* The curve itself */}
        <path d={dPath} fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" />
        {/* Points */}
        {data.map((d, i) => {
          const coords = points[i].split(',');
          return (
            <circle
              key={i}
              cx={coords[0]}
              cy={coords[1]}
              r="4"
              fill="#fff"
              stroke="#6366f1"
              strokeWidth="2"
              className="chart-point"
            >
              <title>Week of {d.week}: {d.count} activities</title>
            </circle>
          );
        })}
      </svg>
      <div className="chart-x-axis" style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        <span>12 wks ago</span>
        <span>This Week</span>
      </div>
    </div>
  );
}

/* ─── To-Do List (Daily Checkpoints) ────────────────────────────────────────────── */
function TodoList({ refreshToken }) {
  const [todos, setTodos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTodos();
    fetchNotes();
  }, [refreshToken]);

  const fetchTodos = async () => {
    try {
      const res = await apiClient.get('/api/todos');
      setTodos(res.data);
    } catch (e) { console.error('Failed to fetch todos'); }
  };

  const fetchNotes = async () => {
    try {
      const res = await apiClient.get('/api/notes?minimal=1');
      setNotes(res.data);
    } catch (e) { console.error('Failed to fetch notes'); }
  };

  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    try {
      const payload = { text: newTodo };
      if (selectedNoteId) payload.note_id = parseInt(selectedNoteId);
      const res = await apiClient.post('/api/todos', payload);
      setTodos([...todos, res.data]);
      setNewTodo('');
      setSelectedNoteId('');
    } catch (e) { console.error('Failed to add todo'); }
  };

  const toggleTodo = async (id, currentStatus) => {
    try {
      const res = await apiClient.patch(`/api/todos/${id}`, { completed: !currentStatus });
      setTodos(prev => prev.map(t => t.id === id ? res.data : t));

      // After checking it, vanish after 2.5s
      if (!currentStatus) {
        setTimeout(() => {
          apiClient.delete(`/api/todos/${id}`).then(() => {
            setTodos(prev => prev.filter(t => t.id !== id));
          }).catch(e => console.error(e));
        }, 2500);
      }
    } catch (e) {
      console.error('Failed to toggle todo', e.response?.data || e.message);
    }
  };

  const deleteTodo = async (id) => {
    try {
      await apiClient.delete(`/api/todos/${id}`);
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error('Failed to delete todo'); }
  };

  const progress = todos.length === 0 ? 0 : Math.round((todos.filter(t => t.completed).length / todos.length) * 100);

  return (
    <div className="todo-container">
      <div className="todo-header">
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Daily Checkpoints</h3>
        <span className="todo-progress-text">{progress}% Completed</span>
      </div>
      
      <div className="todo-progress-bar">
        <div className="todo-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <form onSubmit={addTodo} className="todo-form" style={{ flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Add a new task..." 
            value={newTodo} 
            onChange={e => setNewTodo(e.target.value)} 
            className="todo-input"
          />
          <button type="submit" className="todo-add-btn">Add</button>
        </div>
        <select 
          className="todo-input" 
          style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}
          value={selectedNoteId}
          onChange={e => setSelectedNoteId(e.target.value)}
        >
          <option value="">(Optional) Link a Note...</option>
          {notes.map(n => <option key={n.id} value={n.id}>{n.filename}</option>)}
        </select>
      </form>

      <div className="todo-list">
        {todos.length === 0 ? (
          <p className="todo-empty">All caught up! Add a task above.</p>
        ) : (
          todos.map(todo => (
            <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              <label className="todo-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <input 
                  type="checkbox" 
                  checked={todo.completed} 
                  onChange={() => toggleTodo(todo.id, todo.completed)} 
                />
                <span className="todo-checkbox"></span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span 
                    className="todo-text" 
                    style={{ cursor: todo.note_id ? 'pointer' : 'default', textDecoration: todo.completed ? 'line-through' : (todo.note_id ? 'underline' : 'none'), color: todo.note_id && !todo.completed ? '#818cf8' : 'inherit' }}
                    onClick={(e) => {
                      if (todo.note_id) {
                        e.preventDefault();
                        navigate(`/notes/${todo.note_id}`);
                      }
                    }}
                    title={todo.note_id ? "Click to open linked note" : ""}
                  >
                    {todo.text} {todo.note_id && '📎'}
                  </span>
                  {todo.target_date && (
                    <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: '500' }}>
                      Target: {new Date(todo.target_date).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}
                    </span>
                  )}
                </div>
              </label>
              <button className="todo-delete" onClick={() => deleteTodo(todo.id)}>✕</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Weekly Goal Planner (NLP) ────────────────────────────────────────────── */
function WeeklyGoalPlanner({ onGoalGenerated, refreshToken }) {
  const [goal, setGoal] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchGoal();
  }, [refreshToken]);

  const fetchGoal = () => {
    apiClient.get('/api/goals').then(res => {
      setGoal(res.data);
      setFetching(false);
    }).catch(() => setFetching(false));
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      await apiClient.post('/api/goals', { paragraph: inputText });
      setInputText('');
      fetchGoal(); 
      if (onGoalGenerated) onGoalGenerated();
    } catch(e) {
      console.error(e);
      alert('Failed to generate goal plan.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="glass-panel" style={{padding: '1.5rem'}}><div className="shimmer-text">Loading Goal...</div></div>;

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
      <h3 style={{ margin: 0, fontSize: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🎯 Weekly AI Goal Planner
      </h3>
      
      {goal ? (
        <div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><strong>Goal:</strong> {goal.description}</p>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
              <span>Progress</span>
              <span style={{ color: '#34d399', fontWeight: 'bold' }}>{goal.progress}%</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#34d399', width: `${goal.progress}%`, transition: 'width 0.4s ease' }} />
            </div>
          </div>
          {goal.progress === 100 && (
             <p style={{ color: '#34d399', fontWeight: 'bold', marginTop: '1rem', textAlign: 'center' }}>🎉 Goal Completed! Awesome job.</p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            Type out what you want to achieve this week. The AI will break it down into daily tasks for you.
          </p>
          <textarea
            rows="3"
            className="todo-input"
            placeholder="e.g. I want to read my biology notes and study my physics flashcards..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={loading}
            style={{ resize: 'none' }}
          />
          <button 
            className="todo-add-btn" 
            style={{ alignSelf: 'flex-start', background: '#f59e0b', padding: '6px 16px' }}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'Mapping AI Plan...' : 'Generate Daily Plan ✨'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Daily AI Summary ──────────────────────────────────────────────────────── */
function DailySummary({ refreshToken }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/daily_summary')
      .then(res => setSummary(res.data.summary))
      .catch(() => setSummary("Keep up the great work studying today!"))
      .finally(() => setLoading(false));
  }, [refreshToken]);

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(0,0,0,0) 70%)', zIndex: 0 }} />
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
        <span style={{ color: '#818cf8' }}>✨</span> Daily Insights
      </h3>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', zIndex: 1 }}>
        {loading ? (
          <div className="shimmer-text" style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.6' }}>
            Analyzing today's activity...
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-primary)', fontWeight: '500' }}>
            "{summary}"
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── 7-Day Bar Chart ────────────────────────────────────────────────────────── */
function DailyChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count), 5); // Ensure some height

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem' }}>Last 7 Days</h3>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '10px', justifyContent: 'space-between', height: '120px' }}>
        {data.map((d, i) => {
          const heightPct = (d.count / max) * 100;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%', paddingBottom: '8px' }}>
                <div 
                  style={{ 
                    width: '100%', 
                    height: `${Math.max(heightPct, 4)}%`, 
                    background: d.count > 0 ? 'linear-gradient(180deg, #818cf8 0%, #6366f1 100%)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '4px',
                    transition: 'height 0.5s ease',
                    position: 'relative'
                  }}
                  title={`${d.count} activities`}
                >
                  {d.count > 0 && (
                    <span style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {d.count}
                    </span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Activity Breakdown Bars ─────────────────────────────────────────────── */
function BreakdownBars({ breakdown }) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;
  const items = [
    { key: 'upload', label: 'Uploads', color: '#6366f1', icon: '' },
    { key: 'flashcard', label: 'Flashcards', color: '#818cf8', icon: '' },
    { key: 'quiz', label: 'Quizzes', color: '#34d399', icon: '' },
    { key: 'todo', label: 'To-Dos', color: '#f59e0b', icon: '' },
  ];
  return (
    <div className="breakdown-list" style={{ marginTop: '1.5rem' }}>
      {items.map(item => {
        const count = breakdown[item.key] || 0;
        const pct = ((count / total) * 100).toFixed(0);
        return (
          <div key={item.key} className="breakdown-row">
            <div className="breakdown-label">
              <span>{item.icon} {item.label}</span>
              <span className="breakdown-count">{count}</span>
            </div>
            <div className="breakdown-track">
              <div className="breakdown-fill" style={{ width: `${pct}%`, background: item.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Account Page ───────────────────────────────────────────────────── */
function AccountPage() {
  const { currentUser, logout } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const fetchAnalytics = useCallback(() => {
    if (!currentUser) return;
    apiClient.get('/api/analytics').then(res => setAnalytics(res.data)).catch(() => {});
  }, [currentUser]);

  const handleGoalGenerated = () => {
    setRefreshToken(prev => prev + 1);
    fetchAnalytics();
  };

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (!currentUser) return <p style={{ textAlign: 'center', marginTop: '4rem' }}>Please log in.</p>;

  const stats = analytics?.stats || {};
  const breakdown = analytics?.breakdown || {};
  const mostActive = analytics?.most_active || {};
  const weeklyTrend = analytics?.weekly_trend || [];

  return (
    <div className="account-page">
      {/* Profile */}
      <div className="account-profile glass-panel">
        <div className="account-avatar">{currentUser.username[0].toUpperCase()}</div>
        <div className="account-info">
          <h1>{currentUser.username}</h1>
          <p>{currentUser.email}</p>
        </div>
        <button className="btn btn-ghost" style={{ color: '#f87171', marginLeft: 'auto' }} onClick={logout}>Logout</button>
      </div>

      {/* AI Weekly Planner */}
      <WeeklyGoalPlanner onGoalGenerated={handleGoalGenerated} refreshToken={refreshToken} />

      {/* Row: Daily Insights & 7-Day Graph */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <DailySummary refreshToken={refreshToken} />
        <DailyChart data={analytics?.last_7_days || []} />
      </div>

      {/* Row: Highlights + Todo List */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 3fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Left Column: Highlights & Graph */}
        <div className="left-col" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Highlight Stats */}
          <div className="highlight-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="highlight-card glass-panel">
              <span className="highlight-icon">Streak</span>
              <span className="highlight-value">{stats.streak || 0}</span>
              <span className="highlight-label">Days</span>
            </div>
            <div className="highlight-card glass-panel">
              <span className="highlight-icon">This Wk</span>
              <span className="highlight-value">{stats.this_week || 0}</span>
              <span className="highlight-label">Activity</span>
            </div>
            <div className="highlight-card glass-panel">
              <span className="highlight-icon">This Mo</span>
              <span className="highlight-value">{stats.this_month || 0}</span>
              <span className="highlight-label">Activity</span>
            </div>
            <div className="highlight-card glass-panel">
              <span className="highlight-icon">Total</span>
              <span className="highlight-value">{stats.total_activities || 0}</span>
              <span className="highlight-label">All Time</span>
            </div>
          </div>

          {/* Line Chart */}
          <div className="glass-panel" style={{ padding: '1.75rem', flex: 1 }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Activity Trend</h3>
            <LineChart data={weeklyTrend} />
          </div>

        </div>

        {/* Right Column: Todo List */}
        <div className="glass-panel" style={{ padding: '1.75rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <TodoList refreshToken={refreshToken} />
        </div>

      </div>

      {/* Activity Heatmap + Breakdown */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 3fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div className="section-header">
            <h3>Study Heatmap</h3>
            {mostActive.date && (
              <span className="section-meta">Most active: {new Date(mostActive.date).toLocaleDateString()} ({mostActive.count} activities)</span>
            )}
          </div>
          <Heatmap data={analytics?.heatmap || {}} />
        </div>

        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ margin: '0', fontSize: '1rem' }}>Activity Breakdown</h3>
          <BreakdownBars breakdown={breakdown} />
          
          {/* Some small totals at the bottom of breakdown */}
          <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.total_folders || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Folders</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.total_notes || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Notes</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AccountPage;