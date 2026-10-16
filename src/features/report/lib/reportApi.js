import {
  adaptCarmenAccountCodes,
  adaptCarmenAccountGroups,
  adaptCarmenBudgetRevisions,
  adaptCarmenCompany,
  adaptCarmenDepartmentGroups,
  adaptCarmenDepartments,
  adaptCarmenGlPeriods,
  adaptCarmenReportDefinition,
  adaptCarmenReportDefinitions,
  adaptCarmenLoginUser,
  deriveCarmenFinancialReportAccess,
} from './reportAdapters.js';
import {
  clearCarmenSession,
  getBusinessUnitDisplayName,
  getBusinessUnitTenant,
  getStoredCarmenSession,
  saveCarmenSession,
} from './carmenSession.js';
import { reportCarmenApiFailure } from '../../../lib/carmenApiFailure.js';

export {
  clearCarmenSession,
  getBusinessUnitDisplayName,
  getBusinessUnitTenant,
  getStoredCarmenSession,
  saveCarmenSession,
};

const DEFAULT_BASE_URL = 'http://localhost/Carmen.WebApi';
const normalizeColumnType = (value) => {
  const type = String(value || '').trim().toUpperCase();
  if (type === 'BUD') return 'BC';
  if (type === 'BUDACC') return 'BCC';
  return type;
};
const toTrimmedStringArray = (value) =>
  Array.isArray(value)
    ? value.flatMap((item) => {
        const trimmed = String(item).trim();
        return trimmed ? [trimmed] : [];
      })
    : [];

const getWindowConfig = () => (typeof window !== 'undefined' ? window.__CARMEN_CONFIG__ || {} : {});
const joinUrl = (baseUrl, path) => `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

const publishCarmenApiError = (error) => {
  if (error.affectsSession) {
    clearCarmenSession();
  }
  reportCarmenApiFailure(error);
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent('carmen-api-error', {
    detail: {
      kind: error.kind || 'api',
      message: error.message,
      path: error.path || '',
      status: error.status || null,
    },
  }));
};

const createCarmenApiError = (message, details = {}) => {
  const error = new Error(message);
  error.name = 'CarmenApiError';
  Object.assign(error, details);
  publishCarmenApiError(error);
  return error;
};

const fetchWithNetworkHandling = async (url, options = {}, { path = '', affectsSession = false, timeoutMs = 30000 } = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: options.signal || controller.signal });
  } catch (cause) {
    if (cause?.name === 'AbortError') {
      throw createCarmenApiError(
        'Carmen API request timed out. Please try again.',
        { kind: 'timeout', path, cause, affectsSession: false },
      );
    }
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    throw createCarmenApiError(
      isOffline
        ? 'You are offline. Reconnect to the internet and try again.'
        : 'Unable to reach Carmen API. Check your network connection or contact the administrator.',
      { kind: isOffline ? 'offline' : 'network', path, cause, affectsSession: false },
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

const extractApiErrorMessage = (payload) => {
  if (!payload || typeof payload !== 'object') return '';
  return String(
    payload.UserMessage
    || payload.userMessage
    || payload.Message
    || payload.message
    || payload.title
    || payload.InternalMessage
    || payload.internalMessage
    || '',
  ).trim();
};

const readResponsePayload = async (response) => {
  if (response.status === 204) return null;
  if (typeof response.text === 'function') {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return typeof response.json === 'function' ? response.json() : null;
};

const throwResponseError = async (response, { path, context, isAuthenticated = false, authorizationFailureAffectsSession = true }) => {
  let payload = null;
  try {
    payload = await readResponsePayload(response);
  } catch {
    payload = null;
  }

  const unauthorized = isAuthenticated && (response.status === 401 || (response.status === 403 && authorizationFailureAffectsSession));
  if (unauthorized) {
    throw createCarmenApiError(
      'Your Carmen session expired. Please sign in again.',
      { kind: 'session', status: response.status, path, affectsSession: true },
    );
  }

  const isHtml = response.headers?.get?.('content-type')?.toLowerCase().includes('text/html')
    || (typeof payload === 'string' && /^\s*(?:<!doctype html|<html\b)/i.test(payload));
  const apiMessage = isHtml ? '' : typeof payload === 'string' ? payload.trim() : extractApiErrorMessage(payload);
  const historyEndpointMissing = response.status === 404
    && /\/api\/reports\/[^/]+\/history(?:\/|$)/.test(path);
  const message = historyEndpointMissing
    ? 'Report history is unavailable on this Carmen API server. The history endpoint returned HTTP 404.'
    : apiMessage
      ? `Carmen API: ${apiMessage}`
      : `${context} failed with HTTP ${response.status}.`;
  throw createCarmenApiError(message, {
    kind: response.status === 401 || response.status === 403 ? 'authorization' : 'api',
    status: response.status,
    path,
    affectsSession: false,
  });
};

const getBusinessUnitApiBaseUrl = () => {
  const config = getWindowConfig();
  return config?.apiUrl || DEFAULT_BASE_URL;
};

export const getCarmenApiConfig = () => {
  const config = getWindowConfig();
  return {
    baseUrl: config?.apiUrl || DEFAULT_BASE_URL,
    adminToken: config?.adminToken || '',
  };
};

const buildUrl = (path, { useTenant = true, query = {} } = {}) => {
  const { baseUrl } = getCarmenApiConfig();
  const session = getStoredCarmenSession();
  const requestUrl = joinUrl(baseUrl, path);
  const url = new URL(requestUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  if (useTenant && session?.businessUnit?.tenant) url.searchParams.set('useTenant', session.businessUnit.tenant);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  return /^https?:\/\//i.test(requestUrl)
    ? url.toString()
    : `${url.pathname}${url.search}`;
};

export const isCarmenApiConfigured = () => Boolean(getStoredCarmenSession()?.accessToken);

export const fetchBusinessUnitsByUsername = async (username) => {
  const trimmedUserName = String(username || '').trim();
  const { adminToken } = getCarmenApiConfig();
  if (!adminToken) throw new Error('Carmen adminToken not found in config.js.');
  if (!trimmedUserName) return [];

  const url = `${getBusinessUnitApiBaseUrl().replace(/\/$/, '')}/api/userTenant/tenantListIn/${encodeURIComponent(adminToken)}/${encodeURIComponent(trimmedUserName)}`;
  const response = await fetchWithNetworkHandling(url, undefined, { path: '/api/userTenant/tenantListIn' });
  if (!response.ok) {
    await throwResponseError(response, {
      path: '/api/userTenant/tenantListIn',
      context: 'Business unit request',
    });
  }
  if (response.status === 204) return [];
  const payload = await response.json();
  if (!Array.isArray(payload)) return [];
  return payload;
};

const extractAccessToken = (loginResponse) =>
  loginResponse?.AccessToken || loginResponse?.accessToken || loginResponse?.access_token || loginResponse?.Token || '';

const normalizeLanguageCode = (language) => {
  const value = String(language || '').trim().toLowerCase();
  if (!value) return 'EN';
  if (value.startsWith('th')) return 'TH';
  if (value.startsWith('vi')) return 'VI';
  return 'EN';
};

const normalizeReportRowDimensions = (row) => {
  const dimensions = [];
  const seen = new Set();

  const pushDimension = (key, value) => {
    const normalizedKey = String(key || '').trim().toLowerCase();
    const normalizedValue = String(value ?? '').trim();
    if (!normalizedKey || !normalizedValue) return;
    const signature = `${normalizedKey}:${normalizedValue}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    dimensions.push({ key: normalizedKey, value: normalizedValue });
  };

  if (Array.isArray(row?.dimensions || row?.Dimensions)) {
    (row.dimensions || row.Dimensions).forEach((dimension) => {
      if (!dimension) return;
      pushDimension(dimension.key || dimension.name || dimension.field || dimension.Key || dimension.Field, dimension.value || dimension.id || dimension.code || dimension.Value || dimension.Code);
    });
  }

  Array.from({ length: 10 }, (_, index) => `dim${index + 1}`).forEach((field) => {
    pushDimension(field, row?.[field]);
  });

  return dimensions;
};

const normalizeReportRowForPayload = (row) => {
  if (!row || typeof row !== 'object') return row;
  const dimensions = normalizeReportRowDimensions(row);
  const normalizedType = String(row.type ?? row.Type ?? '').trim().toUpperCase();
  const isFormulaRow = row.isTotal === true || ['F', 'FORMULA', 'TOTAL'].includes(normalizedType);
  const requestedNumberFormat = row.numberFormat ?? row.NumberFormat;
  const numberFormat = requestedNumberFormat == null || requestedNumberFormat === ''
    ? null
    : requestedNumberFormat === 'percent' && isFormulaRow
        ? 'percent'
        : 'column';
  return {
    ...row,
    ...(numberFormat ? { numberFormat } : {}),
    ...(dimensions.length > 0 ? { dimensions } : {}),
  };
};

const resolveReportOwner = (report) => {
  const explicitOwner = String(report?.owner || report?.Owner || report?.createdBy || report?.CreatedBy || '').trim();
  if (explicitOwner) return explicitOwner;

  const assignedUsers = Array.isArray(report?.assignedUsers || report?.AssignedUsers)
    ? (report.assignedUsers || report.AssignedUsers)
    : [];
  const firstAssignedUser = String(assignedUsers[0] || '').trim();
  if (firstAssignedUser) return firstAssignedUser;

  const accessRows = Array.isArray(report?.access || report?.Access) ? (report.access || report.Access) : [];
  const firstAccessUser = String(accessRows[0]?.userId || accessRows[0]?.UserId || '').trim();
  return firstAccessUser;
};

export const loginWithCarmenCredentials = async ({ userName, password, tenant, language }) => {
  const { adminToken } = getCarmenApiConfig();
  if (!adminToken) {
    throw new Error('Carmen adminToken not found in config.js.');
  }

  const response = await fetchWithNetworkHandling(buildUrl('/api/login', {
    useTenant: false,
    query: { adminToken },
  }), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Language: normalizeLanguageCode(language),
      Tenant: tenant,
      Password: password,
      UserName: userName,
    }),
  }, { path: '/api/login' });

  if (!response.ok) {
    await throwResponseError(response, { path: '/api/login', context: 'Carmen login' });
  }

  const payload = await response.json();
  const token = extractAccessToken(payload);
  if (!token) {
    throw new Error('Carmen login response did not include AccessToken.');
  }
  return {
    accessToken: token,
    raw: payload,
    user: adaptCarmenLoginUser(payload),
  };
};

const pendingReadRequests = new Map();

export const fetchCarmenBusinessUnits = async () => {
  const username = getStoredCarmenSession()?.username;
  if (!username) throw new Error('Carmen session username is missing.');
  const response = await requestCarmenJson(`/api/userTenant/UserName/${encodeURIComponent(username)}`, {
    useTenant: false, authorizationFailureAffectsSession: false,
  });
  const items = Array.isArray(response) ? response : response?.Data;
  if (!Array.isArray(items)) throw new Error('Invalid business unit response.');
  return items.map((item) => ({
    Tenant: getBusinessUnitTenant(item.Tenant),
    Description: getBusinessUnitDisplayName(item.Tenant),
    IsDefault: item.IsDefault,
    financialReport: deriveCarmenFinancialReportAccess(item.Permission),
  }));
};

const requestCarmenJson = async (path, options = {}) => {
  const session = getStoredCarmenSession();
  if (!session?.accessToken) throw new Error('Carmen session is missing.');
  const method = options.method || 'GET';
  const url = options.tenant
    ? buildUrl(path, { ...options, useTenant: false, query: { ...options.query, useTenant: options.tenant } })
    : buildUrl(path, options);

  const executeRequest = async () => {
    const response = await fetchWithNetworkHandling(url, {
      method,
      headers: {
        Authorization: session.accessToken,
        'Accept-Language': session.language,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }, { path, affectsSession: true, timeoutMs: options.timeoutMs });

    if (!response.ok) {
      await throwResponseError(response, {
        path,
        context: `Carmen API request for ${path}`,
        isAuthenticated: true,
        authorizationFailureAffectsSession: options.tenant ? false : options.authorizationFailureAffectsSession,
      });
    }

    return readResponsePayload(response);
  };

  const isReadRequest = method === 'GET' || (method === 'POST' && /\/search(?:\?|$)/.test(path));
  if (!isReadRequest) return executeRequest();

  const requestKey = JSON.stringify([session.accessToken, session.language, method, url, options.body || null]);
  if (!pendingReadRequests.has(requestKey)) {
    pendingReadRequests.set(
      requestKey,
      executeRequest().finally(() => pendingReadRequests.delete(requestKey)),
    );
  }
  return pendingReadRequests.get(requestKey);
};

export const fetchCarmenReportOptions = async (context = {}) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const options = await requestCarmenJson('/api/report-options', context);
  return {
    multiBuComparison: options?.multiBuComparison === true,
    themes: Array.isArray(options?.themes) ? options.themes : [],
    periodFormats: Array.isArray(options?.periodFormats) ? options.periodFormats : [],
    accountCategories: Array.isArray(options?.accountCategories) ? options.accountCategories : [],
    columnTypes: Array.isArray(options?.columnTypes) ? options.columnTypes : [],
    columnLogicTypes: Array.isArray(options?.columnLogicTypes) ? options.columnLogicTypes : [],
    yearModes: Array.isArray(options?.yearModes) ? options.yearModes : [],
    periodModes: Array.isArray(options?.periodModes) ? options.periodModes : [],
    rowTypes: Array.isArray(options?.rowTypes) ? options.rowTypes : [],
    indentLevels: Array.isArray(options?.indentLevels) ? options.indentLevels : [],
    raw: options,
  };
};

export const fetchCarmenDimensions = async (context = {}) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const response = await requestCarmenJson('/api/dimension/search', {
    ...context,
    method: 'POST',
    body: {
      Limit: 0,
      Page: 1,
      WhereGroupList: [{
        AndOr: 'And',
        ConditionList: [{ AndOr: 'And', Field: 'Active', Operator: '=', Value: true }],
      }],
    },
  });

  const parseValues = (value) => {
    if (Array.isArray(value)) return toTrimmedStringArray(value);
    const text = String(value || '').trim();
    if (!text) return [];
    try {
      return toTrimmedStringArray(JSON.parse(text));
    } catch {
      return text.split(/[\r\n,|]+/).map((item) => item.trim()).filter(Boolean);
    }
  };

  const definitions = (Array.isArray(response?.Data) ? response.Data : [])
    .sort((left, right) => String(left?.Id || '').localeCompare(String(right?.Id || ''), undefined, { numeric: true }))
    .slice(0, 10)
    .map((item, index) => ({
      key: `dim${index + 1}`,
      caption: String(item?.Caption || '').trim() || `DIM ${index + 1}`,
      values: [...new Set(parseValues(item?.ListOfValues))],
    }));

  return {
    ...Object.fromEntries(definitions.map(({ key, values }) => [key, values])),
    definitions,
  };
};

export const fetchCarmenUsers = async () => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const response = await requestCarmenJson('/api/user/search', {
    method: 'POST',
    body: {
      Limit: 0,
      Page: 0,
      WhereGroupList: [{
        AndOr: 'And',
        ConditionList: [{ AndOr: 'And', Field: 'Active', Operator: '=', Value: true }],
      }],
    },
  });

  return (Array.isArray(response?.Data) ? response.Data : [])
    .filter((user) => user?.Active !== false)
    .map((user) => {
      const userName = String(user?.UserName || '').trim();
      return {
        id: userName,
        name: userName,
        role: 'User',
        source: 'carmen-api',
        userName,
      };
    })
    .filter((user) => user.id)
    .sort((left, right) => left.name.localeCompare(right.name));
};

const fetchCarmenLookupSearch = async (path, context) => requestCarmenJson(path, {
  ...context,
  method: 'POST',
  body: {
    Limit: 0,
    Page: 1,
    WhereGroupList: [],
  },
});

export const fetchCarmenAccountGroups = async (context = {}) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }
  const response = await fetchCarmenLookupSearch('/api/accountGroup/search', context);
  return adaptCarmenAccountGroups(response);
};

export const fetchCarmenDepartmentGroups = async (context = {}) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }
  const response = await fetchCarmenLookupSearch('/api/DepartmentCategory/search', context);
  return adaptCarmenDepartmentGroups(response);
};

export const fetchCarmenReportPeriods = async ({ year, tenant } = {}) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const periods = await requestCarmenJson('/api/report-periods', {
    tenant,
    query: { year },
  });
  return Array.isArray(periods) ? periods : [];
};

export const fetchCarmenReports = async (context = {}) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const reports = await requestCarmenJson('/api/reports', context);
  return adaptCarmenReportDefinitions(reports);
};

export const fetchCarmenReport = async (id, context = {}) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  return adaptCarmenReportDefinition(await requestCarmenJson(`/api/reports/${encodeURIComponent(id)}`, context));
};

export const buildReportDefinitionPayload = (report) => ({
  id: String(report?.id || '').trim(),
  name: String(report?.name || '').trim(),
  companyName: String(report?.companyName || '').trim(),
  category: Array.isArray(report?.category) && report.category.length > 0
    ? toTrimmedStringArray(report.category)
    : ['ALL'],
  assignedUsers: Array.isArray(report?.assignedUsers)
    ? toTrimmedStringArray(report.assignedUsers)
    : [],
  isActive: report?.isActive !== false,
  periodFormat: String(report?.periodFormat || 'standard').trim() || 'standard',
  customDateLabel: String(report?.customDateLabel || '').trim(),
  customPeriodLabel: String(report?.customPeriodLabel || '').trim(),
  overrideDateDisplay: String(report?.overrideDateDisplay || '').trim(),
  overridePeriodDisplay: String(report?.overridePeriodDisplay || '').trim(),
  remark: String(report?.remark || '').trim(),
  owner: resolveReportOwner(report),
  reportType: String(report?.reportType || 'Monthly').trim() || 'Monthly',
  day: String(report?.day || '').trim(),
  theme: String(report?.theme || 'blue').trim() || 'blue',
  ...(report?.lastModified ? { lastModified: report.lastModified } : {}),
  descriptionPosition: Number.isInteger(Number(report?.descriptionPosition))
    ? Number(report.descriptionPosition)
    : 0,
  columns: Array.isArray(report?.columns)
    ? report.columns.map((column) => {
        const { Type: _legacyType, ...normalizedColumn } = column || {};
        if (column?.isFormula || column?.isPercent) {
          const { type: _staleDataType, ...logicColumn } = normalizedColumn;
          return logicColumn;
        }
        const rawType = column?.type ?? column?.Type;
        return rawType == null
          ? normalizedColumn
          : { ...normalizedColumn, type: normalizeColumnType(rawType) };
      })
    : [],
  rows: Array.isArray(report?.rows) ? report.rows.map(normalizeReportRowForPayload) : [],
  access: Array.isArray(report?.access) && report.access.length > 0
    ? report.access
    : Array.isArray(report?.assignedUsers)
      ? report.assignedUsers.reduce((entries, userId) => {
        const trimmedUserId = String(userId).trim();
        if (!trimmedUserId) return entries;
        entries.push({
          userId: trimmedUserId,
          userName: trimmedUserId,
          displayName: trimmedUserId,
          role: 'User',
          canView: true,
          canEdit: true,
        });
        return entries;
      }, [])
      : [],
});

const requireBuMappingSupport = async (payloads, context) => {
  if (!payloads.some((payload) => payload.rows?.some((row) => row.buMappings?.length))) return;
  const options = await requestCarmenJson('/api/report-options', context);
  if (options?.multiBuComparison !== true) throw new Error('Update the Carmen backend before saving multi-BU mappings. Your draft has not been saved.');
};

export const createCarmenReport = async (report, context = {}) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const payload = buildReportDefinitionPayload(report);
  if (!payload.id) {
    throw new Error('Report id is required before creating a report.');
  }
  await requireBuMappingSupport([payload], context);
  const response = await requestCarmenJson('/api/reports', {
    ...context,
    method: 'POST',
    body: payload,
  });
  const wrappedReport = response?.report
    || response?.Report
    || response?.data
    || response?.Data
    || response;
  const createdReport = Array.isArray(wrappedReport) ? wrappedReport[0] : wrappedReport;
  const createdId = String(createdReport?.id || createdReport?.Id || payload.id).trim();

  if (!createdId) {
    throw new Error('Carmen API did not return an id for the new report.');
  }

  // POST returns a success flag on Carmen API. Read the stored timestamp before
  // the first edit, because PUT requires it for optimistic concurrency.
  const savedReport = adaptCarmenReportDefinition(
    await requestCarmenJson(`/api/reports/${encodeURIComponent(createdId)}`, context),
  );
  if (!savedReport?.lastModified) {
    throw new Error('Carmen API did not return a version for the new report.');
  }
  return savedReport;
};

export const fetchCarmenReportHistory = (id, context = {}) =>
  requestCarmenJson(`/api/reports/${encodeURIComponent(id)}/history`, context);

export const fetchCarmenReportHistoryVersion = async (id, historyId, context = {}) =>
  adaptCarmenReportDefinition(await requestCarmenJson(
    `/api/reports/${encodeURIComponent(id)}/history/${encodeURIComponent(historyId)}`,
    context,
  ));

export const restoreCarmenReportHistoryVersion = async (id, historyId, lastModified, context = {}) =>
  adaptCarmenReportDefinition(await requestCarmenJson(
    `/api/reports/${encodeURIComponent(id)}/history/${encodeURIComponent(historyId)}/restore`,
    { ...context, method: 'POST', body: { lastModified } },
  ));

export const saveCarmenReport = async (report, context = {}) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const payload = buildReportDefinitionPayload(report);
  await requireBuMappingSupport([payload], context);
  const method = report?.id ? 'PUT' : 'POST';
  const path = report?.id
    ? `/api/reports/${encodeURIComponent(report.id)}`
    : '/api/reports';

  const response = await requestCarmenJson(path, {
    ...context,
    method,
    body: payload,
  });

  return response;
};

export const saveCarmenReports = async (reports, context = {}) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }
  if (!Array.isArray(reports) || reports.length === 0) return [];
  const payloads = reports.map(buildReportDefinitionPayload);
  await requireBuMappingSupport(payloads, context);

  return requestCarmenJson('/api/reports/batch', {
    ...context,
    method: 'POST',
    body: payloads,
  });
};

export const deleteCarmenReport = async (id, context = {}) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const response = await requestCarmenJson(`/api/reports/${encodeURIComponent(id)}`, {
    ...context,
    method: 'DELETE',
  });

  return response;
};

export const cloneCarmenReport = async (id, context = {}) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const report = await requestCarmenJson(`/api/reports/${encodeURIComponent(id)}/clone`, {
    ...context,
    method: 'POST',
  });
  return adaptCarmenReportDefinition(report);
};

export const fetchCarmenMasterData = async ({ year, tenant, includeMappingGroups = false }) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const session = getStoredCarmenSession();
  const context = { tenant };
  const usersPromise = tenant ? Promise.resolve([]) : fetchCarmenUsers().catch(() => []);
  // Group maintenance permissions are separate from Financial Report View.
  const optionalGroupLookup = (error) => {
    if (error.status === 403) return [];
    throw error;
  };
  try {
    const [masterData, users, accountGroups, deptGroups] = await Promise.all([
      requestCarmenJson(`/api/report-master-data?year=${encodeURIComponent(year)}${includeMappingGroups ? '&includeMappingGroups=true' : ''}`, context),
      usersPromise,
      includeMappingGroups ? Promise.resolve([]) : tenant ? fetchCarmenAccountGroups(context).catch(optionalGroupLookup) : fetchCarmenAccountGroups().catch(() => []),
      includeMappingGroups ? Promise.resolve([]) : tenant ? fetchCarmenDepartmentGroups(context).catch(optionalGroupLookup) : fetchCarmenDepartmentGroups().catch(() => []),
    ]);
    const currentUser = masterData?.currentUser || session?.user || null;
    return {
      currentUser,
      users: currentUser
        ? [currentUser, ...(tenant ? masterData.users || [] : users).filter((user) => String(user.id) !== String(currentUser.id))]
        : users,
      companyProfile: adaptCarmenCompany(masterData?.companyProfile),
      depts: adaptCarmenDepartments(masterData?.depts),
      accCodes: adaptCarmenAccountCodes(masterData?.accCodes),
      accountGroups: includeMappingGroups ? adaptCarmenAccountGroups(masterData?.accountGroups) : accountGroups,
      deptGroups: includeMappingGroups ? adaptCarmenDepartmentGroups(masterData?.deptGroups) : deptGroups,
      periods: adaptCarmenGlPeriods(masterData?.periods),
      budgetRevisions: adaptCarmenBudgetRevisions(masterData?.budgetRevisions),
      groups: {
        L1: Array.isArray(masterData?.groups?.L1) ? masterData.groups.L1 : [],
        L2: Array.isArray(masterData?.groups?.L2) ? masterData.groups.L2 : [],
        L3: Array.isArray(masterData?.groups?.L3) ? masterData.groups.L3 : [],
        L4: Array.isArray(masterData?.groups?.L4) ? masterData.groups.L4 : [],
      },
    };
  } catch (error) {
    if (tenant) throw error;
    const session = getStoredCarmenSession();
    if (!session?.accessToken) {
      throw new Error('Carmen session expired. Please sign in again.');
    }

    const [company, departments, accountCodes, periods, budgets, users] = await Promise.all([
      requestCarmenJson('/api/company'),
      requestCarmenJson('/api/department'),
      requestCarmenJson('/api/accountCode'),
      requestCarmenJson(`/api/glPeriod/year/${encodeURIComponent(year)}`),
      requestCarmenJson('/api/budget'),
      usersPromise,
    ]);

    const currentUser = session?.user || {
      id: String(session?.username || 'carmen-user'),
      name: session?.username || 'Carmen User',
      role: 'User',
      permissions: { financialReport: { view: true } },
      tenant: session?.businessUnit?.tenant || '',
    };
    return {
      currentUser,
      users: [currentUser, ...users.filter((user) =>
        String(user.id) !== String(currentUser.id)
        && String(user.userName) !== String(currentUser.userName || session?.username)
      )],
      companyProfile: adaptCarmenCompany(company),
      depts: adaptCarmenDepartments(departments),
      accCodes: adaptCarmenAccountCodes(accountCodes),
      accountGroups: [],
      deptGroups: [],
      periods: adaptCarmenGlPeriods(periods),
      budgetRevisions: adaptCarmenBudgetRevisions(budgets),
      groups: {
        L1: [],
        L2: [],
        L3: [],
        L4: [],
      },
    };
  }
};

export const fetchCarmenReportData = async ({ reportId = '', year, period, revision, deptIds = [], day = '', tenant, sourceTenants, departmentsByTenant }) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const response = await requestCarmenJson('/api/report-data', {
    tenant,
    timeoutMs: 120000,
    query: {
      reportId,
      year,
      period,
      revision,
      day,
      deptIds: Array.isArray(deptIds) ? deptIds.join(',') : deptIds,
      ...(sourceTenants ? { sourceTenants: sourceTenants.join(','), departmentsByTenant: JSON.stringify(departmentsByTenant || {}) } : {}),
    },
  });

  return {
    actualRows: Array.isArray(response?.actualRows) ? response.actualRows : [],
    budgetRows: Array.isArray(response?.budgetRows) ? response.budgetRows : [],
    ...(Array.isArray(response?.datasets) ? { datasets: response.datasets.map((dataset) => ({ ...dataset,
      report: adaptCarmenReportDefinition(dataset.report),
      masterData: { ...dataset.masterData, periods: adaptCarmenGlPeriods(dataset.masterData?.periods) },
    })) } : {}),
    raw: response,
  };
};
