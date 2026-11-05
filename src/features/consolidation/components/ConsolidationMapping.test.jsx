import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConsolidationMapping from './ConsolidationMapping.jsx';
import { consolidationApi } from '../lib/consolidationApi.js';
import { fetchCarmenDimensions, fetchCarmenMasterData } from '@/features/report/lib/reportApi.js';
import { emptyMappings } from '../lib/mappingModel.js';

vi.mock('../lib/consolidationApi.js', () => ({ consolidationApi: { getMappings: vi.fn(), saveMappings: vi.fn() } }));
vi.mock('@/features/report/lib/reportApi.js', () => ({ fetchCarmenMasterData: vi.fn(), fetchCarmenDimensions: vi.fn() }));

const profile = { tenant: 'hq', memberTenants: ['b'], revision: 'r1', canManage: true };
const headquarters = { companyProfile: { name: 'Head Office' }, accCodes: [{ id: '100', name: 'Cash', type: 'B', sourceType: 'B', nature: 'D' }], depts: [{ id: 'rooms', name: 'Rooms' }] };
const member = { companyProfile: { name: 'Member B' }, accCodes: [
  { id: 'cash', name: 'Member cash', type: 'B', nature: 'D' },
  { id: 'sales', name: 'Member sales', type: 'I', nature: 'C' },
  { id: 'used', name: 'Already used', type: 'B', nature: 'D' },
], depts: [{ id: 'FO', name: 'Front Office' }] };

describe('consolidation mapping workspace', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchCarmenMasterData.mockImplementation(async ({ tenant }) => tenant === 'hq' ? headquarters : member);
    fetchCarmenDimensions.mockImplementation(async ({ tenant }) => ({ definitions: tenant === 'hq'
      ? [{ id: 'D01', key: 'dim1', caption: 'Market', values: ['OTA'] }]
      : [{ id: 'M1', key: 'dim1', caption: 'Member Market', values: ['AGODA'] }, { id: 'M2', key: 'dim2', caption: 'Other Market', values: ['DIRECT'] }] }));
    consolidationApi.getMappings.mockResolvedValue(emptyMappings('r1'));
    consolidationApi.saveMappings.mockImplementation(async (_tenant, document) => ({ ...document, version: document.version + 1 }));
  });

  it('shows member names in the focus selector and mapping dialog', async () => {
    render(<ConsolidationMapping profile={{ ...profile, memberTenants: ['b', 'other'] }}
      units={[{ id: 'b', name: 'Resort' }, { id: 'other', name: 'Ramada' }]} />);
    fireEvent.click(await screen.findByRole('combobox', { name: 'Focus member' }));
    expect(await screen.findByRole('option', { name: 'Ramada' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Resort' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Map codes for 100' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Focus member: Resort');
    expect(screen.getByRole('heading', { name: /Available member codes · Resort/ })).toBeInTheDocument();
  });

  it('filters account types, blocks duplicate sources, retains missing codes and saves reverse signs', async () => {
    consolidationApi.getMappings.mockResolvedValue({ ...emptyMappings('r1'), accounts: { b: { '100': [{ code: 'deleted', reverseSign: true }], '200': [{ code: 'used', reverseSign: false }] }, removed: { '100': [{ code: 'historical', reverseSign: false }] } } });
    const dirty = vi.fn();
    render(<ConsolidationMapping profile={profile} onDirtyChange={dirty} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Map codes for 100' }));
    expect(screen.queryByRole('button', { name: 'Add sales' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add used' })).toBeDisabled();
    expect(screen.getByText('Missing from current master data')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add cash' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Reverse sign for cash' }));
    expect(dirty).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save Mapping' }));
    await waitFor(() => expect(consolidationApi.saveMappings).toHaveBeenCalledTimes(1));
    const [tenant, saved] = consolidationApi.saveMappings.mock.calls[0];
    expect(tenant).toBe('hq');
    expect(saved.accounts.b['100']).toEqual([{ code: 'deleted', reverseSign: true }, { code: 'cash', reverseSign: true }]);
    expect(saved.accounts.removed['100'][0].code).toBe('historical');
    await screen.findByRole('status');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the draft open after save failure and retries without losing edits', async () => {
    consolidationApi.saveMappings.mockRejectedValueOnce(new Error('Version conflict. Cancel and reload mappings.'));
    render(<ConsolidationMapping profile={profile} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Map codes for 100' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add cash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Mapping' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Version conflict');
    expect(screen.getByRole('button', { name: 'Remove cash' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save Mapping' }));
    await screen.findByRole('status');
    expect(consolidationApi.saveMappings).toHaveBeenCalledTimes(2);
  });

  it('requires confirmation before clearing dimension subcodes', async () => {
    consolidationApi.getMappings.mockResolvedValue({ ...emptyMappings('r1'), dimensions: { b: { D01: { memberDimensionId: 'M1', subcodes: { OTA: ['AGODA'] } } } } });
    render(<ConsolidationMapping profile={profile} />);
    await screen.findByRole('button', { name: 'Map codes for 100' });
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Dimension' }), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole('combobox', { name: 'Member dimension for Market' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Other Market' }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('clears its existing sub-code mappings');
    expect(consolidationApi.saveMappings).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Clear sub-code mappings and save' }));
    await waitFor(() => expect(consolidationApi.saveMappings).toHaveBeenCalled());
    expect(consolidationApi.saveMappings.mock.calls[0][1].dimensions.b.D01).toEqual({ memberDimensionId: 'M2', subcodes: {} });
  });

  it('does not allow writes for a read-only profile and retries loading failures', async () => {
    consolidationApi.getMappings.mockRejectedValueOnce(new Error('Mapping service unavailable'));
    render(<ConsolidationMapping profile={{ ...profile, canManage: false }} />);
    expect(await screen.findByText('Mapping service unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: 'Map codes for 100' })).toBeDisabled();
    expect(consolidationApi.saveMappings).not.toHaveBeenCalled();
  });

  it('ignores stale headquarters loads after changing profile', async () => {
    let resolveOld;
    fetchCarmenMasterData.mockImplementation(({ tenant }) => {
      if (tenant === 'hq') return new Promise((resolve) => { resolveOld = resolve; });
      return Promise.resolve(tenant === 'hq2' ? { ...headquarters, companyProfile: { name: 'Second HQ' }, accCodes: [{ id: '999', name: 'Second cash', type: 'B' }] } : member);
    });
    consolidationApi.getMappings.mockImplementation(async (tenant) => emptyMappings(tenant === 'hq2' ? 'r2' : 'r1'));
    const { rerender } = render(<ConsolidationMapping profile={profile} />);
    rerender(<ConsolidationMapping profile={{ ...profile, tenant: 'hq2', revision: 'r2' }} />);
    await screen.findByRole('button', { name: 'Map codes for 999' });
    resolveOld(headquarters);
    await waitFor(() => expect(screen.getByText('Second HQ')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Map codes for 100' })).not.toBeInTheDocument();
  });

  it('notifies parent guards from edits, discard and save events', async () => {
    const onDirtyChange = vi.fn();
    const onBusyChange = vi.fn();
    let finishSave;
    consolidationApi.saveMappings.mockImplementation((_tenant, document) => new Promise((resolve) => {
      finishSave = () => resolve({ ...document, version: 1 });
    }));
    render(<ConsolidationMapping profile={profile} onDirtyChange={onDirtyChange} onBusyChange={onBusyChange} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Map codes for 100' }));
    expect(onDirtyChange).not.toHaveBeenCalled();
    expect(onBusyChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Add cash' }));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Remove cash' }));
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: 'Add cash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: 'Map codes for 100' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add cash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Mapping' }));
    expect(onBusyChange).toHaveBeenLastCalledWith(true);
    finishSave();
    await screen.findByRole('status');
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });
});
