import { normalizeAccLookupCode, normalizeDeptLookupCode } from './normalizeCode.js';

export const parseMappingList = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const uniqueValues = (values, normalizeValue) => {
  const seen = new Set();
  return values.filter((value) => {
    const key = normalizeValue(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const updateMappingList = (currentValue, selectedValues, operation, normalizeValue) => {
  const current = uniqueValues(parseMappingList(currentValue), normalizeValue);
  const selected = uniqueValues(selectedValues.map(String), normalizeValue);

  if (operation === 'clear') return '';
  if (operation === 'set') return selected.join(', ');
  if (operation === 'add') return uniqueValues([...current, ...selected], normalizeValue).join(', ');
  if (operation === 'remove') {
    const removedKeys = new Set(selected.map(normalizeValue));
    return current.filter((value) => !removedKeys.has(normalizeValue(value))).join(', ');
  }
  return current.join(', ');
};

const normalizeText = (value) => String(value || '').trim().toUpperCase();

export const buildBulkMappingPreview = (rows, selectedIds, draft) => {
  const selectedSet = new Set(selectedIds);

  return rows
    .filter((row) => selectedSet.has(row.id) && !row.isHeader && !row.isTotal)
    .map((row) => {
      const updates = {};
      if (draft.applyDept) {
        updates.dept = updateMappingList(
          row.dept,
          draft.deptValues || [],
          draft.operation,
          normalizeDeptLookupCode,
        );
      }
      if (draft.applyAccounts) {
        updates.accCodes = updateMappingList(
          row.accCodes,
          draft.accountValues || [],
          draft.operation,
          normalizeAccLookupCode,
        );
      }
      if (draft.applyDeptGroup) {
        updates.deptGroup = updateMappingList(row.deptGroup, draft.deptGroupValues || [], draft.operation, normalizeText);
        if (draft.operation === 'clear' || draft.operation === 'set') updates.dept = '';
      }
      if (draft.applyAccountGroup) {
        updates.groups = updateMappingList(row.groups, draft.accountGroupValues || [], draft.operation, normalizeText);
        if (draft.operation === 'clear' || draft.operation === 'set') {
          updates.accCodes = '';
          if (draft.accountGroupLevel) updates.groupLevel = draft.accountGroupLevel;
        }
      }
      Object.entries(draft.dimensionValues || {}).forEach(([field, config]) => {
        if (!config?.enabled) return;
        updates[field] = updateMappingList(row[field], config.values || [], draft.operation, normalizeText);
      });

      const changedFields = Object.keys(updates).filter(
        (field) => String(updates[field] || '') !== String(row[field] || ''),
      );

      return {
        id: row.id,
        desc: row.desc,
        before: {
          dept: row.dept || '',
          deptGroup: row.deptGroup || '',
          accCodes: row.accCodes || '',
          groups: row.groups || '',
          groupLevel: row.groupLevel || '',
          ...Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`dim${index + 1}`, row[`dim${index + 1}`] || ''])),
        },
        after: {
          dept: updates.dept ?? row.dept ?? '',
          accCodes: updates.accCodes ?? row.accCodes ?? '',
          ...Object.fromEntries(Object.keys(updates)
            .filter((field) => field !== 'dept' && field !== 'accCodes')
            .map((field) => [field, updates[field]])),
        },
        updates,
        changedFields,
      };
    });
};

export const createUndoUpdates = (preview) => preview
  .filter((item) => item.changedFields.length > 0)
  .map((item) => ({
    id: item.id,
    updates: Object.fromEntries(item.changedFields.map((field) => [field, item.before[field]])),
  }));

export const createApplyUpdates = (preview) => preview
  .filter((item) => item.changedFields.length > 0)
  .map((item) => ({ id: item.id, updates: item.updates }));
