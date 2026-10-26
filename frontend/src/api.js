const API_BASE = import.meta.env?.VITE_API_URL ?? '';

async function request(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (res.status === 400) message = 'Invalid input';
      else if (res.status === 401) message = body.message || 'Please log in';
      else if (body.message) message = body.message;
    } catch { /* no body */ }
    throw new Error(message);
  }
  if (res.status === 202) {
    const body = await res.json().catch(() => ({}));
    window.dispatchEvent(new CustomEvent('edit-pending', { detail: body.message || 'Submitted for approval.' }));
    return { ...body, pending: true };
  }
  return res.status === 204 ? null : res.json();
}

export const authApi = {
  me: () => request('/api/auth/me'),
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
};

export const changesApi = {
  list: (status) => request(`/api/changes${status ? `?status=${status}` : ''}`),
  count: () => request('/api/changes/count'),
  approve: (id) => request(`/api/changes/${id}/approve`, { method: 'POST' }),
  reject: (id, note) => request(`/api/changes/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
};

export const adminUsersApi = {
  list: () => request('/api/admin/users'),
  create: (username, password, email) => request('/api/admin/users', { method: 'POST', body: JSON.stringify({ username, password, email: email || null }) }),
  setEmail: (id, email) => request(`/api/admin/users/${id}/email`, { method: 'PUT', body: JSON.stringify({ email: email || null }) }),
  setPassword: (id, password) => request(`/api/admin/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
  remove: (id) => request(`/api/admin/users/${id}`, { method: 'DELETE' }),
};

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

export const leadersApi = {
  forDojo: (dojoId) => request(`/api/dojos/${dojoId}/leaders`),
  create: (dojoId, data) => request(`/api/dojos/${dojoId}/leaders`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/leaders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/api/leaders/${id}`, { method: 'DELETE' }),
};

export const membershipsApi = {
  forDojo: (dojoId) => request(`/api/dojos/${dojoId}/memberships`),
  create: (practitionerId, data) =>
    request(`/api/practitioners/${practitionerId}/memberships`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/memberships/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/api/memberships/${id}`, { method: 'DELETE' }),
};

export const rankAwardsApi = {
  create: (practitionerId, data) =>
    request(`/api/practitioners/${practitionerId}/rank-awards`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/rank-awards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/api/rank-awards/${id}`, { method: 'DELETE' }),
};

export const ranksApi = { list: () => request('/api/ranks') };

export const locationsApi = {
  countries: () => request('/api/countries').catch(localCountries).then(usFirst),
  lookup: (country, postalCode) =>
    request(`/api/locations/lookup${qs({ country, postalCode })}`).catch(() => directLookup(country, postalCode)),
};

async function localCountries() {
  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  const out = [];
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      let name;
      try { name = names.of(code); } catch { continue; }
      if (name && name !== code && name !== 'Unknown Region') out.push({ code, name });
    }
  }
  return out.sort((x, y) => x.name.localeCompare(y.name));
}

async function directLookup(country, postalCode) {
  const zip = country.toUpperCase() === 'CA' ? postalCode.trim().slice(0, 3) : postalCode.trim();
  const res = await fetch(`https://api.zippopotam.us/${country.toLowerCase()}/${encodeURIComponent(zip)}`);
  if (!res.ok) throw new Error('Postal code not found');
  const body = await res.json();
  const p = body.places?.[0];
  if (!p) throw new Error('Postal code not found');
  return {
    postalCode: body['post code'],
    city: p['place name'],
    state: p['state abbreviation'] || p.state,
    country: body.country,
  };
}

export const ZIP_LOOKUP_COUNTRIES = new Set('AD AR AS AT AU AX BD BE BG BR BY CA CH CO CZ DE DK DO DZ ES FI FO FR GB GF GG GL GP GT GU HR HU IE IM IN IS IT JE JP LI LK LT LU LV MC MD MH MK MP MQ MT MX MY NC NL NO NZ PH PK PL PM PR PT PW RE RO RU SE SI SJ SK SM TH TR UA US UY VA VI YT ZA'.split(' '));

function usFirst(list) {
  const arr = Array.isArray(list) ? list : [];
  return [...arr.filter((c) => c.code === 'US'), ...arr.filter((c) => c.code !== 'US')];
}
