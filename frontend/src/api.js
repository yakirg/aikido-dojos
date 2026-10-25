async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (res.status === 400) message = 'Invalid input';
      else if (body.message) message = body.message;
    } catch { /* no body */ }
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json();
}

const qs = (params) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== '' && v != null && s.set(k, v));
  const str = s.toString();
  return str ? `?${str}` : '';
};

const crud = (base) => ({
  list: (params = {}) => request(base + qs(params)),
  get: (id) => request(`${base}/${id}`),
  create: (data) => request(base, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`${base}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`${base}/${id}`, { method: 'DELETE' }),
});

export const dojosApi = crud('/api/dojos');
export const practitionersApi = crud('/api/practitioners');

export const membershipsApi = {
  forDojo: (dojoId) => request(`/api/dojos/${dojoId}/memberships`),
  create: (practitionerId, data) =>
    request(`/api/practitioners/${practitionerId}/memberships`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/memberships/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/api/memberships/${id}`, { method: 'DELETE' }),
};
