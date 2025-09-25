import React, { useState, useContext } from 'react'; // <-- Add useContext
import { AuthContext } from '../context/AuthContext'; // <-- Import the context
import AuthForm from '../components/AuthForm';

function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext); // <-- Get the global login function

  const handleLogin = async (credentials) => {
    setIsLoading(true);
    setError('');
    try {
      await login(credentials); // <-- Use the context's login function
    } catch (err) {
      setError('Invalid email or password. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <AuthForm onSubmit={handleLogin} isLoading={isLoading} />
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
    </div>
  );
}

export default LoginPage;