import { describe, expect, it } from 'vitest';
import {
  adaptCarmenAccountCodes,
  adaptCarmenAccountGroups,
  adaptCarmenBudgetRevisions,
  adaptCarmenCompany,
  adaptCarmenDepartments,
  adaptCarmenDepartmentGroups,
  adaptCarmenGlPeriods,
  adaptCarmenReportDefinition,
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

  it('normalizes account and department groups with their editable members', () => {
    expect(adaptCarmenAccountGroups({
      Data: [{
        AccGroupCode: 'REV',
        AccGroupName: 'Revenue',
        Level: 'L3',
        Account: [
          { AccCode: '04001', Description: 'Rooms' },
          { AccCode: '04002', Description: 'Food' },
        ],
      }],
    })).toEqual([expect.objectContaining({
      id: 'REV',
      name: 'Revenue',
      level: 'L3',
      accountIds: ['4001', '4002'],
    })]);

    expect(adaptCarmenDepartmentGroups({
      Data: [{
        DeptCateCode: 'OPERATIONS',
        Description: 'Operations',
        Active: true,
        Departments: [
          { DeptCode: '0101', Description: 'Rooms' },
          { DeptCode: '0201', Description: 'Restaurant' },
        ],
      }],
    })).toEqual([expect.objectContaining({
      id: 'OPERATIONS',
      name: 'Operations',
      deptIds: ['101', '201'],
    })]);
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

  it('normalizes report definitions from the local WebApi shape', () => {
    expect(adaptCarmenReportDefinition({
      id: 'rep-1',
      name: 'P&L',
      companyName: 'Hotel',
      category: ['ALL'],
      assignedUsers: ['admin'],
      isActive: true,
      periodFormat: 'standard',
      customDateLabel: 'As of date',
      customPeriodLabel: 'Period label',
      overrideDateDisplay: 'As of date',
      overridePeriodDisplay: 'Period label',
      owner: 'admin',
      reportType: 'Daily',
      day: '28',
      theme: 'green',
      columns: [
        { id: 'C1', label: 'Actual', type: 'AC' },
        { id: 'C2', label: 'Budget', type: 'BUD' },
        { id: 'C3', label: 'Year Budget', Type: 'BUDACC' },
      ],
      rows: [{
        id: 'r1',
        desc: 'Revenue',
        Dimensions: [
          { Key: 'dim1', Value: 'A' },
          { Key: 'dim2', Value: 'X' },
        ],
      }],
      access: [{ userId: 'admin', canView: true, canEdit: false }],
    })).toEqual(expect.objectContaining({
      id: 'rep-1',
      name: 'P&L',
      companyName: 'Hotel',
      assignedUsers: ['admin'],
      owner: 'admin',
      reportType: 'Daily',
      day: '28',
      columns: [
        expect.objectContaining({ id: 'C1', type: 'AC' }),
        expect.objectContaining({ id: 'C2', type: 'BC' }),
        expect.objectContaining({ id: 'C3', type: 'BCC' }),
      ],
      rows: expect.arrayContaining([
        expect.objectContaining({
          id: 'r1',
          desc: 'Revenue',
          Dimensions: [
            { Key: 'dim1', Value: 'A' },
            { Key: 'dim2', Value: 'X' },
          ],
          dimensions: [
            { key: 'dim1', value: 'A' },
            { key: 'dim2', value: 'X' },
          ],
          dim1: 'A',
          dim2: 'X',
        }),
      ]),
      access: [{ userId: 'admin', canView: true, canEdit: false }],
    }));
  });

  it('normalizes Carmen row mapping fields into the configurator shape', () => {
    expect(adaptCarmenReportDefinition({
      id: 'rep-2',
      name: 'API Row Shape',
      companyName: 'Hotel',
      category: ['ALL'],
      assignedUsers: ['admin'],
      isActive: true,
      periodFormat: 'standard',
      owner: 'admin',
      reportType: 'Monthly',
      theme: 'blue',
      columns: [],
      rows: [{
        id: 'r1',
        Description: 'Room Revenue',
        DeptCode: '101',
        AccCode: '4001',
        GroupLevel: 'L2',
        Groups: ['FOOD', 'BEV'],
        PercentBase: 'R3',
        Formula: 'R1+R2',
        Indent: 2,
        Type: 'H',
      }],
      access: [],
    })).toEqual(expect.objectContaining({
      rows: [expect.objectContaining({
        id: 'r1',
        desc: 'Room Revenue',
        dept: '101',
        accCodes: '4001',
        groupLevel: 'L2',
        groups: 'FOOD,BEV',
        percentBase: 'R3',
        formula: 'R1+R2',
        indent: 2,
        isHeader: true,
        isTotal: false,
      })],
    }));
  });
});
