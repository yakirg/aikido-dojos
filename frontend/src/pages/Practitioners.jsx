import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { dojosApi, practitionersApi } from '../api.js';

export function PractitionerList() {
  const [params, setParams] = useSearchParams();
  const dojoId = params.get('dojoId') || '';
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [dojos, setDojos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { dojosApi.list().then(setDojos).catch((e) => setError(e.message)); }, []);
  const load = () =>
    practitionersApi.list({ q, dojoId }).then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [q, dojoId]);

  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.firstName} ${p.lastName}?`)) return;
    try {
      await practitionersApi.remove(p.id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h1>Practitioners</h1>
      <div className="toolbar">
        <input placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter by dojo" value={dojoId}
          onChange={(e) => setParams(e.target.value ? { dojoId: e.target.value } : {})}>
          <option value="">All dojos</option>
          {dojos.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <Link className="btn" to="/practitioners/new">Add practitioner</Link>
      </div>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>Name</th><th>Rank</th><th>Dojo</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td>{p.firstName} {p.lastName}</td>
              <td>{p.rank}</td>
              <td>{p.dojoName}</td>
              <td>
                <Link className="btn" to={`/practitioners/${p.id}`}>Edit</Link>
                <button onClick={() => remove(p)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const empty = { firstName: '', lastName: '', email: '', rank: '', startDate: '', dojoId: '' };

export function PractitionerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [dojos, setDojos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    dojosApi.list().then(setDojos).catch((e) => setError(e.message));
    if (!id) return;
    practitionersApi.get(id).then((p) => setForm({
      firstName: p.firstName, lastName: p.lastName, email: p.email ?? '', rank: p.rank ?? '',
      startDate: p.startDate ?? '', dojoId: p.dojoId ?? '',
    })).catch((e) => setError(e.message));
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      startDate: form.startDate || null,
      dojoId: form.dojoId === '' ? null : Number(form.dojoId),
    };
    try {
      if (id) await practitionersApi.update(id, data); else await practitionersApi.create(data);
      navigate('/practitioners');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>{id ? 'Edit practitioner' : 'New practitioner'}</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={submit}>
        <label>First name<input required value={form.firstName} onChange={set('firstName')} /></label>
        <label>Last name<input required value={form.lastName} onChange={set('lastName')} /></label>
        <label>Email<input type="email" value={form.email} onChange={set('email')} /></label>
        <label>Rank<input value={form.rank} onChange={set('rank')} /></label>
        <label>Start date<input type="date" value={form.startDate} onChange={set('startDate')} /></label>
        <label>Dojo
          <select value={form.dojoId} onChange={set('dojoId')}>
            <option value="">No dojo</option>
            {dojos.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <button type="submit">Save</button>
        <Link to="/practitioners">Cancel</Link>
      </form>
    </div>
  );
}
