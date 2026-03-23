import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import apiClient from '../api/axiosConfig';

function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (credentials) => {
    setIsLoading(true);
    setError('');
    try {
      await apiClient.post('/api/register', {
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
      });
      navigate('/login');
    } catch (err) {
      setError('Registration failed. The email or username may already be taken.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <AuthForm isRegister={true} onSubmit={handleRegister} isLoading={isLoading} />
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
    </div>
  );
}

export default RegisterPage;
