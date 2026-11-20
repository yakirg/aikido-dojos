import { usePendingDelete } from './MyPendingEdits.jsx';
import React, { useEffect, useState } from 'react';
import { rankAwardsApi } from '../api.js';
import { SortTh, dateKey, useSort } from './Sort.jsx';

const label = (ranks, code) => {
  const r = ranks.find((x) => x.code === code);
  return r ? `${r.label} (${r.japanese})` : code;
};

function DojoSelect({ dojos, value, onChange, ...rest }) {
  return (
    <select value={value} onChange={onChange} {...rest}>
      <option value="">(no dojo)</option>
      {dojos.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
    </select>
  );
}

function Row({ a, ranks, dojos, onSaved, onError }) {
  const init = { rank: a.rank, awardedDate: a.awardedDate || '', dojoId: a.dojoId ? String(a.dojoId) : '' };
  const [draft, setDraft] = useState(init);
  useEffect(() => { setDraft(init); }, [a.rank, a.awardedDate, a.dojoId]);
  const dirty = draft.rank !== init.rank || draft.awardedDate !== init.awardedDate || draft.dojoId !== init.dojoId;

  const save = async () => {
    try {
      await rankAwardsApi.update(a.id, { rank: draft.rank, awardedDate: draft.awardedDate || null, dojoId: draft.dojoId ? Number(draft.dojoId) : null });
      onError('');
      onSaved();
    } catch (e) { onError(e.message); }
  };
  const remove = async () => {
    if (!window.confirm('Remove this rank entry?')) return;
    try { await rankAwardsApi.remove(a.id); onError(''); onSaved(); } catch (e) { onError(e.message); }
  };

  const gone = usePendingDelete(`/api/rank-awards/${a.id}`);
  return (<tr className={gone ? 'pending-delete' : ''}>
      <td>
        <select aria-label="Rank" value={draft.rank} onChange={(e) => setDraft({ ...draft, rank: e.target.value })}>
          {ranks.map((r) => <option key={r.code} value={r.code}>{label(ranks, r.code)}</option>)}
        </select>
      </td>
      <td>
        <input type="text" inputMode="numeric" placeholder="YYYY, YYYY-MM or YYYY-MM-DD" title="Year, year-month or full date" pattern="\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?" size="14" aria-label="Awarded" value={draft.awardedDate}
          onChange={(e) => setDraft({ ...draft, awardedDate: e.target.value })} />
      </td>
      <td>
        <DojoSelect aria-label="Awarded at" dojos={dojos} value={draft.dojoId} onChange={(e) => setDraft({ ...draft, dojoId: e.target.value })} />
      </td>
      <td className="row-actions">
        <button type="button" onClick={save} disabled={!dirty}>Save</button>
        <button type="button" onClick={remove}>Remove</button>
      </td>
    </tr>
  );
}

export default function RankHistory({ practitionerId, history, ranks, dojos = [], onChange }) {
  const [error, setError] = useState('');
  const [add, setAdd] = useState({ rank: '', awardedDate: '', dojoId: '' });
  const [info, setInfo] = useState('');
  const rankIdx = (code) => ranks.findIndex((r) => r.code === code);
  const { rows, sort, onSort } = useSort(history, { rank: (a) => rankIdx(a.rank), awarded: (a) => dateKey(a.awardedDate), where: (a) => a.dojoName || '' }, { by: 'awarded', desc: false });

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await rankAwardsApi.create(practitionerId, { rank: add.rank, awardedDate: add.awardedDate || null, dojoId: add.dojoId ? Number(add.dojoId) : null });
      setAdd({ rank: '', awardedDate: '', dojoId: '' });
      setError('');
      setInfo(res && res.pending ? 'Rank submitted for administrator approval; it will appear once approved.' : '');
      onChange();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h2>Rank history</h2>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><SortTh label="Rank" field="rank" sort={sort} onSort={onSort} /><SortTh label="Awarded" field="awarded" sort={sort} onSort={onSort} /><SortTh label="Where" field="where" sort={sort} onSort={onSort} /><th>Actions</th></tr></thead>
        <tbody>
          {rows.map((a) => <Row key={a.id} a={a} ranks={ranks} dojos={dojos} onSaved={onChange} onError={setError} />)}
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
          <input type="text" inputMode="numeric" placeholder="YYYY, YYYY-MM or YYYY-MM-DD" title="Year, year-month or full date" pattern="\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?" size="14" value={add.awardedDate} onChange={(e) => setAdd({ ...add, awardedDate: e.target.value })} />
        </label>
        <label>Where
          <DojoSelect dojos={dojos} value={add.dojoId} onChange={(e) => setAdd({ ...add, dojoId: e.target.value })} />
        </label>
        <button type="submit">Add</button>
      </form>
      {info && <p className="notice" role="status">{info}</p>}
    </div>
  );
}
