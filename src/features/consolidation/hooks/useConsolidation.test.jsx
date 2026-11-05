import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useConsolidation from './useConsolidation.js';
import { consolidationApi } from '../lib/consolidationApi.js';

vi.mock('../lib/consolidationApi.js', () => ({ consolidationApi: {
  listProfiles: vi.fn(), listReports: vi.fn(), getReport: vi.fn(),
} }));
const profile = { tenant: 'hq', memberTenants: ['member'], revision: 'one', canManage: true };
const setup = () => {
  const confirmDiscard = vi.fn();
  const onSelectReport = vi.fn();
  return { ...renderHook(() => useConsolidation({ enabled: true, confirmDiscard, onSelectReport })), confirmDiscard, onSelectReport };
};
beforeEach(() => {
  vi.clearAllMocks();
  consolidationApi.listProfiles.mockResolvedValue([profile]);
  consolidationApi.listReports.mockResolvedValue([]);
  consolidationApi.getReport.mockImplementation(async (id) => ({ id, version: 2, profileTenant: 'hq' }));
});
describe('consolidation workflow', () => {
  it('starts a template after profile setup and keeps the requested destination after profile selection', async () => {
    consolidationApi.listProfiles.mockResolvedValue([]);
    const { result } = setup();
    act(() => result.current.openNewTemplate());
    await waitFor(() => expect(result.current.profileOpen).toBe(true));
    expect(result.current.mode).toBe('template');
    act(() => result.current.profileSaved(profile));
    expect(result.current.profileOpen).toBe(false);
    expect(result.current.mode).toBe('template');
    act(() => result.current.selectProfile({ ...profile, tenant: 'other' }));
    expect(result.current.mode).toBe('template');
  });
  it('retains the new template destination on a profile load failure and retry', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.profile).toEqual(profile));
    consolidationApi.listProfiles.mockRejectedValueOnce(new Error('Service unavailable'));
    act(() => result.current.openNewTemplate());
    await waitFor(() => expect(result.current.error).toBe('Service unavailable'));
    expect(result.current.mode).toBe('template');
    await act(async () => result.current.reloadProfiles());
    expect(result.current.error).toBe('');
    expect(result.current.mode).toBe('template');
  });
  it('gates an empty profile and resumes mapping after one successful save', async () => {
    consolidationApi.listProfiles.mockResolvedValue([]);
    const { result } = setup();
    act(() => result.current.openMapping());
    await waitFor(() => expect(result.current.profileOpen).toBe(true));
    expect(result.current.profile).toBeNull();
    act(() => result.current.profileSaved(profile));
    await waitFor(() => expect(consolidationApi.listReports).toHaveBeenCalledOnce());
    expect(result.current.profileOpen).toBe(false);
    expect(result.current.mode).toBe('mapping');
    expect(result.current.active).toBe(true);
  });
  it('opens existing profiles directly and distinguishes API errors from empty setup', async () => {
    const { result } = setup();
    act(() => result.current.openMapping());
    await waitFor(() => expect(result.current.profile).toEqual(profile));
    expect(result.current.profileOpen).toBe(false);
    consolidationApi.listProfiles.mockRejectedValueOnce(new Error('Service unavailable'));
    await act(async () => result.current.reloadProfiles());
    expect(result.current.error).toBe('Service unavailable');
    expect(result.current.profileOpen).toBe(false);
  });
  it('keeps dirty template drafts until discard is confirmed and blocks navigation while saving', async () => {
    const { result, confirmDiscard } = setup();
    act(() => result.current.openMapping());
    await waitFor(() => expect(result.current.profile).toEqual(profile));
    act(() => result.current.openTemplate());
    act(() => result.current.setDirty(true));
    act(() => result.current.leave());
    expect(result.current.active).toBe(true);
    expect(confirmDiscard).toHaveBeenCalledOnce();
    act(() => confirmDiscard.mock.calls[0][0]());
    expect(result.current.active).toBe(false);
    act(() => { result.current.setBusy(true); });
    act(() => result.current.openMapping());
    expect(result.current.active).toBe(false);
  });
  it('opens regular reports while retaining profile navigation until explicitly returning to normal reports', async () => {
    const { result, onSelectReport } = setup();
    act(() => result.current.openMapping());
    await waitFor(() => expect(result.current.profile).toEqual(profile));
    const report = { id: 'same-id', tenant: 'member' };
    act(() => result.current.selectReport(report));
    expect(result.current.active).toBe(false);
    expect(result.current.navigationActive).toBe(true);
    expect(onSelectReport).toHaveBeenCalledWith(report);
    act(() => result.current.leave());
    expect(result.current.navigationActive).toBe(false);
  });
  it('never silently selects one of multiple headquarter profiles', async () => {
    consolidationApi.listProfiles.mockResolvedValue([profile, { ...profile, tenant: 'other' }]);
    const { result } = setup();
    act(() => result.current.openMapping());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
    expect(result.current.profileOpen).toBe(true);
    expect(consolidationApi.listReports).not.toHaveBeenCalled();
  });
  it('ignores a late missing-profile response after returning to normal reports', async () => {
    let complete;
    consolidationApi.listProfiles.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    const { result } = setup();
    act(() => result.current.openMapping());
    act(() => result.current.leave());
    await act(async () => complete([]));
    expect(result.current.active).toBe(false);
    expect(result.current.profileOpen).toBe(false);
  });
  it('loads saved templates again before editing rather than using stale sidebar definitions', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.profile).toEqual(profile));
    act(() => result.current.openTemplate({ id: 'central', version: 1 }));
    await waitFor(() => expect(result.current.template?.version).toBe(2));
    expect(consolidationApi.getReport).toHaveBeenCalledWith('central');
  });
  it('keeps template loading locked even when the previous pane clears its own busy flag', async () => {
    let complete;
    consolidationApi.getReport.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    const { result } = setup();
    await waitFor(() => expect(result.current.profile).toEqual(profile));
    act(() => result.current.openTemplate({ id: 'central' }));
    act(() => result.current.setBusy(false));
    expect(result.current.busy).toBe(true);
    act(() => result.current.leave());
    expect(result.current.active).toBe(true);
    await act(async () => complete({ id: 'central', version: 1, profileTenant: 'hq' }));
    expect(result.current.busy).toBe(false);
    expect(result.current.mode).toBe('template');
  });
  it('rejects a template response from a different headquarter profile', async () => {
    consolidationApi.getReport.mockResolvedValueOnce({ id: 'central', version: 1, profileTenant: 'other' });
    const { result } = setup();
    await waitFor(() => expect(result.current.profile).toEqual(profile));
    act(() => result.current.openTemplate({ id: 'central' }));
    await waitFor(() => expect(result.current.error).toContain('another headquarter profile'));
    expect(result.current.mode).toBe('mapping');
  });
});
