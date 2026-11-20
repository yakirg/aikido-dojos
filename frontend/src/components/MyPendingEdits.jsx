import React, { useCallback, useEffect, useState } from 'react';
import { changesApi, dojosApi, practitionersApi } from '../api.js';

let dojoNames = {};
let peopleNames = {};
const asArray = (r) => (Array.isArray(r) ? r : (r && Array.isArray(r.content) ? r.content : []));
const loadDojoNames = () => Promise.all([
  dojosApi.list().then((r) => {
    dojoNames = {};
    asArray(r).forEach((d) => { if (d && d.id != null) dojoNames[d.id] = d.name; });
  }).catch(() => {}),
  practitionersApi.list().then((r) => {
    peopleNames = {};
    asArray(r).forEach((p) => { if (p && p.id != null) peopleNames[p.id] = `${p.firstName} ${p.lastName}`; });
  }).catch(() => {}),
]);

let paths = new Set();
let loaded = false;
const listeners = new Set();
const refresh = () => changesApi.mine().then((r) => {
  paths = new Set((Array.isArray(r) ? r : []).filter((c) => c && c.action === 'DELETE' && c.path).map((c) => c.path));
  listeners.forEach((l) => l());
}).catch(() => {});
if (typeof window !== 'undefined') window.addEventListener('edit-pending', refresh);

/** True when the visitor has a pending delete queued for this API path (e.g. /api/rank-awards/3). */
export function usePendingDelete(path) {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    if (!loaded) { loaded = true; refresh(); }
    return () => listeners.delete(l);
  }, []);
  return paths.has(path);
}

/** A table row that is crossed out while the visitor has a pending delete for it. */
export function PendingTr({ path, children, ...rest }) {
  const gone = usePendingDelete(path);
  return <tr className={gone ? 'pending-delete' : ''} {...rest}>{children}</tr>;
}

const FIELDS = ['name', 'firstName', 'lastName', 'rank', 'awardedDate', 'startDate', 'endDate', 'foundedDate',
  'closedDate', 'city', 'country', 'dojoId', 'practitionerId', 'founder', 'email'];

export function describe(c) {
  const verb = { CREATE: 'Add', UPDATE: 'Change', DELETE: 'Remove' }[c.action] || c.action;
  const details = c.body && typeof c.body === 'object'
    ? FIELDS.filter((k) => c.body[k] !== undefined && c.body[k] !== null && c.body[k] !== '')
      .map((k) => (k === 'dojoId'
        ? `dojo: ${dojoNames[c.body[k]] || c.body[k]}`
        : k === 'practitionerId'
          ? `practitioner: ${peopleNames[c.body[k]] || c.body[k]}`
          : `${k}: ${c.body[k]}`)).join(', ')
    : '';
  return `${verb} ${c.entityType.toLowerCase()}${c.label ? ` ${c.label}` : ''}${details ? ` (${details})` : ''}`;
}

/** Shows the visitor's own edits that are still awaiting administrator approval. */
export default function MyPendingEdits({ match }) {
  const [items, setItems] = useState([]);
  const load = useCallback(() => {
    loadDojoNames().then(() => changesApi.mine()).then((r) => setItems(Array.isArray(r) ? r.filter((c) => c && c.entityType && c.path) : [])).catch(() => setItems([]));
  }, []);
  useEffect(() => {
    load();
    window.addEventListener('edit-pending', load);
    return () => window.removeEventListener('edit-pending', load);
  }, [load]);
  const shown = match ? items.filter((c) => match(c)) : items;
  if (shown.length === 0) return null;
  return (
    <div className="notice my-pending" role="status">
      <strong>Your edits awaiting approval ({shown.length})</strong>
      <ul>
        {shown.map((c) => <li key={c.id}>{describe(c)}</li>)}
      </ul>
    </div>
  );
}
