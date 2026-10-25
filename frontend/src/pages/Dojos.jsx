import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { dojosApi, practitionersApi } from '../api.js';

export function DojoList() {
  const [q, setQ] = useState('');
  const [dojos, setDojos] = useState([]);
  const [error, setError] = useState('');

  const load = () =>
    dojosApi.list({ q }).then(setDojos).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [q]);

  const remove = async (d) => {
    if (!window.confirm(`Delete ${d.name}?`)) return;
    try {
      await dojosApi.remove(d.id);
      setError('');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h1>Dojos</h1>
      <div className="toolbar">
        <input placeholder="Search name, city, country" value={q} onChange={(e) => setQ(e.target.value)} />
        <Link className="btn" to="/dojos/new">Add dojo</Link>
      </div>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>Name</th><th>City</th><th>Country</th><th>Actions</th></tr></thead>
        <tbody>
          {dojos.map((d) => (
            <tr key={d.id}>
              <td><Link to={`/practitioners?dojoId=${d.id}`}>{d.name}</Link></td>
              <td>{d.city}</td>
              <td>{d.country}</td>
              <td>
                <Link className="btn" to={`/dojos/${d.id}`}>Edit</Link>
                <button onClick={() => remove(d)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const empty = { name: '', city: '', country: '', address: '', website: '', foundedYear: '' };

export function DojoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    dojosApi.get(id).then((d) => setForm({ ...empty, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ''])) }))
      .catch((e) => setError(e.message));
    practitionersApi.list({ dojoId: id }).then(setMembers).catch(() => {});
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const data = { ...form, foundedYear: form.foundedYear === '' ? null : Number(form.foundedYear) };
    try {
      if (id) await dojosApi.update(id, data); else await dojosApi.create(data);
      navigate('/dojos');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>{id ? 'Edit dojo' : 'New dojo'}</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={submit}>
        <label>Name<input required value={form.name} onChange={set('name')} /></label>
        <label>City<input value={form.city} onChange={set('city')} /></label>
        <label>Country<input required value={form.country} onChange={set('country')} /></label>
        <label>Address<input value={form.address} onChange={set('address')} /></label>
        <label>Website<input value={form.website} onChange={set('website')} /></label>
        <label>Founded year<input type="number" value={form.foundedYear} onChange={set('foundedYear')} /></label>
        <button type="submit">Save</button>
        <Link to="/dojos">Cancel</Link>
      </form>
      {id && (
        <>
          <h2>Practitioners</h2>
          <ul>
            {members.map((p) => (
              <li key={p.id}><Link to={`/practitioners/${p.id}`}>{p.firstName} {p.lastName}</Link></li>
            ))}
          </ul>
          <Link className="btn" to="/practitioners/new">Add practitioner</Link>
        </>
      )}
    </div>
  );
}
