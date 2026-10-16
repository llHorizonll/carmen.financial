import { describe, expect, it } from 'vitest';
import { buildBuComparison, comparisonExportData, findBuMappingOverlaps, getBuReadiness, getMappingIssues, groupBuDepartments, pickMapping, reportForBu, setBuMapping, suggestBuMapping } from './buComparison.js';
import { buildExcelHtml, buildReportData, INITIAL_MASTER_DATA, THEMES } from './reportLogic.js';
import { adaptCarmenReportDefinition } from './reportAdapters.js';
import { buildReportDefinitionPayload } from './reportApi.js';

const report = {
  id: 'pnl', tenant: 'A', name: 'Profit & Loss', category: ['ALL'],
  columns: [
    { id: 'c1', label: 'TODAY\nActual', type: 'AC', isActive: true },
    { id: 'c2', label: 'Twice Actual', isFormula: true, formula: 'C1*2', isActive: true },
    { id: 'c3', label: 'Mix %', isPercent: true, targetCol: 'C1', isActive: true },
  ],
  rows: [
    { id: 'r1', desc: 'Revenue', accCodes: '4100', percentBase: 'R1', buMappings: [{ tenant: 'B', status: 'confirmed', accCodes: '5100' }] },
    { id: 'r2', desc: 'Expense', accCodes: '4200', percentBase: 'R1', buMappings: [{ tenant: 'B', status: 'confirmed', accCodes: '5200' }] },
    { id: 'r3', desc: 'Profit', isTotal: true, formula: 'R1-R2', percentBase: 'R1' },
    { id: 'r4', desc: 'Margin', isTotal: true, formula: 'R3/R1', numberFormat: 'percent', percentBase: 'R1' },
  ],
};
const filters = { appliedYear: '2026', appliedPeriod: '2', appliedRevision: '0', appliedDepts: [] };
const datasets = [
  { tenant: 'A', name: 'Hotel A', currency: 'THB', masterData: INITIAL_MASTER_DATA, budgetRows: [], actualRows: [{ year: 2026, acccode: '4100', amt2: 100 }, { year: 2026, acccode: '4200', amt2: 80 }] },
  { tenant: 'B', name: 'Hotel B', currency: 'THB', masterData: INITIAL_MASTER_DATA, budgetRows: [], actualRows: [{ year: 2026, acccode: '5100', amt2: 200 }, { year: 2026, acccode: '5200', amt2: 150 }, { year: 2026, acccode: '4100', amt2: 999 }] },
];

describe('BU comparison calculations', () => {
  it('matches independent BU reports and keeps column references local', () => {
    const groups = buildBuComparison({ report, datasets, filters });
    expect(groups).toHaveLength(2);
    groups.forEach((group, index) => {
      const data = datasets[index];
      const expected = buildReportData({ ...filters, activeReport: reportForBu(report, data.tenant), engineData: data.actualRows, budgetData: [], masterData: INITIAL_MASTER_DATA });
      expect(group.rows).toEqual(expected);
    });
    expect(groups[0].rows[2].results.c2).toBe(40);
    expect(groups[1].rows[2].results.c2).toBe(100);
    expect(groups[1].rows[0].results.c1).toBe(200);
    expect(report.columns).toHaveLength(3);
  });
  it('recomputes total formulas and weighted percentages from base values', () => {
    const groups = buildBuComparison({ report, datasets, filters, includeTotal: true });
    const total = groups[2];
    expect(total.rows[0].results.c1).toBe(300);
    expect(total.rows[2].results.c1).toBe(70);
    expect(total.rows[3].results.c1).toBeCloseTo(70 / 300);
    expect(total.rows[2].results.c3).toBeCloseTo(23.333333);
    expect(groups[0].rows[2].results.c3).toBe(20);
    expect(groups[1].rows[2].results.c3).toBe(25);
  });
  it('rejects missing mappings and distinguishes not applicable from no transactions', () => {
    const unmapped = { ...report, rows: report.rows.map((row) => ({ ...row, buMappings: [] })) };
    expect(getBuReadiness(unmapped, 'B')).toBe(false);
    expect(() => buildBuComparison({ report: unmapped, datasets, filters })).toThrow('Mapping required');
    const updated = setBuMapping(report, 'r2', { tenant: 'B', status: 'notApplicable' });
    const groups = buildBuComparison({ report: updated, datasets, filters, includeTotal: true });
    expect(groups[1].rows[1].results.c1).toBeNull();
    expect(groups[1].rows[2].results.c1).toBe(200);
    expect(groups[2].rows[1].results.c1).toBe(80);
    expect(getBuReadiness(updated, 'b')).toBe(true);
  });
  it('exports original multiline labels under ordered BU groups with correct percentages', () => {
    const groups = buildBuComparison({ report, datasets, filters, includeTotal: true });
    const data = comparisonExportData(report, groups);
    const html = buildExcelHtml({ ...data, displayCompanyLabel: 'Company', displayDateLabel: '2026', displayPeriodLabel: 'P2', themeColors: THEMES.blue });
    expect(html).toContain('colspan="3"');
    expect(html).toContain('Hotel A (THB)');
    expect(html).toContain('Hotel B (THB)');
    expect(html).toContain('TODAY<br>Actual');
    expect(html).toContain('23.33%');
    expect(data.activeCols).toHaveLength(9);
    expect(new Set(data.activeCols.map((col) => col.id)).size).toBe(9);
  });
});

describe('BU mapping review and persistence', () => {
  it('warns about overlapping accounts only within the same BU and dimension scope', () => {
    const mapping = { tenant: 'B', status: 'confirmed', accCodes: '5100' };
    expect(findBuMappingOverlaps(report, 'r2', mapping, 'B', {})).toEqual(['Revenue']);
    expect(findBuMappingOverlaps(report, 'r2', { ...mapping, accCodes: '4100' }, 'B', {})).toEqual([]);
    const scoped = setBuMapping(report, 'r1', { ...mapping, dimensions: [{ key: 'dim1', value: 'A' }] });
    expect(findBuMappingOverlaps(scoped, 'r2', { ...mapping, dimensions: [{ key: 'dim1', value: 'B' }] }, 'B', {})).toEqual([]);
  });
  it('marks confirmed mappings for review when master codes disappear', () => {
    expect(getBuReadiness(report, 'B', { accCodes: [{ id: '5100' }, { id: '5200' }] })).toBe(true);
    expect(getBuReadiness(report, 'B', { accCodes: [{ id: '5200' }] })).toBe(false);
    expect(getMappingIssues({ accCodes: '1' }, { accCodes: [{ id: '001' }] })).toEqual([]);
    expect(getMappingIssues({ status: 'notApplicable', accCodes: 'deleted' }, { accCodes: [] })).toEqual([]);
  });
  it('rejects malformed and stale department selections without crossing BU boundaries', () => {
    expect(groupBuDepartments(['["B","01"]', '["C","01"]', 'null', 'bad json', '{}', '["B"]'], ['B'])).toEqual({ B: ['01'] });
  });
  const source = { accCodes: [{ id: '4100', name: 'Room Revenue', type: 'I' }], depts: [{ id: '01', name: 'Rooms' }] };
  it('suggests only exact, unambiguous semantic matches without activating them', () => {
    const row = { accCodes: '4100', dept: '01' };
    const suggestion = suggestBuMapping(row, source, structuredClone(source));
    expect(suggestion.matched).toBe(true);
    expect(suggestion.mapping.status).toBeUndefined();
    expect(suggestBuMapping(row, source, { ...source, accCodes: [{ id: '4100', name: 'Food', type: 'I' }] }).matched).toBe(false);
    expect(suggestBuMapping(row, source, { ...source, accCodes: [{ ...source.accCodes[0], type: 'S' }] }).matched).toBe(false);
    expect(suggestBuMapping(row, source, { ...source, accCodes: [...source.accCodes, ...source.accCodes] }).matched).toBe(false);
  });
  it('requires dimension slot and group member review', () => {
    const master = { ...source, dimensionDefinitions: [{ key: 'dim1', caption: 'Market', values: ['OTA'] }], accountGroups: [{ id: 'REV', name: 'Revenue', accountIds: ['4100'] }] };
    expect(suggestBuMapping({ groups: 'REV', dim1: 'OTA' }, master, master).matched).toBe(true);
    expect(suggestBuMapping({ groups: 'REV' }, master, { ...master, accountGroups: [{ id: 'REV', name: 'Revenue', accountIds: ['4200'] }] }).matched).toBe(false);
    expect(suggestBuMapping({ accCodes: '4100', dim1: 'OTA' }, master, { ...master, dimensionDefinitions: [{ key: 'dim2', caption: 'Market', values: ['OTA'] }] }).matched).toBe(false);
  });
  it('preserves mappings through payload/adapters and normalizes dimension edits', () => {
    const adapted = adaptCarmenReportDefinition(buildReportDefinitionPayload(report));
    expect(adapted.rows[0].buMappings).toEqual(report.rows[0].buMappings);
    expect(pickMapping({ dimensions: [{ key: 'dim1', value: 'OLD' }], dim1: 'NEW' }).dimensions).toEqual([{ key: 'dim1', value: 'NEW' }]);
    expect(pickMapping({ dimensions: [{ key: 'dim1', value: 'OLD' }], dim1: '' }).dimensions).toEqual([]);
    const nested = { dimensions: [{ key: 'dim7', value: 'OTA' }] };
    expect(pickMapping(pickMapping(nested)).dimensions).toEqual(nested.dimensions);
    expect(pickMapping(nested).dim7).toBe('OTA');
  });
});
