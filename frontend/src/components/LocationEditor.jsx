import React, { useEffect, useState } from 'react';
import { usePendingDelete } from './MyPendingEdits.jsx';
import { dojoLocationsApi } from '../api.js';
import { SortTh, dateKey, useSort } from './Sort.jsx';

const DATE_PATTERN = '\\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\\d|3[01]))?)?';
const EMPTY = { address: '', city: '', state: '', postalCode: '', country: '', startDate: '', endDate: '' };

function DateInput({ label, value, onChange }) {
  return (
    <input type="text" inputMode="numeric" placeholder="YYYY, YYYY-MM or YYYY-MM-DD" title="Year, year-month or full date"
      pattern={DATE_PATTERN} size="14" aria-label={label} value={value} onChange={onChange} />
  );
}

const toDraft = (l) => Object.fromEntries(Object.keys(EMPTY).map((k) => [k, l[k] || '']));
const toBody = (d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v || null]));

function Row({ l, onSaved, onError }) {
  const [draft, setDraft] = useState(toDraft(l));
  useEffect(() => { setDraft(toDraft(l)); }, [l]);
  const initial = toDraft(l);
  const dirty = Object.keys(EMPTY).some((k) => draft[k] !== initial[k]);
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  const save = async () => {
    try { await dojoLocationsApi.update(l.id, toBody(draft)); onError(''); onSaved(); } catch (e) { onError(e.message); }
  };
  const remove = async () => {
    if (!window.confirm('Remove this location?')) return;
    try { await dojoLocationsApi.remove(l.id); onError(''); onSaved(); } catch (e) { onError(e.message); }
  };

  const gone = usePendingDelete(`/api/locations/${l.id}`);
  return (
    <tr className={gone ? 'pending-delete' : ''}>
      <td><input aria-label="Address" value={draft.address} onChange={set('address')} /></td>
      <td><input aria-label="City" value={draft.city} onChange={set('city')} /></td>
      <td><input aria-label="State" size="6" value={draft.state} onChange={set('state')} /></td>
      <td><input aria-label="Postal code" size="8" value={draft.postalCode} onChange={set('postalCode')} /></td>
      <td><input aria-label="Country" required value={draft.country} onChange={set('country')} /></td>
      <td><DateInput label="Location from" value={draft.startDate} onChange={set('startDate')} /></td>
      <td><DateInput label="Location to" value={draft.endDate} onChange={set('endDate')} /></td>
      <td className="row-actions">
        <button type="button" onClick={save} disabled={!dirty || !draft.country}>Save</button>
        <button type="button" onClick={remove}>Remove</button>
      </td>
    </tr>
  );
}

/** Where a dojo has been located over time; the latest open-ended location is the current one. */
export default function LocationEditor({ dojoId, onChange }) {
  const [items, setItems] = useState([]);
  const { rows, sort, onSort } = useSort(items, {
    address: (l) => l.address || '', city: (l) => l.city || '', state: (l) => l.state || '',
    postalCode: (l) => l.postalCode || '', country: (l) => l.country || '',
    from: (l) => dateKey(l.startDate), to: (l) => dateKey(l.endDate),
  }, { by: 'from', desc: false });
  const [error, setError] = useState('');
  const [add, setAdd] = useState(EMPTY);
  const set = (k) => (e) => setAdd({ ...add, [k]: e.target.value });

  const load = () => dojoLocationsApi.forDojo(dojoId).then((r) => setItems(Array.isArray(r) ? r : [])).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [dojoId]);
  const reload = () => { load(); if (onChange) onChange(); };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await dojoLocationsApi.create(dojoId, toBody(add));
      setAdd(EMPTY);
      setError('');
      reload();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h2>Locations</h2>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <SortTh label="Address" field="address" sort={sort} onSort={onSort} />
            <SortTh label="City" field="city" sort={sort} onSort={onSort} />
            <SortTh label="State" field="state" sort={sort} onSort={onSort} />
            <SortTh label="Postal code" field="postalCode" sort={sort} onSort={onSort} />
            <SortTh label="Country" field="country" sort={sort} onSort={onSort} />
            <SortTh label="From" field="from" sort={sort} onSort={onSort} />
            <SortTh label="To" field="to" sort={sort} onSort={onSort} />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => <Row key={l.id} l={l} onSaved={reload} onError={setError} />)}
        </tbody>
      </table>
      <h3>Add location</h3>
      <form onSubmit={submit}>
        <label>Address<input value={add.address} onChange={set('address')} /></label>
        <label>City<input value={add.city} onChange={set('city')} /></label>
        <label>State<input value={add.state} onChange={set('state')} /></label>
        <label>Postal code<input value={add.postalCode} onChange={set('postalCode')} /></label>
        <label>Country<input required value={add.country} onChange={set('country')} /></label>
        <label>From <DateInput label="Location from" value={add.startDate} onChange={set('startDate')} /></label>
        <label>To (blank if current) <DateInput label="Location to" value={add.endDate} onChange={set('endDate')} /></label>
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
