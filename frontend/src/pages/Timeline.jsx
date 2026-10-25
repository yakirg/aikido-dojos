import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dojosApi, practitionersApi } from '../api.js';

export function buildEvents(dojos, practitioners) {
  const events = [];
  for (const d of dojos) {
    const dojoLink = `/dojos/${d.id}/view`;
    if (d.foundedDate) events.push({ date: d.foundedDate, kind: 'dojo-open', text: `${d.name} opened`, link: dojoLink });
    if (d.closedDate) events.push({ date: d.closedDate, kind: 'dojo-close', text: `${d.name} closed`, link: dojoLink });
  }
  for (const p of practitioners) {
    const name = `${p.firstName} ${p.lastName}`;
    const link = `/practitioners/${p.id}`;
    for (const a of p.rankHistory || []) {
      if (a.awardedDate) events.push({ date: a.awardedDate, kind: 'rank', text: `${name} awarded ${a.rank}`, link });
    }
    for (const m of p.memberships || []) {
      if (m.startDate) events.push({ date: m.startDate, kind: 'join', text: `${name} joined ${m.dojoName}`, link });
      if (m.endDate) events.push({ date: m.endDate, kind: 'leave', text: `${name} left ${m.dojoName}`, link });
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.text.localeCompare(b.text));
}

const DAY = 86400000;
const toMs = (s) => Date.parse(s);
const LEFT = 190, RIGHT = 40, TOP = 40, LANE = 64, WIDTH = 1100;

export function buildChart(dojos, practitioners, today = new Date().toISOString().slice(0, 10)) {
  const lanes = dojos.map((d) => {
    const starts = practitioners.flatMap((p) => (p.memberships || [])
      .filter((m) => m.dojoId === d.id && m.startDate).map((m) => m.startDate));
    const from = d.foundedDate || (starts.length ? starts.sort()[0] : null);
    return { dojo: d, from, to: d.closedDate || (from ? today : null) };
  }).sort((a, b) => (a.from || '9999').localeCompare(b.from || '9999') || a.dojo.name.localeCompare(b.dojo.name));
  const laneIndex = new Map(lanes.map((l, i) => [l.dojo.id, i]));

  const people = practitioners.map((p, i) => {
    const ms = (p.memberships || [])
      .filter((m) => m.startDate && laneIndex.has(m.dojoId))
      .map((m) => ({ lane: laneIndex.get(m.dojoId), from: m.startDate, to: m.endDate || today, dojoName: m.dojoName }))
      .sort((a, b) => a.from.localeCompare(b.from));
    return { id: p.id, name: `${p.firstName} ${p.lastName}`, index: i, segments: ms };
  }).filter((p) => p.segments.length);

  const dates = [...lanes.flatMap((l) => [l.from, l.to]), ...people.flatMap((p) => p.segments.flatMap((s) => [s.from, s.to]))]
    .filter(Boolean).sort();
  return { lanes, people, min: dates[0], max: dates[dates.length - 1] || today };
}

export function SwimlaneChart({ dojos, practitioners }) {
  const { lanes, people, min, max } = buildChart(dojos, practitioners);
  if (!min) return <p>No dated events yet.</p>;
  const t0 = toMs(min) - 30 * DAY;
  const t1 = Math.max(toMs(max) + 30 * DAY, t0 + 90 * DAY);
  const x = (s) => LEFT + ((toMs(s) - t0) / (t1 - t0)) * (WIDTH - LEFT - RIGHT);
  const laneY = (i) => TOP + i * LANE + LANE / 2;
  const height = TOP + lanes.length * LANE + 20;
  const y0 = new Date(t0).getUTCFullYear(), y1 = new Date(t1).getUTCFullYear();
  const step = Math.max(1, Math.ceil((y1 - y0) / 12));
  const years = [];
  for (let y = y0; y <= y1; y += step) years.push(y);
  const color = (i) => `hsl(${(i * 47) % 360} 70% 40%)`;
  const offset = (i) => ((i % 5) - 2) * 7;

  return (
    <div className="chart-scroll">
      <svg width={WIDTH} height={height} role="img" aria-label="Dojo swimlane timeline">
        {years.map((y) => {
          const gx = x(`${y}-01-01`);
          if (gx < LEFT || gx > WIDTH - RIGHT) return null;
          return (
            <g key={y}>
              <line x1={gx} x2={gx} y1={TOP - 10} y2={height - 10} stroke="#ddd" />
              <text x={gx} y={TOP - 16} fontSize="11" textAnchor="middle" fill="#555">{y}</text>
            </g>
          );
        })}
        {lanes.map((l, i) => (
          <g key={l.dojo.id}>
            <rect x={0} y={TOP + i * LANE} width={WIDTH} height={LANE} fill={i % 2 ? '#fafafa' : '#f0f0ec'} opacity="0.6" />
            <a href={`#/dojos/${l.dojo.id}/view`}>
              <text x={8} y={laneY(i) + 4} fontSize="13" fontWeight="bold" fill="#124">{l.dojo.name}</text>
            </a>
            {l.from && (
              <rect x={x(l.from)} y={laneY(i) - 22} width={Math.max(2, x(l.to) - x(l.from))} height={44}
                rx="4" fill="#cfd8e3" stroke="#7b8ea6">
                <title>{`${l.dojo.name}: ${l.from} – ${l.dojo.closedDate || 'present'}`}</title>
              </rect>
            )}
          </g>
        ))}
        {people.map((p) => {
          const c = color(p.index);
          const yOf = (s) => laneY(s.lane) + offset(p.index);
          const first = [x(p.segments[0].from), yOf(p.segments[0])];
          const title = `${p.name}: ${p.segments.map((s) => `${s.dojoName} (${s.from} – ${s.to})`).join(' → ')}`;
          return (
            <g key={p.id}>
              {p.segments.map((s, i) => {
                const prev = p.segments[i - 1];
                return (
                  <g key={i}>
                    <line x1={x(s.from)} x2={x(s.to)} y1={yOf(s)} y2={yOf(s)} stroke={c} strokeWidth="2.5" strokeLinecap="round">
                      <title>{title}</title>
                    </line>
                    {prev && (
                      <line x1={x(prev.to < s.from ? prev.to : s.from)} y1={yOf(prev)} x2={x(s.from)} y2={yOf(s)}
                        stroke={c} strokeWidth="2.5" />
                    )}
                  </g>
                );
              })}
              <circle cx={first[0]} cy={first[1]} r="3.5" fill={c} />
              <a href={`#/practitioners/${p.id}`}>
                <text x={first[0] + 6} y={first[1] - 5} fontSize="11" fill={c}>{p.name}</text>
              </a>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
const labels = { 'dojo-open': 'Dojo opened', 'dojo-close': 'Dojo closed', join: 'Joined', leave: 'Left', rank: 'Rank awarded' };

export default function Timeline() {
  const [events, setEvents] = useState([]);
  const [data, setData] = useState({ dojos: [], practitioners: [] });
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([dojosApi.list(), practitionersApi.list()])
      .then(([d, p]) => { setData({ dojos: d, practitioners: p }); setEvents(buildEvents(d, p)); })
      .catch((e) => setError(e.message));
  }, []);

  const shown = events.filter((e) => !filter || e.kind === filter);
  return (
    <div>
      <h1>Timeline</h1>
      <SwimlaneChart dojos={data.dojos} practitioners={data.practitioners} />
      <h2>Events</h2>
      <div className="toolbar">
        <select aria-label="Filter events" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All events</option>
          {Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {shown.length === 0 ? <p>No dated events yet.</p> : (
        <ol className="timeline">
          {shown.map((e, i) => (
            <li key={i} className={e.kind}>
              <span className="date">{e.date}</span>
              <Link to={e.link}>{e.text}</Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
