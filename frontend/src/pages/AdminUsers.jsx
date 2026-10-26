import React, { useEffect, useState } from 'react';
import { adminUsersApi } from '../api.js';

export default function AdminUsers({ me }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ username: '', password: '', email: '' });

  const load = () => adminUsersApi.list().then(setUsers).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const act = async (fn) => {
    try { await fn(); setError(''); await load(); } catch (e) { setError(e.message); }
  };

  const add = (e) => {
    e.preventDefault();
    act(async () => { await adminUsersApi.create(form.username, form.password, form.email); setForm({ username: '', password: '', email: '' }); });
  };

  const changeEmail = (u) => {
    const email = window.prompt(`Email for ${u.username} (notified of pending edits; blank to clear)`, u.email || '');
    if (email !== null) act(() => adminUsersApi.setEmail(u.id, email.trim()));
  };

  const changePassword = (u) => {
    const pw = window.prompt(`New password for ${u.username} (min 8 characters)`);
    if (pw) act(() => adminUsersApi.setPassword(u.id, pw));
  };

  const remove = (u) => {
    if (window.confirm(`Remove admin ${u.username}?`)) act(() => adminUsersApi.remove(u.id));
  };

  return (
    <div>
      <h1>Administrators</h1>
      {error && <p className="error" role="alert">{error}</p>}
      <table>
        <thead><tr><th>Username</th><th>Email</th><th /></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}{u.username === me.username ? ' (you)' : ''}</td>
              <td>{u.email || '—'}</td>
              <td>
                <button type="button" onClick={() => changeEmail(u)}>Set email</button>{' '}
                <button type="button" onClick={() => changePassword(u)}>Change password</button>{' '}
                {u.username !== me.username && <button type="button" onClick={() => remove(u)}>Remove</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form onSubmit={add} className="toolbar">
        <input placeholder="New admin username" autoComplete="off" name="new-admin-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        <input type="password" placeholder="Password (min 8)" autoComplete="new-password" name="new-admin-password" minLength={8} value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <input type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <button type="submit">Add admin</button>
      </form>
    </div>
  );
}
