import React from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { DojoList, DojoForm } from './pages/Dojos.jsx';
import { PractitionerList, PractitionerForm } from './pages/Practitioners.jsx';

export default function App() {
  return (
    <>
      <nav>
        <Link to="/dojos">Dojos</Link>
        <Link to="/practitioners">Practitioners</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/dojos" replace />} />
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
