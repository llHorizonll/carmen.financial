import { useEffect, useState } from 'react';
import { fetchCarmenBusinessUnits, fetchCarmenReports } from '../lib/reportApi.js';
import { getBusinessUnitTenant, getBusinessUnitDisplayName, getStoredBusinessUnitSelection, saveBusinessUnitSelection } from '../lib/carmenSession.js';

export const reportKey = (report) => report?.tenant ? JSON.stringify([report.tenant, report.id]) : report?.id;

export default function useBusinessUnitReports({ enabled, session, setReports }) {
  const [units, setUnits] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statuses, setStatuses] = useState({});
  const token = session?.accessToken;
  const defaultTenant = session?.businessUnit?.tenant;
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true); setError(''); setUnits([]); setSelected([]);
    fetchCarmenBusinessUnits().then((list) => {
      if (cancelled) return;
      if (!Array.isArray(list)) throw new Error('Invalid business unit list.');
      const allowed = list.map((unit) => ({ id: getBusinessUnitTenant(unit), name: getBusinessUnitDisplayName(unit),
        permission: unit.financialReport })).filter((unit) => unit.id);
      setUnits(allowed);
      const initial = allowed.find((unit) => unit.id.toLowerCase() === String(defaultTenant).toLowerCase()) || allowed[0];
      const stored = getStoredBusinessUnitSelection();
      const restored = stored?.map((tenant) => allowed.find((unit) => unit.id.toLowerCase() === tenant.toLowerCase())?.id).filter(Boolean);
      const selection = restored?.length ? [restored[0]] : initial ? [initial.id] : [];
      setSelected(selection);
      saveBusinessUnitSelection(selection);
      if (!allowed.length) setError('No business units assigned to this user.');
    }).catch((failure) => { if (!cancelled) setError(failure.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [enabled, token, defaultTenant]);

  const selectionKey = JSON.stringify(selected);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const tenants = JSON.parse(selectionKey);
    setStatuses(Object.fromEntries(tenants.map((tenant) => [tenant, { loading: true }])));
    setReports([]);
    const load = async () => {
      for (let start = 0; start < tenants.length; start += 2) {
        const results = await Promise.allSettled(tenants.slice(start, start + 2).map((tenant) => fetchCarmenReports({ tenant })));
        if (cancelled) return;
        results.forEach((result, index) => {
          const tenant = tenants[start + index];
          setStatuses((previous) => ({ ...previous, [tenant]: result.status === 'fulfilled'
            ? { loading: false } : { loading: false, error: result.reason?.message || 'Unable to load reports.' } }));
          if (result.status === 'fulfilled') setReports((previous) => [...previous, ...result.value.map((report) => ({ ...report, tenant }))]);
        });
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [enabled, selectionKey, setReports]);
  const selectBusinessUnits = (selection) => {
    const singleSelection = selection.slice(0, 1);
    saveBusinessUnitSelection(singleSelection);
    setSelected(singleSelection);
  };
  return { units, selected, setSelected: selectBusinessUnits, loading, error, statuses };
}
