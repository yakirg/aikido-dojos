import React, { useEffect, useState } from 'react';
import { rankAwardsApi } from '../api.js';

const label = (ranks, code) => {
  const r = ranks.find((x) => x.code === code);
  return r ? `${r.label} (${r.japanese})` : code;
};

function Row({ a, ranks, onSaved, onError }) {
  const [draft, setDraft] = useState({ rank: a.rank, awardedDate: a.awardedDate || '' });
  useEffect(() => { setDraft({ rank: a.rank, awardedDate: a.awardedDate || '' }); }, [a.rank, a.awardedDate]);
  const dirty = draft.rank !== a.rank || draft.awardedDate !== (a.awardedDate || '');

  const save = async () => {
    try {
      await rankAwardsApi.update(a.id, { rank: draft.rank, awardedDate: draft.awardedDate || null });
      onError('');
      onSaved();
    } catch (e) { onError(e.message); }
  };
  const remove = async () => {
    if (!window.confirm('Remove this rank entry?')) return;
    try { await rankAwardsApi.remove(a.id); onError(''); onSaved(); } catch (e) { onError(e.message); }
  };

  return (
    <tr>
      <td>
        <select aria-label="Rank" value={draft.rank} onChange={(e) => setDraft({ ...draft, rank: e.target.value })}>
          {ranks.map((r) => <option key={r.code} value={r.code}>{label(ranks, r.code)}</option>)}
        </select>
      </td>
      <td>
        <input type="date" aria-label="Awarded" value={draft.awardedDate}
          onChange={(e) => setDraft({ ...draft, awardedDate: e.target.value })} />
      </td>
      <td>
        <button type="button" onClick={save} disabled={!dirty}>Save</button>
        <button type="button" onClick={remove}>Remove</button>
      </td>
    </tr>
  );
}

export default function RankHistory({ practitionerId, history, ranks, onChange }) {
  const [error, setError] = useState('');
  const [add, setAdd] = useState({ rank: '', awardedDate: '' });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await rankAwardsApi.create(practitionerId, { rank: add.rank, awardedDate: add.awardedDate || null });
      setAdd({ rank: '', awardedDate: '' });
      setError('');
      onChange();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h2>Rank history</h2>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>Rank</th><th>Awarded</th><th>Actions</th></tr></thead>
        <tbody>
          {history.map((a) => <Row key={a.id} a={a} ranks={ranks} onSaved={onChange} onError={setError} />)}
        </tbody>
      </table>
      <h3>Add rank</h3>
      <form onSubmit={submit}>
        <label>Rank
          <select required value={add.rank} onChange={(e) => setAdd({ ...add, rank: e.target.value })}>
            <option value="">Select…</option>
            {ranks.map((r) => <option key={r.code} value={r.code}>{label(ranks, r.code)}</option>)}
          </select>
        </label>
        <label>Awarded
          <input type="date" value={add.awardedDate} onChange={(e) => setAdd({ ...add, awardedDate: e.target.value })} />
        </label>
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
