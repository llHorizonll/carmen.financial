import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExcelTemplateImportWizard from "./ExcelTemplateImportWizard.jsx";
import { parseExcelWorkbook } from "../lib/excelTemplateImport.js";

vi.mock("../lib/excelTemplateImport.js", () => ({
  configureExcelSheetImport: vi.fn((sheet) => sheet),
  createReportsFromExcelSheets: vi.fn(() => []),
  parseExcelWorkbook: vi.fn(),
}));

const importConfig = {
  dataStartRow: 1,
  dataEndRow: 10,
  reportStartColumn: "A",
  reportEndColumn: "C",
  descriptionColumn: "A",
  mappingHeaderRow: 1,
  deptMappingColumn: "B",
  accountMappingColumn: "C",
};

const createSheet = (overrides = {}) => ({
  name: "Report worksheet",
  rowCount: 10,
  columnCount: 3,
  isRecommended: true,
  detectedRows: [{ id: "R1" }],
  detectedColumns: [{ id: "C1" }],
  previewRows: ["Revenue", "Rooms", "Food and Beverage"],
  importConfig,
  autoImportConfig: importConfig,
  importIssues: { errors: [], warnings: [] },
  mappingPreviewRows: [],
  ...overrides,
});

describe("ExcelTemplateImportWizard", () => {
  it("shows actions only for worksheets that can be selected", async () => {
    parseExcelWorkbook.mockResolvedValue({
      fileName: "long-financial-report-name.xlsx",
      sheets: [
        createSheet(),
        createSheet({
          name: "Reference data",
          isRecommended: false,
          previewRows: [
            "A very long preview value that must not push row actions outside the worksheet list",
          ],
          importIssues: {
            errors: ["Select valid report coordinates."],
            warnings: [],
          },
        }),
      ],
    });

    render(
      <ExcelTemplateImportWizard
        companyName="Carmen"
        userIds={["admin"]}
        owner="admin"
        departments={[{ id: "110" }]}
        accountCodes={[{ id: "6000102" }]}
        onImportTemplates={vi.fn()}
        onOpenImportedReport={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Choose an Excel workbook"), {
      target: {
        files: [
          new File(["workbook"], "long-financial-report-name.xlsx", {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        ],
      },
    });

    await screen.findByText("Report worksheet");

    const actionGroups = document.querySelectorAll(
      '[data-slot="worksheet-actions"]',
    );
    expect(actionGroups).toHaveLength(1);
    expect(within(actionGroups[0]).getByText("Ready")).toBeVisible();
    expect(
      within(actionGroups[0]).getByRole("button", { name: "Configure" }),
    ).toBeVisible();
    expect(screen.queryByText("Check settings")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Configure" })).toHaveLength(1);

    await waitFor(() => expect(parseExcelWorkbook).toHaveBeenCalledTimes(1));
    expect(parseExcelWorkbook).toHaveBeenCalledWith(expect.any(File), {
      depts: [{ id: "110" }],
      accCodes: [{ id: "6000102" }],
      dimensions: [],
    });
  });
});
