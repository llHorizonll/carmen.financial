import {
  adaptCarmenAccountCodes,
  adaptCarmenBudgetRevisions,
  adaptCarmenCompany,
  adaptCarmenDepartments,
  adaptCarmenGlPeriods,
  adaptCarmenLoginUser,
} from './reportAdapters.js';

const DEFAULT_BASE_URL = 'https://dev.carmen4.com/Carmen.API';
const SESSION_KEYS = {
  token: 'carmen_access_token',
  username: 'carmen_username',
  businessUnit: 'carmen_business_unit',
};

const getWindowConfig = () => (typeof window !== 'undefined' ? window.__CARMEN_CONFIG__ || {} : {});
const joinUrl = (baseUrl, path) => `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

const getBusinessUnitApiBaseUrl = () => {
  const config = getWindowConfig();
  return config?.apiUrl || 'https://dev.carmen4.com/carmen.api';
};

export const getCarmenApiConfig = () => {
  const config = getWindowConfig();
  return {
    baseUrl: DEFAULT_BASE_URL,
    adminToken: config?.adminToken || '',
  };
};

export const getBusinessUnitTenant = (item) => String(item?.Tenant || item?.tenant || '').trim();
export const getBusinessUnitDisplayName = (item) =>
  String(item?.Description || item?.description || getBusinessUnitTenant(item)).trim();

const buildUrl = (path, { useTenant = true, query = {} } = {}) => {
  const { baseUrl } = getCarmenApiConfig();
  const session = getStoredCarmenSession();
  const url = new URL(joinUrl(baseUrl, path));
  if (useTenant && session?.businessUnit?.tenant) url.searchParams.set('useTenant', session.businessUnit.tenant);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  return url.toString();
};

export const getStoredCarmenSession = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const accessToken = window.localStorage.getItem(SESSION_KEYS.token) || '';
  const username = window.localStorage.getItem(SESSION_KEYS.username) || '';
  let businessUnit = null;
  try {
    businessUnit = JSON.parse(window.localStorage.getItem(SESSION_KEYS.businessUnit) || 'null');
  } catch {
    businessUnit = null;
  }
  return {
    accessToken,
    username,
    businessUnit,
  };
};

export const saveCarmenSession = ({ accessToken, username, businessUnit }) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(SESSION_KEYS.token, accessToken || '');
  window.localStorage.setItem(SESSION_KEYS.username, username || '');
  window.localStorage.setItem(SESSION_KEYS.businessUnit, JSON.stringify(businessUnit || null));
};

export const clearCarmenSession = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(SESSION_KEYS.token);
  window.localStorage.removeItem(SESSION_KEYS.username);
  window.localStorage.removeItem(SESSION_KEYS.businessUnit);
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
      Language: language,
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
    throw new Error(`Carmen API request failed for ${path} with HTTP ${response.status}.`);
  }

  return response.json();
};

export const fetchCarmenMasterData = async ({ year }) => {
  if (!isCarmenApiConfigured()) {
    throw new Error('Carmen API session is not configured.');
  }

  const [company, departments, accountCodes, periods, budgets] = await Promise.all([
    requestCarmenJson('/api/company'),
    requestCarmenJson('/api/department'),
    requestCarmenJson('/api/accountCode'),
    requestCarmenJson(`/api/glPeriod/year/${encodeURIComponent(year)}`),
    requestCarmenJson('/api/budget'),
  ]);

  const session = getStoredCarmenSession();
  return {
    currentUser: {
      id: String(session?.username || 'carmen-user'),
      name: session?.username || 'Carmen User',
      role: 'User',
      permissions: { financialReport: { view: true } },
      tenant: session?.businessUnit?.tenant || '',
    },
    companyProfile: adaptCarmenCompany(company),
    depts: adaptCarmenDepartments(departments),
    accCodes: adaptCarmenAccountCodes(accountCodes),
    periods: adaptCarmenGlPeriods(periods),
    budgetRevisions: adaptCarmenBudgetRevisions(budgets),
  };
};
