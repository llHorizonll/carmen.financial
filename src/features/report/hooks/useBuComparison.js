import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchCarmenDimensions, fetchCarmenMasterData, fetchCarmenReportData } from '../lib/reportApi.js';
import { buildBuComparison, getBuReadiness, normalizeTenant } from '../lib/buComparison.js';

const readPreference = (key) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || 'null');
    return value && Array.isArray(value.selected) && value.selected.every((tenant) => typeof tenant === 'string') ? value : null;
  } catch { return null; }
};

export default function useBuComparison({ report, units, selectedUnits, enabled, year, userId, sessionToken, ownerMaster, reuseOwnerMaster = false }) {
  const key = JSON.stringify([userId, report?.tenant, report?.id]);
  const versionKey = JSON.stringify([key, report?.lastModified, sessionToken]);
  const storageKey = `carmen_bu_comparison:${key}`;
  const [preference, setPreference] = useState(null);
  const currentPreference = preference?.key === key ? preference : readPreference(storageKey);
  const selectedUnitSet = new Set(selectedUnits.map(normalizeTenant));
  const available = units.filter((unit) => selectedUnitSet.has(normalizeTenant(unit.id)));
  const allowed = new Set(available.map((unit) => normalizeTenant(unit.id)));
  const defaultTenant = available.find((unit) => normalizeTenant(unit.id) === normalizeTenant(report?.tenant))?.id
    || available.find((unit) => getBuReadiness(report, unit.id))?.id;
  const preferred = currentPreference?.selected || (defaultTenant ? [defaultTenant] : []);
  const selected = preferred.filter((tenant) => allowed.has(normalizeTenant(tenant)));
  const includeTotal = currentPreference?.includeTotal === true;
  const [catalog, setCatalog] = useState({});
  const [snapshot, setSnapshot] = useState(null);
  const [loadingScope, setLoadingScope] = useState('');
  const [notice, setNotice] = useState(null);
  const error = notice?.scope === versionKey ? notice.message : '';
  const setError = (message) => setNotice({ scope: versionKey, message });
  const request = useRef(0);
  const cache = useRef(new Map());
  const needsOwnerGroups = available.length > 1 && report?.rows.some((row) => row.groups || row.deptGroup);
  const managedOwner = reuseOwnerMaster && !needsOwnerGroups ? report?.tenant : null;
  const catalogKey = JSON.stringify([sessionToken, year, available.map((unit) => unit.id), managedOwner]);
  const operationScope = JSON.stringify([versionKey, catalogKey]);
  const loading = loadingScope === operationScope;

  useEffect(() => {
    let cancelled = false;
    const [token, sourceYear, allTenants, managedOwner] = JSON.parse(catalogKey);
    const tenants = allTenants.filter((tenant) => !managedOwner || normalizeTenant(tenant) !== normalizeTenant(managedOwner));
    const load = async () => {
      if (!enabled) return;
      for (let start = 0; start < tenants.length; start += 2) {
        await Promise.all(tenants.slice(start, start + 2).map(async (tenant) => {
          const cacheKey = JSON.stringify([token, tenant, sourceYear]);
          try {
            let master = cache.current.get(cacheKey);
            if (!master) {
              const loaded = await fetchCarmenMasterData({ tenant, year: sourceYear, includeMappingGroups: true });
              const dimensions = await fetchCarmenDimensions({ tenant });
              master = { ...loaded, dimensionDefinitions: dimensions.definitions, dimensionOptions: dimensions };
              cache.current.set(cacheKey, master);
            }
            if (!cancelled) setCatalog((previous) => ({ ...previous, [tenant]: { master, catalogKey } }));
          } catch (failure) {
            if (!cancelled) setCatalog((previous) => ({ ...previous, [tenant]: { error: failure.message, catalogKey } }));
          }
        }));
      }
    };
    void load();
    return () => { cancelled = true; request.current += 1; };
  }, [catalogKey, enabled]);

  const masters = Object.fromEntries(available.map((unit) => [unit.id, catalog[unit.id]?.catalogKey === catalogKey ? catalog[unit.id] : {}]));
  if (managedOwner && ownerMaster) masters[managedOwner] = { master: ownerMaster };
  const updatePreference = (change) => {
    const next = { key, selected, includeTotal, ...change };
    setPreference(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const apply = async (filters) => {
    const requestId = ++request.current;
    setLoadingScope(operationScope); setError('');
    try {
      if (!selected.length) throw new Error('Select at least one business unit.');
      if (!/^\d{4}$/.test(String(filters.appliedYear)) || !Number.isInteger(Number(filters.appliedPeriod)) || Number(filters.appliedPeriod) < 1 || Number(filters.appliedPeriod) > 12) {
        throw new Error('Select a valid year and period.');
      }
      const selectedSet = new Set(selected.map(normalizeTenant));
      const ordered = available.filter((unit) => selectedSet.has(normalizeTenant(unit.id)))
        .sort((left, right) => Number(normalizeTenant(right.id) === normalizeTenant(report.tenant)) - Number(normalizeTenant(left.id) === normalizeTenant(report.tenant)));
      for (const unit of ordered) {
        if (!getBuReadiness(report, unit.id, masters[unit.id]?.master)) throw new Error(`${unit.name}: mapping review required. Ask a report administrator to complete setup.`);
        if (!masters[unit.id]?.master) throw new Error(`${unit.name}: ${masters[unit.id]?.error || 'Master data is loading. Please try again.'}`);
      }
      if (filters.appliedDay) {
        const period = masters[ordered[0].id].master.periods?.find((item) => String(item.id) === String(filters.appliedPeriod));
        const start = new Date(period?.date);
        if (Number.isNaN(start.getTime())) throw new Error('Fiscal periods are required for daily comparison.');
        const days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        if (!Number.isInteger(Number(filters.appliedDay)) || Number(filters.appliedDay) < 1 || Number(filters.appliedDay) > days) throw new Error(`Day must be between 1 and ${days}.`);
      }
      const response = await fetchCarmenReportData({ tenant: report.tenant, reportId: report.id,
        year: filters.appliedYear, period: filters.appliedPeriod, revision: filters.appliedRevision, day: filters.appliedDay,
        sourceTenants: ordered.map((unit) => unit.id), departmentsByTenant: filters.departmentsByTenant });
      if (!Array.isArray(response.datasets) || response.datasets.length !== ordered.length
        || ordered.some((unit) => !response.datasets.some((dataset) => normalizeTenant(dataset.tenant) === normalizeTenant(unit.id)))) {
        throw new Error('Comparison API returned incomplete data. Update the backend before using comparison.');
      }
      const datasets = ordered.map((unit) => {
        const data = response.datasets.find((dataset) => normalizeTenant(dataset.tenant) === normalizeTenant(unit.id));
        return { ...data, name: unit.name, masterData: { ...masters[unit.id].master, ...data.masterData } };
      });
      // Build before publishing, so calculation failures cannot replace a good snapshot.
      const calculatedGroups = buildBuComparison({ report, datasets, filters, includeTotal: true });
      if (requestId === request.current) setSnapshot({ versionKey, report, datasets, filters, calculatedGroups });
      return true;
    } catch (failure) {
      if (requestId === request.current) setError(`${failure.message} Previous results, if shown, have not changed.`);
      return false;
    } finally { if (requestId === request.current) setLoadingScope(''); }
  };
  const validSnapshot = snapshot?.versionKey === versionKey && snapshot.datasets.every((dataset) => allowed.has(normalizeTenant(dataset.tenant))) ? snapshot : null;
  const groups = useMemo(() => validSnapshot ? validSnapshot.calculatedGroups.filter((group) => includeTotal || group.tenant !== '__total') : null, [validSnapshot, includeTotal]);
  return { available, selected, includeTotal, masters, loading, error, snapshot: validSnapshot, groups, apply,
    setSelected: (value) => updatePreference({ selected: value }),
    setIncludeTotal: (value) => updatePreference({ includeTotal: value }),
    clearSnapshot: () => { request.current += 1; setSnapshot(null); setLoadingScope(''); setError(''); },
  };
}
