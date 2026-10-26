import React, { useCallback, useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import Timeline from './pages/Timeline.jsx';
import Welcome from './pages/Welcome.jsx';
import { DojoList, DojoForm, DojoDetail } from './pages/Dojos.jsx';
import { PractitionerList, PractitionerForm } from './pages/Practitioners.jsx';
import { authApi, changesApi } from './api.js';
import Login from './pages/Login.jsx';
import ReviewEdits from './pages/ReviewEdits.jsx';
import AdminUsers from './pages/AdminUsers.jsx';

export default function App() {
  const [me, setMe] = useState({ admin: false, username: '' });
  const [pending, setPending] = useState(0);
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();

  const refreshPending = useCallback(() => {
    changesApi.count().then((c) => setPending(c.pending || 0)).catch(() => setPending(0));
  }, []);
  const refreshMe = useCallback(async () => {
    try {
      const m = await authApi.me();
      setMe({ admin: m.admin === true, username: m.username || '' });
      if (m.admin === true) refreshPending();
    } catch { setMe({ admin: false, username: '' }); }
  }, [refreshPending]);
  useEffect(() => { refreshMe(); }, [refreshMe]);
  useEffect(() => {
    const on = (e) => setNotice(e.detail);
    window.addEventListener('edit-pending', on);
    return () => window.removeEventListener('edit-pending', on);
  }, []);

  const logout = async () => {
    await authApi.logout().catch(() => {});
    setMe({ admin: false, username: '' });
    setPending(0);
    navigate('/');
  };

  return (
    <>
      <div className="banner" role="status">🚧 Under Construction — this site is a work in progress 🚧</div>
      {notice && (
        <div className="notice" role="status">
          {notice} <button type="button" onClick={() => setNotice('')}>Dismiss</button>
        </div>
      )}
      <nav>
        <Link to="/">Home</Link>
        <Link to="/dojos">Dojos</Link>
        <Link to="/practitioners">Practitioners</Link>
        <Link to="/timeline">Timeline</Link>
        <span className="spacer" />
        {me.admin ? (
          <>
            <Link to="/changes">Review edits{pending > 0 ? ` (${pending})` : ''}</Link>
            <Link to="/admins">Admins</Link>
            <button type="button" className="link" onClick={logout}>Log out ({me.username})</button>
          </>
        ) : <Link to="/login">Admin login</Link>}
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/login" element={<Login onLogin={refreshMe} />} />
          <Route path="/changes" element={me.admin ? <ReviewEdits onChange={refreshPending} /> : <Login onLogin={refreshMe} />} />
          <Route path="/admins" element={me.admin ? <AdminUsers me={me} /> : <Login onLogin={refreshMe} />} />
          <Route path="/dojos" element={<DojoList />} />
          <Route path="/dojos/new" element={<DojoForm />} />
          <Route path="/dojos/:id/view" element={<DojoDetail />} />
          <Route path="/dojos/:id" element={<DojoForm />} />
          <Route path="/practitioners" element={<PractitionerList />} />
          <Route path="/practitioners/new" element={<PractitionerForm />} />
          <Route path="/practitioners/:id" element={<PractitionerForm />} />
        </Routes>
      </main>
    </>
  );
}
