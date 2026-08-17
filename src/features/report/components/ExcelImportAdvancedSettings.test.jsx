import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExcelImportAdvancedSettings from "./ExcelImportAdvancedSettings.jsx";

const sheet = {
  name: "PL-PARESA",
  isRecommended: true,
  detectedRows: [{ id: "excel-row-10" }, { id: "excel-row-11" }],
  detectedColumns: [{ id: "C1" }, { id: "C2" }],
  importConfig: {
    dataStartRow: 10,
    dataEndRow: 115,
    reportStartColumn: "C",
    reportEndColumn: "Y",
    descriptionColumn: "O",
    mappingHeaderRow: 7,
    deptMappingColumn: "BZ",
    accountMappingColumn: "CA",
  },
  importIssues: { errors: [], warnings: [] },
  mappingPreviewRows: [
    {
      rowNumber: 10,
      description: "NO. AVAILABLE PER DAY",
      dept: "110, 120",
      accCodes: "9001001",
    },
  ],
};

describe("ExcelImportAdvancedSettings", () => {
  it("renders detected coordinates and mapping preview", () => {
    render(
      <ExcelImportAdvancedSettings
        sheet={sheet}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Data start row")).toHaveValue(10);
    expect(screen.getByLabelText("Dept mapping column")).toHaveValue("BZ");
    expect(screen.getByText("NO. AVAILABLE PER DAY")).toBeInTheDocument();
    expect(screen.getByText("110, 120")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("updates one coordinate without discarding the others", () => {
    const onChange = vi.fn();
    render(
      <ExcelImportAdvancedSettings
        sheet={sheet}
        onChange={onChange}
        onReset={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Dept mapping column"), {
      target: { value: "aa" },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...sheet.importConfig,
      deptMappingColumn: "AA",
    });
  });

  it("shows validation beside the settings and can reset auto-detection", () => {
    const onReset = vi.fn();
    render(
      <ExcelImportAdvancedSettings
        sheet={{
          ...sheet,
          isRecommended: false,
          importIssues: {
            errors: ["Data start row cannot be after data end row."],
            warnings: [
              "Dept Code (Linked) was not found on mapping header row 7.",
            ],
          },
        }}
        onChange={vi.fn()}
        onReset={onReset}
      />,
    );

    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(
      screen.getByText("Data start row cannot be after data end row."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset auto-detect" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
