import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leadersApi } from '../api.js';

const DATE_PATTERN = '\\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\\d|3[01]))?)?';

function DateInput({ label, value, onChange }) {
  return (
    <input type="text" inputMode="numeric" placeholder="YYYY, YYYY-MM or YYYY-MM-DD" title="Year, year-month or full date"
      pattern={DATE_PATTERN} size="14" aria-label={label} value={value} onChange={onChange} />
  );
}

function Row({ l, onSaved, onError }) {
  const initial = { startDate: l.startDate || '', endDate: l.endDate || '', founder: l.founder };
  const [draft, setDraft] = useState(initial);
  useEffect(() => {
    setDraft({ startDate: l.startDate || '', endDate: l.endDate || '', founder: l.founder });
  }, [l.startDate, l.endDate, l.founder]);
  const dirty = draft.startDate !== initial.startDate || draft.endDate !== initial.endDate || draft.founder !== initial.founder;

  const save = async () => {
    try {
      await leadersApi.update(l.id, {
        practitionerId: l.practitionerId, startDate: draft.startDate || null, endDate: draft.endDate || null, founder: draft.founder,
      });
      onError('');
      onSaved();
    } catch (e) { onError(e.message); }
  };
  const remove = async () => {
    if (!window.confirm('Remove this leader?')) return;
    try { await leadersApi.remove(l.id); onError(''); onSaved(); } catch (e) { onError(e.message); }
  };

  return (
    <tr>
      <td><Link to={`/practitioners/${l.practitionerId}`}>{l.practitionerName}</Link></td>
      <td><DateInput label="Leader from" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></td>
      <td><DateInput label="Leader to" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /></td>
      <td><input type="checkbox" aria-label="Founder" checked={draft.founder} onChange={(e) => setDraft({ ...draft, founder: e.target.checked })} /></td>
      <td>
        <button type="button" onClick={save} disabled={!dirty}>Save</button>
        <button type="button" onClick={remove}>Remove</button>
      </td>
    </tr>
  );
}

/** Leaders of a dojo with tenure dates; founders are the first leaders. */
export default function LeaderEditor({ dojoId, foundedDate, practitioners, onChange }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [add, setAdd] = useState({ practitionerId: '', startDate: '', endDate: '', founder: false });

  const load = () => leadersApi.forDojo(dojoId).then((r) => setItems(Array.isArray(r) ? r : [])).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [dojoId]);
  const reload = () => { load(); if (onChange) onChange(); };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await leadersApi.create(dojoId, {
        practitionerId: Number(add.practitionerId), startDate: add.startDate || null, endDate: add.endDate || null, founder: add.founder,
      });
      setAdd({ practitionerId: '', startDate: '', endDate: '', founder: false });
      setError('');
      reload();
    } catch (err) { setError(err.message); }
  };

  const toggleFounder = (checked) => setAdd({
    ...add, founder: checked, startDate: checked && !add.startDate && foundedDate ? foundedDate : add.startDate,
  });

  return (
    <div>
      <h2>Leaders</h2>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>Leader</th><th>From</th><th>To (blank = current)</th><th>Founder</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map((l) => <Row key={l.id} l={l} onSaved={reload} onError={setError} />)}
        </tbody>
      </table>
      <h3>Add leader</h3>
      <form onSubmit={submit}>
        <label>Practitioner
          <select required value={add.practitionerId} onChange={(e) => setAdd({ ...add, practitionerId: e.target.value })}>
            <option value="">Select…</option>
            {practitioners.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
          </select>
        </label>
        <label>Founder (first leader)
          <input type="checkbox" checked={add.founder} onChange={(e) => toggleFounder(e.target.checked)} />
        </label>
        <label>From <DateInput label="Leader from" value={add.startDate} onChange={(e) => setAdd({ ...add, startDate: e.target.value })} /></label>
        <label>To (blank if current) <DateInput label="Leader to" value={add.endDate} onChange={(e) => setAdd({ ...add, endDate: e.target.value })} /></label>
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
