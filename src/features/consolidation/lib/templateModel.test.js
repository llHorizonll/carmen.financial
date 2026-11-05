import { describe, expect, it } from 'vitest';
import { appendTemplateColumn, appendTemplateRow, createConsolidationTemplate } from './templateModel.js';

const profile = { tenant: 'hq', revision: 'profile-v1', memberTenants: ['member'] };

describe('consolidation template definitions', () => {
  it('creates an independent central template without per-report membership or profile mappings', () => {
    const result = createConsolidationTemplate(profile, null, 'new-owner');
    expect(result).toMatchObject({ kind: 'consolidation', profileTenant: 'hq', profileRevision: 'profile-v1', version: 0, owner: 'new-owner' });
    expect(result).not.toHaveProperty('tenants');
    expect(result).not.toHaveProperty('mappings');
  });

  it('copies HQ formulas, total classification, number formats, and multiline labels without copying identity/access', () => {
    const source = { ...createConsolidationTemplate(profile), id: 'hq-report', lastModified: 'old-version', owner: 'old-owner',
      assignedUsers: ['restricted'], access: [{ userName: 'restricted', canView: true }], mappings: { member: {} }, tenant: 'hq',
      rows: [{ id: 'total', desc: 'Total Room Revenue', isTotal: true, isHeader: false, formula: 'R1+R2', numberFormat: 'percent' }],
      columns: [{ id: 'C1', label: 'TODAY\nActual', type: 'AC', isActive: true }] };
    const result = createConsolidationTemplate(profile, source, 'new-owner');
    expect(result.id).not.toBe(source.id);
    expect(result).not.toHaveProperty('lastModified');
    expect(result).not.toHaveProperty('tenant');
    expect(result).not.toHaveProperty('mappings');
    expect(result).toMatchObject({ version: 0, owner: 'new-owner', access: [], assignedUsers: [], columns: source.columns });
    expect(result.rows[0]).toMatchObject(source.rows[0]);
    result.rows[0].formula = 'R2';
    expect(source.rows[0].formula).toBe('R1+R2');
  });

  it('adds percentage totals and data columns with existing report conventions', () => {
    const original = createConsolidationTemplate(profile);
    const withRow = appendTemplateRow(original, 'formula-percent');
    expect(withRow.rows.at(-1)).toMatchObject({ isTotal: true, isHeader: false, numberFormat: 'percent', formula: 'R1+R2' });
    const report = { ...withRow, descriptionPosition: withRow.columns.length };
    const withColumn = appendTemplateColumn(report, 'data');
    expect(withColumn.columns.at(-1)).toMatchObject({ type: 'AC', yearMode: 'current', periodMode: 'current' });
    expect(withColumn.descriptionPosition).toBe(withColumn.columns.length);
    expect(original.rows).toHaveLength(2);
  });
  it('uses positional C references for Mix even when the first column has a generated identity', () => {
    const report = { ...createConsolidationTemplate(profile), columns: [{ id: 'generated-uuid', label: 'Actual', type: 'AC' }] };
    expect(appendTemplateColumn(report, 'percent').columns.at(-1)).toMatchObject({ isPercent: true, targetCol: 'C1' });
  });
});
