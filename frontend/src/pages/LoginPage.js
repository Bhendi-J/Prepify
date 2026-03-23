import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import AuthForm from '../components/AuthForm';

function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);

  const handleLogin = async (credentials) => {
    setIsLoading(true);
    setError('');
    try {
      await login(credentials);
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <AuthForm onSubmit={handleLogin} isLoading={isLoading} />
      {error && <p className="error-message" style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
    </div>
  );
}

export default LoginPage;
