import { beforeEach, describe, expect, it } from 'vitest';
import { clearCarmenSession, getDefaultBusinessUnit, getStoredCarmenSession, saveCarmenSession, setCarmenSessionLanguage, getStoredBusinessUnitSelection, saveBusinessUnitSelection } from './carmenSession.js';

describe('getDefaultBusinessUnit', () => {
  it('selects the tenant marked as default even when it is not the first item', () => {
    const items = [
      { Tenant: 'tenant-a', IsDefault: false },
      { Tenant: 'tenant-b', IsDefault: true },
    ];

    expect(getDefaultBusinessUnit(items)).toBe(items[1]);
  });

  it('accepts common API flag formats and falls back to the first tenant', () => {
    const stringFlagItems = [
      { Tenant: 'tenant-a', IsDefault: false },
      { Tenant: 'tenant-b', isDefault: 'true' },
    ];
    const noDefaultItems = [
      { Tenant: 'tenant-a', IsDefault: false },
      { Tenant: 'tenant-b', IsDefault: false },
    ];

    expect(getDefaultBusinessUnit(stringFlagItems)).toBe(stringFlagItems[1]);
    expect(getDefaultBusinessUnit(noDefaultItems)).toBe(noDefaultItems[0]);
    expect(getDefaultBusinessUnit([])).toBeNull();
  });
});

describe('session language', () => {
  beforeEach(() => window.localStorage.clear());

  it('clears BU selection on a new login and logout', () => {
    saveBusinessUnitSelection(['CarmenCloud', 'paresa']);
    expect(getStoredBusinessUnitSelection()).toEqual(['CarmenCloud', 'paresa']);
    saveCarmenSession({ accessToken: 'new-token', businessUnit: { tenant: 'CarmenCloud' } });
    expect(getStoredBusinessUnitSelection()).toBeNull();
    saveBusinessUnitSelection(['paresa']);
    clearCarmenSession();
    expect(getStoredBusinessUnitSelection()).toBeNull();
  });

  it('persists across reads, login, and logout without changing the token or BU', () => {
    const session = { accessToken: 'token', username: 'user', businessUnit: { tenant: 'a' }, user: { id: 'user' } };
    saveCarmenSession(session);
    expect(getStoredCarmenSession().language).toBe('en');
    setCarmenSessionLanguage('th');
    expect(getStoredCarmenSession()).toEqual({ ...session, language: 'th' });
    clearCarmenSession();
    expect(window.localStorage.getItem('carmen_language')).toBe('th');
    saveCarmenSession(session);
    expect(getStoredCarmenSession().language).toBe('th');
    expect(() => setCarmenSessionLanguage('fr')).toThrow('Unsupported');
  });

  it('defaults legacy or corrupt preferences to English', () => {
    expect(getStoredCarmenSession().language).toBe('en');
    window.localStorage.setItem('carmen_language', 'bad');
    expect(getStoredCarmenSession().language).toBe('en');
  });
});
