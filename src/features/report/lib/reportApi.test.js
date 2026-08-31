import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildReportDefinitionPayload, cloneCarmenReport, deleteCarmenReport, fetchCarmenAccountGroups, fetchCarmenDepartmentGroups, fetchCarmenDimensions, fetchCarmenReport, fetchCarmenReportOptions, fetchCarmenUsers, loginWithCarmenCredentials, saveCarmenReport, saveCarmenReports } from './reportApi.js';

const createSessionStorageMock = (session = {}) => {
  const storage = new Map();
  const user = session.user ?? null;
  const businessUnit = session.businessUnit ?? null;

  if (session.accessToken) storage.set('carmen_access_token', session.accessToken);
  if (session.username) storage.set('carmen_username', session.username);
  if (user !== undefined) storage.set('carmen_user', JSON.stringify(user));
  if (businessUnit !== undefined) storage.set('carmen_business_unit', JSON.stringify(businessUnit));

  const mockLocalStorage = {
    getItem: vi.fn((key) => (storage.has(key) ? storage.get(key) : null)),
    setItem: vi.fn((key, value) => {
      storage.set(key, String(value));
    }),
    removeItem: vi.fn((key) => {
      storage.delete(key);
    }),
    clear: vi.fn(() => {
      storage.clear();
    }),
  };

  vi.stubGlobal('localStorage', mockLocalStorage);

  return storage;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('reportApi helpers', () => {
  it('coalesces concurrent identical GET requests during StrictMode remounts', async () => {
    createSessionStorageMock({
      accessToken: 'token',
      businessUnit: { tenant: 'tenant-1' },
    });
    let resolveFetch;
    const fetchMock = vi.fn(() => new Promise((resolve) => {
      resolveFetch = resolve;
    }));
    vi.stubGlobal('fetch', fetchMock);

    const firstRequest = fetchCarmenReportOptions();
    const secondRequest = fetchCarmenReportOptions();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch({ ok: true, json: async () => ({ themes: [] }) });
    await expect(Promise.all([firstRequest, secondRequest])).resolves.toHaveLength(2);
  });

  it('coalesces concurrent user and dimension search requests', async () => {
    createSessionStorageMock({
      accessToken: 'token',
      businessUnit: { tenant: 'tenant-1' },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Data: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([
      fetchCarmenUsers(),
      fetchCarmenUsers(),
      fetchCarmenDimensions(),
      fetchCarmenDimensions(),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('loads account and department groups from the Carmen grouping APIs', async () => {
    createSessionStorageMock({
      accessToken: 'token',
      businessUnit: { tenant: 'tenant-1' },
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Data: [{ AccGroupCode: 'REV', AccGroupName: 'Revenue', Level: 'L2', Account: [{ AccCode: '4001' }] }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Data: [{ DeptCateCode: 'OPS', Description: 'Operations', Active: true, Departments: [{ DeptCode: '101' }] }] }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchCarmenAccountGroups()).resolves.toEqual([
      expect.objectContaining({ id: 'REV', level: 'L2', accountIds: ['4001'] }),
    ]);
    await expect(fetchCarmenDepartmentGroups()).resolves.toEqual([
      expect.objectContaining({ id: 'OPS', deptIds: ['101'] }),
    ]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/api/accountGroup/search?useTenant=tenant-1'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/api/DepartmentCategory/search?useTenant=tenant-1'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('keeps report definition payloads aligned with the frontend shape', () => {
    expect(buildReportDefinitionPayload({
      id: 'rep-1',
      name: 'Profit and Loss',
      companyName: 'Carmen Hotel',
      category: ['ALL', 'I'],
      assignedUsers: ['admin', 'admin2'],
      isActive: true,
      periodFormat: 'standard',
      customDateLabel: 'As of February 28, 2026',
      customPeriodLabel: 'Period : 2026-P02',
      overrideDateDisplay: 'As of February 28, 2026',
      overridePeriodDisplay: 'Period : 2026-P02',
      owner: 'admin',
      reportType: 'Daily',
      day: '28',
      theme: 'blue',
      columns: [
        { id: 'C1', label: 'Actual', isActive: true, yearMode: 'specific', specificYear: '2024', dayMode: '15', budRev: '2' },
      ],
      rows: [
        { id: 'r1', desc: 'Revenue', isActive: true, deptGroup: 'ROOMS', dim1: 'A', dim2: 'X' },
      ],
      access: [
        {
          userId: 'admin',
          userName: 'admin',
          displayName: 'admin',
          role: 'User',
          canView: true,
          canEdit: false,
        },
      ],
    })).toEqual({
      id: 'rep-1',
      name: 'Profit and Loss',
      companyName: 'Carmen Hotel',
      category: ['ALL', 'I'],
      assignedUsers: ['admin', 'admin2'],
      isActive: true,
      periodFormat: 'standard',
      customDateLabel: 'As of February 28, 2026',
      customPeriodLabel: 'Period : 2026-P02',
      overrideDateDisplay: 'As of February 28, 2026',
      overridePeriodDisplay: 'Period : 2026-P02',
      owner: 'admin',
      reportType: 'Daily',
      day: '28',
      theme: 'blue',
      descriptionPosition: 0,
      columns: [{ id: 'C1', label: 'Actual', isActive: true, yearMode: 'specific', specificYear: '2024', dayMode: '15', budRev: '2' }],
      rows: [{
        id: 'r1',
        desc: 'Revenue',
        isActive: true,
        deptGroup: 'ROOMS',
        dim1: 'A',
        dim2: 'X',
        dimensions: [
          { key: 'dim1', value: 'A' },
          { key: 'dim2', value: 'X' },
        ],
      }],
      access: [
        {
          userId: 'admin',
          userName: 'admin',
          displayName: 'admin',
          role: 'User',
          canView: true,
          canEdit: false,
        },
      ],
    });
  });

  it('serializes row dimensions for API persistence', () => {
    expect(buildReportDefinitionPayload({
      id: 'rep-3',
      name: 'Dimensional Report',
      rows: [
        {
          id: 'r1',
          desc: 'Revenue',
          dim1: 'A',
          dim2: 'X',
        },
      ],
    }).rows[0]).toEqual(expect.objectContaining({
      dim1: 'A',
      dim2: 'X',
      dimensions: [
        { key: 'dim1', value: 'A' },
        { key: 'dim2', value: 'X' },
      ],
    }));
  });

  it('preserves report ownership from access data when owner is blank', () => {
    expect(buildReportDefinitionPayload({
      id: 'rep-4',
      name: 'Ownership Report',
      owner: '',
      assignedUsers: [],
      access: [
        {
          userId: 'owner-1',
          canView: true,
          canEdit: true,
        },
      ],
      rows: [],
      columns: [],
    })).toEqual(expect.objectContaining({
      owner: 'owner-1',
    }));
  });

  it('rejects report detail loads for unauthorized users', async () => {
    createSessionStorageMock({
      accessToken: 'token',
      username: 'viewer',
      user: { id: 'viewer' },
      businessUnit: { tenant: 'tenant-1' },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'rep-unauthorized',
        owner: 'owner-1',
        assignedUsers: ['owner-1'],
        access: [],
      }),
    }));

    await expect(fetchCarmenReport('rep-unauthorized')).rejects.toThrow(/do not have access to this report/i);
  });

  it('allows report detail loads for the owning user', async () => {
    createSessionStorageMock({
      accessToken: 'token',
      username: 'owner-1',
      user: { id: 'owner-1' },
      businessUnit: { tenant: 'tenant-1' },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'rep-owned',
        owner: 'owner-1',
        assignedUsers: ['owner-1'],
        access: [],
        rows: [],
        columns: [],
      }),
    }));

    await expect(fetchCarmenReport('rep-owned')).resolves.toEqual(expect.objectContaining({
      id: 'rep-owned',
      owner: 'owner-1',
      assignedUsers: ['owner-1'],
    }));
  });

  it('derives access rows from assigned users when explicit access is missing', () => {
    expect(buildReportDefinitionPayload({
      id: 'rep-2',
      name: 'Balance Sheet',
      assignedUsers: ['admin'],
      columns: [],
      rows: [],
    }).access).toEqual([
      expect.objectContaining({
        userId: 'admin',
        userName: 'admin',
        displayName: 'admin',
        canView: true,
        canEdit: true,
      }),
    ]);
  });

  it('loads dimension values by configured dimension slot', async () => {
    createSessionStorageMock({
      accessToken: 'token',
      businessUnit: { tenant: 'tenant-1' },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Data: [
        { Caption: 'Market Segment', ListOfValues: '["Retail","Corporate"]' },
        { Caption: 'Meal Period', ListOfValues: 'Breakfast,Lunch|Dinner' },
      ] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchCarmenDimensions()).resolves.toEqual({
      dim1: ['Retail', 'Corporate'],
      dim2: ['Breakfast', 'Lunch', 'Dinner'],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/dimension/search?useTenant=tenant-1'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"Field":"Active"'),
      }),
    );
  });

  it('loads active Carmen users from api/user/search using usernames as report identities', async () => {
    createSessionStorageMock({
      accessToken: 'token',
      businessUnit: { tenant: 'tenant-1' },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Data: [
        { UserId: 'guid-2', UserName: 'viewer.b', Active: true },
        { UserId: 'guid-1', UserName: 'viewer.a', Active: true },
        { UserId: 'guid-3', UserName: 'disabled', Active: false },
      ] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchCarmenUsers()).resolves.toEqual([
      expect.objectContaining({ id: 'viewer.a', name: 'viewer.a' }),
      expect.objectContaining({ id: 'viewer.b', name: 'viewer.b' }),
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/user/search?useTenant=tenant-1'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"Field":"Active"'),
      }),
    );
  });

  it('sends POST for new reports and PUT for updates', async () => {
    createSessionStorageMock({
      accessToken: 'token',
      username: 'owner-1',
      user: { id: 'owner-1' },
      businessUnit: { tenant: 'tenant-1' },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'rep-new' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await saveCarmenReport({
      name: 'New Report',
      companyName: 'Carmen Hotel',
      rows: [],
      columns: [],
    });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/reports'), expect.objectContaining({
      method: 'POST',
    }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(expect.objectContaining({
      name: 'New Report',
    }));

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'rep-1' }),
    });

    await saveCarmenReport({
      id: 'rep-1',
      name: 'Updated Report',
      companyName: 'Carmen Hotel',
      rows: [],
      columns: [],
    });

    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/api/reports/rep-1'), expect.objectContaining({
      method: 'PUT',
    }));
  });

  it('surfaces Carmen API UserMessage details instead of a generic HTTP error', async () => {
    createSessionStorageMock({
      accessToken: 'token',
      businessUnit: { tenant: 'carmencloud' },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({
        Code: -2147467259,
        UserMessage: "Unknown column 'DescriptionPosition' in 'field list'",
      }),
    }));

    await expect(saveCarmenReport({
      id: 'rep-excel-1',
      name: 'Imported report',
      rows: [],
      columns: [],
    })).rejects.toThrow(/Unknown column 'DescriptionPosition'/i);
  });

  it('classifies offline fetch failures and publishes a global API error event', async () => {
    createSessionStorageMock({
      accessToken: 'token',
      businessUnit: { tenant: 'carmencloud' },
    });
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const apiErrorListener = vi.fn();
    window.addEventListener('carmen-api-error', apiErrorListener);

    await expect(saveCarmenReport({
      id: 'rep-offline',
      name: 'Offline report',
      rows: [],
      columns: [],
    })).rejects.toThrow(/offline/i);
    expect(apiErrorListener).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ kind: 'offline' }),
    }));

    window.removeEventListener('carmen-api-error', apiErrorListener);
  });

  it('clears an expired session and publishes a session-expired event', async () => {
    const storage = createSessionStorageMock({
      accessToken: 'expired-token',
      businessUnit: { tenant: 'carmencloud' },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '',
    }));
    const apiErrorListener = vi.fn();
    window.addEventListener('carmen-api-error', apiErrorListener);

    await expect(saveCarmenReport({
      id: 'rep-expired',
      name: 'Expired session report',
      rows: [],
      columns: [],
    })).rejects.toThrow(/session expired/i);
    expect(storage.has('carmen_access_token')).toBe(false);
    expect(apiErrorListener).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ kind: 'session' }),
    }));

    window.removeEventListener('carmen-api-error', apiErrorListener);
  });

  it('saves multiple imported reports with one batch request', async () => {
    createSessionStorageMock({
      accessToken: 'token',
      businessUnit: { tenant: 'tenant-1' },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'rep-1' }, { id: 'rep-2' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    await saveCarmenReports([
      { id: 'rep-1', name: 'Sheet 1', rows: [], columns: [] },
      { id: 'rep-2', name: 'Sheet 2', rows: [], columns: [] },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/reports/batch'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"id":"rep-2"'),
      }),
    );
  });

  it('normalizes login language codes before calling the auth API', async () => {
    window.__CARMEN_CONFIG__ = {
      apiUrl: 'http://localhost/Carmen.WebApi',
      adminToken: 'admin-token',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        AccessToken: 'access-token',
        UserName: 'admin',
        Tenant: 'tenant-1',
        Permissions: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await loginWithCarmenCredentials({
      userName: 'admin',
      password: 'secret',
      tenant: 'tenant-1',
      language: 'en-US',
    });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/login?adminToken='), expect.objectContaining({
      method: 'POST',
    }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(expect.objectContaining({
      Language: 'EN',
      UserName: 'admin',
      Tenant: 'tenant-1',
    }));
  });

  it('sends delete and clone requests to the API', async () => {
    createSessionStorageMock({
      accessToken: 'token',
      username: 'owner-1',
      user: { id: 'owner-1' },
      businessUnit: { tenant: 'tenant-1' },
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'rep-clone',
          name: 'Cloned Report',
          rows: [],
          columns: [],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await deleteCarmenReport('rep-delete');
    await cloneCarmenReport('rep-source');

    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining('/api/reports/rep-delete'), expect.objectContaining({
      method: 'DELETE',
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('/api/reports/rep-source/clone'), expect.objectContaining({
      method: 'POST',
    }));
  });

  it('clears the Carmen session when the API returns 401', async () => {
    createSessionStorageMock({
      accessToken: 'token',
      username: 'owner-1',
      user: { id: 'owner-1' },
      businessUnit: { tenant: 'tenant-1' },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchCarmenReportOptions()).rejects.toThrow(/session expired/i);
    expect(window.localStorage.getItem('carmen_access_token')).toBeNull();
  });
});
