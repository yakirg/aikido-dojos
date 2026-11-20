import React, { useState } from 'react';

const compare = (a, b) => (typeof a === 'number' && typeof b === 'number'
  ? a - b
  : String(a ?? '').toLowerCase().localeCompare(String(b ?? '').toLowerCase()));

/** Sorts items by the selected column; getters maps a column field to a value extractor. */
export function useSort(items, getters, initial) {
  const [sort, setSort] = useState(initial || { by: Object.keys(getters)[0], desc: false });
  const get = getters[sort.by];
  const rows = [...(Array.isArray(items) ? items : [])].sort((a, b) => (sort.desc ? compare(get(b), get(a)) : compare(get(a), get(b))));
  const onSort = (field) => setSort((cur) => ({ by: field, desc: cur.by === field ? !cur.desc : false }));
  return { rows, sort, onSort };
}

/** A table header cell that sorts on click and reverses when the active column is clicked again. */
export function SortTh({ label, field, sort, onSort }) {
  const active = sort.by === field;
  return (
    <th aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
      <button type="button" className="th-sort" onClick={() => onSort(field)} title={`Sort by ${label.toLowerCase()}`}>
        {label}{active ? (sort.desc ? ' \u25BC' : ' \u25B2') : ''}
      </button>
    </th>
  );
}

export const dateKey = (d) => d || '9999';
