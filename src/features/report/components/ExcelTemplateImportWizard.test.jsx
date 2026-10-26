import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExcelTemplateImportWizard from "./ExcelTemplateImportWizard.jsx";
import { createReportsFromExcelSheets, parseExcelWorkbook } from "../lib/excelTemplateImport.js";

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
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("opens its guide from the single shell help request", () => {
    window.localStorage.setItem(
      "test-guide:import:upload",
      "done",
    );
    const guideRef = React.createRef();

    render(
      <ExcelTemplateImportWizard
        ref={guideRef}
        companyName="Carmen"
        userIds={["admin"]}
        owner="admin"
        guideStoragePrefix="test-guide"
        onImportTemplates={vi.fn()}
        onOpenImportedReport={vi.fn()}
      />,
    );

    act(() => guideRef.current.openGuide());
    expect(
      screen.getByRole("dialog", { name: "Import has three phases" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open import guide" }),
    ).not.toBeInTheDocument();
  });

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
    expect(screen.getByText("Review detected worksheets")).toBeInTheDocument();

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

  it("shows the completion guide and clear completion copy", async () => {
    parseExcelWorkbook.mockResolvedValue({
      fileName: "report.xlsx",
      sheets: [createSheet()],
    });
    createReportsFromExcelSheets.mockReturnValue([{ id: "report-1" }]);

    render(
      <ExcelTemplateImportWizard
        companyName="Carmen"
        userIds={["admin"]}
        owner="admin"
        onImportTemplates={vi.fn()}
        onOpenImportedReport={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Choose an Excel workbook"), {
      target: { files: [new File(["workbook"], "report.xlsx")] },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Create 1 report" }));

    expect(await screen.findByRole("heading", { name: "1 report created" })).toBeInTheDocument();
    expect(screen.getAllByText("Import complete").length).toBeGreaterThan(0);
  });
});
