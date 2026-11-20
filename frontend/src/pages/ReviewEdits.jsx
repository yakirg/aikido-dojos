import React, { useEffect, useState } from 'react';
import { changesApi, dojosApi, practitionersApi } from '../api.js';

const FIELD_LABELS = { firstName: 'First name', lastName: 'Last name', startDate: 'Start', endDate: 'End', foundedDate: 'Founded', closedDate: 'Closed', postalCode: 'Postal code', awardedDate: 'Awarded' };

function Payload({ body, dojos, people }) {
  if (!body) return null;
  let data;
  try { data = JSON.parse(body); } catch { return <code>{body}</code>; }
  const rows = Object.entries(data).filter(([, v]) => v !== null && v !== '');
  return (
    <dl className="payload">
      {rows.map(([k, v]) => (
        <React.Fragment key={k}>
          <dt>{k === 'dojoId' ? 'Dojo' : k === 'practitionerId' ? 'Practitioner' : (FIELD_LABELS[k] || k)}</dt>
          <dd>{k === 'dojoId' ? (dojos[v] || String(v)) : k === 'practitionerId' ? (people[v] || String(v)) : String(v)}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export default function ReviewEdits({ onChange }) {
  const [filter, setFilter] = useState('PENDING');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [dojos, setDojos] = useState({});
  const [people, setPeople] = useState({});
  useEffect(() => {
    dojosApi.list().then((r) => {
      const m = {};
      (Array.isArray(r) ? r : []).forEach((d) => { if (d && d.id != null) m[d.id] = d.name; });
      setDojos(m);
    }).catch(() => {});
    practitionersApi.list().then((r) => {
      const arr = Array.isArray(r) ? r : (r && Array.isArray(r.content) ? r.content : []);
      const m = {};
      arr.forEach((p) => { if (p && p.id != null) m[p.id] = `${p.firstName} ${p.lastName}`; });
      setPeople(m);
    }).catch(() => {});
  }, []);

  const load = () => changesApi.list(filter === 'ALL' ? '' : filter).then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [filter]);

  const act = async (fn) => {
    try { await fn(); setError(''); } catch (e) {
      setError(e.message.startsWith('409') ? 'That edit could not be applied (see the error on the row); reject it or fix the data first.' : e.message);
    }
    await load();
    onChange?.();
  };

  const reject = (c) => {
    const note = window.prompt('Reason for rejecting (optional)');
    if (note !== null) act(() => changesApi.reject(c.id, note));
  };

  return (
    <div>
      <h1>Review edits</h1>
      <div className="toolbar">
        <select aria-label="Status" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All</option>
        </select>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {items.length === 0 ? <p>No edits.</p> : (
        <ul className="changes">
          {items.map((c) => (
            <li key={c.id} className={`change ${c.status.toLowerCase()}`}>
              <div>
                <strong>{c.action} {c.entityType}</strong>{c.label ? `: ${c.label}` : ''}
                {c.targetId ? ` (#${c.targetId})` : ''}
                <span className="meta"> · {c.submittedBy} · {new Date(c.submittedAt).toLocaleString()} · {c.status}</span>
              </div>
              <Payload body={c.body} dojos={dojos} people={people} />
              {c.error && <p className="error">{c.error}</p>}
              {c.reviewedBy && <p className="meta">Reviewed by {c.reviewedBy}{c.reviewNote ? `: ${c.reviewNote}` : ''}</p>}
              {c.status === 'PENDING' && (
                <div className="toolbar">
                  <button type="button" onClick={() => act(() => changesApi.approve(c.id))}>Approve</button>
                  <button type="button" onClick={() => reject(c)}>Reject</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
