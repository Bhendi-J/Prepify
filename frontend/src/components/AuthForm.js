import React, { useState } from 'react';

function AuthForm({ isRegister = false, onSubmit, isLoading }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    // Call the function passed from the parent (LoginPage or RegisterPage)
    onSubmit({ username, email, password });
  };

  return (
    <form onSubmit={handleSubmit} className="content-section">
      <fieldset>
        <legend className="border-bottom mb-4">
          {isRegister ? 'Join Today' : 'Log In'}
        </legend>

        {isRegister && (
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        )}

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </fieldset>
      <div className="form-group">
        <button type="submit" className="btn" disabled={isLoading}>
          {isLoading ? 'Submitting...' : (isRegister ? 'Sign Up' : 'Login')}
        </button>
      </div>
    </form>
  );
}

export default AuthForm;