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
