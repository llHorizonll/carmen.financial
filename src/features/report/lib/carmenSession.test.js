import { describe, expect, it } from 'vitest';
import { getDefaultBusinessUnit } from './carmenSession.js';

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
