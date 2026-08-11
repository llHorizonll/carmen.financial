import {
  adaptCarmenAccountCodes,
  adaptCarmenBudgetRevisions,
  adaptCarmenCompany,
  adaptCarmenDepartments,
  adaptCarmenGlPeriods,
  adaptCarmenReportDefinition,
  adaptCarmenReportDefinitions,
  adaptCarmenLoginUser,
} from './reportAdapters.js';
import {
  clearCarmenSession,
  getBusinessUnitDisplayName,
  getBusinessUnitTenant,
  getStoredCarmenSession,
  saveCarmenSession,
} from './carmenSession.js';

export {
  clearCarmenSession,
  getBusinessUnitDisplayName,
  getBusinessUnitTenant,
  getStoredCarmenSession,
  saveCarmenSession,
};

const DEFAULT_BASE_URL = 'http://localhost/Carmen.WebApi';
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

const fetchWithNetworkHandling = async (url, options, path = '') => {
  try {
    return await fetch(url, options);
  } catch (cause) {
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    throw createCarmenApiError(
      isOffline
        ? 'You are offline. Reconnect to the internet and try again.'
        : 'Unable to reach Carmen API. Check your network connection or contact the administrator.',
      { kind: isOffline ? 'offline' : 'network', path, cause },
    );
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

const throwResponseError = async (response, { path, context, isAuthenticated = false }) => {
  let payload = null;
  try {
    payload = await readResponsePayload(response);
  } catch {
    payload = null;
  }

  const unauthorized = isAuthenticated && [401, 419, 440].includes(response.status);
  if (unauthorized) {
    clearCarmenSession();
    throw createCarmenApiError(
      'Your Carmen session expired. Please sign in again.',
      { kind: 'session', status: response.status, path },
    );
  }

  const apiMessage = typeof payload === 'string' ? payload.trim() : extractApiErrorMessage(payload);
  const message = apiMessage
    ? `Carmen API: ${apiMessage}`
    : `${context} failed with HTTP ${response.status}.`;
  throw createCarmenApiError(message, {
    kind: response.status === 401 || response.status === 403 ? 'authorization' : 'api',
    status: response.status,
    path,
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
  if (!adminToken) throw new Error('Carmen adminToken not found in public/config.js.');
  if (!trimmedUserName) return [];

  const url = `${getBusinessUnitApiBaseUrl().replace(/\/$/, '')}/api/userTenant/tenantListIn/${encodeURIComponent(adminToken)}/${encodeURIComponent(trimmedUserName)}`;
  const response = await fetchWithNetworkHandling(url, undefined, '/api/userTenant/tenantListIn');
  if (!response.ok) {
    await throwResponseError(response, {
      path: '/api/userTenant/tenantListIn',
      context: 'Business unit request',
    });
  }
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

  ['dim1', 'dim2', 'dim3', 'dim4'].forEach((field) => {
    pushDimension(field, row?.[field]);
  });

  return dimensions;
};

const normalizeReportRowForPayload = (row) => {
  if (!row || typeof row !== 'object') return row;
  const dimensions = normalizeReportRowDimensions(row);
  return {
    ...row,
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

const getSessionUserIdentity = () => {
  const session = getStoredCarmenSession();
  return String(
    session?.user?.id
    || session?.user?.UserId
    || session?.user?.userId
    || session?.username
    || ''
  ).trim();
};

const canAccessCarmenReportDefinition = (report, userId) => {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return false;

  if (String(report?.owner || report?.Owner || '').trim() === normalizedUserId) return true;
  if (Array.isArray(report?.assignedUsers || report?.AssignedUsers) && (report.assignedUsers || report.AssignedUsers).includes(normalizedUserId)) {
    return true;
  }

  const accessRows = Array.isArray(report?.access || report?.Access) ? (report.access || report.Access) : [];
  return accessRows.some((item) => String(item?.userId || item?.UserId || '').trim() === normalizedUserId && item?.canView !== false && item?.CanView !== false);
};

export const loginWithCarmenCredentials = async ({ userName, password, tenant, language }) => {
  const { adminToken } = getCarmenApiConfig();
  if (!adminToken) {
    throw new Error('Carmen adminToken not found in public/config.js.');
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
  }, '/api/login');

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

const requestCarmenJson = async (path, options = {}) => {
  const session = getStoredCarmenSession();
  if (!session?.accessToken) throw new Error('Carmen session is missing.');
  const method = options.method || 'GET';
  const url = buildUrl(path, options);

  const executeRequest = async () => {
    const response = await fetchWithNetworkHandling(url, {
      method,
      headers: {
        Authorization: session.accessToken,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }, path);

    if (!response.ok) {
      await throwResponseError(response, {
        path,
        context: `Carmen API request for ${path}`,
        isAuthenticated: true,
      });
    }

    return readResponsePayload(response);
  };

  const isReadRequest = method === 'GET' || (method === 'POST' && /\/search(?:\?|$)/.test(path));
  if (!isReadRequest) return executeRequest();

  const requestKey = JSON.stringify([session.accessToken, method, url, options.body || null]);
  if (!pendingReadRequests.has(requestKey)) {
    pendingReadRequests.set(
      requestKey,
      executeRequest().finally(() => pendingReadRequests.delete(requestKey)),
    );
  }
  return pendingReadRequests.get(requestKey);
};

export const fetchCarmenReportOptions = async () => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const options = await requestCarmenJson('/api/report-options');
  return {
    themes: Array.isArray(options?.themes) ? options.themes : [],
    periodFormats: Array.isArray(options?.periodFormats) ? options.periodFormats : [],
    accountCategories: Array.isArray(options?.accountCategories) ? options.accountCategories : [],
    columnTypes: Array.isArray(options?.columnTypes) ? options.columnTypes : [],
    yearModes: Array.isArray(options?.yearModes) ? options.yearModes : [],
    periodModes: Array.isArray(options?.periodModes) ? options.periodModes : [],
    rowTypes: Array.isArray(options?.rowTypes) ? options.rowTypes : [],
    indentLevels: Array.isArray(options?.indentLevels) ? options.indentLevels : [],
    raw: options,
  };
};

export const fetchCarmenDimensions = async () => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const response = await requestCarmenJson('/api/dimension/search', {
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

  return Object.fromEntries((Array.isArray(response?.Data) ? response.Data : [])
    .sort((left, right) => String(left?.Id || '').localeCompare(String(right?.Id || ''), undefined, { numeric: true }))
    .slice(0, 4)
    .map((item, index) => [`dim${index + 1}`, [...new Set(parseValues(item?.ListOfValues))]]));
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

export const fetchCarmenReportPeriods = async ({ year } = {}) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const periods = await requestCarmenJson('/api/report-periods', {
    query: { year },
  });
  return Array.isArray(periods) ? periods : [];
};

export const fetchCarmenReports = async () => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const reports = await requestCarmenJson('/api/reports');
  return adaptCarmenReportDefinitions(reports);
};

export const fetchCarmenReport = async (id) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const report = await requestCarmenJson(`/api/reports/${encodeURIComponent(id)}`);
  const userId = getSessionUserIdentity();
  if (!canAccessCarmenReportDefinition(report, userId)) {
    throw new Error('You do not have access to this report.');
  }
  return adaptCarmenReportDefinition(report);
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
  owner: resolveReportOwner(report),
  reportType: String(report?.reportType || 'Monthly').trim() || 'Monthly',
  day: String(report?.day || '').trim(),
  theme: String(report?.theme || 'blue').trim() || 'blue',
  descriptionPosition: Number.isInteger(Number(report?.descriptionPosition))
    ? Number(report.descriptionPosition)
    : 0,
  columns: Array.isArray(report?.columns) ? report.columns : [],
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

export const saveCarmenReport = async (report) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const payload = buildReportDefinitionPayload(report);
  const method = report?.id ? 'PUT' : 'POST';
  const path = report?.id
    ? `/api/reports/${encodeURIComponent(report.id)}`
    : '/api/reports';

  const response = await requestCarmenJson(path, {
    method,
    body: payload,
  });

  return response;
};

export const saveCarmenReports = async (reports) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }
  if (!Array.isArray(reports) || reports.length === 0) return [];

  return requestCarmenJson('/api/reports/batch', {
    method: 'POST',
    body: reports.map(buildReportDefinitionPayload),
  });
};

export const deleteCarmenReport = async (id) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const response = await requestCarmenJson(`/api/reports/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  return response;
};

export const cloneCarmenReport = async (id) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const report = await requestCarmenJson(`/api/reports/${encodeURIComponent(id)}/clone`, {
    method: 'POST',
  });
  return adaptCarmenReportDefinition(report);
};

export const fetchCarmenMasterData = async ({ year }) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const session = getStoredCarmenSession();
  const usersPromise = fetchCarmenUsers().catch(() => []);
  try {
    const [masterData, users] = await Promise.all([
      requestCarmenJson(`/api/report-master-data?year=${encodeURIComponent(year)}`),
      usersPromise,
    ]);
    const currentUser = masterData?.currentUser || session?.user || null;
    return {
      currentUser,
      users: currentUser
        ? [currentUser, ...users.filter((user) => String(user.id) !== String(currentUser.id))]
        : users,
      companyProfile: adaptCarmenCompany(masterData?.companyProfile),
      depts: adaptCarmenDepartments(masterData?.depts),
      accCodes: adaptCarmenAccountCodes(masterData?.accCodes),
      periods: adaptCarmenGlPeriods(masterData?.periods),
      budgetRevisions: adaptCarmenBudgetRevisions(masterData?.budgetRevisions),
      groups: {
        L1: Array.isArray(masterData?.groups?.L1) ? masterData.groups.L1 : [],
        L2: Array.isArray(masterData?.groups?.L2) ? masterData.groups.L2 : [],
        L3: Array.isArray(masterData?.groups?.L3) ? masterData.groups.L3 : [],
        L4: Array.isArray(masterData?.groups?.L4) ? masterData.groups.L4 : [],
      },
    };
  } catch {
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

export const fetchCarmenReportData = async ({ reportId = '', year, period, revision, deptIds = [], day = '' }) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const response = await requestCarmenJson('/api/report-data', {
    query: {
      reportId,
      year,
      period,
      revision,
      day,
      deptIds: Array.isArray(deptIds) ? deptIds.join(',') : deptIds,
    },
  });

  return {
    actualRows: Array.isArray(response?.actualRows) ? response.actualRows : [],
    budgetRows: Array.isArray(response?.budgetRows) ? response.budgetRows : [],
    raw: response,
  };
};
