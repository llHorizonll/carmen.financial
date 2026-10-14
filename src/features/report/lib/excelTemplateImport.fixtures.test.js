import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { configureExcelSheetImport, createReportsFromExcelSheets, parseExcelWorkbook } from "./excelTemplateImport.js";

const fixtureDirectory = path.resolve(
  "test-fixtures/excel-template-import",
);

const parseFixture = async (fileName) => {
  const bytes = await readFile(path.join(fixtureDirectory, fileName));
  return parseExcelWorkbook({
    name: fileName,
    arrayBuffer: async () =>
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ),
  });
};

const expectValidIndents = (workbook) => {
  const rows = workbook.sheets.flatMap((sheet) => sheet.detectedRows);
  expect(rows.some((row) => row.indent > 0)).toBe(true);
  expect(rows.every((row) => row.indent >= 0 && row.indent <= 7)).toBe(true);
  expect(
    workbook.sheets
      .filter((sheet) => sheet.isRecommended)
      .flatMap((sheet) => sheet.detectedColumns)
      .every((column) => !column.label.startsWith("Excel column")),
  ).toBe(true);
};

describe("Excel template import fixtures", () => {
  it("preserves daily revenue and F&B headers and column totals from the real workbook", async () => {
    const workbook = await parseFixture("Example - Daily Revenue Report (2).xlsx");
    const revenue = workbook.sheets.find(sheet => sheet.name === "DRR REVENUE");
    const food = workbook.sheets.find(sheet => sheet.name === "DAILY F&B");
    expect(revenue.detectedColumns.map(column => column.label)).toEqual(
      ["TODAY", "M-T-D", "Y-T-D"].flatMap(period =>
        ["Actual", "forecast", "Variance", "Last Year"].map(label => `${period}\n${label}`)),
    );
    expect(food.detectedColumns.map(column => column.label)).toEqual([
      ...["TODAY", "M-T-D"].flatMap(period =>
        ["BREAKFAST", "LUNCH", "DINNER", "SUPPER", "TOTAL", "BUDGET", "LAST YEAR"].map(label => `${period}\n${label}`)),
      "Y-T-D\nActual", "Y-T-D\nBudget", "Y-T-D\nLast Year",
    ]);
    expect(food.detectedColumns[4]).toMatchObject({ isFormula: true, formula: "C1+C2+C3+C4" });
    expect(food.detectedColumns[11]).toMatchObject({ isFormula: true, formula: "C8+C9+C10+C11" });
    expect(revenue.detectedRows.find(row => row.desc === "Total Room Revenue")).toMatchObject({ isTotal: true, isHeader: false, formula: "R2+R3+R4" });
    const configured = configureExcelSheetImport(food, { ...food.importConfig, reportStartColumn: "C", reportEndColumn: "R", dataStartRow: 8 });
    expect(configured.detectedColumns[3]).toMatchObject({ label: "TODAY\nTOTAL", isFormula: true, formula: "!REF!+C1+C2+C3" });
    expect(configured.detectedColumns[10]).toMatchObject({ label: "M-T-D\nTOTAL", isFormula: true, formula: "C7+C8+C9+C10" });
    const reports = createReportsFromExcelSheets(workbook, [food.name], { companyName: "Hotel", userIds: [], owner: "admin", idSeed: 1 });
    localStorage.setItem("imported-daily-food", JSON.stringify(reports));
    const restored = JSON.parse(localStorage.getItem("imported-daily-food"));
    expect(restored[0].columns[4]).toMatchObject({ label: "TODAY\nTOTAL", isFormula: true, formula: "C1+C2+C3+C4" });
    localStorage.removeItem("imported-daily-food");
  });
  it("parses the Homm workbook and skips non-report sheets", async () => {
    const workbook = await parseFixture(
      "Homm 34 - Financial Report_Master.xlsx",
    );
    const intro = workbook.sheets.find((sheet) => sheet.name === "Intro");
    const roomRows = workbook.sheets.find(
      (sheet) => sheet.name === "Sum Room",
    ).detectedRows;

    expect(workbook.sheets).toHaveLength(19);
    expect(workbook.sheets.filter((sheet) => sheet.isRecommended)).toHaveLength(
      15,
    );
    expect(intro).toMatchObject({
      rowCount: 25,
      columnCount: 7,
      isRecommended: false,
    });
    expect(roomRows.some((row) => row.desc === "Room Department")).toBe(false);
    expect(
      roomRows.slice(0, 5).map(({ desc, indent, isHeader }) => ({
        desc,
        indent,
        isHeader,
      })),
    ).toEqual([
      { desc: "REVENUE", indent: 0, isHeader: true },
      { desc: "ROOM REVENUE", indent: 1, isHeader: false },
      {
        desc: "SERVICECHARGE - ROOM REVENUE",
        indent: 1,
        isHeader: false,
      },
      { desc: "ROOM REVENUE - OTHER", indent: 1, isHeader: false },
      { desc: "ALLOWANCES", indent: 1, isHeader: false },
    ]);
    expect(
      workbook.sheets
        .find((sheet) => sheet.name === "Sum Room")
        .detectedColumns.map((column) => column.label),
    ).toEqual([
      "CURRENT MONTH\nLAST YEAR\nBHT",
      "CURRENT MONTH\nLAST YEAR\n%",
      "CURRENT MONTH\nVARIANCE\nBHT",
      "CURRENT MONTH\nVARIANCE\n%",
      "CURRENT MONTH\nBUDGET\nBHT",
      "CURRENT MONTH\nBUDGET\n%",
      "CURRENT MONTH\nACTUAL\nBHT",
      "CURRENT MONTH\nACTUAL\n%",
      "YEAR TO DATE\nACTUAL\nBHT",
      "YEAR TO DATE\nACTUAL\n%",
      "YEAR TO DATE\nBUDGET\nBHT",
      "YEAR TO DATE\nBUDGET\n%",
      "YEAR TO DATE\nVARIANCE\nBHT",
      "YEAR TO DATE\nVARIANCE\n%",
      "YEAR TO DATE\nLAST YEAR\nBHT",
      "YEAR TO DATE\nLAST YEAR\n%",
    ]);
    expectValidIndents(workbook);
  });

  it("parses the RKL workbook and skips its utility sheets", async () => {
    const workbook = await parseFixture(
      "07_FS_RKL_H_Master_Carmen_Cloud 13072026-update 3.xlsx",
    );

    expect(workbook.sheets).toHaveLength(35);
    expect(workbook.sheets.filter((sheet) => sheet.isRecommended)).toHaveLength(
      29,
    );
    expect(
      workbook.sheets
        .filter((sheet) => !sheet.isRecommended)
        .map((sheet) => sheet.name),
    ).toEqual(["GLAC", "Intro", "Cover", "Sheet2", "Sheet1", "AspenMacro"]);
    expect(
      workbook.sheets
        .find((sheet) => sheet.name === "SCH00A")
        .detectedColumns.map((column) => column.label),
    ).toEqual([
      "NET REVENUE",
      "COST",
      "COST\n%",
      "PAYROLL",
      "PAYROLL\n%",
      "OTHER EXPENSE",
      "OTHER EXPENSE\n%",
      "INCOME (LOSS)",
      "INCOME (LOSS)\n%",
    ]);
    expectValidIndents(workbook);
  });
});
