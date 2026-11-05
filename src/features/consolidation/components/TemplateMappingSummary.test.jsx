import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import TemplateMappingSummary from './TemplateMappingSummary.jsx';
import { consolidationApi } from '../lib/consolidationApi.js';
import { fetchCarmenDimensions, fetchCarmenMasterData } from '../../report/lib/reportApi.js';

vi.mock('../lib/consolidationApi.js', () => ({ consolidationApi: { getMappings: vi.fn() } }));
vi.mock('../../report/lib/reportApi.js', () => ({ fetchCarmenDimensions: vi.fn(), fetchCarmenMasterData: vi.fn() }));

it('shows unmapped member codes and keeps dimension codes separate by category', async () => {
  consolidationApi.getMappings.mockResolvedValue({ profileRevision: 'r1', accounts: { member: { hq: [{ code: 'a' }] } },
    departments: {}, dimensions: { member: { hqDimension: { memberDimensionId: 'd1', subcodes: { x: ['same'] } } } } });
  fetchCarmenMasterData.mockResolvedValue({ accCodes: [{ id: 'a', type: 'I' }, { id: 'b', type: 'B' }, { id: 'header', type: 'H' }], depts: [{ id: 'dept' }] });
  fetchCarmenDimensions.mockResolvedValue({ definitions: [{ id: 'd1', values: ['same'] }, { id: 'd2', values: ['same'] }] });
  const open = vi.fn();
  render(<TemplateMappingSummary profile={{ tenant: 'hq', memberTenants: ['member'], revision: 'r1', canManage: true }}
    units={[{ id: 'hq', name: 'HQ' }, { id: 'member', name: 'Hotel' }]} onOpenMapping={open} />);
  expect(screen.getByRole('button', { name: /Profile mapping status/ })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByRole('button', { name: /Profile mapping status/ }));
  expect(await screen.findByText(/Accounts: 1 · Departments: 1 · Dimension categories: 1 · Dimension codes: 1/)).toBeInTheDocument();
  expect(screen.getByText('Hotel')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View / Edit Mapping' }));
  expect(open).toHaveBeenCalledOnce();
});
