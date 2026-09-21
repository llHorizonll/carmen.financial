import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet.jsx";
import { useIsMobile } from "@/hooks/use-mobile.js";

const TOUR_STEPS = [
  {
    target: "reports",
    title: "Choose a report",
    description: "Select any report in the left navigation to open its latest financial data.",
  },
  {
    target: "new-report",
    adminOnly: true,
    title: "Create a new report",
    description: "New Report creates a blank report, then opens SETUP so you can define rows, columns, and access.",
  },
  {
    target: "import-template",
    adminOnly: true,
    title: "Import an Excel template",
    description: "Import Excel reads a workbook and guides you through sheet selection, mapping, preview, and creation.",
  },
  {
    target: "mode-switch",
    title: "View or configure",
    description: "Use VIEW for analysis. Admins can use SETUP to change report definitions and mappings.",
  },
];

export default function GettingStartedTour({
  canSetup,
  steps: customSteps,
  open,
  stepIndex,
  onStepChange,
  onClose,
}) {
  const steps = useMemo(
    () => (customSteps || TOUR_STEPS).filter((step) => canSetup || !step.adminOnly),
    [canSetup, customSteps],
  );
  const safeStepIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeStepIndex];
  const isMobile = useIsMobile();
  const [anchorTarget, setAnchorTarget] = useState(null);
  const nextButtonRef = useRef(null);

  useEffect(() => {
    if (!open || !step) return undefined;
    let target = document.querySelector(`[data-tour="${step.target}"]`);
    const activateTarget = () => {
      target = document.querySelector(`[data-tour="${step.target}"]`);
      target?.setAttribute("data-tour-active", "true");
      target?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
      setAnchorTarget(target || null);
    };
    activateTarget();
    const frame = target ? null : window.requestAnimationFrame(activateTarget);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      target?.removeAttribute("data-tour-active");
      setAnchorTarget(null);
    };
  }, [open, step]);
  useEffect(() => {
    if (!open || isMobile) return undefined;
    const frame = window.requestAnimationFrame(() => nextButtonRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isMobile, open, safeStepIndex]);

  if (!open || !step) return null;

  const isLastStep = safeStepIndex === steps.length - 1;
  const handleKeyDown = (event) => {
    if (event.key === "Escape") onClose();
    if (event.key === "ArrowLeft" && safeStepIndex > 0) {
      onStepChange(safeStepIndex - 1);
    }
    if (event.key === "ArrowRight") {
      isLastStep ? onClose() : onStepChange(safeStepIndex + 1);
    }
  };
  const focusNextButton = (event) => {
    event.preventDefault();
    nextButtonRef.current?.focus();
  };
  const tourCard = (
    <Card
      className="w-full border-0 bg-background shadow-none ring-0"
      aria-labelledby="getting-started-title"
      aria-describedby="getting-started-description"
      onKeyDown={handleKeyDown}
    >
        <CardHeader className="gap-2 pb-3">
          <section className="flex items-start justify-between gap-3">
            <section>
              <CardDescription>
                Getting started · {safeStepIndex + 1} of {steps.length}
              </CardDescription>
              <CardTitle id="getting-started-title" className="mt-1 text-balance text-lg">
                {step.title}
              </CardTitle>
            </section>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close getting started guide"
            >
              <X className="size-4" />
            </Button>
          </section>
        </CardHeader>
        <CardContent className="space-y-4">
          <p id="getting-started-description" className="text-pretty text-sm leading-6 text-muted-foreground">
            {step.description}
          </p>
          <section className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Skip
            </Button>
            <section className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safeStepIndex === 0}
                onClick={() => onStepChange(safeStepIndex - 1)}
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
              <Button
                ref={nextButtonRef}
                type="button"
                size="sm"
                onClick={() =>
                  isLastStep ? onClose() : onStepChange(safeStepIndex + 1)
                }
              >
                {isLastStep ? "Done" : "Next"}
                {!isLastStep && <ChevronRight className="size-4" />}
              </Button>
            </section>
          </section>
        </CardContent>
    </Card>
  );

  if (isMobile) {
    return (
      <Sheet open onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[70dvh] overflow-y-auto rounded-t-xl pb-[env(safe-area-inset-bottom)]"
          onOpenAutoFocus={focusNextButton}
        >
          <SheetTitle className="sr-only">{step.title}</SheetTitle>
          <SheetDescription className="sr-only">
            {step.description}
          </SheetDescription>
          {tourCard}
        </SheetContent>
      </Sheet>
    );
  }

  const targetRect = anchorTarget?.getBoundingClientRect();
  const horizontalPlacement = targetRect?.left > window.innerWidth / 2
    ? "left-4"
    : "right-4";
  const verticalPlacement = targetRect?.top > window.innerHeight / 2
    ? "top-4"
    : "bottom-[calc(1rem+env(safe-area-inset-bottom))]";

  return (
    <section
      className={`fixed ${horizontalPlacement} ${verticalPlacement} z-60 w-sm max-w-[calc(100vw-2rem)] rounded-xl border border-primary/30 bg-background shadow-xl print:hidden`}
      role="dialog"
      aria-labelledby="getting-started-title"
      aria-describedby="getting-started-description"
    >
      {tourCard}
    </section>
  );
}
