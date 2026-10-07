import { describe, expect, it } from 'vitest';
import { buildReportDefinitionPayload } from './reportApi.js';
import { adaptCarmenReportDefinition } from './reportAdapters.js';

describe('row number format persistence', () => {
  it('preserves format and formula through JSON save and reload', () => {
    const report = { id: 'occupancy', rows: [{ id: 'ratio', isTotal: true, formula: 'R2/R1', numberFormat: 'percent' }], columns: [] };
    const saved = JSON.parse(JSON.stringify(buildReportDefinitionPayload(report)));
    const loaded = adaptCarmenReportDefinition(saved);
    expect(loaded.rows[0]).toMatchObject({ numberFormat: 'percent', formula: 'R2/R1', isTotal: true });
  });

  it('defaults legacy rows to column formatting', () => {
    expect(adaptCarmenReportDefinition({ rows: [{ id: 'r1' }] }).rows[0].numberFormat).toBe('column');
  });
});
