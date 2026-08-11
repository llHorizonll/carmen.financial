import { describe, expect, it } from 'vitest';
import {
  buildBulkMappingPreview,
  createApplyUpdates,
  createUndoUpdates,
} from './bulkMapping.js';

const rows = [
  { id: 'r1', desc: 'Revenue', dept: '001', accCodes: '4001', isHeader: false, isTotal: false },
  { id: 'r2', desc: 'Expense', dept: '002', accCodes: '5001, 5002', isHeader: false, isTotal: false },
  { id: 'r3', desc: 'Total', dept: '', accCodes: '', isHeader: false, isTotal: true },
];

describe('bulk mapping helpers', () => {
  it('adds normalized values without duplicates and skips formula rows', () => {
    const preview = buildBulkMappingPreview(rows, ['r1', 'r3'], {
      operation: 'add',
      applyDept: true,
      applyAccounts: true,
      deptValues: ['1', '003'],
      accountValues: ['4001', '4002'],
    });

    expect(preview).toHaveLength(1);
    expect(preview[0].after).toEqual({ dept: '001, 003', accCodes: '4001, 4002' });
  });

  it('removes only enabled mapping fields', () => {
    const [preview] = buildBulkMappingPreview(rows, ['r2'], {
      operation: 'remove',
      applyDept: false,
      applyAccounts: true,
      deptValues: ['002'],
      accountValues: ['5001'],
    });

    expect(preview.after).toEqual({ dept: '002', accCodes: '5002' });
    expect(preview.changedFields).toEqual(['accCodes']);
  });

  it('creates atomic apply and undo payloads', () => {
    const preview = buildBulkMappingPreview(rows, ['r1', 'r2'], {
      operation: 'clear',
      applyDept: true,
      applyAccounts: true,
      deptValues: [],
      accountValues: [],
    });

    expect(createApplyUpdates(preview)).toEqual([
      { id: 'r1', updates: { dept: '', accCodes: '' } },
      { id: 'r2', updates: { dept: '', accCodes: '' } },
    ]);
    expect(createUndoUpdates(preview)[0]).toEqual({
      id: 'r1',
      updates: { dept: '001', accCodes: '4001' },
    });
  });
});
