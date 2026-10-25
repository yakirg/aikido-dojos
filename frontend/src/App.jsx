import React from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import Welcome from './pages/Welcome.jsx';
import { DojoList, DojoForm } from './pages/Dojos.jsx';
import { PractitionerList, PractitionerForm } from './pages/Practitioners.jsx';

export default function App() {
  return (
    <>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/dojos">Dojos</Link>
        <Link to="/practitioners">Practitioners</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/dojos" element={<DojoList />} />
          <Route path="/dojos/new" element={<DojoForm />} />
          <Route path="/dojos/:id" element={<DojoForm />} />
          <Route path="/practitioners" element={<PractitionerList />} />
          <Route path="/practitioners/new" element={<PractitionerForm />} />
          <Route path="/practitioners/:id" element={<PractitionerForm />} />
        </Routes>
      </main>
    </>
  );
}
