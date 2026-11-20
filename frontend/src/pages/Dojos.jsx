import MyPendingEdits, { PendingTr } from '../components/MyPendingEdits.jsx';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LeaderEditor from '../components/LeaderEditor.jsx';
import LocationEditor from '../components/LocationEditor.jsx';
import MembershipEditor from '../components/MembershipEditor.jsx';
import { SortTh, dateKey, useSort } from '../components/Sort.jsx';
import { ZIP_LOOKUP_COUNTRIES, dojoLocationsApi, dojosApi, leadersApi, locationsApi, membershipsApi, practitionersApi } from '../api.js';

export function DojoList() {
  const [q, setQ] = useState('');
  const [dojos, setDojos] = useState([]);
  const { rows, sort, onSort } = useSort(dojos, { name: (d) => d.name, city: (d) => d.city || '', state: (d) => d.state || '', country: (d) => d.country || '', founded: (d) => dateKey(d.foundedDate), founders: (d) => (d.founders || []).map((f) => f.name).join(', ') });
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
      <h1>Dojos</h1><MyPendingEdits />
      <div className="toolbar">
        <input placeholder="Search name, city, country" value={q} onChange={(e) => setQ(e.target.value)} />
        <Link className="btn" to="/dojos/new">Add dojo</Link>
      </div>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><SortTh label="Name" field="name" sort={sort} onSort={onSort} /><SortTh label="City" field="city" sort={sort} onSort={onSort} /><SortTh label="State" field="state" sort={sort} onSort={onSort} /><SortTh label="Country" field="country" sort={sort} onSort={onSort} /><SortTh label="Founded" field="founded" sort={sort} onSort={onSort} /><SortTh label="Founders" field="founders" sort={sort} onSort={onSort} /><th>Actions</th></tr></thead>
        <tbody>
          {rows.map((d) => (
            <PendingTr key={d.id} path={`/api/dojos/${d.id}`}>
              <td><Link to={`/dojos/${d.id}/view`}>{d.name}</Link></td>
              <td>{d.city}</td>
              <td>{d.state}</td>
              <td>{d.country}</td>
              <td>{d.foundedDate}</td>
              <td>{(d.founders || []).map((f, i) => (
                <span key={f.id}>{i > 0 && ', '}<Link to={`/practitioners/${f.id}`}>{f.name}</Link></span>
              ))}</td>
              <td className="row-actions">
                <Link className="btn" to={`/dojos/${d.id}`}>Edit</Link>
                <button onClick={() => remove(d)}>Delete</button>
              </td>
            </PendingTr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DojoDetail() {
  const { id } = useParams();
  const [dojo, setDojo] = useState(null);
  const [members, setMembers] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [places, setPlaces] = useState([]);
  const [error, setError] = useState('');
  const placeSort = useSort(places, { place: (x) => x.address || x.city || '', from: (x) => dateKey(x.startDate), to: (x) => dateKey(x.endDate) }, { by: 'from', desc: false });
  const nameFrom = { name: (x) => x.practitionerName || '', from: (x) => dateKey(x.startDate), to: (x) => dateKey(x.endDate) };
  const leaderSort = useSort(leaders, nameFrom, { by: 'from', desc: false });
  const memberSort = useSort(members, nameFrom, { by: 'from', desc: false });

  useEffect(() => {
    leadersApi.forDojo(id).then(setLeaders).catch(() => {});
    dojoLocationsApi.forDojo(id).then((r) => setPlaces(Array.isArray(r) ? r : [])).catch(() => {});
    dojosApi.get(id).then(setDojo).catch((e) => setError(e.message));
    membershipsApi.forDojo(id).then(setMembers).catch(() => {});
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!dojo) return <p>Loading…</p>;

  const location = [dojo.address, dojo.city, dojo.state, dojo.postalCode, dojo.country].filter(Boolean).join(', ');
  return (
    <div>
      <h1>{dojo.name}</h1><MyPendingEdits match={(c) => c.path.includes(`/dojos/${id}`)} />
      <dl>
        <dt>Location</dt><dd>{location || '—'}</dd>
        <dt>Founded</dt><dd>{dojo.foundedDate || '—'}</dd>
        <dt>Closed</dt><dd>{dojo.closedDate || '—'}</dd>
        <dt>Founders</dt>
        <dd>
          {dojo.founders?.length
            ? dojo.founders.map((f, i) => (
              <span key={f.id}>{i > 0 && ', '}<Link to={`/practitioners/${f.id}`}>{f.name}</Link></span>
            ))
            : '—'}
        </dd>
        <dt>Website</dt>
        <dd>{dojo.website ? <a href={dojo.website} target="_blank" rel="noreferrer">{dojo.website}</a> : '—'}</dd>
      </dl>
      {places.length > 1 && (
        <>
          <h2>Location history</h2>
          <table>
            <thead><tr><SortTh label="Location" field="place" sort={placeSort.sort} onSort={placeSort.onSort} /><SortTh label="From" field="from" sort={placeSort.sort} onSort={placeSort.onSort} /><SortTh label="To" field="to" sort={placeSort.sort} onSort={placeSort.onSort} /></tr></thead>
            <tbody>
              {placeSort.rows.map((p) => (
                <tr key={p.id}>
                  <td>{[p.address, p.city, p.state, p.postalCode, p.country].filter(Boolean).join(', ')}</td>
                  <td>{p.startDate || '?'}</td>
                  <td>{p.endDate || 'present'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <h2>Leaders</h2>
      {leaders.length === 0 ? <p>No leaders recorded.</p> : (
        <table>
          <thead><tr><SortTh label="Name" field="name" sort={leaderSort.sort} onSort={leaderSort.onSort} /><SortTh label="From" field="from" sort={leaderSort.sort} onSort={leaderSort.onSort} /><SortTh label="To" field="to" sort={leaderSort.sort} onSort={leaderSort.onSort} /><th></th></tr></thead>
          <tbody>
            {leaderSort.rows.map((l) => (
              <tr key={l.id}>
                <td><Link to={`/practitioners/${l.practitionerId}`}>{l.practitionerName}</Link></td>
                <td>{l.startDate || '?'}</td>
                <td>{l.endDate || 'present'}</td>
                <td>{l.founder ? 'Founder' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2>Practitioners</h2>
      {members.length === 0 ? <p>No practitioners yet.</p> : (
        <table>
          <thead><tr><SortTh label="Name" field="name" sort={memberSort.sort} onSort={memberSort.onSort} /><SortTh label="From" field="from" sort={memberSort.sort} onSort={memberSort.onSort} /><SortTh label="To" field="to" sort={memberSort.sort} onSort={memberSort.onSort} /></tr></thead>
          <tbody>
            {memberSort.rows.map((m) => (
              <tr key={m.id}>
                <td><Link to={`/practitioners/${m.practitionerId}`}>{m.practitionerName}</Link></td>
                <td>{m.startDate || '?'}</td>
                <td>{m.endDate || 'present'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Link className="btn" to={`/dojos/${id}`}>Edit dojo</Link>
      <Link className="btn" to="/dojos">Back to dojos</Link>
    </div>
  );
}

const empty = { name: '', city: '', state: '', postalCode: '', country: '', address: '', website: '', foundedDate: '', closedDate: '' };

export function DojoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...empty, country: 'United States' });
  const [members, setMembers] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [error, setError] = useState('');
  const [countries, setCountries] = useState([]);
  const [lookupMsg, setLookupMsg] = useState('');

  const zipSupported = ZIP_LOOKUP_COUNTRIES.has(countries.find((c) => c.name === form.country)?.code);

  const lookup = async () => {
    const match = countries.find((c) => c.name === form.country);
    if (!match) { setLookupMsg('Select a country first'); return; }
    try {
      const r = await locationsApi.lookup(match.code, form.postalCode);
      setForm((f) => ({ ...f, city: r.city || f.city, state: r.state || f.state, postalCode: r.postalCode || f.postalCode }));
      setLookupMsg('');
    } catch (e) {
      setLookupMsg(e.message || 'Lookup failed');
    }
  };

  useEffect(() => {
    locationsApi.countries().then((c) => setCountries(Array.isArray(c) ? c : [])).catch(() => {});
    practitionersApi.list().then(setPractitioners).catch(() => {});
    if (!id) return;
    dojosApi.get(id).then((d) => setForm({
      ...empty,
      ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ''])),
    })).catch((e) => setError(e.message));
    loadMembers();
  }, [id]);

  const loadMembers = () => membershipsApi.forDojo(id).then(setMembers).catch(() => {});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      foundedDate: form.foundedDate || null,
      closedDate: form.closedDate || null,
    };
    try {
      if (id) await dojosApi.update(id, data); else await dojosApi.create(data);
      navigate('/dojos');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>{id ? 'Edit dojo' : 'New dojo'}</h1><MyPendingEdits match={(c) => !id || c.path.includes(`/dojos/${id}`)} />
      {error && <p className="error">{error}</p>}
      <form onSubmit={submit}>
        <label>Name<input required value={form.name} onChange={set('name')} /></label>
        {id ? (
          <p>Current location: {[form.address, form.city, form.state, form.postalCode, form.country].filter(Boolean).join(', ') || '—'} (edit under Locations below)</p>
        ) : (<>
        <label>Country
          <select required value={form.country} onChange={set('country')}>
            <option value="">Select…</option>
            {form.country && !countries.some((c) => c.name === form.country) &&
              <option value={form.country}>{form.country}</option>}
            {countries.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
          </select>
        </label>
        <label>Postal / ZIP code
          <input value={form.postalCode} onChange={set('postalCode')}
            onBlur={() => zipSupported && form.postalCode && !form.city && lookup()} />
        </label>
        {zipSupported && <button type="button" onClick={lookup} disabled={!form.postalCode}>Look up address</button>}
        {lookupMsg && <p className="error">{lookupMsg}</p>}
        <label>City<input value={form.city} onChange={set('city')} /></label>
        <label>State / Province<input value={form.state} onChange={set('state')} /></label>
        <label>Address<input value={form.address} onChange={set('address')} /></label>
        </>)}
        <label>Website<input value={form.website} onChange={set('website')} /></label>
        <label>Founded<input type="text" inputMode="numeric" placeholder="YYYY, YYYY-MM or YYYY-MM-DD" title="Year, year-month or full date" pattern="\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?" size="14" value={form.foundedDate} onChange={set('foundedDate')} /></label>
        <label>Closed<input type="text" inputMode="numeric" placeholder="YYYY, YYYY-MM or YYYY-MM-DD" title="Year, year-month or full date" pattern="\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?" size="14" value={form.closedDate} onChange={set('closedDate')} /></label>
        <button type="submit">Save</button>
        <Link to="/dojos">Cancel</Link>
      </form>
      {id && <LocationEditor dojoId={id} />}
      {id && <LeaderEditor dojoId={id} foundedDate={form.foundedDate} practitioners={practitioners} />}
      {id && (
        <MembershipEditor mode="dojo" ownerId={id} items={members} options={practitioners} onChange={loadMembers} />
      )}
    </div>
  );
}
