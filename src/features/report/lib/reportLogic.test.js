import { describe, expect, it } from 'vitest';
import {
  THEMES,
  INITIAL_MASTER_DATA,
  splitCSVRow,
  parseAmount,
  detectDelimiter,
  parseGlCsvText,
  parseBudgetCsvText,
  mergeAndSort,
  formatAutoPeriod,
  resolveTime,
  getIndentClass,
  createBlankReport,
  createOcrReport,
  cloneReport,
  buildReportData,
  deleteRowAndRewriteReferences,
  deleteColAndRewriteReferences,
  moveColumnsAndRewriteReferences,
  moveRowsAndRewriteReferences,
  buildExcelHtml,
} from './reportLogic.js';

describe('reportLogic helpers', () => {
  it('parses CSV rows with quoted delimiters', () => {
    expect(splitCSVRow('A,"B,C",D')).toEqual(['A', 'B,C', 'D']);
  });

  it('detects delimiters and parses amounts', () => {
    expect(detectDelimiter('a;b;c')).toBe(';');
    expect(parseAmount('(1,234.50)')).toBe(-1234.5);
    expect(parseAmount('NULL')).toBe(0);
  });

  it('parses GL CSV text and captures master data updates', () => {
    const csv = [
      'year,deptcode,acccode,accname,accnature,group1,group2,group3,group4,amt1,bfamt1',
      '2025,101,4001,Rooms,I,FOOD,BEV,MAIN,DETAIL,100,25',
      '2025,102,4002,"Food, Beverage",B,FOOD,BEV,MAIN,DETAIL,(50),10',
    ].join('\n');

    const parsed = parseGlCsvText(csv);

    expect(parsed.error).toBeUndefined();
    expect(parsed.detectedYear).toBe('2025');
    expect(parsed.parsedData).toHaveLength(2);
    expect(parsed.parsedData[1].accname).toBe('Food, Beverage');
    expect(parsed.newDeptsMap.get('101')).toMatchObject({ id: '101', name: 'Dept 101' });
    expect(parsed.newAccCodesMap.get('4001')).toMatchObject({ id: '4001', name: 'Rooms', type: 'I' });
    expect(parsed.newAccCodesMap.get('4002')).toMatchObject({ id: '4002', name: 'Food, Beverage', type: 'B' });
    expect(parsed.newGroups.L4.get('DETAIL')).toMatchObject({ id: 'DETAIL', name: 'DETAIL' });
  });

  it('parses Budget CSV text and captures master data updates', () => {
    const csv = [
      'deptcode,acccode,caption,amt1,amt2',
      '101,5001,Budget Rooms,10,20',
      '102,5002,"Budget, F&B",30,40',
    ].join('\n');

    const parsed = parseBudgetCsvText(csv);

    expect(parsed.error).toBeUndefined();
    expect(parsed.parsedData).toHaveLength(2);
    expect(parsed.parsedData[1].caption).toBe('Budget, F&B');
    expect(parsed.newDeptsMap.get('102')).toMatchObject({ id: '102', name: 'Dept 102' });
    expect(parsed.newAccCodesMap.get('5002')).toMatchObject({ id: '5002', name: 'Budget, F&B', type: 'I' });
  });

  it('merges and sorts master data', () => {
    const merged = mergeAndSort(
      [{ id: 'B', name: 'B' }],
      new Map([
        ['A', { id: 'A', name: 'A' }],
        ['B', { id: 'B', name: 'Override' }],
      ])
    );
    expect(merged.map(item => item.id)).toEqual(['A', 'B']);
    expect(merged.find(item => item.id === 'B').name).toBe('Override');
  });

  it('formats auto periods and indent classes', () => {
    expect(formatAutoPeriod(2025, 2, 'year_month')).toBe('2025-02');
    expect(formatAutoPeriod(2025, 2, 'end_of_month')).toBe('February 28, 2025');
    expect(getIndentClass(3)).toBe('pl-16');
  });

  it('resolves column time windows', () => {
    expect(resolveTime({ yearMode: 'current', periodMode: 'current' }, '2025', '2')).toEqual({
      effYear: '2025',
      targetMonths: [2],
    });
    expect(resolveTime({ yearMode: '-1', periodMode: 'FY' }, '2025', '2')).toEqual({
      effYear: '2024',
      targetMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    });
  });

  it('creates clone, blank, and OCR starter reports', () => {
    const blank = createBlankReport('Carmen', ['u1'], 'rep-1');
    const cloned = cloneReport(blank, 'rep-2');
    const ocr = createOcrReport('scan.pdf', 'Carmen', ['u1'], 'rep-3');

    expect(blank.name).toBe('New Custom Report');
    expect(cloned.name).toBe('New Custom Report (Copy)');
    expect(ocr.name).toBe('Imported from scan.pdf');
    expect(blank.assignedUsers).toEqual(['u1']);
  });

  it('creates an OCR starter report scaffold with the expected defaults', () => {
    const userIds = ['u1', 'u2'];
    const ocr = createOcrReport('invoice.png', 'Carmen Hotel', userIds, 'rep-ocr-1');

    expect(ocr).toMatchObject({
      id: 'rep-ocr-1',
      name: 'Imported from invoice.png',
      companyName: 'Carmen Hotel',
      category: ['ALL'],
      assignedUsers: ['u1', 'u2'],
      isActive: true,
      periodFormat: 'standard',
      theme: 'blue',
    });
    expect(ocr.columns).toHaveLength(1);
    expect(ocr.columns[0]).toMatchObject({
      id: 'C1',
      label: 'Extracted Value',
      isActive: true,
      type: 'AC',
    });
    expect(ocr.rows).toHaveLength(2);
    expect(ocr.rows[0]).toMatchObject({ desc: 'Sales (OCR)', isHeader: false, isTotal: false });
    expect(ocr.rows[1]).toMatchObject({ desc: 'Cost (OCR)', isHeader: false, isTotal: false });
    expect(userIds).toEqual(['u1', 'u2']);
    expect(ocr.assignedUsers).not.toBe(userIds);
  });

  it('keeps theme and master data constants stable', () => {
    expect(THEMES.blue.name).toBe('Classic Blue');
    expect(INITIAL_MASTER_DATA.users).toHaveLength(3);
  });
});

describe('buildReportData', () => {
  const activeReport = {
    category: ['ALL'],
    rows: [
      {
        id: 'r1',
        desc: 'Revenue',
        isHeader: false,
        isTotal: false,
        dept: '101',
        groupLevel: 'L4',
        groups: 'FOO',
        accCodes: '4001',
        percentBase: '',
        formula: '',
        indent: 0,
      },
      {
        id: 'r2',
        desc: 'Total Revenue',
        isHeader: false,
        isTotal: true,
        dept: '',
        groupLevel: 'L4',
        groups: '',
        accCodes: '',
        percentBase: 'R1',
        formula: 'R1+R1',
        indent: 0,
      },
    ],
    columns: [
      { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
      { id: 'C2', label: 'Acc', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'ACC', width: '' },
      { id: 'C3', label: 'Budget', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'BUD', width: '' },
      { id: 'C4', label: 'Budget FY', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'FY', type: 'BUDACC', width: '' },
      { id: 'C5', label: 'Calc', isActive: true, isFormula: true, isPercent: false, formula: 'C1+C1', width: '' },
      { id: 'C6', label: '%', isActive: true, isFormula: false, isPercent: true, targetCol: 'C5', width: '80' },
    ],
  };

  const engineData = [
    { year: '2025', deptcode: '101', acccode: '4001', accnature: 'I', group4: 'FOO', amt2: '100', bfamt2: '50' },
  ];

  const budgetData = [
    { year: '2025', revision: '0', deptcode: '101', acccode: '4001', accnature: 'I', group4: 'FOO', amt1: '10', amt2: '20', amt3: '30' },
  ];

  const masterData = {
    ...INITIAL_MASTER_DATA,
    accCodes: [{ id: '4001', name: 'Rooms', type: 'I' }],
  };

  it('calculates raw, formula, and percent values', () => {
    const result = buildReportData({
      activeReport,
      engineData,
      budgetData,
      appliedDepts: [],
      appliedYear: '2025',
      appliedPeriod: '2',
      appliedRevision: '0',
      masterData,
    });

    expect(result[0].results.C1).toBe(100);
    expect(result[0].results.C2).toBe(150);
    expect(result[0].results.C3).toBe(20);
    expect(result[0].results.C4).toBe(60);
    expect(result[0].results.C5).toBe(200);
    expect(result[1].results.C1).toBe(200);
    expect(result[1].results.C5).toBe(400);
    expect(result[1].results.C6).toBe(200);
  });

  it('matches department lookups even when codes are zero-padded', () => {
    const paddedResult = buildReportData({
      activeReport,
      engineData: [{ year: '2025', deptcode: '0101', acccode: '4001', accnature: 'I', group4: 'FOO', amt2: '100', bfamt2: '50' }],
      budgetData: [{ year: '2025', revision: '0', deptcode: '0101', acccode: '4001', accnature: 'I', group4: 'FOO', amt1: '10', amt2: '20', amt3: '30' }],
      appliedDepts: ['101'],
      appliedYear: '2025',
      appliedPeriod: '2',
      appliedRevision: '0',
      masterData,
    });

    expect(paddedResult[0].results.C1).toBe(100);
    expect(paddedResult[0].results.C3).toBe(20);
  });

  it('matches account lookups even when GL account codes are zero-padded', () => {
    const paddedAccResult = buildReportData({
      activeReport,
      engineData: [{ year: '2025', deptcode: '101', acccode: '04001', accnature: 'I', group4: 'FOO', amt2: '100', bfamt2: '50' }],
      budgetData: [],
      appliedDepts: [],
      appliedYear: '2025',
      appliedPeriod: '2',
      appliedRevision: '0',
      masterData: {
        ...masterData,
        accCodes: [{ id: '4001', name: 'Rooms', type: 'I' }],
      },
    });

    expect(paddedAccResult[0].results.C1).toBe(100);
    expect(paddedAccResult[1].results.C1).toBe(200);
  });

  it('rewrites row and column references when deleting or moving', () => {
    const rowDelete = deleteRowAndRewriteReferences({
      rows: [
        { id: 'r1', formula: '' },
        { id: 'r2', formula: '' },
        { id: 'r3', formula: 'R1+R2', percentBase: 'R2' },
      ],
      columns: [],
    }, 'r2');
    expect(rowDelete.rows[1].formula).toContain('!REF!');
    expect(rowDelete.rows[1].percentBase).toContain('!REF!');

    const rowDeleteNoop = deleteRowAndRewriteReferences({
      rows: [
        { id: 'r1', formula: 'R1+R2', percentBase: 'R1' },
      ],
      columns: [],
    }, 'missing-row');
    expect(rowDeleteNoop.rows[0].formula).toBe('R1+R2');
    expect(rowDeleteNoop.rows[0].percentBase).toBe('R1');

    const colDelete = deleteColAndRewriteReferences({
      columns: [
        { id: 'C1', formula: '' },
        { id: 'C2', formula: '' },
        { id: 'C3', formula: 'C1+C2' },
      ],
      rows: [],
    }, 'C2');
    expect(colDelete.columns[1].formula).toContain('!REF!');

    const colDeleteNoop = deleteColAndRewriteReferences({
      columns: [{ id: 'C1', formula: 'C1+C1' }],
      rows: [],
    }, 'missing-col');
    expect(colDeleteNoop.columns[0].formula).toBe('C1+C1');

    const movedCols = moveColumnsAndRewriteReferences({
      columns: [
        { id: 'C1', formula: '' },
        { id: 'C2', formula: 'C1+C1', targetCol: 'C1' },
      ],
      rows: [],
    }, 0, 'right');
    expect(movedCols.columns[0].formula).toBe('C2+C2');
    expect(movedCols.columns[0].targetCol).toBe('C2');

    const moveColsNoop = moveColumnsAndRewriteReferences({
      columns: [{ id: 'C1', formula: 'C1' }],
      rows: [],
    }, 0, 'left');
    expect(moveColsNoop.columns[0].formula).toBe('C1');

    const movedRows = moveRowsAndRewriteReferences({
      rows: [
        { id: 'r1', formula: '' },
        { id: 'r2', formula: 'R1+R1', percentBase: 'R1' },
      ],
      columns: [],
    }, 1, 'up');
    expect(movedRows.rows[0].formula).toBe('R2+R2');
    expect(movedRows.rows[0].percentBase).toBe('R2');

    const moveRowsNoop = moveRowsAndRewriteReferences({
      rows: [{ id: 'r1', formula: 'R1', percentBase: 'R1' }],
      columns: [],
    }, 0, 'up');
    expect(moveRowsNoop.rows[0].formula).toBe('R1');
    expect(moveRowsNoop.rows[0].percentBase).toBe('R1');
  });

  it('builds excel html output', () => {
    const html = buildExcelHtml({
      activeReport: { name: 'Report' },
      activeCols: [{ id: 'C1', label: 'Actual', width: '' }],
      displayCompanyLabel: 'Carmen',
      displayDateLabel: 'As of Feb',
      displayPeriodLabel: 'P2',
      reportData: [{ desc: 'Revenue', indent: 0, results: { C1: 100 }, isHeader: false, isTotal: false }],
      themeColors: THEMES.blue,
    });
    expect(html).toContain('Carmen');
    expect(html).toContain('Actual');
    expect(html).toContain('Revenue');
  });
});

