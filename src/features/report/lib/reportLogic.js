import { normalizeLookupCode, normalizeDeptLookupCode, normalizeAccLookupCode } from './normalizeCode.js';
export { normalizeLookupCode, normalizeDeptLookupCode, normalizeAccLookupCode } from './normalizeCode.js';

export const THEMES = {
  blue: {
    name: 'Classic Blue',
    header: 'bg-[#2D4A8C] text-white border-[#1e3263]',
    subHeader: 'bg-blue-100/60 text-blue-950 font-bold dark:bg-blue-950/60 dark:text-blue-100',
    total: 'bg-blue-50 text-slate-950 font-bold dark:bg-blue-950/40 dark:text-blue-50',
    rowHover: 'hover:bg-blue-50/60 dark:hover:bg-blue-950/30',
    borderColor: 'border-blue-100 dark:border-blue-900/60',
    cellBorder: 'border-blue-100/80 dark:border-blue-900/50',
    hexHeader: '#2D4A8C', hexSubHeader: '#dbeafe', hexTotal: '#eff6ff', hexCellBorder: '#eff6ff'
  },
  green: {
    name: 'Emerald Green',
    header: 'bg-emerald-700 text-white border-emerald-800',
    subHeader: 'bg-emerald-100/60 text-emerald-950 font-bold dark:bg-emerald-950/60 dark:text-emerald-100',
    total: 'bg-emerald-50 text-slate-950 font-bold dark:bg-emerald-950/40 dark:text-emerald-50',
    rowHover: 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-900/60',
    cellBorder: 'border-emerald-100/80 dark:border-emerald-900/50',
    hexHeader: '#047857', hexSubHeader: '#d1fae5', hexTotal: '#ecfdf5', hexCellBorder: '#ecfdf5'
  },
  gray: {
    name: 'Slate Gray',
    header: 'bg-slate-700 text-white border-slate-800',
    subHeader: 'bg-slate-200/70 text-slate-950 font-bold dark:bg-slate-700/70 dark:text-slate-50',
    total: 'bg-slate-100 text-slate-950 font-bold dark:bg-slate-800 dark:text-slate-50',
    rowHover: 'hover:bg-slate-100/60 dark:hover:bg-slate-800/70',
    borderColor: 'border-slate-300 dark:border-slate-700',
    cellBorder: 'border-slate-200/80 dark:border-slate-800',
    hexHeader: '#334155', hexSubHeader: '#e2e8f0', hexTotal: '#f1f5f9', hexCellBorder: '#f1f5f9'
  }
};

export const INITIAL_MASTER_DATA = {
  companyProfile: { name: 'Carmen Hotel & Resorts' },
  users: [
    { id: 'admin', name: 'admin', role: 'Admin' }
  ],
  depts: [],
  accountGroups: [],
  deptGroups: [
    { id: 'ROOMS', name: 'Rooms Division', deptIds: ['101'] },
    { id: 'FOOD_BEVERAGE', name: 'Food & Beverage', deptIds: ['201', '202'] },
    { id: 'ADMIN', name: 'Administration', deptIds: ['301', '302'] },
  ],
  groups: { L1: [], L2: [], L3: [], L4: [] },
  accCodes: []
};

export const parseAmount = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  let cleanVal = String(val).replace(/,/g, '').replace(/"/g, '').trim();
  if (cleanVal === '\\N' || cleanVal.toUpperCase() === 'NULL') return 0;
  if (cleanVal.startsWith('(') && cleanVal.endsWith(')')) {
    cleanVal = '-' + cleanVal.substring(1, cleanVal.length - 1);
  }
  const parsedVal = parseFloat(cleanVal);
  return isNaN(parsedVal) ? 0 : parsedVal;
};

export const formatAutoPeriod = (year, period, formatType) => {
  if (period === 'Q1' || period === 'Q2' || period === 'Q3' || period === 'Q4') {
    return `${period} ${year}`;
  }
  if (period === '-1') {
    return `Previous Period (${year})`;
  }
  const pInt = parseInt(period, 10);
  const yInt = parseInt(year, 10);
  if (isNaN(pInt) || isNaN(yInt)) return `Period : ${year}-${String(period).padStart(2, '0')}`;
  const mIdx = Math.max(0, Math.min(11, pInt - 1));
  const padP = String(pInt).padStart(2, '0');
  const yy = String(yInt).slice(-2);
  const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const lastDay = new Date(yInt, pInt, 0).getDate();

  switch (formatType) {
    case 'numeric': return `${padP}/${yInt}`;
    case 'numeric_short': return `${padP}/${yy}`;
    case 'year_month': return `${yInt}-${padP}`;
    case 'short': return `${SHORT_MONTHS[mIdx]} ${yInt}`;
    case 'short_yy': return `${SHORT_MONTHS[mIdx]} '${yy}`;
    case 'long': return `${LONG_MONTHS[mIdx]} ${yInt}`;
    case 'month_only': return `${LONG_MONTHS[mIdx]}`;
    case 'end_of_month': return `${LONG_MONTHS[mIdx]} ${lastDay}, ${yInt}`;
    case 'day_month_year': return `${lastDay} ${SHORT_MONTHS[mIdx]} ${yInt}`;
    default: return `Period : ${yInt}-${padP}`;
  }
};

const normalizePeriodOptions = (periodOptions) => (Array.isArray(periodOptions) ? periodOptions : [])
  .map((option, index) => ({
    id: String(option?.id ?? option?.GlpNo ?? option?.periodNo ?? index + 1).trim(),
    periodNo: Number(option?.periodNo ?? option?.GlpNo ?? option?.id ?? index + 1),
    sequence: index + 1,
  }))
  .filter((option) => option.id);

const getPeriodSequence = (appliedPeriod, periodOptions) => {
  const normalized = normalizePeriodOptions(periodOptions);
  if (normalized.length === 0) return null;

  const index = normalized.findIndex((option) =>
    String(option.id) === String(appliedPeriod) || String(option.periodNo) === String(appliedPeriod)
  );

  if (index < 0) return null;

  return {
    index,
    currentPosition: index + 1,
    totalPositions: normalized.length,
  };
};

export const resolveTime = (col, appliedYear, appliedPeriod, periodOptions = []) => {
  let y = parseInt(appliedYear, 10);
  let p = parseInt(appliedPeriod, 10);
  let months = [];
  const periodSequence = getPeriodSequence(appliedPeriod, periodOptions);

  if (periodSequence) {
    const { currentPosition, totalPositions } = periodSequence;

    if (col.periodMode === 'current') months = [currentPosition];
    else if (col.periodMode === '-1') {
      if (currentPosition <= 1) {
        months = [totalPositions];
        y -= 1;
      } else {
        months = [currentPosition - 1];
      }
    } else if (col.periodMode === 'Q1') months = Array.from({ length: Math.min(3, totalPositions) }, (_, i) => i + 1);
    else if (col.periodMode === 'Q2') months = Array.from({ length: Math.min(3, Math.max(0, totalPositions - 3)) }, (_, i) => i + 4);
    else if (col.periodMode === 'Q3') months = Array.from({ length: Math.min(3, Math.max(0, totalPositions - 6)) }, (_, i) => i + 7);
    else if (col.periodMode === 'Q4') months = Array.from({ length: Math.min(3, Math.max(0, totalPositions - 9)) }, (_, i) => i + 10);
    else if (col.periodMode === 'FY') months = Array.from({ length: totalPositions }, (_, i) => i + 1);
    else months = [parseInt(col.periodMode) || currentPosition];

    if (col.yearMode === '-1') y -= 1;
    else if (col.yearMode === '+1') y += 1;
    else if (col.yearMode === 'specific' && /^\d{4}$/.test(String(col.specificYear || ''))) y = Number(col.specificYear);
    return { effYear: y.toString(), targetMonths: months };
  }

  // Fallback non-sequence logic
  let globalMonths = [p];
  if (appliedPeriod === 'Q1') globalMonths = [1, 2, 3];
  else if (appliedPeriod === 'Q2') globalMonths = [4, 5, 6];
  else if (appliedPeriod === 'Q3') globalMonths = [7, 8, 9];
  else if (appliedPeriod === 'Q4') globalMonths = [10, 11, 12];
  else if (appliedPeriod === '-1') {
    const prevM = new Date().getMonth(); // 0-11 (so 0 is Jan, meaning previous is Dec)
    globalMonths = [prevM === 0 ? 12 : prevM];
  }

  if (col.periodMode === 'current') months = globalMonths;
  else if (col.periodMode === '-1') {
    let baseM = globalMonths[0];
    if (isNaN(baseM)) baseM = new Date().getMonth() + 1;
    let prevM = baseM - 1;
    if (prevM < 1) { prevM = 12; y -= 1; }
    months = [prevM];
  }
  else if (col.periodMode === 'Q1') months = [1, 2, 3];
  else if (col.periodMode === 'Q2') months = [4, 5, 6];
  else if (col.periodMode === 'Q3') months = [7, 8, 9];
  else if (col.periodMode === 'Q4') months = [10, 11, 12];
  else if (col.periodMode === 'FY') months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  else months = [parseInt(col.periodMode) || globalMonths[0]];

  if (col.yearMode === '-1') y -= 1;
  else if (col.yearMode === '+1') y += 1;
  else if (col.yearMode === 'specific' && /^\d{4}$/.test(String(col.specificYear || ''))) y = Number(col.specificYear);
  return { effYear: y.toString(), targetMonths: months };
};

const BUDGET_COLUMN_TYPES = new Set(['BUD', 'BC', 'BUDACC', 'BCC', 'DACBG', 'PTDBG']);

const getColumnValueMode = (colType) => {
  const type = String(colType || '').trim().toUpperCase();
  if (['ACC', 'PTD', 'BUDACC', 'BCC', 'PTDBG'].includes(type)) return 'acc';
  if (['BUD', 'BC', 'DACBG'].includes(type)) return 'bud';
  return 'ac';
};

let reportCloneCounter = 0;

const createReportId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `rep-${crypto.randomUUID()}`
    : `rep-${++reportCloneCounter}`;

const evaluateArithmeticExpression = (expression) => {
  const sanitized = String(expression || '').replace(/[^-()\d/*+.\s]/g, '').trim();
  if (!sanitized) return 0;

  let index = 0;

  const skipWhitespace = () => {
    while (index < sanitized.length && /\s/.test(sanitized[index])) index += 1;
  };

  const parseNumber = () => {
    skipWhitespace();
    const start = index;
    while (index < sanitized.length && /[\d.]/.test(sanitized[index])) index += 1;
    const value = Number.parseFloat(sanitized.slice(start, index));
    if (!Number.isFinite(value)) throw new Error('Invalid number');
    return value;
  };

  const parseFactor = () => {
    skipWhitespace();
    if (sanitized[index] === '+') {
      index += 1;
      return parseFactor();
    }
    if (sanitized[index] === '-') {
      index += 1;
      return -parseFactor();
    }
    if (sanitized[index] === '(') {
      index += 1;
      const value = parseExpression();
      skipWhitespace();
      if (sanitized[index] !== ')') throw new Error('Missing closing parenthesis');
      index += 1;
      return value;
    }
    return parseNumber();
  };

  const parseTerm = () => {
    let value = parseFactor();
    while (true) {
      skipWhitespace();
      const operator = sanitized[index];
      if (operator !== '*' && operator !== '/') break;
      index += 1;
      const rhs = parseFactor();
      value = operator === '*' ? value * rhs : value / rhs;
    }
    return value;
  };

  const parseExpression = () => {
    let value = parseTerm();
    while (true) {
      skipWhitespace();
      const operator = sanitized[index];
      if (operator !== '+' && operator !== '-') break;
      index += 1;
      const rhs = parseTerm();
      value = operator === '+' ? value + rhs : value - rhs;
    }
    return value;
  };

  const value = parseExpression();
  skipWhitespace();
  if (index !== sanitized.length) throw new Error('Unexpected token');
  return Number.isFinite(value) ? value : 0;
};

const INDENT_CLASSES = ['pl-0', 'pl-4', 'pl-8', 'pl-12', 'pl-16', 'pl-20', 'pl-24', 'pl-28'];
export const getIndentClass = (level) => INDENT_CLASSES[Math.min(7, Math.max(0, Math.round(Number(level) || 0)))];

export { createBlankReport } from '../data/reportTemplates.js';

export const cloneReport = (report, newId = createReportId(), owner = report.owner) => {
  const cloned = structuredClone(report);
  cloned.id = newId;
  cloned.owner = owner;
  cloned.name = `${report.name} (Copy)`;
  return cloned;
};

export const findBrokenReferences = (report) => {
  const issues = [];
  if (!report) return issues;
  const rowCount = Array.isArray(report.rows) ? report.rows.length : 0;
  const columnCount = Array.isArray(report.columns) ? report.columns.length : 0;

  const pushRowRefIssues = (field, value, rowId) => {
    const matches = String(value || '').toUpperCase().match(/R(\d+)/g) || [];
    matches.forEach((token) => {
      const idx = parseInt(token.slice(1), 10);
      if (!Number.isInteger(idx) || idx < 1 || idx > rowCount) {
        issues.push({ scope: 'row', id: rowId, field, value: token });
      }
    });
  };

  const pushColRefIssues = (field, value, colId) => {
    const matches = String(value || '').toUpperCase().match(/C(\d+)/g) || [];
    matches.forEach((token) => {
      const idx = parseInt(token.slice(1), 10);
      if (!Number.isInteger(idx) || idx < 1 || idx > columnCount) {
        issues.push({ scope: 'column', id: colId, field, value: token });
      }
    });
  };

  (report.rows || []).forEach((row) => {
    if (row?.formula && String(row.formula).includes('!REF!')) {
      issues.push({ scope: 'row', id: row.id, field: 'formula', value: row.formula });
    } else if (row?.formula) {
      pushRowRefIssues('formula', row.formula, row.id);
    }
    if (row?.percentBase && String(row.percentBase).includes('!REF!')) {
      issues.push({ scope: 'row', id: row.id, field: 'percentBase', value: row.percentBase });
    } else if (row?.percentBase) {
      pushRowRefIssues('percentBase', row.percentBase, row.id);
    }
  });

  (report.columns || []).forEach((column) => {
    if (column?.formula && String(column.formula).includes('!REF!')) {
      issues.push({ scope: 'column', id: column.id, field: 'formula', value: column.formula });
    } else if (column?.formula) {
      pushColRefIssues('formula', column.formula, column.id);
    }
    if (column?.targetCol && String(column.targetCol).includes('!REF!')) {
      issues.push({ scope: 'column', id: column.id, field: 'targetCol', value: column.targetCol });
    } else if (column?.targetCol) {
      pushColRefIssues('targetCol', column.targetCol, column.id);
    }
  });

  return issues;
};

const getMasterListIds = (items) =>
  Array.isArray(items)
    ? items.map((item) => String(item?.id || item?.code || item?.DeptCode || item?.AccCode || '').trim()).filter(Boolean)
    : [];

export const createRowMappingWarningContext = (_allRows = [], masterData = null) => ({
    masterDeptIds: new Set(getMasterListIds(masterData?.depts)),
    masterAccIds: new Set(getMasterListIds(masterData?.accCodes)),
    masterDeptGroupIds: new Set(
      (Array.isArray(masterData?.deptGroups) ? masterData.deptGroups : [])
        .map((group) => String(group?.id || '').trim().toUpperCase())
        .filter(Boolean),
    ),
    masterAccGroupIds: new Set(
      (Array.isArray(masterData?.accountGroups) ? masterData.accountGroups : [])
        .map((group) => String(group?.id || '').trim().toUpperCase())
        .filter(Boolean),
    ),
  });

export const getRowMappingWarnings = (row, allRows = [], masterData = null, warningContext = null) => {
  const warnings = [];
  if (!row) return warnings;

  const context = warningContext || createRowMappingWarningContext(allRows, masterData);

  const hasDept = Boolean(String(row.dept || '').trim());
  const deptGroup = String(row.deptGroup || row.DeptGroup || '').trim().toUpperCase();
  const hasDeptGroup = Boolean(deptGroup);
  const hasAccCodes = Boolean(String(row.accCodes || '').trim());
  const accountGroup = String(row.groups || '').trim().toUpperCase();
  const hasAccountGroup = Boolean(accountGroup);

  if (hasDeptGroup && hasDept) {
    warnings.push('department group and department codes cannot be mapped together.');
  }

  if (hasAccountGroup && hasAccCodes) {
    warnings.push('account group and account codes cannot be mapped together.');
  }

  if (context.masterDeptIds.size > 0 && hasDept) {
    const invalidDepts = String(row.dept || '')
      .split(',')
      .map(normalizeDeptLookupCode)
      .filter(Boolean)
      .filter((dept) => !context.masterDeptIds.has(dept));
    if (invalidDepts.length > 0) {
      warnings.push(`unknown department code(s): ${invalidDepts.join(', ')}.`);
    }
  }

  if (hasDeptGroup && context.masterDeptGroupIds.size > 0 && !context.masterDeptGroupIds.has(deptGroup)) {
    warnings.push('unknown department group: ' + deptGroup + '.');
  }

  if (hasAccountGroup && context.masterAccGroupIds.size > 0 && !context.masterAccGroupIds.has(accountGroup)) {
    warnings.push('unknown account group: ' + accountGroup + '.');
  }

  if (context.masterAccIds.size > 0 && hasAccCodes) {
    const invalidAccs = String(row.accCodes || '')
      .split(',')
      .map(normalizeAccLookupCode)
      .filter(Boolean)
      .filter((acc) => !context.masterAccIds.has(acc));
    if (invalidAccs.length > 0) {
      warnings.push(`unknown account code(s): ${invalidAccs.join(', ')}.`);
    }
  }

  return warnings;
};

export const findRowMappingConflicts = (report, masterData = null) => {
  const issues = [];
  if (!report) return issues;

  (report.rows || []).forEach((row) => {
    if (!row || row.isHeader || row.isTotal) return;
    getRowMappingWarnings(row, report.rows, masterData).forEach((message) => {
      issues.push({ scope: 'row', id: row.id, field: 'mapping', value: message });
    });
  });

  return issues;
};

const filterEngineRows = (row, masterData) => {
  const deptGroupId = String(row.deptGroup || row.DeptGroup || '').trim().toUpperCase();
  const deptGroup = (masterData?.deptGroups || []).find((group) => String(group?.id || '').trim().toUpperCase() === deptGroupId);
  const explicitDepts = row.dept ? String(row.dept).split(',').map(normalizeDeptLookupCode).filter(Boolean) : [];
  const depts = explicitDepts.length > 0
    ? explicitDepts
    : deptGroupId
      ? (deptGroup?.deptIds || []).map(normalizeDeptLookupCode).filter(Boolean)
      : [];
  const accountGroupId = String(row.groups || '').trim().toUpperCase();
  const accountGroup = (masterData?.accountGroups || []).find((group) => String(group?.id || '').trim().toUpperCase() === accountGroupId);
  const explicitAccs = row.accCodes ? String(row.accCodes).split(',').map(normalizeAccLookupCode).filter(Boolean) : [];
  const accs = explicitAccs.length > 0
    ? explicitAccs
    : accountGroup
      ? (accountGroup.accountIds || []).map(normalizeAccLookupCode).filter(Boolean)
      : [];
  const grps = accs.length === 0 && accountGroupId
    ? String(row.groups).split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    : [];
  const dimensions = Array.isArray(row.dimensions)
    ? row.dimensions
        .map((item) => ({
          key: String(item?.key || item?.name || item?.field || '').trim(),
          value: String(item?.value || item?.id || item?.code || '').trim(),
        }))
        .filter((item) => item.key && item.value)
    : ['dim1', 'dim2', 'dim3', 'dim4']
        .map((field) => (row[field] ? { key: field, value: String(row[field]).trim() } : null))
        .filter(Boolean);
  const groupLevelKey = (row.groupLevel === 'L1' ? 'group1' : row.groupLevel === 'L2' ? 'group2' : row.groupLevel === 'L3' ? 'group3' : 'group4');
  const dimensionSets = new Map();
  dimensions.forEach(({ key, value }) => {
    const normalizedKey = String(key || '').trim().toLowerCase();
    if (!normalizedKey) return;
    if (!dimensionSets.has(normalizedKey)) dimensionSets.set(normalizedKey, new Set());
    String(value || '').split(',').map((item) => item.trim().toUpperCase()).filter(Boolean)
      .forEach((item) => dimensionSets.get(normalizedKey).add(item));
  });
  return {
    depts,
    accs,
    grps,
    deptSet: new Set(depts),
    accSet: new Set(accs),
    grpSet: new Set(grps),
    dimensions,
    dimensionSets,
    groupLevelKey,
    hasDeptMap: depts.length > 0,
    hasAccMap: accs.length > 0,
    hasGrpMap: grps.length > 0,
  };
};

const matchesReportCategory = ({ reportCategories, dAccType, hasAccMap, dAccCode, accSet }) => {
  if (reportCategories.includes('ALL')) return true;
  const isIncome = ['I', 'E', 'R', 'INC', 'EXP', 'REV', 'COS', 'PL'].some(t => dAccType === t || dAccType.startsWith(t));
  const isBalance = ['B', 'A', 'L', 'AST', 'LIA', 'EQU', 'CAP', 'BS'].some(t => dAccType === t || dAccType.startsWith(t));

  if (reportCategories.includes('I') && isIncome) return true;
  if (reportCategories.includes('B') && isBalance) return true;
  if (reportCategories.some(cat => dAccType === cat || dAccType.startsWith(cat))) return true;
  return !hasAccMap || accSet.has(dAccCode);
};

const prepareSourceRows = (sourceRows, masterData) => {
  const masterAccTypes = new Map();
  (masterData?.accCodes || []).forEach((account) => {
    const code = normalizeAccLookupCode(account?.id);
    if (!masterAccTypes.has(code)) {
      masterAccTypes.set(code, String(account?.type || '').trim().toUpperCase());
    }
  });

  return (sourceRows || []).map((source) => {
    const accCode = normalizeAccLookupCode(source.acccode || source.account || source.accountcode || '');
    const directAccType = String(source.acctype || source.accnature || source.type || '').trim().toUpperCase();
    return {
      source,
      year: String(source.year || source.yr || '').trim(),
      period: Number.parseInt(source.period || source.month || source.period_no, 10),
      day: Number.parseInt(source.day || source.Day || source.docDay || source.transactionDay || source.date_day || source.day_no, 10),
      revision: String(source.revision || source.rev || '0').trim(),
      deptCode: normalizeDeptLookupCode(source.deptcode || source.dept || source.department || ''),
      accCode,
      accType: directAccType || masterAccTypes.get(accCode) || '',
    };
  });
};

const matchesPreparedDimensions = (dimensionSets, source) => {
  if (dimensionSets.size === 0) return true;
  for (const [key, values] of dimensionSets) {
    const sourceValue = String(source?.[key] || source?.[key.toLowerCase()] || source?.[key.toUpperCase()] || '').trim().toUpperCase();
    if (!values.has(sourceValue)) return false;
  }
  return true;
};

const filterPreparedRows = ({ preparedRows, rowConfig, appliedDeptSet, reportCategories, filterRevision = false, appliedRevision }) =>
  preparedRows.filter((prepared) => {
    if (filterRevision && prepared.revision !== appliedRevision) return false;
    if (appliedDeptSet.size > 0 && !appliedDeptSet.has(prepared.deptCode)) return false;
    if (rowConfig.hasDeptMap && !rowConfig.deptSet.has(prepared.deptCode)) return false;
    if (rowConfig.hasAccMap && !rowConfig.accSet.has(prepared.accCode)) return false;
    const sourceGroup = String(prepared.source[rowConfig.groupLevelKey] || prepared.source.group || '').trim().toUpperCase();
    if (rowConfig.hasGrpMap && !rowConfig.grpSet.has(sourceGroup)) return false;
    if (!matchesPreparedDimensions(rowConfig.dimensionSets, prepared.source)) return false;
    return matchesReportCategory({
      reportCategories,
      dAccType: prepared.accType,
      hasAccMap: rowConfig.hasAccMap,
      dAccCode: prepared.accCode,
      accSet: rowConfig.accSet,
    });
  });

const sumActuals = ({ col, matchedRows, appliedYear, appliedPeriod, appliedDay, periodOptions }) => {
  const { effYear, targetMonths } = resolveTime(col, appliedYear, appliedPeriod, periodOptions);
  const type = String(col.type || '').trim().toUpperCase();
  const monthsToEvaluate = ['BUDACC', 'BCC'].includes(type) && col.periodMode === 'FY' ? [targetMonths[0]] : targetMonths;
  const targetDay = Number.parseInt(appliedDay, 10);
  const valueMode = getColumnValueMode(col.type);
  let sum = 0;

  monthsToEvaluate.forEach(m => {
    matchedRows.forEach((prepared) => {
      const d = prepared.source;
      if (prepared.year && prepared.year !== effYear) return;
      if (type === 'DAC' || type === 'PTD') {
        if (Number.isInteger(prepared.period) && prepared.period !== m) return;
        if (Number.isInteger(targetDay)) {
          if (!Number.isInteger(prepared.day)) return;
          if (type === 'DAC' && prepared.day !== targetDay) return;
          if (type === 'PTD' && (prepared.day < 1 || prepared.day > targetDay)) return;
        }
      }

      const amtM = d['amt' + m] !== undefined && d['amt' + m] !== '' ? d['amt' + m] : (d['amt0' + m] !== undefined && d['amt0' + m] !== '' ? d['amt0' + m] : 0);
      const bfAmtM = d['bfamt' + m] !== undefined && d['bfamt' + m] !== '' ? d['bfamt' + m] : (d['bfamt0' + m] !== undefined && d['bfamt0' + m] !== '' ? d['bfamt0' + m] : 0);

      if (type === 'DAC' || type === 'PTD') {
        sum += parseAmount(d.amount ?? d.amt ?? d.val ?? amtM);
      } else if (valueMode === 'ac') sum += parseAmount(amtM);
      else if (valueMode === 'acc') sum += parseAmount(bfAmtM) + parseAmount(amtM);
    });
  });

  return sum;
};

const sumBudget = ({ col, matchedRows, appliedYear, appliedPeriod, appliedDay, periodOptions }) => {
  const { effYear, targetMonths } = resolveTime(col, appliedYear, appliedPeriod, periodOptions);
  const type = String(col.type || '').trim().toUpperCase();
  const monthsToEvaluate = ['BUDACC', 'BCC'].includes(type) && col.periodMode === 'FY' ? [targetMonths[0]] : targetMonths;
  const targetDay = Number.parseInt(appliedDay, 10);
  const valueMode = getColumnValueMode(col.type);
  let sum = 0;

  monthsToEvaluate.forEach(m => {
    matchedRows.forEach((prepared) => {
      const d = prepared.source;
      if (prepared.year && prepared.year !== effYear) return;
      if (type === 'DACBG' || type === 'PTDBG') {
        if (Number.isInteger(prepared.period) && prepared.period !== m) return;
        if (Number.isInteger(targetDay) && Number.isInteger(prepared.day)) {
          if (type === 'DACBG' && prepared.day !== targetDay) return;
          if (type === 'PTDBG' && (prepared.day < 1 || prepared.day > targetDay)) return;
        }
      }

      if (type === 'DACBG' || type === 'PTDBG') {
        const amtM = d['amt' + m] !== undefined && d['amt' + m] !== '' ? d['amt' + m] : (d['amt0' + m] !== undefined && d['amt0' + m] !== '' ? d['amt0' + m] : 0);
        if (Number.isInteger(prepared.day)) {
          sum += parseAmount(d.amount ?? d.amt ?? d.val ?? amtM);
        } else {
          const daysInPeriod = Number.parseInt(d['days' + m], 10) || new Date(Number(effYear), m, 0).getDate();
          const dailyAmount = Math.round((parseAmount(amtM) / daysInPeriod) * 100) / 100;
          sum += dailyAmount * (type === 'PTDBG' ? Math.max(0, targetDay || 0) : 1);
        }
      } else if (valueMode === 'bud') {
        const amtM = d['amt' + m] !== undefined && d['amt' + m] !== '' ? d['amt' + m] : (d['amt0' + m] !== undefined && d['amt0' + m] !== '' ? d['amt0' + m] : 0);
        sum += parseAmount(amtM);
      } else if (valueMode === 'acc') {
        if (col.periodMode === 'FY') {
          for (let i = 1; i <= 12; i++) {
            const amtI = d['amt' + i] !== undefined && d['amt' + i] !== '' ? d['amt' + i] : (d['amt0' + i] !== undefined && d['amt0' + i] !== '' ? d['amt0' + i] : 0);
            sum += parseAmount(amtI);
          }
        } else {
          const budAccM = d['budacc' + m];
          if (budAccM !== undefined && budAccM !== '') {
            sum += parseAmount(budAccM);
          } else {
            for (let i = 1; i <= m; i++) {
              const amtI = d['amt' + i] !== undefined && d['amt' + i] !== '' ? d['amt' + i] : (d['amt0' + i] !== undefined && d['amt0' + i] !== '' ? d['amt0' + i] : 0);
              sum += parseAmount(amtI);
            }
          }
        }
      }
    });
  });

  return sum;
};

const applyFormulaRows = (rows, columns, rowRefMap) => {
  rows.filter(r => r.isTotal).forEach(row => {
    columns.filter(c => !c.isFormula && !c.isPercent).forEach(col => {
      let evalStr = row.formula?.toUpperCase() || '';
      (evalStr.match(/R\d+/g) || []).forEach(v => {
        const idx = parseInt(v.replace('R', ''), 10) - 1;
        evalStr = evalStr.replace(new RegExp(`\\b${v}\\b`, 'g'), (rows[idx] && rowRefMap[rows[idx].id][col.id]) || 0);
      });
      try {
        const res = evaluateArithmeticExpression(evalStr);
        rowRefMap[row.id][col.id] = (!isFinite(res) || isNaN(res)) ? 0 : res;
      } catch {
        rowRefMap[row.id][col.id] = 0;
      }
    });
  });
};

const applyPercentRows = (rows, columns, rowRefMap) => {
  rows.forEach(row => {
    columns.filter(c => c.isPercent).forEach(col => {
      const targetColId = col.targetCol;
      if (!targetColId) {
        rowRefMap[row.id][col.id] = 0;
        return;
      }
      const numerator = Number(rowRefMap[row.id][targetColId]) || 0;
      let denominator = 0;
      if (row.percentBase && !row.percentBase.includes('!REF!')) {
        const baseMatch = row.percentBase.match(/R(\d+)/i);
        if (baseMatch) {
          const bIdx = parseInt(baseMatch[1], 10) - 1;
          if (rows[bIdx]) denominator = Number(rowRefMap[rows[bIdx].id][targetColId]) || 0;
        }
      }
      const result = denominator !== 0 ? (numerator / denominator) * 100 : 0;
      rowRefMap[row.id][col.id] = (!isFinite(result) || isNaN(result)) ? 0 : result;
    });
  });
};

export const buildReportData = ({
  activeReport,
  engineData,
  budgetData,
  appliedDepts,
  appliedYear,
  appliedPeriod,
  appliedDay = '',
  appliedRevision,
  periodOptions = [],
  masterData,
}) => {
  if (!activeReport) return [];
  const { rows, columns } = activeReport;
  const rowRefMap = {};
  rows.forEach(r => rowRefMap[r.id] = {});
  const reportCategories = Array.isArray(activeReport?.category) ? activeReport.category : ['ALL'];
  const appliedDeptSet = new Set((appliedDepts || []).map(normalizeDeptLookupCode).filter(Boolean));
  const preparedActualRows = prepareSourceRows(engineData, masterData);
  const preparedBudgetRows = prepareSourceRows(budgetData, masterData);

  rows.filter(r => !r.isTotal && !r.isHeader).forEach((row) => {
    const rowConfig = filterEngineRows(row, masterData);

    if (rowConfig.depts.length === 0 && rowConfig.accs.length === 0 && rowConfig.grps.length === 0) {
      columns.forEach(col => rowRefMap[row.id][col.id] = 0);
      return;
    }

    const matchedActualRows = filterPreparedRows({
      preparedRows: preparedActualRows,
      rowConfig,
      appliedDeptSet,
      reportCategories,
    });
    const matchedBudgetRows = filterPreparedRows({
      preparedRows: preparedBudgetRows,
      rowConfig,
      appliedDeptSet,
      reportCategories,
      filterRevision: true,
      appliedRevision,
    });

    columns.filter(c => !c.isFormula && !c.isPercent).forEach(col => {
      if (BUDGET_COLUMN_TYPES.has(String(col.type || '').trim().toUpperCase())) {
        rowRefMap[row.id][col.id] = sumBudget({
          col,
          matchedRows: matchedBudgetRows,
          appliedYear,
          appliedPeriod,
          appliedDay,
          periodOptions,
        });
      } else {
        rowRefMap[row.id][col.id] = sumActuals({
          col,
          matchedRows: matchedActualRows,
          appliedYear,
          appliedPeriod,
          appliedDay,
          periodOptions,
        });
      }
    });
  });
  applyFormulaRows(rows, columns, rowRefMap);

  rows.forEach(row => {
    columns.filter(c => c.isFormula).forEach(col => {
      let evalStr = col.formula?.toUpperCase() || '';
      (evalStr.match(/C\d+/g) || []).forEach(v => {
        const idx = parseInt(v.replace('C', ''), 10) - 1;
        evalStr = evalStr.replace(new RegExp(`\\b${v}\\b`, 'g'), (columns[idx] && rowRefMap[row.id][columns[idx].id]) || 0);
      });
      try {
        const res = evaluateArithmeticExpression(evalStr);
        rowRefMap[row.id][col.id] = (!isFinite(res) || isNaN(res)) ? 0 : res;
      } catch {
        rowRefMap[row.id][col.id] = 0;
      }
    });
  });
  applyPercentRows(rows, columns, rowRefMap);

  return rows.map((r, i) => ({ ...r, rowLabel: `R${i + 1}`, results: rowRefMap[r.id] }));
};

export const deleteRowAndRewriteReferences = (activeReport, rowId) => {
  const delIdx = activeReport.rows.findIndex(r => r.id === rowId);
  if (delIdx === -1) return activeReport;
  const newRows = activeReport.rows.filter(r => r.id !== rowId);
  const map = {};
  activeReport.rows.forEach((r, i) => {
    if (i > delIdx) map[`R${i + 1}`] = `R${i}`;
    else if (i === delIdx) map[`R${i + 1}`] = '!REF!';
  });
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return { ...activeReport, rows: newRows };
  const regex = new RegExp(`\\b(${keys.join('|')})\\b`, 'gi');
  return {
    ...activeReport,
    rows: newRows.map(r => ({
      ...r,
      formula: r.formula ? r.formula.toUpperCase().replace(regex, m => map[m.toUpperCase()]) : r.formula,
      percentBase: r.percentBase ? r.percentBase.toUpperCase().replace(regex, m => map[m.toUpperCase()]) : r.percentBase
    }))
  };
};

export const deleteColAndRewriteReferences = (activeReport, colId) => {
  const delIdx = activeReport.columns.findIndex(c => c.id === colId);
  if (delIdx === -1) return activeReport;
  const newCols = activeReport.columns.filter(c => c.id !== colId);
  const map = {};
  activeReport.columns.forEach((c, i) => {
    if (i > delIdx) map[`C${i + 1}`] = `C${i}`;
    else if (i === delIdx) map[`C${i + 1}`] = '!REF!';
  });
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return { ...activeReport, columns: newCols };
  const regex = new RegExp(`\\b(${keys.join('|')})\\b`, 'gi');
  return {
    ...activeReport,
    columns: newCols.map(c => ({
      ...c,
      formula: c.formula ? c.formula.toUpperCase().replace(regex, m => map[m.toUpperCase()]) : c.formula,
      targetCol: c.targetCol ? c.targetCol.toUpperCase().replace(regex, m => map[m.toUpperCase()]) : c.targetCol
    }))
  };
};

export const moveColumnsAndRewriteReferences = (activeReport, idx, dir) => {
  const newCols = [...activeReport.columns];
  const targetIdx = Number.isInteger(dir) ? dir : (dir === 'left' ? idx - 1 : idx + 1);
  if (idx < 0 || idx >= newCols.length || targetIdx < 0 || targetIdx >= newCols.length || idx === targetIdx) return activeReport;
  const [movedColumn] = newCols.splice(idx, 1);
  newCols.splice(targetIdx, 0, movedColumn);
  const map = {};
  newCols.forEach((c, i) => {
    const oldI = activeReport.columns.findIndex(oc => oc.id === c.id);
    if (oldI !== i) map[`C${oldI + 1}`] = `C${i + 1}`;
  });
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return activeReport;
  const regex = new RegExp(`\\b(${keys.join('|')})\\b`, 'gi');
  return {
    ...activeReport,
    columns: newCols.map(c => ({
      ...c,
      formula: c.formula ? c.formula.toUpperCase().replace(regex, m => map[m.toUpperCase()]) : c.formula,
      targetCol: c.targetCol ? c.targetCol.toUpperCase().replace(regex, m => map[m.toUpperCase()]) : c.targetCol
    }))
  };
};

export const moveDisplayColumnsAndRewriteReferences = (activeReport, fromIndex, toIndex) => {
  const displayColumns = getReportDisplayColumns(activeReport);
  if (fromIndex < 0 || fromIndex >= displayColumns.length || toIndex < 0 || toIndex >= displayColumns.length || fromIndex === toIndex) return activeReport;
  const [movedColumn] = displayColumns.splice(fromIndex, 1);
  displayColumns.splice(toIndex, 0, movedColumn);

  const descriptionPosition = displayColumns.findIndex((column) => column.isDescription);
  if (movedColumn.isDescription) return { ...activeReport, descriptionPosition };

  const targetColumnIndex = displayColumns.filter((column) => !column.isDescription).findIndex((column) => column.id === movedColumn.id);
  const sourceColumnIndex = activeReport.columns.findIndex((column) => column.id === movedColumn.id);
  return {
    ...moveColumnsAndRewriteReferences(activeReport, sourceColumnIndex, targetColumnIndex),
    descriptionPosition,
  };
};

export const moveRowsAndRewriteReferences = (activeReport, idx, dir) => {
  const newRows = [...activeReport.rows];
  const targetIdx = Number.isInteger(dir) ? dir : (dir === 'up' ? idx - 1 : idx + 1);
  if (idx < 0 || idx >= newRows.length || targetIdx < 0 || targetIdx >= newRows.length || idx === targetIdx) return activeReport;
  const [movedRow] = newRows.splice(idx, 1);
  newRows.splice(targetIdx, 0, movedRow);
  const map = {};
  newRows.forEach((r, i) => {
    const oldI = activeReport.rows.findIndex(or => or.id === r.id);
    if (oldI !== i) map[`R${oldI + 1}`] = `R${i + 1}`;
  });
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return activeReport;
  const regex = new RegExp(`\\b(${keys.join('|')})\\b`, 'gi');
  return {
    ...activeReport,
    rows: newRows.map(r => ({
      ...r,
      formula: r.formula?.toUpperCase().replace(regex, m => map[m.toUpperCase()]),
      percentBase: r.percentBase?.toUpperCase().replace(regex, m => map[m.toUpperCase()])
    }))
  };
};

export const getReportDisplayColumns = (activeReport, columns = activeReport?.columns || []) => {
  const reportColumns = activeReport?.columns || [];
  const requestedPosition = Number(activeReport?.descriptionPosition);
  const descriptionPosition = Number.isInteger(requestedPosition)
    ? Math.min(reportColumns.length, Math.max(0, requestedPosition))
    : 0;
  const precedingIds = new Set(reportColumns.slice(0, descriptionPosition).map((column) => column.id));
  const visiblePosition = columns.filter((column) => precedingIds.has(column.id)).length;
  const displayColumns = [...columns];
  displayColumns.splice(visiblePosition, 0, { id: '__description__', label: 'Description', isDescription: true });
  return displayColumns;
};

export const buildExcelHtml = ({ activeReport, activeCols, displayCompanyLabel, displayDateLabel, displayPeriodLabel, reportData, themeColors }) => {
  const displayColumns = getReportDisplayColumns(activeReport, activeCols);
  let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>`;
  tableHtml += `<table border="1" cellpadding="5" cellspacing="0" style="font-family: Arial, sans-serif; font-size: 12px; border-collapse: collapse;">`;
  tableHtml += `<tr><td colspan="${displayColumns.length}" style="text-align:center; font-size: 16px; font-weight: bold; border:none;">${displayCompanyLabel}</td></tr>`;
  tableHtml += `<tr><td colspan="${displayColumns.length}" style="text-align:center; font-size: 14px; font-weight: bold; border:none;">${activeReport.name}</td></tr>`;
  tableHtml += `<tr><td colspan="${displayColumns.length}" style="text-align:center; font-size: 12px; border:none;">${displayDateLabel}</td></tr>`;
  tableHtml += `<tr><td colspan="${displayColumns.length}" style="text-align:center; font-size: 12px; border:none;">${displayPeriodLabel}</td></tr>`;
  tableHtml += `<tr><td colspan="${displayColumns.length}" style="border:none;"></td></tr>`;
  tableHtml += `<tr>`;
  displayColumns.forEach(col => {
    tableHtml += col.isDescription
      ? `<th style="background-color: ${themeColors.hexHeader}; color: white; text-align: left; padding: 8px;">Description</th>`
      : `<th style="background-color: ${themeColors.hexHeader}; color: white; padding: 8px; width: ${col.width || 100}px;">${col.label}</th>`;
  });
  tableHtml += `</tr>`;

  reportData.forEach(row => {
    let rowStyle = '';
    let fontStyle = '';
    if (row.isTotal) { rowStyle = `background-color: ${themeColors.hexTotal};`; fontStyle = 'font-weight: bold;'; }
    else if (row.isHeader) { rowStyle = `background-color: ${themeColors.hexSubHeader};`; fontStyle = 'font-weight: bold;'; }
    tableHtml += `<tr style="${rowStyle} ${fontStyle}">`;
    displayColumns.forEach(col => {
      if (col.isDescription) {
        const indentSpaces = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(row.indent || 0);
        tableHtml += `<td style="padding: 6px;">${indentSpaces}${row.desc}</td>`;
        return;
      }
      if (row.isHeader) {
        tableHtml += `<td></td>`;
      } else {
        const val = Number(row.results?.[col.id]) || 0;
        const isDisplayPercent = col.isPercent || col.formatAsPercent;
        const displayVal = isDisplayPercent
          ? (val < 0 ? `(${Math.abs(val).toFixed(2)}%)` : val.toFixed(2) + '%')
          : (val < 0 ? `(${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        const colorStyle = val < 0 ? 'color: red;' : '';
        tableHtml += `<td style="text-align: right; ${colorStyle}">${displayVal}</td>`;
      }
    });
    tableHtml += `</tr>`;
  });

  tableHtml += `</table></body></html>`;
  return tableHtml;
};
