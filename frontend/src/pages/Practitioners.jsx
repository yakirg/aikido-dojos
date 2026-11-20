import MyPendingEdits, { PendingTr } from '../components/MyPendingEdits.jsx';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { dojosApi, practitionersApi, ranksApi } from '../api.js';
import PractitionerHistory from '../components/PractitionerHistory.jsx';
import RankHistory from '../components/RankHistory.jsx';
import MembershipEditor from '../components/MembershipEditor.jsx';
import { SortTh, dateKey, useSort } from '../components/Sort.jsx';

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
  const rankIdx = (code) => ranks.findIndex((r) => r.code === code);
  const { rows, sort, onSort } = useSort(items, { name: (p) => `${p.lastName} ${p.firstName}`, rank: (p) => rankIdx(p.rank), dojos: (p) => currentDojos(p) });
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
      <h1>Practitioners</h1><MyPendingEdits />
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
        <thead><tr><SortTh label="Name" field="name" sort={sort} onSort={onSort} /><SortTh label="Rank" field="rank" sort={sort} onSort={onSort} /><SortTh label="Current dojos" field="dojos" sort={sort} onSort={onSort} /><th>Actions</th></tr></thead>
        <tbody>
          {rows.map((p) => (
            <PendingTr key={p.id} path={`/api/practitioners/${p.id}`}>
              <td><Link to={`/practitioners/${p.id}`}>{p.firstName} {p.lastName}</Link></td>
              <td>{rankLabel(ranks, p.rank)}</td>
              <td>{p.memberships.filter((m) => !m.endDate).map((m, i) => (
                <React.Fragment key={m.id}>{i > 0 && ', '}<Link to={`/dojos/${m.dojoId}/view`}>{m.dojoName}</Link></React.Fragment>
              ))}</td>
              <td className="row-actions">
                <Link className="btn" to={`/practitioners/${p.id}/edit`}>Edit</Link>
                <button onClick={() => remove(p)}>Delete</button>
              </td>
            </PendingTr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PractitionerDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [ranks, setRanks] = useState([]);
  const memSort = useSort(p ? p.memberships : [], { name: (m) => m.dojoName || '', from: (m) => dateKey(m.startDate), to: (m) => dateKey(m.endDate) }, { by: 'from', desc: false });
  const histSort = useSort(p ? p.rankHistory : [], { rank: (h) => ranks.findIndex((r) => r.code === h.rank), awarded: (h) => dateKey(h.awardedDate), where: (h) => h.dojoName || '' }, { by: 'awarded', desc: true });
  const [error, setError] = useState('');

  useEffect(() => {
    ranksApi.list().then(setRanks).catch(() => {});
    practitionersApi.get(id).then(setP).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!p) return <p>Loading...</p>;

  const memberships = memSort.rows;
  const history = histSort.rows;
  return (
    <div>
      <h1>{p.firstName} {p.lastName}</h1><MyPendingEdits match={(c) => c.path.includes(`/practitioners/${id}`)} />
      <dl>
        <dt>Rank</dt><dd>{p.rank ? rankLabel(ranks, p.rank) : 'Unranked'}</dd>
        <dt>Started aikido</dt><dd>{p.startDate || '-'}</dd>
        <dt>Email</dt><dd>{p.email || '-'}</dd>
      </dl>
      <h2>Dojos</h2>
      {memberships.length === 0 ? <p>No dojos yet.</p> : (
        <table>
          <thead><tr><SortTh label="Dojo" field="name" sort={memSort.sort} onSort={memSort.onSort} /><SortTh label="From" field="from" sort={memSort.sort} onSort={memSort.onSort} /><SortTh label="To" field="to" sort={memSort.sort} onSort={memSort.onSort} /></tr></thead>
          <tbody>
            {memberships.map((m) => (
              <tr key={m.id}>
                <td><Link to={`/dojos/${m.dojoId}/view`}>{m.dojoName}</Link></td>
                <td>{m.startDate || '?'}</td>
                <td>{m.endDate || 'present'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2>History</h2>
      <PractitionerHistory p={p} />
      <h2>Rank history</h2>
      {history.length === 0 ? <p>No rank history yet.</p> : (
        <table>
          <thead><tr><SortTh label="Rank" field="rank" sort={histSort.sort} onSort={histSort.onSort} /><SortTh label="Awarded" field="awarded" sort={histSort.sort} onSort={histSort.onSort} /><SortTh label="Where" field="where" sort={histSort.sort} onSort={histSort.onSort} /></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}><td>{rankLabel(ranks, h.rank) || h.rank}</td><td>{h.awardedDate || '?'}</td><td>{h.dojoId ? <Link to={`/dojos/${h.dojoId}/view`}>{h.dojoName}</Link> : '-'}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <Link className="btn" to={`/practitioners/${id}/edit`}>Edit practitioner</Link>
      <Link className="btn" to="/practitioners">Back to practitioners</Link>
    </div>
  );
}
const empty = { firstName: '', lastName: '', email: '', rank: '', startDate: '' };
export function PractitionerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [dojos, setDojos] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [rankHistory, setRankHistory] = useState([]);
  const [error, setError] = useState('');

  const load = () =>
    practitionersApi.get(id).then((p) => {
      setForm({
        firstName: p.firstName, lastName: p.lastName, email: p.email ?? '', rank: p.rank ?? '',
        startDate: p.startDate ?? '',
      });
      setMemberships(p.memberships);
      setRankHistory(p.rankHistory || []);
    }).catch((e) => setError(e.message));

  useEffect(() => {
    ranksApi.list().then(setRanks).catch(() => {});
    dojosApi.list().then(setDojos).catch((e) => setError(e.message));
    if (id) load();
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const data = { ...form, rank: form.rank || null, startDate: form.startDate || null };
    try {
      if (id) {
        await practitionersApi.update(id, data);
        navigate('/practitioners');
      } else {
        const created = await practitionersApi.create(data);
        navigate(created.pending ? '/practitioners' : `/practitioners/${created.id}/edit`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>{id ? 'Edit practitioner' : 'New practitioner'}</h1><MyPendingEdits match={(c) => !id || c.path.includes(`/practitioners/${id}`)} />
      {error && <p className="error">{error}</p>}
      <form onSubmit={submit}>
        <label>First name<input required value={form.firstName} onChange={set('firstName')} /></label>
        <label>Last name<input required value={form.lastName} onChange={set('lastName')} /></label>
        <label>Email<input type="email" value={form.email} onChange={set('email')} /></label>
        {id ? (
          <p>Current rank: <strong>{form.rank ? rankLabel(ranks, form.rank) : 'Unranked'}</strong> (edit under Rank history)</p>
        ) : (
          <label>Rank
            <select value={form.rank} onChange={set('rank')}>
              <option value="">Unranked</option>
              {ranks.map((r) => <option key={r.code} value={r.code}>{rankLabel([r], r.code)}  -  {r.title}</option>)}
            </select>
          </label>
        )}
        <label>Started aikido<input type="text" inputMode="numeric" placeholder="YYYY, YYYY-MM or YYYY-MM-DD" title="Year, year-month or full date" pattern="\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?" size="14" value={form.startDate} onChange={set('startDate')} /></label>
        <button type="submit">Save</button>
        <Link to="/practitioners">Cancel</Link>
      </form>
      {id && <RankHistory practitionerId={id} history={rankHistory} ranks={ranks} dojos={dojos} onChange={load} />}
      {id && (
        <MembershipEditor mode="practitioner" ownerId={id} items={memberships} options={dojos} onChange={load} />
      )}
    </div>
  );
}
