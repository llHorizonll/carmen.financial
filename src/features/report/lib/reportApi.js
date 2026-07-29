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

const DEFAULT_BASE_URL = 'https://dev.carmen4.com/carmen.api2';
const SESSION_KEYS = {
  token: 'carmen_access_token',
  username: 'carmen_username',
  businessUnit: 'carmen_business_unit',
  user: 'carmen_user',
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

export const getBusinessUnitTenant = (item) => String(item?.Tenant || item?.tenant || '').trim();
export const getBusinessUnitDisplayName = (item) =>
  String(item?.Description || item?.description || getBusinessUnitTenant(item)).trim();

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

export const getStoredCarmenSession = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const accessToken = window.localStorage.getItem(SESSION_KEYS.token) || '';
  const username = window.localStorage.getItem(SESSION_KEYS.username) || '';
  let businessUnit = null;
  let user = null;
  try {
    businessUnit = JSON.parse(window.localStorage.getItem(SESSION_KEYS.businessUnit) || 'null');
  } catch {
    businessUnit = null;
  }
  try {
    user = JSON.parse(window.localStorage.getItem(SESSION_KEYS.user) || 'null');
  } catch {
    user = null;
  }
  return {
    accessToken,
    username,
    businessUnit,
    user,
  };
};

export const saveCarmenSession = ({ accessToken, username, businessUnit, user }) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(SESSION_KEYS.token, accessToken || '');
  window.localStorage.setItem(SESSION_KEYS.username, username || '');
  window.localStorage.setItem(SESSION_KEYS.businessUnit, JSON.stringify(businessUnit || null));
  window.localStorage.setItem(SESSION_KEYS.user, JSON.stringify(user || null));
  window.dispatchEvent(new Event('carmen-session-changed'));
};

export const clearCarmenSession = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(SESSION_KEYS.token);
  window.localStorage.removeItem(SESSION_KEYS.username);
  window.localStorage.removeItem(SESSION_KEYS.businessUnit);
  window.localStorage.removeItem(SESSION_KEYS.user);
  window.dispatchEvent(new Event('carmen-session-changed'));
};

export const isCarmenApiConfigured = () => Boolean(getStoredCarmenSession()?.accessToken);

export const fetchBusinessUnitsByUsername = async (username) => {
  const trimmedUserName = String(username || '').trim();
  const { adminToken } = getCarmenApiConfig();
  if (!adminToken) throw new Error('Carmen adminToken not found in public/config.js.');
  if (!trimmedUserName) return [];

  const url = `${getBusinessUnitApiBaseUrl().replace(/\/$/, '')}/api/userTenant/tenantListIn/${encodeURIComponent(adminToken)}/${encodeURIComponent(trimmedUserName)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Business unit request failed with HTTP ${response.status}.`);
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

  const response = await fetch(buildUrl('/api/login', {
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
  });

  if (!response.ok) {
    throw new Error(`Carmen login failed with HTTP ${response.status}.`);
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

const requestCarmenJson = async (path, options = {}) => {
  const session = getStoredCarmenSession();
  if (!session?.accessToken) throw new Error('Carmen session is missing.');

  const response = await fetch(buildUrl(path, options), {
    method: options.method || 'GET',
    headers: {
      Authorization: session.accessToken,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearCarmenSession();
      throw new Error('Carmen session expired. Please sign in again.');
    }
    throw new Error(`Carmen API request failed for ${path} with HTTP ${response.status}.`);
  }

  return response.json();
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

  return [...new Set((Array.isArray(response?.Data) ? response.Data : [])
    .map((item) => String(item?.Caption || '').trim())
    .filter(Boolean))];
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
  try {
    const masterData = await requestCarmenJson(`/api/report-master-data?year=${encodeURIComponent(year)}`);
    return {
      currentUser: masterData?.currentUser || session?.user || null,
      users: Array.isArray(masterData?.users) ? masterData.users : [],
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

    const [company, departments, accountCodes, periods, budgets] = await Promise.all([
      requestCarmenJson('/api/company'),
      requestCarmenJson('/api/department'),
      requestCarmenJson('/api/accountCode'),
      requestCarmenJson(`/api/glPeriod/year/${encodeURIComponent(year)}`),
      requestCarmenJson('/api/budget'),
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
      users: [currentUser],
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
