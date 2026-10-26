import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api.js';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      await authApi.login(username, password);
      await onLogin();
      navigate('/changes');
    } catch {
      setError('Invalid username or password');
    }
  };

  return (
    <form onSubmit={submit} className="card">
      <h1>Admin login</h1>
      <p>Only administrators need to log in. Edits from everyone else are held until an admin approves them.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
      <button type="submit">Log in</button>
    </form>
  );
}
