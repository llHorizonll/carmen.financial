import { describe, expect, it, vi } from 'vitest';
import { calculateSharedReport, createSharedReport, sharedReportsApi } from './sharedReports.js';
import { deleteRowAndRewriteReferences, moveRowsAndRewriteReferences } from './reportLogic.js';
vi.mock('./reportApi.js', () => ({ requestCarmenJson: vi.fn(async () => ({})) }));
import { requestCarmenJson } from './reportApi.js';

const fixture = () => {
  const report = { ...createSharedReport(['cloud', 'paresa']), version: 1,
    rows: [{ id: 'room', desc: 'Room Revenue' }, { id: 'food', desc: 'F&B' }, { id: 'total', isTotal: true, formula: 'R1+R2' }],
    columns: [{ id: 'C1', type: 'AC', sourceTenant: 'cloud' }, { id: 'C2', type: 'AC', sourceTenant: 'paresa' },
      { id: 'C3', isFormula: true, formula: 'C1+C2' }, { id: 'C4', type: 'AC', sourceTenant: 'ALL' }],
    mappings: { cloud: { room: { accCodes: '400' }, food: { accCodes: '500' } }, paresa: { room: { accCodes: '401' }, food: { accCodes: '501' } } } };
  const source = (accounts, amounts) => ({ actualRows: accounts.map((acccode, i) => ({ acccode, year: '2026', amt1: amounts[i] })), budgetRows: [] });
  const response = { configVersion: 1, mappingVersion: 1, requestedTenants: report.tenants, isComplete: true,
    byTenant: { cloud: source(['400', '500'], [100000, 20000]), paresa: source(['401', '501'], [80000, 30000]) } };
  return { report, response, filters: { year: 2026, period: 1, revision: 0 } };
};
describe('shared report calculation', () => {
  it('maps different accounts per BU and calculates row/column formulas without duplicating combined scope', () => {
    const { report, response, filters } = fixture();
    const result = calculateSharedReport(report, response, filters);
    expect(result.rows[0].results).toMatchObject({ C1: 100000, C2: 80000, C3: 180000, C4: 180000 });
    expect(result.rows[2].results.C3).toBe(230000);
    expect(result.rows[2].results.C4).toBe(230000);
  });
  it('keeps source failure unavailable through dependent totals and percentages', () => {
    const { report, response, filters } = fixture();
    delete response.byTenant.paresa;
    response.isComplete = false;
    report.columns.push({ id: 'C5', isPercent: true, targetCol: 'C4' });
    report.rows[0].percentBase = 'R3';
    const result = calculateSharedReport(report, response, filters);
    expect(result.rows[0].results.C1).toBe(100000);
    expect(result.rows[0].results.C3).toBeNull();
    expect(result.rows[2].results.C4).toBeNull();
    expect(result.rows[0].results.C5).toBeNull();
  });
  it('recalculates ratios from combined amounts', () => {
    const { report, response, filters } = fixture();
    response.byTenant.cloud.actualRows[0].amt1 = 100;
    response.byTenant.cloud.actualRows[1].amt1 = 10;
    response.byTenant.paresa.actualRows[0].amt1 = 300;
    response.byTenant.paresa.actualRows[1].amt1 = 90;
    report.rows[2].formula = 'R2/R1';
    expect(calculateSharedReport(report, response, filters).rows[2].results.C4).toBe(0.25);
  });
  it('preserves mapping IDs on reorder and flags deleted formula references', () => {
    const { report, response, filters } = fixture();
    const moved = moveRowsAndRewriteReferences(report, 0, 1);
    expect(calculateSharedReport(moved, response, filters).rows[2].results.C4).toBe(230000);
    expect(deleteRowAndRewriteReferences(report, 'room').rows[1].formula).toContain('!REF!');
  });
  it('rejects mismatched versions and unmapped source rows', () => {
    const { report, response, filters } = fixture();
    expect(() => calculateSharedReport(report, { ...response, configVersion: 2 }, filters)).toThrow('Template changed');
    delete report.mappings.cloud.room;
    expect(() => calculateSharedReport(report, response, filters)).toThrow('Mapping missing');
  });
  it('rejects a false complete flag or missing financial arrays instead of silently showing zero', () => {
    const { report, response, filters } = fixture();
    delete response.byTenant.paresa;
    expect(() => calculateSharedReport(report, response, filters)).toThrow('missing a business unit');
    response.isComplete = false;
    delete response.byTenant.cloud.actualRows;
    expect(() => calculateSharedReport(report, response, filters)).toThrow('Invalid financial source');
  });
  it('sends shared calls without login tenant routing and keeps 403 separate from session expiry', async () => {
    await sharedReportsApi.list();
    expect(requestCarmenJson).toHaveBeenCalledWith('/api/shared-reports', expect.objectContaining({ useTenant: false, authorizationFailureAffectsSession: false }));
  });
  it('sums budgets with per-BU signs and distinguishes explicit not-applicable from missing mapping', () => {
    const { report, response, filters } = fixture();
    report.columns = [{ id: 'C1', type: 'BC', sourceTenant: 'ALL' }];
    response.byTenant.cloud.budgetRows = [{ year: '2026', revision: '0', acccode: '400', amt1: 120000 }];
    response.byTenant.paresa.budgetRows = [{ year: '2026', revision: '0', acccode: '401', amt1: 100000 }];
    report.mappings.paresa.room.sign = -1;
    expect(calculateSharedReport(report, response, filters).rows[0].results.C1).toBe(20000);
    report.mappings.paresa.room = { notApplicable: true };
    expect(calculateSharedReport(report, response, filters).rows[0].results.C1).toBe(120000);
  });
});
