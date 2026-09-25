import { describe, expect, it } from "vitest";
import {
  analyzeExcelSheet,
  configureExcelSheetImport,
  createReportsFromExcelSheets,
  excelColumnToIndex,
  excelIndexToColumn,
  resolveDimensionMapping,
  resolveLinkedMappingValue,
} from "./excelTemplateImport.js";

describe("Excel template import", () => {
  it("classifies imported reports from data column types", () => {
    const columnSets = [
      [{ type: "DAC" }, { type: "DACBG" }, { type: "PTDBG" }, { type: "YTDBG" }],
      [{ type: "AC" }, { type: "BC" }, { type: "BCC" }],
      [{ type: "DAC" }, { type: "AC" }, { type: "CALC", isFormula: true }],
    ];
    const sheets = columnSets.map((detectedColumns, index) => ({
      name: `Sheet ${index + 1}`,
      isRecommended: true,
      detectedColumns,
      detectedRows: [],
    }));
    const reports = createReportsFromExcelSheets(
      { fileName: "Example.xlsx", sheets },
      sheets.map((sheet) => sheet.name),
      { companyName: "Hotel", userIds: [], owner: "admin", idSeed: 1 },
    );

    expect(reports.map((report) => report.reportType)).toEqual(["Daily", "Monthly", "Mixed"]);
  });

  it("converts Excel column references in both directions", () => {
    expect(excelColumnToIndex("A")).toBe(0);
    expect(excelColumnToIndex("BZ")).toBe(77);
    expect(excelIndexToColumn(78)).toBe("CA");
    expect(excelColumnToIndex("A1")).toBe(-1);
  });

  it("expands numeric mapping ranges using only codes present in master data", () => {
    const resolved = resolveLinkedMappingValue(
      "6000102-6000106, 6000500",
      [
        { id: "6000102" },
        { id: "6000104" },
        { id: "6000106" },
        { id: "7000000" },
      ],
    );

    expect(resolved.value).toBe("6000102, 6000104, 6000106");
    expect(resolved.rangeMatches).toEqual([
      { token: "6000102-6000106", count: 3 },
    ]);
    expect(resolved.invalidTokens).toEqual(["6000500"]);
  });

  it("maps a template dimension by API Caption and compatible Operator", () => {
    expect(resolveDimensionMapping(
      { fieldName: "Market Segment", operator: "in", value: "FIT, OTA" },
      [{ key: "dim1", caption: "Market Segment", values: ["FIT", "WHO", "OTA"] }],
    )).toEqual({ fieldKey: "dim1", value: "FIT, OTA", warning: "" });

    expect(resolveDimensionMapping(
      { fieldName: "Market Segment", operator: "not in", value: "WHO" },
      [{ key: "dim1", caption: "Market Segment", values: ["FIT", "WHO", "OTA"] }],
    )).toEqual(expect.objectContaining({
      fieldKey: "",
      value: "",
      warning: expect.stringMatching(/unsupported dimension operator/i),
    }));
  });

  it("imports Dimension Value into the slot whose API Caption matches Field Name", () => {
    const sheet = analyzeExcelSheet(
      "ROOM",
      [
        ["Actual", "Budget", "Description", "Field Name", "Operator", "Value"],
        [100, 90, "Rooms FIT", "Market Segment", "in", "FIT"],
        [50, 45, "Rooms OTA", "Market Segment", "=", "OTA"],
      ],
      [],
      new Map(),
      {},
      {
        dimensions: [
          { key: "dim1", caption: "Market Segment", values: ["FIT", "WHO", "OTA"] },
          { key: "dim2", caption: "Meal Period", values: ["Breakfast", "Dinner"] },
        ],
      },
    );

    expect(sheet.detectedRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ desc: "Rooms FIT", dim1: "FIT" }),
      expect.objectContaining({ desc: "Rooms OTA", dim1: "OTA" }),
    ]));
  });

  it("detects a description column and creates a safe report template", () => {
    const sheet = analyzeExcelSheet("P&L", [
      ["Actual", "%", "Description"],
      [100, 0.5, "REVENUE"],
      [60, 0.3, "  Rooms"],
      [40, 0.2, "  Food & Beverage"],
    ]);

    expect(sheet.descriptionColumn).toBe(2);
    expect(sheet.detectedRows.map((row) => row.desc)).toEqual([
      "REVENUE",
      "Rooms",
      "Food & Beverage",
    ]);
    expect(sheet.detectedRows.map((row) => row.indent)).toEqual([0, 1, 1]);
    expect(sheet.detectedColumns).toHaveLength(2);

    const [report] = createReportsFromExcelSheets(
      { fileName: "Master.xlsx", sheets: [sheet] },
      ["P&L"],
      {
        companyName: "Carmen",
        userIds: ["admin"],
        owner: "admin",
        idSeed: 1,
      },
    );

    expect(report.id).toBe("rep-excel-1-1");
    expect(report.sourceWorkbook).toBe("Master");
    expect(report.rows.every((row) => row.isTotal === false)).toBe(true);
  });

  it("prefers Excel cell indentation over leading-space fallback", () => {
    const sheet = analyzeExcelSheet(
      "P&L",
      [
        ["Actual", "Description"],
        [100, "Revenue"],
        [50, "     Rooms"],
      ],
      [[], [, { s: { alignment: { indent: 3 } } }], []],
    );

    expect(sheet.detectedRows.map((row) => row.indent)).toEqual([3, 1]);
  });

  it("imports linked department and account codes into row mappings", () => {
    const sheet = analyzeExcelSheet(
      "PL-PARESA",
      [
        [
          "Actual",
          "Budget",
          "Description",
          "Dept Code (Linked)",
          "Account Code (Linked)",
        ],
        [100, 90, "Rooms", "110, 120", "4100001, 4100100"],
        [50, 45, "Food & Beverage", 201, 4210000],
        [25, 20, "Other Income", "-", "#N/A"],
      ],
      [],
      new Map([["1:2", { bold: true }]]),
    );

    expect(sheet.detectedColumns).toHaveLength(2);
    expect(
      sheet.detectedRows.map(({ desc, dept, accCodes }) => ({
        desc,
        dept,
        accCodes,
      })),
    ).toEqual([
      {
        desc: "Rooms",
        dept: "110, 120",
        accCodes: "4100001, 4100100",
      },
      { desc: "Food & Beverage", dept: "201", accCodes: "4210000" },
      { desc: "Other Income", dept: "", accCodes: "" },
    ]);

    const [report] = createReportsFromExcelSheets(
      { fileName: "Paresa.xlsm", sheets: [sheet] },
      ["PL-PARESA"],
      {
        companyName: "Paresa Resort",
        userIds: ["admin"],
        owner: "admin",
        idSeed: 2,
      },
    );
    expect(report.rows[0]).toMatchObject({
      desc: "Rooms",
      dept: "110, 120",
      accCodes: "4100001, 4100100",
      isHeader: false,
    });
  });

  it("keeps bordered revenue rows as details and reads legacy mapping blocks", () => {
    const matrix = [
      ["Description", "Actual", "Budget", "From", "To", "Dept 1", "Dept 2"],
      ["Room Revenue", "", "", "", "", "", ""],
      ["Revenue rooms", "10,000.00", "9,000.00", "411010", "", "101", ""],
      ["Other rooms", "0.00", "0.00", "411020", "411030", "102", ""],
    ];
    const styles = new Map([
      ["1:0", { bold: true, top: true, bottom: true }],
      ["2:0", { bottom: true }],
      ["3:0", { top: true, bottom: true }],
    ]);
    const sheet = analyzeExcelSheet("DRR REVENUE", matrix, [], styles, {}, {
      depts: [{ id: "101" }, { id: "102" }],
      accCodes: [{ id: "411010" }, { id: "411020" }, { id: "411025" }, { id: "411030" }],
    });

    expect(sheet.detectedRows.map(({ desc, isHeader, dept, accCodes }) => ({ desc, isHeader, dept, accCodes }))).toEqual([
      { desc: "Room Revenue", isHeader: true, dept: "", accCodes: "" },
      { desc: "Revenue rooms", isHeader: false, dept: "101", accCodes: "411010" },
      { desc: "Other rooms", isHeader: false, dept: "102", accCodes: "411020, 411025, 411030" },
    ]);
  });

  it("ignores a description heading left of the detail labels", () => {
    const sheet = analyzeExcelSheet("DRR RO BY MARKET SEGMENT", [
      ["Description", "", "Actual", "Budget"],
      ["", "Consumer Direct", "0.00", "0.00"],
      ["", "Contract", "0.00", "0.00"],
    ]);
    expect(sheet.detectedRows.map((row) => row.desc)).toEqual(["Consumer Direct", "Contract"]);
    expect(sheet.detectedRows.every((row) => !row.isHeader)).toBe(true);
  });

  it("uses bold text for DAILY F&B headers while keeping bordered regular rows as details", () => {
    const sheet = analyzeExcelSheet("DAILY F&B", [
      ["Description", "Actual", "Budget"],
      ["DINNING ROOM", "", ""],
      ["Food Revenue", "0.00", "0.00"],
      ["Total", "0.00", "0.00"],
    ], [], new Map([
      ["1:0", { bold: true, bottom: true }],
      ["2:0", { bold: false, bottom: true }],
      ["3:0", { bold: true, bottom: true }],
    ]));
    expect(sheet.detectedRows.map(({ desc, isHeader }) => ({ desc, isHeader }))).toEqual([
      { desc: "DINNING ROOM", isHeader: true },
      { desc: "Food Revenue", isHeader: false },
      { desc: "Total", isHeader: true },
    ]);
  });

  it("imports Variance columns as formulas using their Excel column references", () => {
    const matrix = [
      ["Description", "Actual", "Forecast", "Variance", "Last Year", "Actual", "Forecast", "Variance"],
      ["Revenue", "100", "90", "10", "80", "200", "180", "20"],
      ["Other", "50", "45", "5", "40", "70", "60", "10"],
    ];
    const cells = [[], [null, null, null, { f: "B2-C2" }, null, null, null, { f: "G2-F2" }]];
    const sheet = analyzeExcelSheet("Revenue", matrix, cells, new Map(), { descriptionColumn: "A" });

    expect(sheet.detectedColumns[2]).toMatchObject({ id: "C3", label: "Variance", isFormula: true, formula: "C1-C2" });
    expect(sheet.detectedColumns[6]).toMatchObject({ id: "C7", label: "Variance", isFormula: true, formula: "C6-C5" });
  });

  it("uses Carmen formulas in DDR Revenue cells for daily actual and forecast columns", () => {
    const matrix = [
      ["Description", "", "TODAY", "", "", "", "M-T-D", ""],
      ["", "", "Actual", "forecast", "Variance", "Last Year", "Actual", "forecast"],
      ["Revenue rooms", "", "100", "90", "10", "80", "200", "180"],
      ["Other rooms", "", "50", "45", "5", "40", "70", "60"],
    ];
    const formulas = ["DAC", "DACBG", null, "DAC", "PTD", "PTDBG"];
    const cells = matrix.map(() => []);
    formulas.forEach((type, index) => {
      if (!type) return;
      const sourceIndex = index + 2;
      cells[2][sourceIndex] = { f: `_xll.${type}(DB,ArrayDPT(),ArrayCOA(),YR,PRD,DT)` };
    });
    cells[2][5].f = "_xll.DAC(DB,ArrayDPT(),ArrayCOA(),YR-1,PRD,DT)";
    cells[2][4] = { f: "C3-D3" };

    const sheet = analyzeExcelSheet("DRR REVENUE", matrix, cells, new Map(), {
      descriptionColumn: "A", reportStartColumn: "C", reportEndColumn: "H",
    });

    expect(sheet.detectedColumns.map(({ type, formula, yearMode }) => ({ type, formula, yearMode }))).toEqual([
      { type: "DAC", formula: undefined, yearMode: "current" },
      { type: "DACBG", formula: undefined, yearMode: "current" },
      { type: undefined, formula: "C1-C2", yearMode: undefined },
      { type: "DAC", formula: undefined, yearMode: "-1" },
      { type: "PTD", formula: undefined, yearMode: "current" },
      { type: "PTDBG", formula: undefined, yearMode: "current" },
    ]);
  });

  it("imports day-aware YTD and YTDBG formulas from the workbook", () => {
    const sheet = analyzeExcelSheet("DRR REVENUE", [
      ["Description", "Y-T-D Actual", "Y-T-D forecast"],
      ["Rooms", "30", "20"],
      ["Food", "40", "25"],
    ], [[], [null, { f: "_xll.YTD(DB,ArrayDPT(),ArrayCOA(),YR,PRD,DT)" },
      { f: "_xll.YTDBG(DB,ArrayDPT(),ArrayCOA(),YR,PRD,DT,0)" }]], new Map(), {
      descriptionColumn: "A", reportStartColumn: "B", reportEndColumn: "C",
    });

    expect(sheet.detectedColumns.map(({ type }) => type)).toEqual(["YTD", "YTDBG"]);
  });

  it("validates linked ranges and direct codes before creating a template", () => {
    const sheet = analyzeExcelSheet(
      "PL-RANGES",
      [
        [
          "Actual",
          "Budget",
          "Description",
          "Dept Code (Linked)",
          "Account Code (Linked)",
        ],
        [100, 90, "Rooms", "100-103", "6000102-6000106, 6000500"],
        [50, 45, "F&B", "201", "7000000"],
      ],
      [],
      new Map(),
      {
        reportStartColumn: "A",
        reportEndColumn: "B",
        descriptionColumn: "C",
        mappingHeaderRow: 1,
        deptMappingColumn: "D",
        accountMappingColumn: "E",
      },
      {
        depts: [{ id: "100" }, { id: "102" }, { id: "201" }],
        accCodes: [
          { id: "6000102" },
          { id: "6000104" },
          { id: "6000106" },
          { id: "7000000" },
        ],
      },
    );

    expect(sheet.detectedRows[0]).toMatchObject({
      dept: "100, 102",
      accCodes: "6000102, 6000104, 6000106",
    });
    expect(sheet.mappingChecks).toContain(
      "Row 2 (Rooms): Account range 6000102-6000106 matched 3 system codes.",
    );
    expect(sheet.importIssues.warnings).toContain(
      "Row 2 (Rooms): ignored account mapping values not found in the system: 6000500.",
    );
  });

  it("blocks linked mapping import when system master data is unavailable", () => {
    const sheet = analyzeExcelSheet(
      "PL-NO-MASTER",
      [
        [
          "Actual",
          "Budget",
          "Description",
          "Dept Code (Linked)",
          "Account Code (Linked)",
        ],
        [100, 90, "Rooms", "100-103", "6000102-6000106"],
        [50, 45, "F&B", "201", "7000000"],
      ],
      [],
      new Map(),
      {
        reportStartColumn: "A",
        reportEndColumn: "B",
        descriptionColumn: "C",
        mappingHeaderRow: 1,
        deptMappingColumn: "D",
        accountMappingColumn: "E",
      },
      { depts: [], accCodes: [] },
    );

    expect(sheet.isRecommended).toBe(false);
    expect(sheet.importIssues.errors).toEqual(
      expect.arrayContaining([
        "Department master data is unavailable. Linked department mappings cannot be verified.",
        "Account master data is unavailable. Linked account mappings cannot be verified.",
      ]),
    );
  });

  it("re-analyzes a worksheet with explicit data and mapping coordinates", () => {
    const matrix = [
      ["Cover", "", "", "Do not import"],
      ["", "", "", "", "", "Dept Code (Linked)", "Account Code (Linked)"],
      ["Actual", "Budget", "", "Description"],
      [100, 90, "", "Rooms", "", "110, 120", "4100001, 4100100"],
      [50, 45, "", "F&B", "", 201, 4210000],
      ["Footer", "", "", "Do not import"],
    ];
    const source = { matrix, cellMatrix: [], cellStyles: new Map() };
    const detected = analyzeExcelSheet("PL", matrix);
    const configured = configureExcelSheetImport(
      { ...detected, source, autoImportConfig: detected.importConfig },
      {
        dataStartRow: 4,
        dataEndRow: 5,
        reportStartColumn: "A",
        reportEndColumn: "B",
        descriptionColumn: "D",
        mappingHeaderRow: 2,
        deptMappingColumn: "F",
        accountMappingColumn: "G",
      },
    );

    expect(configured.isRecommended).toBe(true);
    expect(configured.detectedRows).toHaveLength(2);
    expect(configured.detectedColumns).toHaveLength(2);
    expect(configured.mappingPreviewRows[0]).toEqual({
      rowNumber: 4,
      description: "Rooms",
      dept: "110, 120",
      accCodes: "4100001, 4100100",
    });
    expect(configured.importIssues).toEqual({ errors: [], warnings: [] });
  });

  it("reports invalid advanced import ranges", () => {
    const matrix = [
      ["Actual", "Budget", "Description"],
      [100, 90, "Rooms"],
      [50, 45, "F&B"],
    ];
    const source = { matrix, cellMatrix: [], cellStyles: new Map() };
    const detected = analyzeExcelSheet("PL", matrix);
    const configured = configureExcelSheetImport(
      { ...detected, source },
      {
        ...detected.importConfig,
        dataStartRow: 5,
        dataEndRow: 2,
      },
    );

    expect(configured.isRecommended).toBe(false);
    expect(configured.importIssues.errors).toContain(
      "Data start row cannot be after data end row.",
    );
  });

  it("stops report columns before a labeled mapping area", () => {
    const sheet = analyzeExcelSheet(
      "PL",
      [
        ["Actual", "Budget", "Description", "", "", "Mapping Area"],
        [100, 90, "Rooms", "", "", 110],
        [50, 45, "F&B", "", "", 201],
      ],
      [],
      new Map(),
      { descriptionColumn: "C" },
    );

    expect(sheet.detectedColumns).toHaveLength(2);
    expect(sheet.importConfig).toMatchObject({
      reportStartColumn: "A",
      reportEndColumn: "B",
      descriptionColumn: "C",
    });
  });

  it("does not recommend an intro sheet with formatted blank ranges", () => {
    const introRows = Array.from({ length: 1000 }, () => Array(30).fill(""));
    introRows[17][6] = "Day";
    introRows[18][6] = "Period";
    introRows[18][7] = "1";
    introRows[19][6] = "Year";
    introRows[19][7] = "2026";
    introRows[25][2] = "Balance Sheet";
    introRows[26][2] = "Profit & Loss Statement";

    const sheet = analyzeExcelSheet("Intro", introRows);

    expect(sheet.rowCount).toBe(5);
    expect(sheet.columnCount).toBe(3);
    expect(sheet.isRecommended).toBe(false);

    expect(
      createReportsFromExcelSheets(
        { fileName: "Master.xlsx", sheets: [sheet] },
        ["Intro"],
        {
          companyName: "Carmen",
          userIds: ["admin"],
          owner: "admin",
          idSeed: 1,
        },
      ),
    ).toEqual([]);
  });
});
