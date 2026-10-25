import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { dojosApi, membershipsApi, practitionersApi, ranksApi } from '../api.js';

const rankLabel = (ranks, code) => {
  const r = ranks.find((x) => x.code === code);
  return r ? `${r.label} (${r.japanese})` : '';
};

const currentDojos = (p) =>
  p.memberships.filter((m) => !m.endDate).map((m) => m.dojoName).join(', ');

export function PractitionerList() {
  const [params, setParams] = useSearchParams();
  const dojoId = params.get('dojoId') || '';
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [dojos, setDojos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    dojosApi.list().then(setDojos).catch((e) => setError(e.message));
    ranksApi.list().then(setRanks).catch(() => {});
  }, []);
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
        <thead><tr><th>Name</th><th>Rank</th><th>Current dojos</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td>{p.firstName} {p.lastName}</td>
              <td>{rankLabel(ranks, p.rank)}</td>
              <td>{currentDojos(p)}</td>
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


const empty = { firstName: '', lastName: '', email: '', rank: '', startDate: '' };
const emptyMembership = { dojoId: '', startDate: '', endDate: '' };

export function PractitionerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [dojos, setDojos] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [newMembership, setNewMembership] = useState(emptyMembership);
  const [error, setError] = useState('');

  const load = () =>
    practitionersApi.get(id).then((p) => {
      setForm({
        firstName: p.firstName, lastName: p.lastName, email: p.email ?? '', rank: p.rank ?? '',
        startDate: p.startDate ?? '',
      });
      setMemberships(p.memberships);
    }).catch((e) => setError(e.message));

  useEffect(() => {
    ranksApi.list().then(setRanks).catch(() => {});
    dojosApi.list().then(setDojos).catch((e) => setError(e.message));
    if (id) load();
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setM = (k) => (e) => setNewMembership({ ...newMembership, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const data = { ...form, rank: form.rank || null, startDate: form.startDate || null };
    try {
      if (id) {
        await practitionersApi.update(id, data);
        navigate('/practitioners');
      } else {
        const created = await practitionersApi.create(data);
        navigate(`/practitioners/${created.id}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const addMembership = async (e) => {
    e.preventDefault();
    try {
      await membershipsApi.create(id, {
        dojoId: Number(newMembership.dojoId),
        startDate: newMembership.startDate || null,
        endDate: newMembership.endDate || null,
      });
      setNewMembership(emptyMembership);
      setError('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const endMembership = async (m) => {
    const endDate = window.prompt('End date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
    if (!endDate) return;
    try {
      await membershipsApi.update(m.id, { dojoId: m.dojoId, startDate: m.startDate, endDate });
      setError('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeMembership = async (m) => {
    if (!window.confirm(`Remove membership at ${m.dojoName}?`)) return;
    try {
      await membershipsApi.remove(m.id);
      load();
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
        <label>Rank
          <select value={form.rank} onChange={set('rank')}>
            <option value="">Unranked</option>
            {ranks.map((r) => <option key={r.code} value={r.code}>{rankLabel([r], r.code)}  -  {r.title}</option>)}
          </select>
        </label>
        <label>Started aikido<input type="date" value={form.startDate} onChange={set('startDate')} /></label>
        <button type="submit">Save</button>
        <Link to="/practitioners">Cancel</Link>
      </form>
      {id && (
        <>
          <h2>Dojo memberships</h2>
          <table>
            <thead><tr><th>Dojo</th><th>From</th><th>To</th><th>Actions</th></tr></thead>
            <tbody>
              {memberships.map((m) => (
                <tr key={m.id}>
                  <td>{m.dojoName}</td>
                  <td>{m.startDate}</td>
                  <td>{m.endDate || 'present'}</td>
                  <td>
                    {!m.endDate && <button onClick={() => endMembership(m)}>End</button>}
                    <button onClick={() => removeMembership(m)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>Add membership</h3>
          <form onSubmit={addMembership}>
            <label>Dojo
              <select required value={newMembership.dojoId} onChange={setM('dojoId')}>
                <option value="">Select dojo</option>
                {dojos.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label>From<input type="date" value={newMembership.startDate} onChange={setM('startDate')} /></label>
            <label>To (blank if current)
              <input type="date" value={newMembership.endDate} onChange={setM('endDate')} />
            </label>
            <button type="submit">Add</button>
          </form>
        </>
      )}
    </div>
  );
}
