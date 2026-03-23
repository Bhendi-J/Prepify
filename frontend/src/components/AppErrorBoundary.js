import React from 'react';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled application error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0f172a',
          color: '#e2e8f0',
          fontFamily: 'Inter, sans-serif',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            padding: '24px',
            background: 'rgba(15, 23, 42, 0.9)',
          }}
        >
          <h1 style={{ marginTop: 0, fontSize: '1.4rem' }}>App failed to load</h1>
          <p style={{ color: '#94a3b8', lineHeight: 1.5 }}>
            A runtime error blocked rendering. Open the browser console to see
            details.
          </p>
          <p
            style={{
              marginTop: '12px',
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              wordBreak: 'break-word',
              fontSize: '0.9rem',
            }}
          >
            {this.state.errorMessage}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              marginTop: '16px',
              background: '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 14px',
              cursor: 'pointer',
            }}
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
