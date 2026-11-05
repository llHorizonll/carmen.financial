import { requestCarmenJson } from '../../report/lib/reportApi.js';

const request = (path, options = {}) => requestCarmenJson(`/api/consolidation${path}`, {
  useTenant: false,
  authorizationFailureAffectsSession: false,
  ...options,
});
const profilePath = (tenant) => `/profiles/${encodeURIComponent(tenant)}`;

export const listProfiles = () => request('/profiles');
export const saveProfile = (original, draft) => request(original ? profilePath(original.tenant) : '/profiles', {
  method: original ? 'PUT' : 'POST',
  body: { tenant: draft.tenant, memberTenants: draft.memberTenants, ...(original ? { revision: original.revision } : {}) },
});
export const getMappings = (tenant) => request(`${profilePath(tenant)}/mappings`);
export const saveMappings = (tenant, mapping) => request(`${profilePath(tenant)}/mappings`, { method: 'PUT', body: mapping });
export const listReports = (profileTenant) => request('/reports', { query: { profileTenant } });
export const getReport = (id) => request(`/reports/${encodeURIComponent(id)}`);
export const saveReport = (report) => request(report.version ? `/reports/${encodeURIComponent(report.id)}` : '/reports', {
  method: report.version ? 'PUT' : 'POST', body: report,
});
export const consolidationApi = { listProfiles, saveProfile, getMappings, saveMappings, listReports, getReport, saveReport };
