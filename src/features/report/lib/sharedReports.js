import { requestCarmenJson } from './reportApi.js';
import { buildReportData, createBlankReport } from './reportLogic.js';

const request = (path = '', options = {}) => requestCarmenJson(`/api/shared-reports${path}`, {
  useTenant: false, authorizationFailureAffectsSession: false, ...options,
});
export const sharedReportsApi = {
  capabilities: () => request('/capabilities'),
  list: () => request(),
  validate: (report) => request('/validate', { method: 'POST', body: report }),
  get: (id) => request(`/${encodeURIComponent(id)}`),
  save: (report) => request(report.version ? `/${encodeURIComponent(report.id)}` : '', { method: report.version ? 'PUT' : 'POST', body: report }),
  clone: (id) => request(`/${encodeURIComponent(id)}/clone`, { method: 'POST' }),
  delete: (report) => request(`/${encodeURIComponent(report.id)}`, { method: 'DELETE', query: { version: report.version } }),
  history: (id) => request(`/${encodeURIComponent(id)}/history`),
  restore: (report, version) => request(`/${encodeURIComponent(report.id)}/history/${version}/restore`, { method: 'POST', body: { version: report.version } }),
  data: (report, filters) => request(`/${encodeURIComponent(report.id)}/data`, { method: 'POST', body: filters, timeoutMs: 120000 }),
};

export const createSharedReport = (tenants) => ({
  ...createBlankReport('Consolidated', [], crypto.randomUUID()), kind: 'shared', tenants,
  mappings: {}, access: [], kpis: [], compatibilityConfirmed: false,
  columns: [{ id: 'C1', label: 'Combined actual', sourceTenant: 'ALL', type: 'AC', isActive: true, yearMode: 'current', periodMode: 'current' }],
});

export function calculateSharedReport(report, response, filters) {
  if (response.configVersion !== report.version || response.mappingVersion !== report.version)
    throw new Error('Template changed. Reload before calculating.');
  if (JSON.stringify(response.requestedTenants) !== JSON.stringify(report.tenants))
    throw new Error('Source business units differ from this template.');
  if (response.isComplete && report.tenants.some(tenant => !response.byTenant?.[tenant]))
    throw new Error('Complete response is missing a business unit source.');
  const tenantSet = new Set(report.tenants);
  const byTenant = {};
  for (const tenant of report.tenants) {
    const source = response.byTenant?.[tenant];
    if (!source) continue;
    if (!Array.isArray(source.actualRows) || !Array.isArray(source.budgetRows))
      throw new Error(`Invalid financial source payload: ${tenant}`);
    const mapped = { ...report, columns: report.columns.filter(c => !c.isFormula && !c.isPercent),
      rows: report.rows.map(row => {
        if (row.isHeader || row.isTotal) return { ...row, isTotal: false, isHeader: true };
        const mapping = report.mappings?.[tenant]?.[row.id];
        if (!mapping) throw new Error(`Mapping missing: ${tenant} / ${row.desc}`);
        return mapping.notApplicable ? { ...row, isHeader: true } : { ...row, ...mapping, id: row.id, isTotal: false, isHeader: false };
      }) };
    const data = buildReportData({ activeReport: mapped, engineData: source.actualRows, budgetData: source.budgetRows,
      appliedDepts: [], appliedYear: filters.year, appliedPeriod: filters.period, appliedRevision: filters.revision,
      appliedDay: filters.day, periodOptions: source.periods,
      masterData: { accCodes: source.accountCodes || [], groups: source.groups || {} } });
    byTenant[tenant] = Object.fromEntries(data.map(row => [row.id, Object.fromEntries(mapped.columns.map(col => [col.id,
      (row.results[col.id] ?? 0) * (report.mappings?.[tenant]?.[row.id]?.sign ?? 1)]))]));
  }
  const baseValues = {};
  for (const row of report.rows.filter(r => !r.isHeader && !r.isTotal)) {
    baseValues[row.id] = {};
    for (const col of report.columns.filter(c => !c.isFormula && !c.isPercent)) {
      const tenants = col.sourceTenant === 'ALL' ? report.tenants : [col.sourceTenant];
      if (tenants.some(t => !tenantSet.has(t))) throw new Error('Invalid column business unit source.');
      baseValues[row.id][col.id] = tenants.some(t => !byTenant[t]) ? null
        : tenants.reduce((total, tenant) => total + byTenant[tenant][row.id][col.id], 0);
    }
  }
  return { byTenant, baseValues, rows: buildReportData({ activeReport: report, baseValues, engineData: [], budgetData: [], appliedDepts: [],
    appliedYear: filters.year, appliedPeriod: filters.period, appliedRevision: filters.revision }) };
}
