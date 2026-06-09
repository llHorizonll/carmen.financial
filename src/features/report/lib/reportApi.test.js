import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildReportDefinitionPayload, cloneCarmenReport, deleteCarmenReport, fetchCarmenReport, fetchCarmenReportOptions, loginWithCarmenCredentials, saveCarmenReport } from './reportApi.js';

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('reportApi helpers', () => {
  it('keeps report definition payloads aligned with the frontend shape', () => {
    expect(buildReportDefinitionPayload({
      id: 'rep-1',
      name: 'Profit and Loss',
      companyName: 'Carmen Hotel',
      category: ['ALL', 'I'],
      assignedUsers: ['u1', 'u2'],
      isActive: true,
      periodFormat: 'standard',
      customDateLabel: 'As of February 28, 2026',
      customPeriodLabel: 'Period : 2026-P02',
      overrideDateDisplay: 'As of February 28, 2026',
      overridePeriodDisplay: 'Period : 2026-P02',
      owner: 'u1',
      reportType: 'Daily',
      day: '28',
      theme: 'blue',
      columns: [
        { id: 'C1', label: 'Actual', isActive: true },
      ],
      rows: [
        { id: 'r1', desc: 'Revenue', isActive: true, dim1: 'A', dim2: 'X' },
      ],
      access: [
        {
          userId: 'u1',
          userName: 'u1',
          displayName: 'u1',
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
      assignedUsers: ['u1', 'u2'],
      isActive: true,
      periodFormat: 'standard',
      customDateLabel: 'As of February 28, 2026',
      customPeriodLabel: 'Period : 2026-P02',
      overrideDateDisplay: 'As of February 28, 2026',
      overridePeriodDisplay: 'Period : 2026-P02',
      owner: 'u1',
      reportType: 'Daily',
      day: '28',
      theme: 'blue',
      columns: [{ id: 'C1', label: 'Actual', isActive: true }],
      rows: [{
        id: 'r1',
        desc: 'Revenue',
        isActive: true,
        dim1: 'A',
        dim2: 'X',
        dimensions: [
          { key: 'dim1', value: 'A' },
          { key: 'dim2', value: 'X' },
        ],
      }],
      access: [
        {
          userId: 'u1',
          userName: 'u1',
          displayName: 'u1',
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
    window.localStorage.setItem('carmen_access_token', 'token');
    window.localStorage.setItem('carmen_username', 'viewer');
    window.localStorage.setItem('carmen_user', JSON.stringify({ id: 'viewer' }));
    window.localStorage.setItem('carmen_business_unit', JSON.stringify({ tenant: 'tenant-1' }));

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
    window.localStorage.setItem('carmen_access_token', 'token');
    window.localStorage.setItem('carmen_username', 'owner-1');
    window.localStorage.setItem('carmen_user', JSON.stringify({ id: 'owner-1' }));
    window.localStorage.setItem('carmen_business_unit', JSON.stringify({ tenant: 'tenant-1' }));

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
      assignedUsers: ['u1'],
      columns: [],
      rows: [],
    }).access).toEqual([
      expect.objectContaining({
        userId: 'u1',
        userName: 'u1',
        displayName: 'u1',
        canView: true,
        canEdit: true,
      }),
    ]);
  });

  it('sends POST for new reports and PUT for updates', async () => {
    window.localStorage.setItem('carmen_access_token', 'token');
    window.localStorage.setItem('carmen_username', 'owner-1');
    window.localStorage.setItem('carmen_user', JSON.stringify({ id: 'owner-1' }));
    window.localStorage.setItem('carmen_business_unit', JSON.stringify({ tenant: 'tenant-1' }));

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
    window.localStorage.setItem('carmen_access_token', 'token');
    window.localStorage.setItem('carmen_username', 'owner-1');
    window.localStorage.setItem('carmen_user', JSON.stringify({ id: 'owner-1' }));
    window.localStorage.setItem('carmen_business_unit', JSON.stringify({ tenant: 'tenant-1' }));

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
    window.localStorage.setItem('carmen_access_token', 'token');
    window.localStorage.setItem('carmen_username', 'owner-1');
    window.localStorage.setItem('carmen_user', JSON.stringify({ id: 'owner-1' }));
    window.localStorage.setItem('carmen_business_unit', JSON.stringify({ tenant: 'tenant-1' }));

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
