const SESSION_KEYS = {
  token: 'carmen_access_token',
  username: 'carmen_username',
  businessUnit: 'carmen_business_unit',
  user: 'carmen_user',
};

export const getBusinessUnitTenant = (item) => String(item?.Tenant || item?.tenant || '').trim();

export const getBusinessUnitDisplayName = (item) =>
  String(item?.Description || item?.description || getBusinessUnitTenant(item)).trim();

const isTrueFlag = (value) => {
  if (value === true || value === 1) return true;
  if (typeof value !== 'string') return false;
  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue === 'true' || normalizedValue === '1';
};

export const getDefaultBusinessUnit = (items) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items.find((item) => isTrueFlag(item?.IsDefault ?? item?.isDefault)) || items[0];
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
  return { accessToken, username, businessUnit, user };
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
