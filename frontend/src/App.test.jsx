import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from './App.jsx';

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

test('lists practitioners with their dojo', async () => {
  render(<MemoryRouter initialEntries={['/practitioners']}><App /></MemoryRouter>);
  expect(await screen.findByText('Ann Zed')).toBeInTheDocument();
  expect(await screen.findByText('1st dan (shodan)')).toBeInTheDocument();
  expect(await screen.findAllByText('Hombu Dojo')).not.toHaveLength(0);
});
