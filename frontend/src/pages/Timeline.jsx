import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
      if (a.awardedDate) events.push({ date: a.awardedDate, kind: 'rank', text: `${name} awarded ${(BELTS[a.rank] || [a.rank])[0]}`, link });
    }
    for (const m of p.memberships || []) {
      if (m.startDate) events.push({ date: m.startDate, kind: 'join', text: `${name} joined ${m.dojoName}`, link });
      if (m.endDate) events.push({ date: m.endDate, kind: 'leave', text: `${name} left ${m.dojoName}`, link });
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.text.localeCompare(b.text));
}

const DAY = 86400000;
const toMs = (s) => Date.parse(s.length === 4 ? `${s}-01-01` : s.length === 7 ? `${s}-01` : s);
const RIGHT = 40, TOP = 40, MAX_ZOOM = 12;

export const BELTS = {
  ROKYU: ['6th kyu', '#f59e0b'], GOKYU: ['5th kyu', '#f59e0b'], YONKYU: ['4th kyu', '#2563eb'], SANKYU: ['3rd kyu', '#2563eb'],
  NIKYU: ['2nd kyu', '#7c4a1e'], IKKYU: ['1st kyu', '#7c4a1e'], SHODAN: ['1st dan', '#111'], NIDAN: ['2nd dan', '#111'],
  SANDAN: ['3rd dan', '#111'], YODAN: ['4th dan', '#111'], GODAN: ['5th dan', '#111'], ROKUDAN: ['6th dan', '#111'],
  SHICHIDAN: ['7th dan', '#111'], HACHIDAN: ['8th dan', '#111'],
};

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
    const awards = (p.rankHistory || []).filter((a) => a.awardedDate && ms.length).map((a) => {
      const seg = ms.find((s) => s.from <= a.awardedDate && a.awardedDate <= s.to)
        || [...ms].reverse().find((s) => s.from <= a.awardedDate) || ms[0];
      return { date: a.awardedDate, rank: a.rank, lane: seg.lane };
    });
    return { id: p.id, name: `${p.firstName} ${p.lastName}`, index: i, segments: ms, awards };
  }).filter((p) => p.segments.length);

  const dates = [...lanes.flatMap((l) => [l.from, l.to]), ...people.flatMap((p) => p.segments.flatMap((s) => [s.from, s.to]))]
    .filter(Boolean).sort();
  return { lanes, people, min: dates[0], max: dates[dates.length - 1] || today };
}

export function SwimlaneChart({ dojos, practitioners }) {
  const { lanes, people, min, max } = buildChart(dojos, practitioners);
  const [zoom, setZoom] = useState(1);
  const [hidden, setHidden] = useState([]);
  const [hover, setHover] = useState(null);
  const [tip, setTip] = useState(null);
  const scrollRef = useRef(null);
  const anchor = useRef(null);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const [baseW, setBaseW] = useState(1100);
  const baseWRef = useRef(1100);
  baseWRef.current = baseW;
  const narrow = baseW < 600;
  const LEFT = narrow ? 14 : 190;
  const W = Math.round(baseW * zoom);

  const zoomTo = (next, clientX) => {
    const el = scrollRef.current;
    const clamped = Math.min(MAX_ZOOM, Math.max(1, next));
    if (el && clamped !== zoomRef.current) {
      const ax = clientX === undefined ? el.clientWidth / 2 : clientX - el.getBoundingClientRect().left;
      anchor.current = { ratio: (el.scrollLeft + ax) / (baseWRef.current * zoomRef.current), ax };
    }
    setZoom(clamped);
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && anchor.current) {
      el.scrollLeft = anchor.current.ratio * W - anchor.current.ax;
      anchor.current = null;
    }
  }, [W]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => setBaseW(Math.max(280, Math.round(el.clientWidth)));
    measure();
    window.addEventListener('resize', measure);
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomTo(zoomRef.current * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX);
    };
    let pinch = null;
    const dist = (ts) => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
    const onStart = (e) => { if (e.touches.length === 2) pinch = { d: dist(e.touches), z: zoomRef.current }; };
    const onMove = (e) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        zoomTo(pinch.z * (dist(e.touches) / pinch.d), (e.touches[0].clientX + e.touches[1].clientX) / 2);
      }
    };
    const onEnd = () => { pinch = null; };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('resize', measure);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [min]);

  if (!min) return <p>No dated events yet.</p>;
  const t0 = toMs(min) - 30 * DAY;
  const t1 = Math.max(toMs(max) + 30 * DAY, t0 + 90 * DAY);
  const x = (s) => LEFT + ((toMs(s) - t0) / (t1 - t0)) * (W - LEFT - RIGHT);
  const ROW = 24;
  const slots = new Map();
  const rowsPerLane = lanes.map((l, li) => {
    const inLane = people.map((p) => ({ p, segs: p.segments.filter((s) => s.lane === li) })).filter((e) => e.segs.length)
      .sort((a, b) => a.segs[0].from.localeCompare(b.segs[0].from));
    const ends = [];
    inLane.forEach(({ p, segs }) => {
      const start = segs[0].from, end = segs[segs.length - 1].to;
      let r = ends.findIndex((e) => e < start);
      if (r < 0) { r = ends.length; ends.push(end); } else ends[r] = end;
      slots.set(p.id + ':' + li, r);
    });
    return Math.max(1, ends.length);
  });
  const laneH = rowsPerLane.map((n) => Math.max(60, n * ROW + 36));
  const laneTop = laneH.map((_, i) => TOP + laneH.slice(0, i).reduce((a, b) => a + b, 0));
  const laneY = (i) => laneTop[i] + laneH[i] / 2;
  const personY = (p, lane) => laneTop[lane] + 30 + (slots.get(p.id + ':' + lane) || 0) * ROW;
  const height = TOP + laneH.reduce((a, b) => a + b, 0) + 20;
  const y0 = new Date(t0).getUTCFullYear(), y1 = new Date(t1).getUTCFullYear();
  const step = Math.max(1, Math.ceil((y1 - y0) / (12 * zoom)));
  const years = [];
  for (let y = y0; y <= y1; y += step) years.push(y);
  const legendH = lanes.reduce((n, l, li) => {
    const c = people.filter((p) => p.segments.some((s) => s.lane === li)).length;
    return c ? n + 30 + c * 26 : n;
  }, 0);
  const startOpen = legendH <= height;
  const color = (i) => `hsl(${(i * 47) % 360} 70% 40%)`;

  return (
    <div>
      <div className="toolbar zoom-controls">
        <button type="button" aria-label="Zoom out" onClick={() => zoomTo(zoom / 1.5)} disabled={zoom <= 1}>−</button>
        <button type="button" aria-label="Zoom in" onClick={() => zoomTo(zoom * 1.5)} disabled={zoom >= MAX_ZOOM}>+</button>
        <button type="button" onClick={() => zoomTo(1)} disabled={zoom === 1}>Reset</button>
        <span>{Math.round(zoom * 100)}% · Ctrl+scroll or pinch to zoom</span>
      </div>
    <div className="chart-layout">
    <div className="chart-scroll" ref={scrollRef}>
      <svg width={W} height={height} role="img" aria-label="Dojo swimlane timeline">
        {years.map((y) => {
          const gx = x(`${y}-01-01`);
          if (gx < LEFT || gx > W - RIGHT) return null;
          return (
            <g key={y}>
              <line x1={gx} x2={gx} y1={TOP - 10} y2={height - 10} stroke="#ddd" />
              <text x={gx} y={TOP - 16} fontSize="11" textAnchor="middle" fill="#555">{y}</text>
            </g>
          );
        })}
        {lanes.map((l, i) => (
          <g key={l.dojo.id}>
            <rect x={0} y={laneTop[i]} width={W} height={laneH[i]} fill={i % 2 ? '#fafafa' : '#f0f0ec'} opacity="0.6" />
            <a href={`#/dojos/${l.dojo.id}/view`}>
              <text x={8} y={narrow ? laneTop[i] + 12 : laneY(i) + 4} fontSize="13" fontWeight="bold" fill="#124">{l.dojo.name}</text>
            </a>
            {l.from && (
              <rect x={x(l.from)} y={laneTop[i] + 4} width={Math.max(2, x(l.to) - x(l.from))} height={laneH[i] - 8}
                rx="4" fill="#cfd8e3" stroke="#7b8ea6">
                <title>{`${l.dojo.name}: ${l.from} – ${l.dojo.closedDate || 'present'}`}</title>
              </rect>
            )}
          </g>
        ))}
        {people.filter((p) => !hidden.includes(p.id)).map((p) => {
          const c = color(p.index);
          const yOf = (s) => personY(p, s.lane);
          const first = [x(p.segments[0].from), yOf(p.segments[0])];
          const title = `${p.name}: ${p.segments.map((s) => `${s.dojoName} (${s.from} – ${s.to})`).join(' → ')}`;
          return (
            <g key={p.id} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)}
              opacity={hover === null || hover === p.id ? 1 : 0.2}>
              {p.segments.map((s, i) => {
                const prev = p.segments[i - 1];
                return (
                  <g key={i}>
                    <line x1={x(s.from)} x2={x(s.to)} y1={yOf(s)} y2={yOf(s)} stroke={c} strokeWidth={hover === p.id ? 5 : 2.5} strokeLinecap="round">
                      <title>{title}</title>
                    </line>
                    {prev && (
                      <line x1={x(prev.to < s.from ? prev.to : s.from)} y1={yOf(prev)} x2={x(s.from)} y2={yOf(s)}
                        stroke={c} strokeWidth={hover === p.id ? 5 : 2.5} />
                    )}
                    {[[s.from, 'Start'], ...(s.to !== new Date().toISOString().slice(0, 10) ? [[s.to, 'End']] : [])].map(([d, what]) => (
                      <circle key={what} cx={x(d)} cy={yOf(s)} r="5" fill={c} fillOpacity="0.01" style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setTip({ x: x(d), y: yOf(s), lines: [`${p.name} @ ${s.dojoName}`, `${what} - ${d}`] })}
                        onMouseLeave={() => setTip(null)} />
                    ))}
                  </g>
                );
              })}
              {p.awards.map((a, i) => {
                const [label, fill] = BELTS[a.rank] || [a.rank, '#888'];
                const bx = x(a.date), by = personY(p, a.lane);
                return (
                  <g key={'a' + i} className="belt" style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setTip({ x: bx, y: by, lines: [p.name, `${label} - ${a.date}`] })}
                    onMouseLeave={() => setTip(null)}>
                    <rect x={bx - 9} y={by - 8} width="18" height="16" fill="transparent" />
                    <rect x={bx - 7} y={by - 3} width="14" height="6" rx="1" fill={fill} stroke="#fff" strokeWidth="1" />
                    <rect x={bx - 2} y={by - 4.5} width="4" height="9" rx="1" fill={fill} stroke="#fff" strokeWidth="1" />
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
        {tip && (() => {
          const w = Math.max(...tip.lines.map((l) => l.length)) * 6.5 + 16;
          const tx = Math.min(Math.max(tip.x - w / 2, 2), W - w - 2);
          const ty = tip.y - 52 < 0 ? tip.y + 14 : tip.y - 52;
          return (
            <g className="rank-tip" pointerEvents="none">
              <rect x={tx} y={ty} width={w} height="38" rx="6" fill="#123" stroke="#c9a227" />
              <text x={tx + 8} y={ty + 15} fontSize="11" fill="#fff">{tip.lines[0]}</text>
              <text x={tx + 8} y={ty + 30} fontSize="11" fontWeight="bold" fill="#f5d76e">{tip.lines[1]}</text>
            </g>
          );
        })()}
      </svg>
    </div>
    <aside className="chart-legend" aria-label="Legend">
      {lanes.map((l, li) => {
        const members = people.filter((p) => p.segments.some((s) => s.lane === li));
        if (!members.length) return null;
        return (
          <details key={l.dojo.id} open={startOpen}>
            <summary>
              {l.dojo.name} <span className="count">({members.length})</span>
            </summary>
            <ul>
              {members.map((p) => (
                <li key={p.id} className={hover === p.id ? "hover" : ""} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)}>
                  <input type="checkbox" aria-label={`Show ${p.name}`} checked={!hidden.includes(p.id)}
                    onChange={() => setHidden((h) => (h.includes(p.id) ? h.filter((x) => x !== p.id) : [...h, p.id]))} />
                  <span className="swatch" style={{ background: color(p.index) }} />
                  <a href={`#/practitioners/${p.id}`}>{p.name}</a>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </aside>
    </div>
    </div>
  );
}
const labels = { 'dojo-open': 'Dojo opened', 'dojo-close': 'Dojo closed', join: 'Joined', leave: 'Left', rank: 'Rank awarded' };

export default function Timeline() {
  const [events, setEvents] = useState([]);
  const [data, setData] = useState({ dojos: [], practitioners: [] });
  const [filter, setFilter] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('chart');

  useEffect(() => {
    Promise.all([dojosApi.list(), practitionersApi.list()])
      .then(([d, p]) => { setData({ dojos: d, practitioners: p }); setEvents(buildEvents(d, p)); })
      .catch((e) => setError(e.message));
  }, []);

  const toggle = (k) => setFilter((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));
  const shown = events.filter((e) => filter.length === 0 || filter.includes(e.kind));
  return (
    <div>
      <h1>Timeline</h1>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'chart'} className={tab === 'chart' ? 'btn active' : 'btn'} onClick={() => setTab('chart')}>Timeline</button>
        <button type="button" role="tab" aria-selected={tab === 'events'} className={tab === 'events' ? 'btn active' : 'btn'} onClick={() => setTab('events')}>Events</button>
      </div>
      {tab === 'chart' && <SwimlaneChart dojos={data.dojos} practitioners={data.practitioners} />}
      {tab === 'events' && <>
      <div className="toolbar event-filter" role="group" aria-label="Filter events">
        {Object.entries(labels).map(([k, v]) => (
          <label key={k}>
            <input type="checkbox" checked={filter.includes(k)} onChange={() => toggle(k)} /> {v}
          </label>
        ))}
        <button type="button" onClick={() => setFilter([])} disabled={filter.length === 0}>All events</button>
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
      </>}
    </div>
  );
}
