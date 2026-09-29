import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
    desktopOnly: true,
    title: "Choose a report",
    description: "Select a report in the left navigation. Select its name above the report to return to View.",
  },
  {
    target: "report-actions",
    adminOnly: true,
    title: "Manage reports",
    description: "Create or import reports here. For the selected report, Edit opens its setup; Delete, Duplicate, and Activity are beside it.",
  },
  {
    target: "report-filters",
    title: "Filter and export",
    description: "Choose a department, year, period, and budget revision, then select Apply. Export or print from the same bar.",
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
  const isMobile = useIsMobile();
  const steps = useMemo(
    () => (customSteps || TOUR_STEPS).filter((step) => (canSetup || !step.adminOnly) && (!isMobile || !step.desktopOnly)),
    [canSetup, customSteps, isMobile],
  );
  const safeStepIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeStepIndex];
  const nextButtonRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open || !step) return undefined;
    let target = document.querySelector(`[data-tour="${step.target}"]`);
    const activateTarget = () => {
      target = document.querySelector(`[data-tour="${step.target}"]`);
      target?.setAttribute("data-tour-active", "true");
      target?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    };
    activateTarget();
    const frame = target ? null : window.requestAnimationFrame(activateTarget);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      target?.removeAttribute("data-tour-active");
    };
  }, [open, step]);
  useEffect(() => {
    if (!open || isMobile) return undefined;
    const frame = window.requestAnimationFrame(() => nextButtonRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isMobile, open, safeStepIndex]);
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

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

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-foreground/35 print:hidden"
        data-testid="tour-backdrop"
        aria-label="Dismiss guide backdrop"
        onClick={onClose}
      />
        <section
          className="fixed top-1/2 left-1/2 z-60 w-sm max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-primary/30 bg-background shadow-xl print:hidden"
          role="dialog"
          aria-labelledby="getting-started-title"
          aria-describedby="getting-started-description"
        >
          {tourCard}
        </section>
    </>, document.body,
  );
}
