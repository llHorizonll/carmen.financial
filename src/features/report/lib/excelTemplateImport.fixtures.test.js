import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseExcelWorkbook } from "./excelTemplateImport.js";

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
      "CURRENT MONTH · LAST YEAR · BHT",
      "CURRENT MONTH · LAST YEAR · %",
      "CURRENT MONTH · VARIANCE · BHT",
      "CURRENT MONTH · VARIANCE · %",
      "CURRENT MONTH · BUDGET · BHT",
      "CURRENT MONTH · BUDGET · %",
      "CURRENT MONTH · ACTUAL · BHT",
      "CURRENT MONTH · ACTUAL · %",
      "YEAR TO DATE · ACTUAL · BHT",
      "YEAR TO DATE · ACTUAL · %",
      "YEAR TO DATE · BUDGET · BHT",
      "YEAR TO DATE · BUDGET · %",
      "YEAR TO DATE · VARIANCE · BHT",
      "YEAR TO DATE · VARIANCE · %",
      "YEAR TO DATE · LAST YEAR · BHT",
      "YEAR TO DATE · LAST YEAR · %",
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
      "COST · %",
      "PAYROLL",
      "PAYROLL · %",
      "OTHER EXPENSE",
      "OTHER EXPENSE · %",
      "INCOME (LOSS)",
      "INCOME (LOSS) · %",
    ]);
    expectValidIndents(workbook);
  });
});
