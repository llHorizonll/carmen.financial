import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import GettingStartedTour from "./GettingStartedTour.jsx";

describe("GettingStartedTour", () => {
  afterEach(() => {
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
  });

  it("guides admins through report creation and template import", () => {
    const onStepChange = vi.fn();
    document.body.innerHTML = '<button data-tour="reports">Reports</button>';

    const { rerender } = render(
      <GettingStartedTour
        canSetup
        open
        stepIndex={0}
        onStepChange={onStepChange}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Choose a report")).toBeInTheDocument();
    expect(screen.getByTestId("tour-backdrop")).toHaveClass(
      "fixed",
      "inset-0",
      "bg-foreground/35",
    );
    expect(document.querySelector('[data-tour="reports"]')).toHaveAttribute(
      "data-tour-active",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onStepChange).toHaveBeenCalledWith(1);
    document.body.insertAdjacentHTML(
      "afterbegin",
      '<button data-tour="new-report">New Report</button>',
    );
    rerender(
      <GettingStartedTour
        canSetup
        open
        stepIndex={1}
        onStepChange={onStepChange}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Create a new report")).toBeInTheDocument();

    document.querySelector('[data-tour="new-report"]').remove();
    rerender(
      <GettingStartedTour
        canSetup
        open
        stepIndex={2}
        onStepChange={onStepChange}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Import an Excel template")).toBeInTheDocument();
  });

  it("renders an accessible dialog title on mobile", () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    document.body.innerHTML = '<button data-tour="reports">Reports</button>';

    render(
      <GettingStartedTour
        canSetup
        open
        stepIndex={0}
        onStepChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Choose a report" }),
    ).toBeInTheDocument();
  });
});
