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
        String(url).startsWith('/api/dojos')
          ? [{ id: 1, name: 'Hombu Dojo', city: 'Tokyo', country: 'Japan' }]
          : [{ id: 2, firstName: 'Ann', lastName: 'Zed', rank: 'Shodan', dojoId: 1, dojoName: 'Hombu Dojo' }]
      ),
    })
  );
});

test('lists dojos', async () => {
  render(<MemoryRouter initialEntries={['/dojos']}><App /></MemoryRouter>);
  expect(await screen.findByText('Tokyo')).toBeInTheDocument();
});

test('lists practitioners with their dojo', async () => {
  render(<MemoryRouter initialEntries={['/practitioners']}><App /></MemoryRouter>);
  expect(await screen.findByText('Ann Zed')).toBeInTheDocument();
  expect(await screen.findAllByText('Hombu Dojo')).not.toHaveLength(0);
});
