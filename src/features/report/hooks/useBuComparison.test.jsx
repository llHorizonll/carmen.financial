import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useBuComparison from './useBuComparison.js';

const api = vi.hoisted(() => ({ fetchCarmenMasterData: vi.fn(), fetchCarmenDimensions: vi.fn(), fetchCarmenReportData: vi.fn() }));
vi.mock('../lib/reportApi.js', () => api);
const report = { id: 'pnl', tenant: 'A', lastModified: 'v1', columns: [{ id: 'c1', label: 'Actual', type: 'AC', isActive: true }], rows: [
  { id: 'r1', desc: 'Revenue', accCodes: '4100', buMappings: [{ tenant: 'B', status: 'confirmed', accCodes: '5100' }] },
] };
const options = { report, units: [{ id: 'A', name: 'Hotel A' }, { id: 'B', name: 'Hotel B' }], selectedUnits: ['A', 'B'], enabled: true, year: '2026', userId: 'viewer', sessionToken: 'test-session' };
const filters = { appliedYear: '2026', appliedPeriod: '2', appliedRevision: '0' };
const response = { datasets: [
  { tenant: 'A', actualRows: [{ year: 2026, acccode: '4100', amt2: 100 }], budgetRows: [], masterData: { periods: [] } },
  { tenant: 'B', actualRows: [{ year: 2026, acccode: '5100', amt2: 200 }], budgetRows: [], masterData: { periods: [] } },
] };
const ready = async (result) => waitFor(() => expect(result.current.masters.B?.master).toBeTruthy());

describe('comparison requests and snapshots', () => {
  beforeEach(() => {
    const store = new Map();
    Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem: (key) => store.get(key) || null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key), clear: () => store.clear() } });
    vi.clearAllMocks();
    api.fetchCarmenMasterData.mockResolvedValue({ periods: [], accCodes: [{ id: '4100' }, { id: '5100' }], depts: [] });
    api.fetchCarmenDimensions.mockResolvedValue({ definitions: [] });
    api.fetchCarmenReportData.mockResolvedValue(response);
  });
  it('publishes complete source datasets, preserves filters, toggles Total without refetch', async () => {
    const { result } = renderHook(() => useBuComparison(options));
    await ready(result);
    act(() => result.current.setSelected(['B', 'A']));
    await act(async () => { expect(await result.current.apply({ ...filters, departmentsByTenant: { B: ['01'] } })).toBe(true); });
    expect(api.fetchCarmenReportData).toHaveBeenCalledWith(expect.objectContaining({ tenant: 'A', sourceTenants: ['A', 'B'], departmentsByTenant: { B: ['01'] } }));
    expect(result.current.groups.map((group) => group.name)).toEqual(['Hotel A', 'Hotel B']);
    expect(result.current.snapshot.filters.appliedYear).toBe('2026');
    act(() => result.current.setIncludeTotal(true));
    expect(result.current.groups[2].rows[0].results.c1).toBe(300);
    expect(api.fetchCarmenReportData).toHaveBeenCalledTimes(1);
  });
  it('retains the previous snapshot when a source fails', async () => {
    const { result } = renderHook(() => useBuComparison(options));
    await ready(result); act(() => result.current.setSelected(['A', 'B']));
    await act(async () => { await result.current.apply(filters); });
    api.fetchCarmenReportData.mockRejectedValueOnce(new Error('B: access denied'));
    await act(async () => { expect(await result.current.apply({ ...filters, appliedPeriod: '3' })).toBe(false); });
    expect(result.current.snapshot.filters.appliedPeriod).toBe('2');
    expect(result.current.error).toContain('B: access denied');
    expect(result.current.groups[1].rows[0].results.c1).toBe(200);
  });
  it('reuses owner master data and safely restores only authorized preferences', async () => {
    const storageKey = `carmen_bu_comparison:${JSON.stringify(['viewer', 'A', 'pnl'])}`;
    window.localStorage.setItem(storageKey, JSON.stringify({ selected: 'corrupt' }));
    const ownerMaster = { accCodes: [], depts: [], periods: [] };
    const { result, unmount } = renderHook(() => useBuComparison({ ...options, reuseOwnerMaster: true, ownerMaster }));
    await ready(result);
    expect(result.current.selected).toEqual(['A']);
    expect(api.fetchCarmenMasterData).toHaveBeenCalledTimes(1);
    expect(api.fetchCarmenMasterData).toHaveBeenCalledWith({ tenant: 'B', year: '2026', includeMappingGroups: true });
    expect(result.current.masters.A.master).toBe(ownerMaster);
    act(() => result.current.setSelected(['A', 'B']));
    unmount();
    const restored = renderHook(() => useBuComparison({ ...options, units: [options.units[0]], selectedUnits: ['A'] }));
    expect(restored.result.current.selected).toEqual(['A']);
  });
  it('rejects missing mappings, empty selections, bad dates, and incomplete responses', async () => {
    const unready = { ...report, rows: [{ ...report.rows[0], buMappings: [] }] };
    const { result, rerender } = renderHook((props) => useBuComparison(props), { initialProps: { ...options, report: unready } });
    await ready(result); act(() => result.current.setSelected(['A', 'B']));
    await act(async () => { expect(await result.current.apply(filters)).toBe(false); });
    expect(api.fetchCarmenReportData).not.toHaveBeenCalled();
    expect(result.current.error).toContain('mapping review required');
    rerender(options);
    await act(async () => { expect(await result.current.apply({ ...filters, appliedPeriod: '13' })).toBe(false); });
    act(() => result.current.setSelected([]));
    await act(async () => { expect(await result.current.apply(filters)).toBe(false); });
    expect(api.fetchCarmenReportData).not.toHaveBeenCalled();
    act(() => result.current.setSelected(['A', 'B']));
    api.fetchCarmenReportData.mockResolvedValueOnce({ datasets: [response.datasets[0]] });
    await act(async () => { expect(await result.current.apply(filters)).toBe(false); });
    expect(result.current.groups).toBeNull();
  });
  it('ignores late responses and removes snapshots when source access is removed', async () => {
    const { result, rerender } = renderHook((props) => useBuComparison(props), { initialProps: options });
    await ready(result); act(() => result.current.setSelected(['A', 'B']));
    let resolveOld;
    api.fetchCarmenReportData.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    let oldRequest;
    act(() => { oldRequest = result.current.apply({ ...filters, appliedPeriod: '1' }); });
    await act(async () => { await result.current.apply(filters); });
    await act(async () => { resolveOld(response); await oldRequest; });
    expect(result.current.snapshot.filters.appliedPeriod).toBe('2');
    rerender({ ...options, selectedUnits: ['A'] });
    expect(result.current.selected).toEqual(['A']);
    expect(result.current.groups).toBeNull();
  });
});
