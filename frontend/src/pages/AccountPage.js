import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
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

    // Track month labels
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

/* ─── Weekly Trend Mini Bar Chart ─────────────────────────────────────────── */
function WeeklyTrend({ data }) {
  const max = Math.max(...data.map(w => w.count), 1);
  return (
    <div className="trend-chart">
      {data.map((w, i) => (
        <div key={i} className="trend-bar-wrapper" title={`Week of ${w.week}: ${w.count}`}>
          <div className="trend-bar" style={{ height: `${(w.count / max) * 100}%` }} />
          <span className="trend-label">{i % 2 === 0 ? `W${i + 1}` : ''}</span>
        </div>
      ))}
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
  ];
  return (
    <div className="breakdown-list">
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

  useEffect(() => {
    if (currentUser) {
      apiClient.get('/api/analytics').then(res => setAnalytics(res.data)).catch(() => {});
    }
  }, [currentUser]);

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

      {/* Highlight Stats */}
      <div className="highlight-row">
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

      {/* Totals */}
      <div className="stats-row">
        <div className="stat-card glass-panel">
          <span className="stat-value">{stats.total_folders || 0}</span>
          <span className="stat-label">Folders</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-value">{stats.total_notes || 0}</span>
          <span className="stat-label">Notes</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-value">{stats.total_flashcards || 0}</span>
          <span className="stat-label">Flashcard Sets</span>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-value">{stats.total_quizzes || 0}</span>
          <span className="stat-label">Quizzes</span>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <div className="section-header">
          <h3>Study Activity</h3>
          {mostActive.date && (
            <span className="section-meta">Most active: {new Date(mostActive.date).toLocaleDateString()} ({mostActive.count} activities)</span>
          )}
        </div>
        <Heatmap data={analytics?.heatmap || {}} />
      </div>

      {/* Bottom Row: Breakdown + Trend */}
      <div className="analytics-bottom-row">
        <div className="glass-panel" style={{ padding: '1.75rem', flex: 1 }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Activity Breakdown</h3>
          <BreakdownBars breakdown={breakdown} />
        </div>
        <div className="glass-panel" style={{ padding: '1.75rem', flex: 1 }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Last 12 Weeks</h3>
          <WeeklyTrend data={weeklyTrend} />
        </div>
      </div>
    </div>
  );
}

export default AccountPage;