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
  cloneReport,
  buildReportData,
  findBrokenReferences,
  findRowMappingConflicts,
  getRowMappingWarnings,
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
    expect(formatAutoPeriod(2025, 'Q1', 'year_month')).toBe('Q1 2025');
    expect(formatAutoPeriod(2025, '-1', 'year_month')).toBe('Previous Period (2025)');
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
    // Custom quarters and previous month
    expect(resolveTime({ yearMode: 'current', periodMode: 'current' }, '2025', 'Q1')).toEqual({
      effYear: '2025',
      targetMonths: [1, 2, 3],
    });
    expect(resolveTime({ yearMode: 'current', periodMode: 'current' }, '2025', 'Q4')).toEqual({
      effYear: '2025',
      targetMonths: [10, 11, 12],
    });
    expect(resolveTime({ yearMode: 'current', periodMode: 'current' }, '2025', '-1')).toEqual({
      effYear: '2025',
      targetMonths: [new Date().getMonth() === 0 ? 12 : new Date().getMonth()],
    });
  });

  it('resolves periods using fiscal metadata order when provided', () => {
    const periods = [
      { id: '10', periodNo: 10, dateLabel: 'Period 10' },
      { id: '20', periodNo: 20, dateLabel: 'Period 20' },
      { id: '30', periodNo: 30, dateLabel: 'Period 30' },
    ];

    expect(resolveTime({ yearMode: 'current', periodMode: 'current' }, '2026', '20', periods)).toEqual({
      effYear: '2026',
      targetMonths: [2],
    });

    expect(resolveTime({ yearMode: 'current', periodMode: '-1' }, '2026', '10', periods)).toEqual({
      effYear: '2025',
      targetMonths: [3],
    });
  });

  it('builds report data using fiscal metadata order for relative periods', () => {
    const result = buildReportData({
      activeReport: {
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
        ],
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: '-1', type: 'AC', width: '' },
        ],
      },
      engineData: [
        { year: '2025', deptcode: '101', acccode: '4001', accnature: 'I', group4: 'FOO', amt3: '30' },
      ],
      budgetData: [],
      appliedDepts: [],
      appliedYear: '2026',
      appliedPeriod: '10',
      appliedRevision: '0',
      periodOptions: [
        { id: '10', periodNo: 10, dateLabel: 'Period 10' },
        { id: '20', periodNo: 20, dateLabel: 'Period 20' },
        { id: '30', periodNo: 30, dateLabel: 'Period 30' },
      ],
      masterData: INITIAL_MASTER_DATA,
    });

    expect(result[0].results.C1).toBe(30);
  });

  it('creates and clones blank reports', () => {
    const blank = createBlankReport('Carmen', ['admin'], 'rep-1');
    const cloned = cloneReport(blank, 'rep-2');

    expect(blank.name).toBe('New Custom Report');
    expect(cloned.name).toBe('New Custom Report (Copy)');
    expect(blank.assignedUsers).toEqual(['admin']);
  });

  it('detects unresolved references before save', () => {
    expect(findBrokenReferences({
      rows: [{ id: 'r1', formula: 'R1+!REF!', percentBase: '' }],
      columns: [{ id: 'C1', formula: '', targetCol: '!REF!' }],
    })).toEqual([
      expect.objectContaining({ scope: 'row', id: 'r1', field: 'formula' }),
      expect.objectContaining({ scope: 'column', id: 'C1', field: 'targetCol' }),
    ]);
  });

  it('flags conflicting and duplicate row mappings before save', () => {
    const rows = [
      { id: 'r1', desc: 'Revenue', dept: '101', groups: 'FOOD', groupLevel: 'L4', accCodes: '', dim1: 'A', dim2: 'X' },
      { id: 'r2', desc: 'Duplicate Revenue', dept: '101', groups: 'FOOD', groupLevel: 'L4', accCodes: '', dim1: 'A', dim2: 'X' },
      { id: 'r3', desc: 'Mixed Mapping', dept: '102', groups: '', groupLevel: 'L2', accCodes: '4001', dim1: '', dim2: '' },
    ];

    expect(getRowMappingWarnings(rows[0], rows, {
      depts: [{ id: '101' }],
      accCodes: [{ id: '4001' }],
    })).toContain('This mapping duplicates another data row and may double count.');
    expect(getRowMappingWarnings(rows[2], rows, {
      depts: [{ id: '101' }, { id: '102' }],
      accCodes: [{ id: '5001' }],
    })).toEqual(expect.arrayContaining([
      'Dept and account code are both set.',
      'Grouped rows should not mix with explicit account codes.',
      'unknown account code(s): 4001.',
    ]));

    expect(findRowMappingConflicts({ rows }, {
      depts: [{ id: '101' }, { id: '102' }],
      accCodes: [{ id: '5001' }],
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ scope: 'row', id: 'r1', field: 'mapping' }),
      expect.objectContaining({ scope: 'row', id: 'r2', field: 'mapping' }),
      expect.objectContaining({ scope: 'row', id: 'r3', field: 'mapping' }),
    ]));
  });

  it('keeps theme and master data constants stable', () => {
    expect(THEMES.blue.name).toBe('Classic Blue');
    expect(INITIAL_MASTER_DATA.users).toHaveLength(1);
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

  it('recalculates when the applied department filter changes', () => {
    const unrestricted = buildReportData({
      activeReport: {
        category: ['ALL'],
        rows: [
          { id: 'r1', desc: 'Revenue', isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: '', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
        ],
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
        ],
      },
      engineData: [
        { year: '2025', deptcode: '101', acccode: '4001', accnature: 'I', group4: 'FOO', amt2: '100', bfamt2: '0' },
        { year: '2025', deptcode: '102', acccode: '4001', accnature: 'I', group4: 'FOO', amt2: '200', bfamt2: '0' },
      ],
      budgetData: [],
      appliedDepts: [],
      appliedYear: '2025',
      appliedPeriod: '2',
      appliedRevision: '0',
      masterData,
    });

    const filtered = buildReportData({
      activeReport: {
        category: ['ALL'],
        rows: [
          { id: 'r1', desc: 'Revenue', isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: '', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
        ],
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
        ],
      },
      engineData: [
        { year: '2025', deptcode: '101', acccode: '4001', accnature: 'I', group4: 'FOO', amt2: '100', bfamt2: '0' },
        { year: '2025', deptcode: '102', acccode: '4001', accnature: 'I', group4: 'FOO', amt2: '200', bfamt2: '0' },
      ],
      budgetData: [],
      appliedDepts: ['101'],
      appliedYear: '2025',
      appliedPeriod: '2',
      appliedRevision: '0',
      masterData,
    });

    expect(unrestricted[0].results.C1).toBe(300);
    expect(filtered[0].results.C1).toBe(100);
  });

  it('filters daily column types by day when provided', () => {
    const dailyResult = buildReportData({
      activeReport: {
        category: ['ALL'],
        rows: [
          { id: 'r1', desc: 'Daily Revenue', isHeader: false, isTotal: false, dept: '101', groupLevel: 'L4', groups: 'FOO', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
        ],
        columns: [
          { id: 'C1', label: 'Daily Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'DAC', width: '' },
        ],
      },
      engineData: [
        { year: '2025', day: '28', deptcode: '101', acccode: '4001', accnature: 'I', group4: 'FOO', amt2: '100', bfamt2: '50' },
        { year: '2025', day: '27', deptcode: '101', acccode: '4001', accnature: 'I', group4: 'FOO', amt2: '999', bfamt2: '0' },
      ],
      budgetData: [],
      appliedDepts: [],
      appliedYear: '2025',
      appliedPeriod: '2',
      appliedDay: '28',
      appliedRevision: '0',
      masterData,
    });

    expect(dailyResult[0].results.C1).toBe(100);
  });

  it('requires all row dimensions to match when they are defined', () => {
    const dimensionResult = buildReportData({
      activeReport: {
        category: ['ALL'],
        rows: [
          { id: 'r1', desc: 'Dim Revenue', isHeader: false, isTotal: false, dept: '101', groupLevel: 'L4', groups: 'FOO', accCodes: '4001', dim1: 'A', dim2: 'X', percentBase: '', formula: '', indent: 0 },
        ],
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
        ],
      },
      engineData: [
        { year: '2025', deptcode: '101', acccode: '4001', accnature: 'I', group4: 'FOO', dim1: 'A', dim2: 'X', amt2: '100', bfamt2: '50' },
        { year: '2025', deptcode: '101', acccode: '4001', accnature: 'I', group4: 'FOO', dim1: 'A', dim2: 'Y', amt2: '999', bfamt2: '0' },
      ],
      budgetData: [],
      appliedDepts: [],
      appliedYear: '2025',
      appliedPeriod: '2',
      appliedRevision: '0',
      masterData,
    });

    expect(dimensionResult[0].results.C1).toBe(100);
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
        { id: 'C3', formula: 'C1+C2', targetCol: 'C2' },
      ],
      rows: [],
    }, 'C2');
    expect(colDelete.columns[1].formula).toContain('!REF!');
    expect(colDelete.columns[1].targetCol).toContain('!REF!');

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

  it('calculates daily actual and budget windows and supports BC/BCC aliases', () => {
    const result = buildReportData({
      activeReport: {
        category: ['ALL'],
        rows: [{ id: 'r1', desc: 'Daily', dept: '101', deptGroup: '', accCodes: '4001', groupLevel: 'L4', groups: '', isHeader: false, isTotal: false }],
        columns: [
          { id: 'C1', type: 'DAC', yearMode: 'current', periodMode: 'current' },
          { id: 'C2', type: 'PTD', yearMode: 'current', periodMode: 'current' },
          { id: 'C3', type: 'DACBG', yearMode: 'current', periodMode: 'current' },
          { id: 'C4', type: 'PTDBG', yearMode: 'current', periodMode: 'current' },
          { id: 'C5', type: 'BC', yearMode: 'current', periodMode: 'current' },
          { id: 'C6', type: 'BCC', yearMode: 'current', periodMode: 'current' },
        ],
      },
      engineData: [
        { year: '2025', period: '2', day: '1', deptcode: '101', acccode: '4001', amount: '10', amt2: '10' },
        { year: '2025', period: '2', day: '2', deptcode: '101', acccode: '4001', amount: '20', amt2: '20' },
      ],
      budgetData: [
        { year: '2025', revision: '0', period: '2', day: '1', deptcode: '101', acccode: '4001', amount: '3', amt1: '1', amt2: '3' },
        { year: '2025', revision: '0', period: '2', day: '2', deptcode: '101', acccode: '4001', amount: '4', amt1: '2', amt2: '4' },
      ],
      appliedDepts: [],
      appliedYear: '2025',
      appliedPeriod: '2',
      appliedDay: '2',
      appliedRevision: '0',
      masterData,
    });

    expect(result[0].results).toMatchObject({
      C1: 20,
      C2: 30,
      C3: 4,
      C4: 7,
      C5: 7,
      C6: 10,
    });
  });

  it('expands mock department groups into department filters', () => {
    const result = buildReportData({
      activeReport: {
        category: ['ALL'],
        rows: [{ id: 'r1', dept: '', deptGroup: 'ROOMS', accCodes: '4001', groupLevel: 'L4', groups: '' }],
        columns: [{ id: 'C1', type: 'AC', yearMode: 'current', periodMode: 'current' }],
      },
      engineData: [
        { year: '2025', deptcode: '101', acccode: '4001', amt2: '10' },
        { year: '2025', deptcode: '201', acccode: '4001', amt2: '90' },
      ],
      budgetData: [],
      appliedDepts: [],
      appliedYear: '2025',
      appliedPeriod: '2',
      appliedRevision: '0',
      masterData,
    });

    expect(result[0].results.C1).toBe(10);
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

