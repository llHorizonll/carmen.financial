import { describe, expect, it } from 'vitest';
import {
  adaptCarmenAccountCodes,
  adaptCarmenBudgetRevisions,
  adaptCarmenCompany,
  adaptCarmenDepartments,
  adaptCarmenGlPeriods,
  adaptCarmenLoginUser,
  deriveCarmenFinancialReportAccess,
} from './reportAdapters.js';

describe('reportAdapters', () => {
  it('normalizes Carmen company, department, and account fields', () => {
    expect(adaptCarmenCompany({ HotelName: 'Carmen Hotel' })).toEqual({ name: 'Carmen Hotel' });

    expect(adaptCarmenDepartments({
      Data: [{ DeptCode: '0101', Description: 'Rooms' }],
    })).toEqual([{ id: '101', name: 'Rooms' }]);

    expect(adaptCarmenAccountCodes({
      Data: [
        { AccCode: '04001', Description: 'Room Revenue', Type: 'Income', Active: true },
        { AccCode: '2001', Description: 'Payable', Type: 'BalanceSheet', Active: true },
      ],
    })).toEqual([
      expect.objectContaining({ id: '2001', name: 'Payable', type: 'B' }),
      expect.objectContaining({ id: '4001', name: 'Room Revenue', type: 'I' }),
    ]);
  });

  it('normalizes fiscal periods and budget revisions', () => {
    const periods = adaptCarmenGlPeriods({
      Data: [
        { GlpNo: 2, GlpDate: '2026-02-01T00:00:00', GlpStatus: 'Open', GlpYear: 4 },
        { GlpNo: 1, GlpDate: '2026-01-01T00:00:00', GlpStatus: 'Partial', GlpYear: 4 },
      ],
    });

    expect(periods.map(period => period.id)).toEqual(['1', '2']);
    expect(periods[0]).toEqual(expect.objectContaining({
      id: '1',
      periodNo: 1,
      status: 'Partial',
      date: '2026-01-01T00:00:00',
    }));

    expect(adaptCarmenBudgetRevisions({
      Data: [{
        Revisions: [
          { Revision: 2, Caption: 'Revision 2' },
          { Revision: 1, Caption: 'Revision 1' },
        ],
      }],
    })).toEqual([
      { id: '1', label: 'Revision 1' },
      { id: '2', label: 'Revision 2' },
    ]);
  });

  it('derives setup access from Carmen financial report permissions', () => {
    expect(deriveCarmenFinancialReportAccess([
      { Name: 'GL.FinancialReport', View: true, Add: false, Update: true, Delete: false },
    ])).toEqual({
      view: true,
      add: false,
      update: true,
      delete: false,
      setup: true,
    });

    expect(adaptCarmenLoginUser({
      UserId: 'api-admin',
      UserName: 'admin',
      Tenant: 'carmencloud',
      Permissions: [{ Name: 'GL.FinancialReport', View: true, Add: true, Update: false, Delete: false }],
    })).toEqual(expect.objectContaining({
      id: 'api-admin',
      name: 'admin',
      role: 'Admin',
      source: 'carmen-api',
      permissions: {
        financialReport: expect.objectContaining({ view: true, setup: true, add: true }),
      },
    }));
  });

  it('keeps view-only Carmen financial report users out of setup mode', () => {
    const user = adaptCarmenLoginUser({
      UserId: 'viewer',
      UserName: 'viewer',
      Permissions: [{ Name: 'GL.FinancialReport', View: true, Add: false, Update: false, Delete: false }],
    });

    expect(user.role).toBe('User');
    expect(user.permissions.financialReport).toEqual(expect.objectContaining({
      view: true,
      setup: false,
    }));
  });
});
