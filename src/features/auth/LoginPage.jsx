// src/features/auth/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { logger } from '../../lib/logger';

const login = async ({ email, password }) => {
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    logger.warn('Login failed', { error });
    throw new Error(error.message);
  }
  return data;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: login,
    onSuccess: () => {
      toast.success('Welcome back!');
      navigate('/');
    },
    onError: (err) => toast.error(err.message || 'Login failed.'),
  });

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password.');
      return;
    }
    mutate({ email, password });
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg w-96 flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-center">Login</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="p-2 border rounded"
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="p-2 border rounded"
      />

      <button
        onClick={handleLogin}
        disabled={isPending}
        className="bg-indigo-500 text-white py-2 rounded hover:bg-indigo-600 disabled:opacity-50"
      >
        {isPending ? 'Logging in…' : 'Login'}
      </button>
    </div>
  );
};

export default LoginPage;