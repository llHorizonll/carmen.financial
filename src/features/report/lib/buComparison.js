import { buildReportData, rowDimensionsOverlap } from './reportLogic.js';
import { normalizeLookupCode } from './normalizeCode.js';

export const normalizeTenant = (value) => String(value || '').trim().toLowerCase();
const text = (value) => String(value || '').trim().toLowerCase();
export const splitCodes = (value) => String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
export const groupBuDepartments = (values, selectedTenants) => {
  const tenants = new Map(selectedTenants.map((tenant) => [normalizeTenant(tenant), tenant]));
  const result = {};
  values.forEach((value) => {
    try {
      const tuple = JSON.parse(value);
      if (!Array.isArray(tuple) || tuple.length !== 2 || tuple.some((part) => typeof part !== 'string' || !part.trim())) return;
      const tenant = tenants.get(normalizeTenant(tuple[0]));
      if (tenant) (result[tenant] ||= []).push(tuple[1]);
    } catch { /* Ignore stale filter entries; they cannot widen the source BU selection. */ }
  });
  return result;
};
export const isMappingRow = (row) => !row.isHeader && !row.isTotal;
const fields = ['dept', 'deptGroup', 'accCodes', 'groups', 'groupLevel', 'dimensions', ...Array.from({ length: 10 }, (_, i) => `dim${i + 1}`)];

export const pickMapping = (row) => {
  const mapping = Object.fromEntries(fields.map((key) => [key, row?.[key] ?? (key === 'dimensions' ? [] : '')]));
  const dimensions = new Map((row?.dimensions || []).map((item) => [item.key, item.value]));
  fields.filter((key) => /^dim\d+$/.test(key)).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(row || {}, key)) {
      if (row[key]) dimensions.set(key, row[key]); else dimensions.delete(key);
    }
  });
  mapping.dimensions = [...dimensions].map(([key, value]) => ({ key, value }));
  fields.filter((key) => /^dim\d+$/.test(key)).forEach((key) => { mapping[key] = dimensions.get(key) || ''; });
  return mapping;
};
export const getBuMapping = (row, tenant, ownerTenant) => normalizeTenant(tenant) === normalizeTenant(ownerTenant)
  ? { ...pickMapping(row), tenant, status: 'confirmed' }
  : row.buMappings?.find((mapping) => normalizeTenant(mapping.tenant) === normalizeTenant(tenant));

const hasMapping = (mapping) => Boolean(mapping?.accCodes || mapping?.groups || mapping?.dept || mapping?.deptGroup);
export const findBuMappingOverlaps = (report, rowId, mapping, tenant, master) => {
  const accounts = (value) => new Set((value.groups
    ? master?.accountGroups?.find((group) => text(group.id) === text(value.groups))?.accountIds || []
    : splitCodes(value.accCodes)).map(normalizeLookupCode));
  const departments = (value) => new Set((value.deptGroup
    ? master?.deptGroups?.find((group) => text(group.id) === text(value.deptGroup))?.deptIds || []
    : splitCodes(value.dept)).map(normalizeLookupCode));
  const selectedAccounts = accounts(mapping);
  const selectedDepartments = departments(mapping);
  return report.rows.filter((row) => {
    if (row.id === rowId || !isMappingRow(row)) return false;
    const other = getBuMapping(row, tenant, report.tenant);
    if (!other || other.status === 'notApplicable') return false;
    const otherDepartments = departments(other);
    if (selectedDepartments.size && otherDepartments.size && ![...selectedDepartments].some((code) => otherDepartments.has(code))) return false;
    return [...accounts(other)].some((code) => selectedAccounts.has(code)) && rowDimensionsOverlap(mapping, other);
  }).map((row) => row.desc);
};
export const getMappingIssues = (mapping, master) => {
  if (!master || mapping?.status === 'notApplicable') return [];
  const issues = [];
  if (mapping?.groups && mapping?.accCodes) issues.push('Account group and individual codes are mutually exclusive');
  if (mapping?.deptGroup && mapping?.dept) issues.push('Department group and individual codes are mutually exclusive');
  const validate = (codes, items, label) => {
    const ids = new Set((items || []).map((item) => normalizeLookupCode(item.id)));
    splitCodes(codes).forEach((code) => { if (!ids.has(normalizeLookupCode(code))) issues.push(`${label}: ${code}`); });
  };
  validate(mapping?.accCodes, master.accCodes, 'Account');
  validate(mapping?.dept, master.depts, 'Department');
  validate(mapping?.groups, master.accountGroups, 'Account group');
  validate(mapping?.deptGroup, master.deptGroups, 'Department group');
  pickMapping(mapping).dimensions.forEach(({ key, value }) => {
    const definition = master.dimensionDefinitions?.find((item) => item.key === key);
    if (!definition || splitCodes(value).some((code) => !definition.values.some((item) => text(item) === text(code)))) issues.push(`Dimension: ${key}`);
  });
  return issues;
};
export const getBuReadiness = (report, tenant, master) => {
  if (normalizeTenant(tenant) === normalizeTenant(report?.tenant)) return true;
  return Boolean(report) && report.rows.filter(isMappingRow).every((row) => {
    const mapping = getBuMapping(row, tenant, report.tenant);
    return mapping?.status === 'notApplicable' || (mapping?.status === 'confirmed' && hasMapping(mapping) && getMappingIssues(mapping, master).length === 0);
  });
};

export const setBuMapping = (report, rowId, mapping) => ({
  ...report,
  rows: report.rows.map((row) => row.id === rowId ? {
    ...row,
    buMappings: [...(row.buMappings || []).filter((item) => normalizeTenant(item.tenant) !== normalizeTenant(mapping.tenant)), mapping],
  } : row),
});

// Suggestions never become active until reviewed. Same code alone is insufficient.
export const suggestBuMapping = (row, source, target) => {
  const mapping = pickMapping(row);
  const issues = [];
  const compare = (codes, from, to, label, account = false, members) => {
    splitCodes(codes).forEach((code) => {
      const left = (from || []).filter((item) => text(item.id) === text(code));
      const right = (to || []).filter((item) => text(item.id) === text(code));
      if (left.length !== 1 || right.length !== 1 || text(left[0].name) !== text(right[0].name)
        || (account && text(left[0].type) !== text(right[0].type))
        || (members && text(left[0].level) !== text(right[0].level))
        || (members && JSON.stringify([...(left[0][members] || [])].map(text).sort()) !== JSON.stringify([...(right[0][members] || [])].map(text).sort()))) {
        issues.push(`${label}: ${code}`);
      }
    });
  };
  compare(row.accCodes, source?.accCodes, target?.accCodes, 'Account', true);
  compare(row.dept, source?.depts, target?.depts, 'Department');
  compare(row.groups, source?.accountGroups, target?.accountGroups, 'Account group', false, 'accountIds');
  compare(row.deptGroup, source?.deptGroups, target?.deptGroups, 'Department group', false, 'deptIds');
  const dimensions = row.dimensions?.length ? row.dimensions : fields.filter((key) => /^dim\d+$/.test(key) && row[key]).map((key) => ({ key, value: row[key] }));
  dimensions.forEach(({ key, value }) => {
    const from = source?.dimensionDefinitions?.find((item) => item.key === key);
    const to = target?.dimensionDefinitions?.filter((item) => from && text(item.caption) === text(from.caption));
    if (!from || to?.length !== 1 || !splitCodes(value).every((code) => to[0].values.some((item) => text(item) === text(code)))) issues.push(`Dimension: ${key}`);
    // Different slots require explicit review; never copy a slot by position.
    else if (to[0].key !== key) issues.push(`Dimension slot: ${key}`);
  });
  if (!hasMapping(mapping)) issues.push('No source mapping');
  return { mapping, issues, matched: issues.length === 0 };
};

export const reportForBu = (report, tenant) => ({
  ...report,
  rows: report.rows.map((row) => {
    if (!isMappingRow(row)) return row;
    const mapping = getBuMapping(row, tenant, report.tenant);
    if (!mapping || !['confirmed', 'notApplicable'].includes(mapping.status)) throw new Error(`Mapping required: ${tenant} / ${row.desc}`);
    return { ...row, ...pickMapping(mapping.status === 'notApplicable' ? {} : mapping), notApplicable: mapping.status === 'notApplicable' };
  }),
});

export const buildBuComparison = ({ report, datasets, filters, includeTotal = false }) => {
  const groups = datasets.map((dataset) => {
    const activeReport = dataset.report || reportForBu(report, dataset.tenant);
    const rows = buildReportData({ ...filters, activeReport, engineData: dataset.actualRows, budgetData: dataset.budgetRows,
      appliedDepts: dataset.deptIds || [], masterData: dataset.masterData, periodOptions: dataset.masterData.periods });
    return { tenant: dataset.tenant, name: dataset.name || dataset.tenant, currency: dataset.currency, rows: rows.map((row) => getBuMapping(row, dataset.tenant, report.tenant)?.status === 'notApplicable' ? { ...row, results: Object.fromEntries(report.columns.map((col) => [col.id, null])) } : row), calculatedRows: rows };
  });
  if (includeTotal && groups.length > 1) {
    const baseValues = {};
    const groupRows = groups.map((group) => new Map(group.calculatedRows.map((row) => [row.id, row])));
    report.rows.filter(isMappingRow).forEach((row) => {
      baseValues[row.id] = {};
      report.columns.filter((col) => !col.isFormula && !col.isPercent).forEach((col) => {
        baseValues[row.id][col.id] = groupRows.reduce((sum, rows) => sum + (Number(rows.get(row.id)?.results[col.id]) || 0), 0);
      });
    });
    groups.push({ tenant: '__total', name: 'Total', currency: datasets[0]?.currency,
      rows: buildReportData({ ...filters, activeReport: report, engineData: [], budgetData: [], masterData: {}, baseValues }) });
  }
  return groups;
};

export const comparisonExportData = (report, groups) => {
  const rowMaps = new Map(groups.map((group) => [group.tenant, new Map(group.rows.map((row) => [row.id, row]))]));
  const columns = groups.flatMap((group) => report.columns.filter((col) => col.isActive).map((col) => ({ ...col, id: JSON.stringify([group.tenant, col.id]) })));
  const rows = report.rows.filter((row) => row.isActive !== false).map((row) => ({ ...row,
    results: Object.fromEntries(groups.flatMap((group) => report.columns.map((col) => [JSON.stringify([group.tenant, col.id]), rowMaps.get(group.tenant).get(row.id)?.results[col.id] ?? null]))),
  }));
  return { activeReport: { ...report, descriptionPosition: 0, columns }, activeCols: columns, reportData: rows,
    columnGroups: groups.map((group) => ({ label: `${group.name}${group.currency ? ` (${group.currency})` : ''}`, count: report.columns.filter((col) => col.isActive).length })) };
};
