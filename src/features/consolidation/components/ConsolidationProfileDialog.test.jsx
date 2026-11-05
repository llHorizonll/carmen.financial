import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConsolidationProfileDialog from './ConsolidationProfileDialog.jsx';
import { consolidationApi } from '../lib/consolidationApi.js';

vi.mock('../lib/consolidationApi.js', () => ({ consolidationApi: { saveProfile: vi.fn() } }));
const profile = { tenant: 'hq', groupName: 'Demo', memberTenants: ['member'], revision: 'one', canManage: true, headquarterLocked: true };
const units = [{ id: 'hq', name: 'HQ Hotel', permission: { view: true, setup: true } },
  { id: 'member', name: 'Member Hotel', permission: { view: true } }, { id: 'other', name: 'Other Hotel', permission: { view: true } }];
beforeEach(() => vi.clearAllMocks());
describe('profile wizard', () => {
  it('locks an in-use HQ, excludes HQ from members and keeps failed saves open', async () => {
    consolidationApi.saveProfile.mockRejectedValueOnce(new Error('Profile changed'));
    const onSaved = vi.fn();
    render(<ConsolidationProfileDialog open profile={profile} units={units} onSaved={onSaved} onClose={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Headquarter BU' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByRole('checkbox', { name: 'HQ Hotel' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Member Hotel' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('Profile changed');
    expect(onSaved).not.toHaveBeenCalled();
    expect(consolidationApi.saveProfile).toHaveBeenCalledWith(profile, { tenant: 'hq', memberTenants: ['member'] });
  });
  it('requires confirmation before shared Centralize membership changes', async () => {
    consolidationApi.saveProfile.mockResolvedValue({ ...profile, memberTenants: ['member', 'other'] });
    const onSaved = vi.fn();
    render(<ConsolidationProfileDialog open profile={profile} units={units} onSaved={onSaved} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Other Hotel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(consolidationApi.saveProfile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Update profile' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });
});
