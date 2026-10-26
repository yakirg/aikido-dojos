import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { membershipsApi } from '../api.js';

function Row({ m, mode, dojos, onSaved, onError }) {
  const initial = { dojoId: m.dojoId, startDate: m.startDate || '', endDate: m.endDate || '' };
  const [draft, setDraft] = useState(initial);
  useEffect(() => {
    setDraft({ dojoId: m.dojoId, startDate: m.startDate || '', endDate: m.endDate || '' });
  }, [m.dojoId, m.startDate, m.endDate]);
  const dirty = Number(draft.dojoId) !== m.dojoId || draft.startDate !== initial.startDate || draft.endDate !== initial.endDate;
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  const save = async () => {
    try {
      await membershipsApi.update(m.id, {
        dojoId: Number(draft.dojoId), startDate: draft.startDate || null, endDate: draft.endDate || null,
      });
      onError('');
      onSaved();
    } catch (e) { onError(e.message); }
  };
  const remove = async () => {
    if (!window.confirm('Remove this membership?')) return;
    try { await membershipsApi.remove(m.id); onError(''); onSaved(); } catch (e) { onError(e.message); }
  };

  return (
    <tr>
      <td>
        {mode === 'dojo'
          ? <Link to={`/practitioners/${m.practitionerId}`}>{m.practitionerName}</Link>
          : (
            <select aria-label="Dojo" value={draft.dojoId} onChange={set('dojoId')}>
              {dojos.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
      </td>
      <td><input type="text" inputMode="numeric" placeholder="YYYY, YYYY-MM or YYYY-MM-DD" title="Year, year-month or full date" pattern="\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?" size="14" aria-label="From" value={draft.startDate} onChange={set('startDate')} /></td>
      <td><input type="text" inputMode="numeric" placeholder="YYYY, YYYY-MM or YYYY-MM-DD" title="Year, year-month or full date" pattern="\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?" size="14" aria-label="To" value={draft.endDate} onChange={set('endDate')} /></td>
      <td>
        <button type="button" onClick={save} disabled={!dirty}>Save</button>
        <button type="button" onClick={remove}>Remove</button>
      </td>
    </tr>
  );
}

/**
 * mode 'dojo': items are a dojo's memberships; options are practitioners ({id, firstName, lastName}).
 * mode 'practitioner': items are a practitioner's memberships; options are dojos ({id, name}).
 */
export default function MembershipEditor({ mode, ownerId, items, options, onChange }) {
  const [error, setError] = useState('');
  const [add, setAdd] = useState({ otherId: '', startDate: '', endDate: '' });
  const dojos = mode === 'practitioner' ? options : [];
  const label = (o) => (mode === 'dojo' ? `${o.firstName} ${o.lastName}` : o.name);

  const submit = async (e) => {
    e.preventDefault();
    const practitionerId = mode === 'dojo' ? add.otherId : ownerId;
    const dojoId = mode === 'dojo' ? ownerId : add.otherId;
    try {
      await membershipsApi.create(practitionerId, {
        dojoId: Number(dojoId), startDate: add.startDate || null, endDate: add.endDate || null,
      });
      setAdd({ otherId: '', startDate: '', endDate: '' });
      setError('');
      onChange();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h2>{mode === 'dojo' ? 'Practitioners' : 'Dojo memberships'}</h2>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>{mode === 'dojo' ? 'Practitioner' : 'Dojo'}</th><th>From</th><th>To (blank = current)</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map((m) => <Row key={m.id} m={m} mode={mode} dojos={dojos} onSaved={onChange} onError={setError} />)}
        </tbody>
      </table>
      <h3>Add membership</h3>
      <form onSubmit={submit}>
        <label>{mode === 'dojo' ? 'Practitioner' : 'Dojo'}
          <select required value={add.otherId} onChange={(e) => setAdd({ ...add, otherId: e.target.value })}>
            <option value="">Select…</option>
            {options.map((o) => <option key={o.id} value={o.id}>{label(o)}</option>)}
          </select>
        </label>
        <label>From<input type="text" inputMode="numeric" placeholder="YYYY, YYYY-MM or YYYY-MM-DD" title="Year, year-month or full date" pattern="\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?" size="14" value={add.startDate} onChange={(e) => setAdd({ ...add, startDate: e.target.value })} /></label>
        <label>To (blank if current)
          <input type="text" inputMode="numeric" placeholder="YYYY, YYYY-MM or YYYY-MM-DD" title="Year, year-month or full date" pattern="\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?" size="14" value={add.endDate} onChange={(e) => setAdd({ ...add, endDate: e.target.value })} />
        </label>
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
