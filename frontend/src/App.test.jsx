import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from './App.jsx';
import { buildChart } from './pages/Timeline.jsx';

beforeEach(() => {
  global.fetch = vi.fn((url) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(
        String(url).startsWith('/api/ranks')
          ? [{ code: 'SHODAN', label: '1st dan', japanese: 'shodan', category: 'dan', title: 'Black Belt' }]
          : String(url).startsWith('/api/dojos')
          ? [{ id: 1, name: 'Hombu Dojo', city: 'Tokyo', country: 'Japan' }]
          : [{ id: 2, firstName: 'Ann', lastName: 'Zed', rank: 'SHODAN', memberships: [{ id: 5, dojoId: 1, dojoName: 'Hombu Dojo', startDate: '2020-01-01', endDate: null }] }]
      ),
    })
  );
});

test('shows welcome with add buttons', () => {
  render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
  expect(screen.getByText('Add yourself')).toHaveAttribute('href', '/practitioners/new');
  expect(screen.getByText('Add your dojo')).toHaveAttribute('href', '/dojos/new');
});

test('lists dojos', async () => {
  render(<MemoryRouter initialEntries={['/dojos']}><App /></MemoryRouter>);
  expect(await screen.findByText('Tokyo')).toBeInTheDocument();
});

test('dojo name links to detail page', async () => {
  render(<MemoryRouter initialEntries={['/dojos']}><App /></MemoryRouter>);
  expect(await screen.findByText('Hombu Dojo')).toHaveAttribute('href', '/dojos/1/view');
});

test('timeline shows join events', async () => {
  render(<MemoryRouter initialEntries={['/timeline']}><App /></MemoryRouter>);
  expect(await screen.findByText('Ann Zed joined Hombu Dojo')).toBeInTheDocument();
});

test('lists practitioners with their dojo', async () => {
  render(<MemoryRouter initialEntries={['/practitioners']}><App /></MemoryRouter>);
  expect(await screen.findByText('Ann Zed')).toBeInTheDocument();
  expect(await screen.findByText('1st dan (shodan)')).toBeInTheDocument();
  expect(await screen.findAllByText('Hombu Dojo')).not.toHaveLength(0);
});

test('buildChart makes lanes and practitioner paths across dojos', () => {
  const dojos = [{ id: 1, name: 'A', foundedDate: '2000-01-01' }, { id: 2, name: 'B', foundedDate: '2005-01-01', closedDate: '2010-01-01' }];
  const people = [{ id: 9, firstName: 'Zoe', lastName: 'Q', memberships: [
    { dojoId: 2, dojoName: 'B', startDate: '2006-01-01', endDate: '2008-01-01' },
    { dojoId: 1, dojoName: 'A', startDate: '2001-01-01', endDate: '2006-01-01' }] }];
  const c = buildChart(dojos, people, '2020-01-01');
  expect(c.lanes.map((l) => l.dojo.name)).toEqual(['A', 'B']);
  expect(c.people[0].segments.map((s) => s.lane)).toEqual([0, 1]);
  expect(c.min).toBe('2000-01-01');
});

test('dojo edit page lets you edit a membership', async () => {
  const calls = [];
  global.fetch = vi.fn((url, opts) => {
    calls.push([String(url), opts?.method]);
    const u = String(url);
    const body = u.includes('/memberships') ? [{ id: 5, practitionerId: 2, practitionerName: 'Ann Zed', dojoId: 1, startDate: '2020-01-01', endDate: null }]
      : u.startsWith('/api/dojos/1') ? { id: 1, name: 'Hombu Dojo', country: 'Japan' }
      : u.startsWith('/api/countries') ? [] : [{ id: 2, firstName: 'Ann', lastName: 'Zed', memberships: [] }];
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  });
  render(<MemoryRouter initialEntries={['/dojos/1']}><App /></MemoryRouter>);
  const to = await screen.findByLabelText('To');
  fireEvent.change(to, { target: { value: '2021-05-01' } });
  fireEvent.click(screen.getByText('Save', { selector: 'tbody button' }));
  await waitFor(() => expect(calls).toContainEqual(['/api/memberships/5', 'PUT']));
});

test('practitioner edit page shows rank history', async () => {
  global.fetch = vi.fn((url) => {
    const u = String(url);
    const body = u.startsWith('/api/ranks') ? [{ code: 'SHODAN', label: '1st dan', japanese: 'shodan', category: 'dan', title: 'Black Belt' }, { code: 'IKKYU', label: '1st kyu', japanese: 'ikkyu', category: 'kyu', title: 'Brown' }]
      : u.startsWith('/api/practitioners/2') ? { id: 2, firstName: 'Ann', lastName: 'Zed', rank: 'SHODAN', memberships: [], rankHistory: [{ id: 1, rank: 'SHODAN', awardedDate: '2018-06-01' }, { id: 2, rank: 'IKKYU', awardedDate: '2015-01-01' }] }
      : [];
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  });
  render(<MemoryRouter initialEntries={['/practitioners/2']}><App /></MemoryRouter>);
  expect(await screen.findByText('Rank history')).toBeInTheDocument();
  expect(await screen.findByDisplayValue('2015-01-01')).toBeInTheDocument();
  expect(screen.getByDisplayValue('2018-06-01')).toBeInTheDocument();
});
