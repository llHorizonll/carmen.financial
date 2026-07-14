import { normalizeLookupCode, normalizeDeptLookupCode, normalizeAccLookupCode } from './normalizeCode.js';
export { normalizeLookupCode, normalizeDeptLookupCode, normalizeAccLookupCode } from './normalizeCode.js';

export const THEMES = {
  blue: {
    name: 'Classic Blue',
    header: 'bg-[#2D4A8C] text-white border-[#1e3263]',
    subHeader: 'bg-blue-100/40 text-blue-900 font-black',
    total: 'bg-blue-50 text-slate-900 font-black',
    rowHover: 'hover:bg-blue-50/50',
    borderColor: 'border-blue-100',
    cellBorder: 'border-blue-50',
    hexHeader: '#2D4A8C', hexSubHeader: '#dbeafe', hexTotal: '#eff6ff', hexCellBorder: '#eff6ff'
  },
  green: {
    name: 'Emerald Green',
    header: 'bg-emerald-700 text-white border-emerald-800',
    subHeader: 'bg-emerald-100/50 text-emerald-900 font-black',
    total: 'bg-emerald-50 text-slate-900 font-black',
    rowHover: 'hover:bg-emerald-50/50',
    borderColor: 'border-emerald-200',
    cellBorder: 'border-emerald-50',
    hexHeader: '#047857', hexSubHeader: '#d1fae5', hexTotal: '#ecfdf5', hexCellBorder: '#ecfdf5'
  },
  gray: {
    name: 'Slate Gray',
    header: 'bg-slate-700 text-white border-slate-800',
    subHeader: 'bg-slate-200/60 text-slate-900 font-black',
    total: 'bg-slate-100 text-slate-900 font-black',
    rowHover: 'hover:bg-slate-100/50',
    borderColor: 'border-slate-300',
    cellBorder: 'border-slate-100',
    hexHeader: '#334155', hexSubHeader: '#e2e8f0', hexTotal: '#f1f5f9', hexCellBorder: '#f1f5f9'
  }
};

export const INITIAL_MASTER_DATA = {
  companyProfile: { name: 'Carmen Hotel & Resorts' },
  users: [
    { id: 'admin', name: 'admin', role: 'Admin' }
  ],
  depts: [],
  deptGroups: [
    { id: 'ROOMS', name: 'Rooms Division', deptIds: ['101'] },
    { id: 'FOOD_BEVERAGE', name: 'Food & Beverage', deptIds: ['201', '202'] },
    { id: 'ADMIN', name: 'Administration', deptIds: ['301', '302'] },
  ],
  groups: { L1: [], L2: [], L3: [], L4: [] },
  accCodes: []
};

export const splitCSVRow = (text, delimiter = ',') => {
  const result = [];
  let start = 0;
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') inQuotes = !inQuotes;
    else if (text[i] === delimiter && !inQuotes) {
      result.push(text.substring(start, i));
      start = i + 1;
    }
  }
  result.push(text.substring(start));
  return result.map(s => s.replace(/^"|"$/g, '').trim());
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

export const detectDelimiter = (headerLine) => {
  if (headerLine.includes(';') && !headerLine.includes(',')) return ';';
  if (headerLine.includes('\t')) return '\t';
  return ',';
};

const normalizeHeaders = (headers) => headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

const buildCsvRowObject = (headers, normHeaders, values) => {
  const rowObj = {};
  headers.forEach((header, index) => {
    const val = values[index] !== undefined ? values[index] : '';
    rowObj[header] = val;
    rowObj[normHeaders[index]] = val;
  });
  return rowObj;
};

const normalizeImportedRow = (rowObj) => ({
  ...rowObj,
  year: rowObj.year || rowObj.yr || '',
  revision: rowObj.revision || rowObj.rev || '0',
  deptcode: rowObj.deptcode || rowObj.dept || rowObj.department || '',
  acccode: rowObj.acccode || rowObj.account || rowObj.accountcode || '',
  accname: rowObj.accnamee || rowObj.accnamet || rowObj.accname || rowObj.caption || '',
  acctype: rowObj.acctype || rowObj.accnature || rowObj.type || '',
});

const buildImportMasterData = ({ rowObj, newDeptsMap, newAccCodesMap, newGroups = { L1: new Map(), L2: new Map(), L3: new Map(), L4: new Map() }, defaultAccType = 'I' }) => {
  const rDept = normalizeDeptLookupCode(rowObj.deptcode);
  const rAcc = normalizeAccLookupCode(rowObj.acccode);
  const rAccName = rowObj.accname || rAcc;
  const rAccType = (rowObj.acctype || defaultAccType || 'I').toString().trim().toUpperCase();

  if (rDept) newDeptsMap.set(rDept, { id: rDept, name: `Dept ${rDept}` });
  if (rAcc) newAccCodesMap.set(rAcc, { id: rAcc, name: rAccName, type: rAccType });

  const g1 = rowObj.group1; if (g1) newGroups.L1.set(g1.toUpperCase(), { id: g1.toUpperCase(), name: g1 });
  const g2 = rowObj.group2; if (g2) newGroups.L2.set(g2.toUpperCase(), { id: g2.toUpperCase(), name: g2 });
  const g3 = rowObj.group3; if (g3) newGroups.L3.set(g3.toUpperCase(), { id: g3.toUpperCase(), name: g3 });
  const g4 = rowObj.group4; if (g4) newGroups.L4.set(g4.toUpperCase(), { id: g4.toUpperCase(), name: g4 });
};

export const parseGlCsvText = (text) => {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) {
    return { error: 'INVALID_FILE' };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCSVRow(lines[0], delimiter).map(h => h.replace(/^\uFEFF/, '').trim());
  const normHeaders = normalizeHeaders(headers);

  const parsedData = [];
  const newDeptsMap = new Map();
  const newAccCodesMap = new Map();
  const newGroups = { L1: new Map(), L2: new Map(), L3: new Map(), L4: new Map() };
  let detectedYear = null;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitCSVRow(lines[i], delimiter);
    const rowObj = normalizeImportedRow(buildCsvRowObject(headers, normHeaders, values));

    if (!detectedYear && rowObj.year && rowObj.year !== '\\N') detectedYear = rowObj.year;
    buildImportMasterData({ rowObj, newDeptsMap, newAccCodesMap, newGroups });

    parsedData.push(rowObj);
  }

  return { parsedData, newDeptsMap, newAccCodesMap, newGroups, detectedYear };
};

export const parseBudgetCsvText = (text) => {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) {
    return { error: 'INVALID_FILE' };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCSVRow(lines[0], delimiter).map(h => h.replace(/^\uFEFF/, '').trim());
  const normHeaders = normalizeHeaders(headers);

  const parsedData = [];
  const newDeptsMap = new Map();
  const newAccCodesMap = new Map();

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitCSVRow(lines[i], delimiter);
    const rowObj = normalizeImportedRow(buildCsvRowObject(headers, normHeaders, values));

    buildImportMasterData({
      rowObj: { ...rowObj, accname: rowObj.caption || rowObj.accname },
      newDeptsMap,
      newAccCodesMap,
      defaultAccType: 'I',
    });

    parsedData.push(rowObj);
  }

  return { parsedData, newDeptsMap, newAccCodesMap };
};

export const mergeAndSort = (oldArr, newMap) => {
  const combinedMap = new Map();
  oldArr.forEach(item => combinedMap.set(String(item.id).trim(), item));
  newMap.forEach((value, key) => combinedMap.set(String(key).trim(), value));
  return Array.from(combinedMap.values()).sort((a, b) =>
    String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' })
  );
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

const normalizeRowDimensions = (row) => {
  const dimensions = [];
  if (Array.isArray(row?.dimensions)) {
    row.dimensions.forEach((item) => {
      if (!item) return;
      const key = String(item.key || item.name || item.field || '').trim();
      const value = String(item.value || item.id || item.code || '').trim();
      if (key && value) dimensions.push({ key, value });
    });
  }

  ['dim1', 'dim2', 'dim3', 'dim4'].forEach((field) => {
    if (row?.[field]) {
      dimensions.push({ key: field, value: String(row[field]).trim() });
    }
  });

  return dimensions;
};

const matchesRowDimensions = (row, sourceRow) => {
  const rowDimensions = normalizeRowDimensions(row);
  if (rowDimensions.length === 0) return true;

  return rowDimensions.every(({ key, value }) => {
    if (!key || !value) return true;
    const sourceValue = String(sourceRow?.[key] || sourceRow?.[key.toLowerCase()] || sourceRow?.[key.toUpperCase()] || '').trim();
    return sourceValue === value;
  });
};

export const getIndentClass = (level) => level === 1 ? 'pl-8' : level === 2 ? 'pl-12' : level === 3 ? 'pl-16' : 'pl-4';

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

const buildRowMappingSignature = (row) => {
  if (!row) return '';

  const parts = [];
  const deptGroup = String(row.deptGroup || row.DeptGroup || '').trim().toUpperCase();
  const depts = row.dept ? String(row.dept).split(',').map(normalizeDeptLookupCode).filter(Boolean).sort() : [];
  const accs = row.accCodes ? String(row.accCodes).split(',').map(normalizeAccLookupCode).filter(Boolean).sort() : [];
  const grps = row.groups ? String(row.groups).split(',').map((value) => String(value).trim().toUpperCase()).filter(Boolean).sort() : [];
  const dimensions = normalizeRowDimensions(row)
    .map(({ key, value }) => `${String(key).trim().toLowerCase()}:${String(value).trim().toUpperCase()}`)
    .filter(Boolean)
    .sort();

  if (depts.length > 0) parts.push(`dept=${depts.join('|')}`);
  if (accs.length > 0) parts.push(`acc=${accs.join('|')}`);
  if (grps.length > 0) parts.push(`grp=${grps.join('|')}`);
  if (dimensions.length > 0) parts.push(`dim=${dimensions.join('|')}`);

  if (deptGroup) parts.push('deptGroup=' + deptGroup);

  const groupLevel = String(row.groupLevel || '').trim().toUpperCase();
  if (groupLevel) parts.push(`lvl=${groupLevel}`);

  return parts.join('::');
};

const getMasterListIds = (items) =>
  Array.isArray(items)
    ? items.map((item) => String(item?.id || item?.code || item?.DeptCode || item?.AccCode || '').trim()).filter(Boolean)
    : [];

export const getRowMappingWarnings = (row, allRows = [], masterData = null) => {
  const warnings = [];
  if (!row) return warnings;

  const hasDept = Boolean(String(row.dept || '').trim());
  const deptGroup = String(row.deptGroup || row.DeptGroup || '').trim().toUpperCase();
  const hasDeptGroup = Boolean(deptGroup);
  const hasAccCodes = Boolean(String(row.accCodes || '').trim());
  const hasGroups = Boolean(String(row.groups || '').trim());
  const groupLevel = String(row.groupLevel || 'L4').trim().toUpperCase();

  if (hasDept && hasAccCodes) warnings.push('Dept and account code are both set.');
  if (hasDept && hasDeptGroup) warnings.push('Department and department group are both set.');
  if (hasDept && hasGroups) warnings.push('Dept and group mapping are both set.');
  if (hasAccCodes && hasGroups) warnings.push('Account code and group mapping are both set.');
  if (groupLevel !== 'L4' && hasAccCodes) warnings.push('Grouped rows should not mix with explicit account codes.');

  const signature = buildRowMappingSignature(row);
  if (signature && Array.isArray(allRows)) {
    const duplicate = allRows.find((other) =>
      other
      && other.id !== row.id
      && !other.isHeader
      && !other.isTotal
      && buildRowMappingSignature(other) === signature
    );
    if (duplicate) {
      warnings.push('This mapping duplicates another data row and may double count.');
    }
  }

  const masterDeptIds = getMasterListIds(masterData?.depts);
  if (masterDeptIds.length > 0 && hasDept) {
    const invalidDepts = String(row.dept || '')
      .split(',')
      .map(normalizeDeptLookupCode)
      .filter(Boolean)
      .filter((dept) => !masterDeptIds.includes(dept));
    if (invalidDepts.length > 0) {
      warnings.push(`unknown department code(s): ${invalidDepts.join(', ')}.`);
    }
  }

  const masterAccIds = getMasterListIds(masterData?.accCodes);
  if (hasDeptGroup && Array.isArray(masterData?.deptGroups) && !masterData.deptGroups.some((group) => String(group?.id || '').trim().toUpperCase() === deptGroup)) {
    warnings.push('unknown department group: ' + deptGroup + '.');
  }

  if (masterAccIds.length > 0 && hasAccCodes) {
    const invalidAccs = String(row.accCodes || '')
      .split(',')
      .map(normalizeAccLookupCode)
      .filter(Boolean)
      .filter((acc) => !masterAccIds.includes(acc));
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
  const depts = deptGroupId
    ? (deptGroup?.deptIds || []).map(normalizeDeptLookupCode).filter(Boolean)
    : row.dept ? String(row.dept).split(',').map(normalizeDeptLookupCode).filter(Boolean) : [];
  const accs = row.accCodes ? String(row.accCodes).split(',').map(normalizeAccLookupCode).filter(Boolean) : [];
  const grps = row.groups ? String(row.groups).split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [];
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
  return { depts, accs, grps, dimensions, groupLevelKey, hasDeptMap: depts.length > 0, hasAccMap: accs.length > 0, hasGrpMap: grps.length > 0 };
};

const resolveAccType = (d, masterData, dAccCode) => {
  let dAccType = (d.acctype || d.accnature || d.type || '').toString().trim().toUpperCase();
  if (!dAccType && masterData?.accCodes) {
    const mAcc = masterData.accCodes.find(a => normalizeAccLookupCode(a.id) === dAccCode);
    if (mAcc) dAccType = (mAcc.type || '').toString().trim().toUpperCase();
  }
  return dAccType;
};

const matchesReportCategory = ({ reportCategories, dAccType, hasAccMap, dAccCode, accs }) => {
  if (reportCategories.includes('ALL')) return true;
  const isIncome = ['I', 'E', 'R', 'INC', 'EXP', 'REV', 'COS', 'PL'].some(t => dAccType === t || dAccType.startsWith(t));
  const isBalance = ['B', 'A', 'L', 'AST', 'LIA', 'EQU', 'CAP', 'BS'].some(t => dAccType === t || dAccType.startsWith(t));

  if (reportCategories.includes('I') && isIncome) return true;
  if (reportCategories.includes('B') && isBalance) return true;
  if (reportCategories.some(cat => dAccType === cat || dAccType.startsWith(cat))) return true;
  return !hasAccMap || accs.includes(dAccCode);
};

const sumActuals = ({ col, rowConfig, engineData, appliedDepts, appliedYear, appliedPeriod, appliedDay, periodOptions, reportCategories, masterData }) => {
  const { effYear, targetMonths } = resolveTime(col, appliedYear, appliedPeriod, periodOptions);
  const normalizedAppliedDepts = appliedDepts.map(normalizeDeptLookupCode).filter(Boolean);
  const type = String(col.type || '').trim().toUpperCase();
  const monthsToEvaluate = ['BUDACC', 'BCC'].includes(type) && col.periodMode === 'FY' ? [targetMonths[0]] : targetMonths;
  const targetDay = Number.parseInt(appliedDay, 10);
  let sum = 0;

  monthsToEvaluate.forEach(m => {
    engineData.forEach(d => {
      const dYear = (d.year || d.yr || '').toString().trim();
      if (dYear && dYear !== effYear) return;
      if (type === 'DAC' || type === 'PTD') {
        const dPeriod = Number.parseInt(d.period || d.month || d.period_no, 10);
        const dDay = Number.parseInt(d.day || d.Day || d.docDay || d.transactionDay || d.date_day || d.day_no, 10);
        if (Number.isInteger(dPeriod) && dPeriod !== m) return;
        if (Number.isInteger(targetDay)) {
          if (!Number.isInteger(dDay)) return;
          if (type === 'DAC' && dDay !== targetDay) return;
          if (type === 'PTD' && (dDay < 1 || dDay > targetDay)) return;
        }
      }

      const dDeptCode = normalizeDeptLookupCode(d.deptcode || d.dept || d.department || '');
      const dAccCode = normalizeAccLookupCode(d.acccode || d.account || d.accountcode || '');
      const dGroup = (d[rowConfig.groupLevelKey] || d.group || '').toString().trim().toUpperCase();

      if (normalizedAppliedDepts.length > 0 && !normalizedAppliedDepts.includes(dDeptCode)) return;
      if (rowConfig.hasDeptMap && !rowConfig.depts.includes(dDeptCode)) return;
      if (rowConfig.hasAccMap && !rowConfig.accs.includes(dAccCode)) return;
      if (rowConfig.hasGrpMap && !rowConfig.grps.includes(dGroup)) return;
      if (!matchesRowDimensions(rowConfig, d)) return;

      const dAccType = resolveAccType(d, masterData, dAccCode);
      if (!matchesReportCategory({ reportCategories, dAccType, hasAccMap: rowConfig.hasAccMap, dAccCode, accs: rowConfig.accs })) return;

      const amtM = d['amt' + m] !== undefined && d['amt' + m] !== '' ? d['amt' + m] : (d['amt0' + m] !== undefined && d['amt0' + m] !== '' ? d['amt0' + m] : 0);
      const bfAmtM = d['bfamt' + m] !== undefined && d['bfamt' + m] !== '' ? d['bfamt' + m] : (d['bfamt0' + m] !== undefined && d['bfamt0' + m] !== '' ? d['bfamt0' + m] : 0);

      const valueMode = getColumnValueMode(col.type);
      if (type === 'DAC' || type === 'PTD') {
        sum += parseAmount(d.amount ?? d.amt ?? d.val ?? amtM);
      } else if (valueMode === 'ac') sum += parseAmount(amtM);
      else if (valueMode === 'acc') sum += parseAmount(bfAmtM) + parseAmount(amtM);
    });
  });

  return sum;
};

const sumBudget = ({ col, rowConfig, budgetData, appliedDepts, appliedYear, appliedPeriod, appliedDay, appliedRevision, periodOptions, reportCategories, masterData }) => {
  const { effYear, targetMonths } = resolveTime(col, appliedYear, appliedPeriod, periodOptions);
  const normalizedAppliedDepts = appliedDepts.map(normalizeDeptLookupCode).filter(Boolean);
  const type = String(col.type || '').trim().toUpperCase();
  const monthsToEvaluate = ['BUDACC', 'BCC'].includes(type) && col.periodMode === 'FY' ? [targetMonths[0]] : targetMonths;
  const targetDay = Number.parseInt(appliedDay, 10);
  let sum = 0;

  monthsToEvaluate.forEach(m => {
    budgetData.forEach(d => {
      const dYear = (d.year || d.yr || '').toString().trim();
      if (dYear && dYear !== effYear) return;
      if (type === 'DACBG' || type === 'PTDBG') {
        const dPeriod = Number.parseInt(d.period || d.month || d.period_no, 10);
        const dDay = Number.parseInt(d.day || d.Day || d.docDay || d.transactionDay || d.date_day || d.day_no, 10);
        if (Number.isInteger(dPeriod) && dPeriod !== m) return;
        if (Number.isInteger(targetDay)) {
          if (!Number.isInteger(dDay)) return;
          if (type === 'DACBG' && dDay !== targetDay) return;
          if (type === 'PTDBG' && (dDay < 1 || dDay > targetDay)) return;
        }
      }

      const dRev = (d.revision || d.rev || '0').toString().trim();
      if (dRev !== appliedRevision) return;

      const dDeptCode = normalizeDeptLookupCode(d.deptcode || d.dept || d.department || '');
      const dAccCode = normalizeAccLookupCode(d.acccode || d.account || d.accountcode || '');
      const dGroup = (d[rowConfig.groupLevelKey] || d.group || '').toString().trim().toUpperCase();

      if (normalizedAppliedDepts.length > 0 && !normalizedAppliedDepts.includes(dDeptCode)) return;
      if (rowConfig.hasDeptMap && !rowConfig.depts.includes(dDeptCode)) return;
      if (rowConfig.hasAccMap && !rowConfig.accs.includes(dAccCode)) return;
      if (rowConfig.hasGrpMap && !rowConfig.grps.includes(dGroup)) return;
      if (!matchesRowDimensions(rowConfig, d)) return;

      const dAccType = resolveAccType(d, masterData, dAccCode);
      if (!matchesReportCategory({ reportCategories, dAccType, hasAccMap: rowConfig.hasAccMap, dAccCode, accs: rowConfig.accs })) return;

      const valueMode = getColumnValueMode(col.type);
      if (type === 'DACBG' || type === 'PTDBG') {
        const amtM = d['amt' + m] !== undefined && d['amt' + m] !== '' ? d['amt' + m] : (d['amt0' + m] !== undefined && d['amt0' + m] !== '' ? d['amt0' + m] : 0);
        sum += parseAmount(d.amount ?? d.amt ?? d.val ?? amtM);
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

  rows.filter(r => !r.isTotal && !r.isHeader).forEach((row) => {
    const rowConfig = filterEngineRows(row, masterData);

    if (rowConfig.depts.length === 0 && rowConfig.accs.length === 0 && rowConfig.grps.length === 0) {
      columns.forEach(col => rowRefMap[row.id][col.id] = 0);
      return;
    }

    columns.filter(c => !c.isFormula && !c.isPercent).forEach(col => {
        rowRefMap[row.id][col.id] = sumActuals({
          col,
          rowConfig,
          engineData,
          appliedDepts,
          appliedYear,
          appliedPeriod,
          appliedDay,
          periodOptions,
          reportCategories,
          masterData,
        });
      if (BUDGET_COLUMN_TYPES.has(String(col.type || '').trim().toUpperCase())) {
        rowRefMap[row.id][col.id] = sumBudget({
          col,
          rowConfig,
          budgetData,
          appliedDepts,
          appliedYear,
          appliedPeriod,
          appliedDay,
          appliedRevision,
          periodOptions,
          reportCategories,
          masterData,
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
  const swapIdx = dir === 'left' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= newCols.length) return activeReport;
  [newCols[idx], newCols[swapIdx]] = [newCols[swapIdx], newCols[idx]];
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

export const moveRowsAndRewriteReferences = (activeReport, idx, dir) => {
  const newRows = [...activeReport.rows];
  const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= newRows.length) return activeReport;
  [newRows[idx], newRows[swapIdx]] = [newRows[swapIdx], newRows[idx]];
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

export const buildExcelHtml = ({ activeReport, activeCols, displayCompanyLabel, displayDateLabel, displayPeriodLabel, reportData, themeColors }) => {
  let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>`;
  tableHtml += `<table border="1" cellpadding="5" cellspacing="0" style="font-family: Arial, sans-serif; font-size: 12px; border-collapse: collapse;">`;
  tableHtml += `<tr><td colspan="${activeCols.length + 1}" style="text-align:center; font-size: 16px; font-weight: bold; border:none;">${displayCompanyLabel}</td></tr>`;
  tableHtml += `<tr><td colspan="${activeCols.length + 1}" style="text-align:center; font-size: 14px; font-weight: bold; border:none;">${activeReport.name}</td></tr>`;
  tableHtml += `<tr><td colspan="${activeCols.length + 1}" style="text-align:center; font-size: 12px; border:none;">${displayDateLabel}</td></tr>`;
  tableHtml += `<tr><td colspan="${activeCols.length + 1}" style="text-align:center; font-size: 12px; border:none;">${displayPeriodLabel}</td></tr>`;
  tableHtml += `<tr><td colspan="${activeCols.length + 1}" style="border:none;"></td></tr>`;
  tableHtml += `<tr><th style="background-color: ${themeColors.hexHeader}; color: white; text-align: left; padding: 8px;">Description</th>`;
  activeCols.forEach(col => {
    tableHtml += `<th style="background-color: ${themeColors.hexHeader}; color: white; padding: 8px; width: ${col.width || 100}px;">${col.label}</th>`;
  });
  tableHtml += `</tr>`;

  reportData.forEach(row => {
    let rowStyle = '';
    let fontStyle = '';
    if (row.isTotal) { rowStyle = `background-color: ${themeColors.hexTotal};`; fontStyle = 'font-weight: bold;'; }
    else if (row.isHeader) { rowStyle = `background-color: ${themeColors.hexSubHeader};`; fontStyle = 'font-weight: bold;'; }
    tableHtml += `<tr style="${rowStyle} ${fontStyle}">`;
    const indentSpaces = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(row.indent || 0);
    tableHtml += `<td style="padding: 6px;">${indentSpaces}${row.desc}</td>`;
    activeCols.forEach(col => {
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
