import { describe, expect, it } from "vitest";
import {
  analyzeExcelSheet,
  createReportsFromExcelSheets,
} from "./excelTemplateImport.js";

describe("Excel template import", () => {
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
      [
        [],
        [, { s: { alignment: { indent: 3 } } }],
        [],
      ],
    );

    expect(sheet.detectedRows.map((row) => row.indent)).toEqual([3, 1]);
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
