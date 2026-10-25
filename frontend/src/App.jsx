import React from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import Timeline from './pages/Timeline.jsx';
import Welcome from './pages/Welcome.jsx';
import { DojoList, DojoForm, DojoDetail } from './pages/Dojos.jsx';
import { PractitionerList, PractitionerForm } from './pages/Practitioners.jsx';

export default function App() {
  return (
    <>
      <div className="banner" role="status">🚧 Under Construction — this site is a work in progress 🚧</div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/dojos">Dojos</Link>
        <Link to="/practitioners">Practitioners</Link>
        <Link to="/timeline">Timeline</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/timeline" element={<Timeline />} />
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
