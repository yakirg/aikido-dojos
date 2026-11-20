import React, { useEffect, useState } from 'react';
import { dojosApi, practitionersApi } from '../api.js';
import { MasterAncestry } from '../components/PractitionerHistory.jsx';

export default function Ancestry() {
  const [data, setData] = useState({ dojos: [], practitioners: [] });
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([dojosApi.list(), practitionersApi.list()])
      .then(([d, p]) => setData({ dojos: d, practitioners: p }))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div>
      <h1>Ancestry</h1>
      {error && <p className="error">{error}</p>}
      <MasterAncestry dojos={data.dojos} practitioners={data.practitioners} />
    </div>
  );
}