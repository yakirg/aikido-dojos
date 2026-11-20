import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { leadersApi, practitionersApi } from '../api.js';

const lo = (d) => (d ? (d.length === 4 ? `${d}-01-01` : d.length === 7 ? `${d}-01` : d) : '0000-01-01');
const hi = (d) => (d ? lo(d) : '9999-12-31');
const overlaps = (a, b) => lo(a.startDate) < hi(b.endDate) && lo(b.startDate) < hi(a.endDate);
const ms = (s) => new Date(s).getTime();
const arr = (r) => (Array.isArray(r) ? r : []);

function useLeaders(memberships) {
  const [byDojo, setByDojo] = useState({});
  const key = arr(memberships).map((m) => m.dojoId).join(',');
  useEffect(() => {
    let live = true;
    const ids = [...new Set(arr(memberships).map((m) => m.dojoId))];
    Promise.all(ids.map((id) => leadersApi.forDojo(id).then((l) => [id, arr(l)]).catch(() => [id, []])))
      .then((e) => { if (live) setByDojo(Object.fromEntries(e)); });
    return () => { live = false; };
  }, [key]);
  return byDojo;
}

const MIN_DAYS = 60;
const overlapDays = (a, b) => {
  const s = lo(a.startDate) > lo(b.startDate) ? lo(a.startDate) : lo(b.startDate);
  const e = hi(a.endDate) < hi(b.endDate) ? hi(a.endDate) : hi(b.endDate);
  return (ms(e) - ms(s)) / 86400000;
};
const isTeacher = (m, l, all, selfId) => !!m.startDate && l.practitionerId !== selfId && overlapDays(m, l) >= MIN_DAYS && !all.some((o) => o.practitionerId === selfId && overlaps(o, l));

// Only the earliest teacher(s) count as ancestors; co-leaders from that time share the earliest overlap date.
function teachersOf(memberships, byDojo, selfId, expOf) {
  const out = new Map();
  for (const m of arr(memberships)) {
    for (const l of byDojo[m.dojoId] || []) {
      if (!isTeacher(m, l, byDojo[m.dojoId], selfId)) continue;
      const since = lo(m.startDate) > lo(l.startDate) ? lo(m.startDate) : lo(l.startDate);
      const e = out.get(l.practitionerId) || { id: l.practitionerId, name: l.practitionerName, dojos: new Set(), start: null, since };
      if (l.startDate && (!e.start || lo(l.startDate) < lo(e.start))) e.start = l.startDate;
      if (since < e.since) { e.since = since; e.dojos = new Set(); }
      if (since === e.since) e.dojos.add(m.dojoName);
      out.set(l.practitionerId, e);
    }
  }
  const all = [...out.values()];
  const first = all.map((e) => e.since).sort()[0];
  const tied = all.filter((e) => e.since === first);
  if (tied.length < 2) return tied;
  // Ties: the teacher with the longest experience (earliest practice start), then by last name.
  const exp = (e) => lo((expOf && expOf(e.id)) || e.start);
  const last = (e) => (e.name || '').trim().split(/\s+/).pop().toLowerCase();
  tied.sort((a, b) => exp(a).localeCompare(exp(b)) || last(a).localeCompare(last(b)));
  return [tied[0]];
}
export function PractitionerTimeline({ p }) {
  const byDojo = useLeaders(p.memberships);
  const rows = useMemo(() => arr(p.memberships).map((m) => ({
    m,
    leaders: (byDojo[m.dojoId] || []).filter((l, _i, all) => isTeacher(m, l, all, p.id)),
  })).sort((a, b) => lo(a.m.startDate).localeCompare(lo(b.m.startDate))), [p, byDojo]);
  if (rows.length === 0) return <p>No dojo memberships yet.</p>;

  const today = new Date().toISOString().slice(0, 10);
  const end = (d) => (d ? hi(d) : today);
  const starts = rows.flatMap(({ m, leaders }) => [m.startDate && lo(m.startDate), ...leaders.map((l) => l.startDate && lo(l.startDate))]).filter(Boolean);
  const min = starts.length ? starts.sort()[0] : lo(rows[0].m.startDate);
  const t0 = ms(min), t1 = Math.max(ms(today), t0 + 86400000);
  const pct = (s) => Math.max(0, Math.min(100, ((ms(s) - t0) / (t1 - t0)) * 100));
  const span = (from, to, bound) => {
    const a = from ? lo(from) : min;
    const b = end(to);
    const a2 = a < bound.a ? bound.a : a;
    const b2 = b > bound.b ? bound.b : b;
    return { left: `${pct(a2)}%`, width: `${Math.max(0.8, pct(b2) - pct(a2))}%` };
  };
  const y0 = Number(min.slice(0, 4)), y1 = Number(today.slice(0, 4));
  const step = Math.max(1, Math.ceil((y1 - y0) / 8));
  const ticks = [];
  for (let y = y0; y <= y1; y += step) ticks.push(y);

  return (
    <div className="phist">
      <div className="phist-axis">{ticks.map((y) => <span key={y} style={{ left: `${pct(`${y}-01-01`)}%` }}>{y}</span>)}</div>
      {rows.map(({ m, leaders }) => {
        const bound = { a: m.startDate ? lo(m.startDate) : min, b: end(m.endDate) };
        return (
          <div className="phist-block" key={m.id}>
            <div className="phist-label"><Link to={`/dojos/${m.dojoId}/view`}>{m.dojoName}</Link> <small>{m.startDate || '?'} – {m.endDate || 'present'}</small></div>
            <div className="phist-track"><div className="phist-bar" style={span(m.startDate, m.endDate, bound)} title={`${m.dojoName}`} /></div>
            {leaders.map((l) => (
              <div className="phist-track phist-leader" key={l.id}>
                <div className="phist-bar sub" style={span(l.startDate, l.endDate, bound)} title={`${l.practitionerName}${l.founder ? ' (founder)' : ''}`}>
                  <Link to={`/practitioners/${l.practitionerId}`}>{l.practitionerName}{l.founder ? ' ★' : ''}</Link>
                </div>
              </div>
            ))}
            {leaders.length === 0 && <div className="phist-none">No leaders recorded for this period</div>}
          </div>
        );
      })}
    </div>
  );
}

const gkey = (g) => g.map((x) => x.id).sort((a, b) => a - b).join('-');

// Teachers who led the same dojo at overlapping times are shown together as one group.
function groupPeople(people, byDojo) {
  const parent = new Map(people.map((x) => [x.id, x.id]));
  const find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
  const ids = new Set(people.map((x) => x.id));
  for (const ls of Object.values(byDojo)) {
    const here = ls.filter((l) => ids.has(l.practitionerId));
    for (let a = 0; a < here.length; a++) {
      for (let b = a + 1; b < here.length; b++) {
        if (overlaps(here[a], here[b])) parent.set(find(here[a].practitionerId), find(here[b].practitionerId));
      }
    }
  }
  const groups = new Map();
  for (const x of people) {
    const r = find(x.id);
    groups.set(r, [...(groups.get(r) || []), x]);
  }
  const key = (g) => g.map((x) => (x.start ? lo(x.start) : '9999')).sort()[0];
  return [...groups.values()].map((g) => g.sort((a, b) => a.name.localeCompare(b.name)))
    .sort((a, b) => key(a).localeCompare(key(b)) || a[0].name.localeCompare(b[0].name));
}

const GroupLabel = ({ group }) => group.map((x, i) => (
  <React.Fragment key={x.id}>{i > 0 && ' & '}<Link to={`/practitioners/${x.id}`}>{x.name}</Link></React.Fragment>
));

function Node({ group, via, depth, seen }) {
  const [people, setPeople] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.all(group.map((x) => practitionersApi.get(x.id).catch(() => ({ memberships: [] }))))
      .then((r) => { if (live) setPeople(r); });
    return () => { live = false; };
  }, [gkey(group)]);
  const allMs = people ? people.flatMap((p) => arr(p.memberships)) : [];
  const byDojo = useLeaders(allMs);
  const nextSeen = new Set(seen);
  group.forEach((x) => nextSeen.add(x.id));
  const teachers = new Map();
  if (people) {
    people.forEach((p, i) => teachersOf(p.memberships, byDojo, group[i].id).forEach((t) => {
      if (!nextSeen.has(t.id)) {
        const e = teachers.get(t.id) || { ...t, dojos: new Set() };
        t.dojos.forEach((d) => e.dojos.add(d));
        teachers.set(t.id, e);
      }
    }));
  }
  const groups = groupPeople([...teachers.values()], byDojo);
  return (
    <li>
      <GroupLabel group={group} />{via && <small> — via {via}</small>}
      {depth < 6 && groups.length > 0 && (
        <ul>
          {groups.map((g) => <Node key={gkey(g)} group={g} via={[...new Set(g.flatMap((t) => [...teachers.get(t.id).dojos]))].join(', ')} depth={depth + 1} seen={nextSeen} />)}
        </ul>
      )}
    </li>
  );
}

export function PractitionerAncestry({ p }) {
  return (
    <div className="ancestry">
      <p><small>Teachers are inferred from dojo leaders whose tenure overlapped this practitioner's membership by at least 2 months; memberships without a start date are ignored. Leaders at the same time are listed together.</small></p>
      <ul className="tree"><Node group={[{ id: p.id, name: `${p.firstName} ${p.lastName}` }]} depth={0} seen={new Set()} /></ul>
    </div>
  );
}

function GroupNode({ group, kids, path }) {
  const next = new Set(path);
  group.forEach((x) => next.add(x.id));
  const children = new Map();
  group.forEach((x) => (kids.get(x.id) || []).forEach((s) => { if (!next.has(s.id)) children.set(s.id, s); }));
  const groups = kids.groupFn([...children.values()]);
  return (
    <li>
      <GroupLabel group={group} />
      {groups.length > 0 && <ul>{groups.map((g) => <GroupNode key={gkey(g)} group={g} kids={kids} path={next} />)}</ul>}
    </li>
  );
}

export function MasterAncestry({ dojos, practitioners }) {
  const [byDojo, setByDojo] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.all(arr(dojos).map((d) => leadersApi.forDojo(d.id).then((l) => [d.id, arr(l)]).catch(() => [d.id, []])))
      .then((e) => { if (live) setByDojo(Object.fromEntries(e)); });
    return () => { live = false; };
  }, [dojos]);
  const { roots, kids } = useMemo(() => {
    const kids = new Map();
    const hasTeacher = new Set();
    const people = new Map(arr(practitioners).map((p) => [p.id, { id: p.id, name: `${p.firstName} ${p.lastName}`, start: p.startDate || arr(p.memberships).map((m) => m.startDate).filter(Boolean).sort((a, b) => lo(a).localeCompare(lo(b)))[0] || null }]));
    for (const p of arr(practitioners)) {
      for (const t of teachersOf(p.memberships, byDojo || {}, p.id, (id) => people.get(id)?.start)) {
        hasTeacher.add(p.id);
        kids.set(t.id, [...(kids.get(t.id) || []), people.get(p.id)]);
      }
    }
    kids.groupFn = (list) => groupPeople(list, byDojo || {});
    const teachers = [...people.values()].filter((x) => kids.has(x.id));
    const roots = groupPeople(teachers, byDojo || {})
      .filter((g) => g.every((x) => !hasTeacher.has(x.id)));
    return { roots, kids };
  }, [practitioners, byDojo]);
  if (!byDojo) return <p>Loading...</p>;
  if (roots.length === 0) return <p>No teacher/student links yet.</p>;
  return (
    <div className="ancestry">
      <p><small>Teachers are inferred from dojo leaders whose tenure overlapped a practitioner's membership by at least 2 months; memberships without a start date are ignored. Leaders at the same time are listed together; each person appears once, under their earliest teacher (ties: longest experience, then last name).</small></p>
      <ul className="tree">{roots.map((g) => <GroupNode key={gkey(g)} group={g} kids={kids} path={new Set()} />)}</ul>
    </div>
  );
}
export default function PractitionerHistory({ p }) {
  const [tab, setTab] = useState('timeline');
  return (
    <div>
      <div className="tabs">
        <button type="button" className={`btn${tab === 'timeline' ? ' active' : ''}`} onClick={() => setTab('timeline')}>Timeline</button>
        <button type="button" className={`btn${tab === 'ancestry' ? ' active' : ''}`} onClick={() => setTab('ancestry')}>Ancestry</button>
      </div>
      {tab === 'timeline' ? <PractitionerTimeline p={p} /> : <PractitionerAncestry p={p} />}
    </div>
  );
}
