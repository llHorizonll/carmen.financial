import { describe, expect, it } from 'vitest';
import { emptyMappings, getMappedCodes, mergeMappedMaster, updateCodeMapping, updateDimensionCategory } from './mappingModel.js';

describe('consolidation crosswalks', () => {
  it('preserves other members and persists account reverse sign without mutating its input', () => {
    const original = { ...emptyMappings('r1'), accounts: { removed: { A: [{ code: 'old', reverseSign: true }] } } };
    const next = updateCodeMapping(original, { kind: 'accounts', member: 'b', target: 'A', codes: [{ code: 'cash', reverseSign: true }] });
    expect(next.accounts.removed).toEqual(original.accounts.removed);
    expect(next.accounts.b.A).toEqual([{ code: 'cash', reverseSign: true }]);
    expect(original.accounts.b).toBeUndefined();
  });
  it('rejects a member code assigned to a second target', () => {
    const doc = { ...emptyMappings('r1'), departments: { b: { rooms: ['FO'] } } };
    expect(() => updateCodeMapping(doc, { kind: 'departments', member: 'b', target: 'admin', codes: [{ code: 'FO' }] })).toThrow('already mapped');
  });
  it('isolates equal subcodes across dimension categories and clears only changed category subcodes', () => {
    let doc = updateDimensionCategory(emptyMappings('r1'), 'b', 'D01', 'M1');
    doc = updateDimensionCategory(doc, 'b', 'D02', 'M2');
    doc = updateCodeMapping(doc, { kind: 'dimensions', member: 'b', target: 'SAME', dimensionId: 'D01', codes: [{ code: 'a' }] });
    doc = updateCodeMapping(doc, { kind: 'dimensions', member: 'b', target: 'SAME', dimensionId: 'D02', codes: [{ code: 'a' }] });
    const next = updateDimensionCategory(doc, 'b', 'D01', 'M3');
    expect(getMappedCodes(next, 'dimensions', 'b', 'SAME', 'D01')).toEqual([]);
    expect(getMappedCodes(next, 'dimensions', 'b', 'SAME', 'D02')).toEqual([{ code: 'a' }]);
    expect(() => updateDimensionCategory(doc, 'b', 'D02', 'M1')).toThrow('already mapped');
  });
  it('keeps missing mapped codes visible instead of silently removing them', () => {
    expect(mergeMappedMaster([], [{ code: 'deleted', reverseSign: true }])).toEqual([
      { id: 'deleted', code: 'deleted', name: 'Missing from current master data', missing: true, reverseSign: true },
    ]);
  });
  it('removes an explicitly cleared target so deleted headquarters codes can be cleaned up', () => {
    const doc = { ...emptyMappings('r1'), departments: { b: { deleted: ['FO'], keep: ['HK'] } } };
    const next = updateCodeMapping(doc, { kind: 'departments', member: 'b', target: 'deleted', codes: [] });
    expect(next.departments.b).toEqual({ keep: ['HK'] });
  });
});
