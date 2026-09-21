import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  FileCheck2,
  FileSpreadsheet,
  Import,
  LoaderCircle,
  RotateCcw,
  Settings2,
  UploadCloud,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import { cn } from "@/lib/utils.js";
import {
  configureExcelSheetImport,
  createReportsFromExcelSheets,
  parseExcelWorkbook,
} from "../lib/excelTemplateImport.js";
import ExcelImportAdvancedSettings from "./ExcelImportAdvancedSettings.jsx";
import GettingStartedTour from "./GettingStartedTour.jsx";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const EMPTY_MAPPING_CATALOG = [];
const STEPS = [
  { id: "upload", label: "Upload workbook" },
  { id: "select", label: "Select worksheets" },
  { id: "done", label: "Import complete" },
];

const getStepIndex = (step) => STEPS.findIndex((item) => item.id === step);
const IMPORT_TOUR_STEPS = {
  upload: [
    { target: "import-progress", title: "Import has three phases", description: "Upload a workbook, choose worksheets, then review the imported reports in Setup." },
    { target: "import-upload", title: "Choose the source workbook", description: "Drop or browse for an Excel file up to 25 MB. Processing stays in this browser." },
  ],
  select: [
    { target: "import-select-header", title: "Review detected worksheets", description: "The wizard recommends sheets that look like financial report templates." },
    { target: "import-worksheets", title: "Select and configure sheets", description: "Select each report sheet. Use Configure when detected rows, columns, or mappings need adjustment." },
    { target: "import-create", title: "Create reports", description: "This creates one report per selected worksheet. Review every imported report in Setup before use." },
  ],
  done: [
    { target: "import-done-heading", title: "Import complete", description: "Open the first report to verify mappings, formulas, access, columns, and rows in Setup." },
  ],
};

export default function ExcelTemplateImportWizard({
  companyName,
  userIds,
  owner,
  departments = EMPTY_MAPPING_CATALOG,
  accountCodes = EMPTY_MAPPING_CATALOG,
  dimensions = EMPTY_MAPPING_CATALOG,
  guideStoragePrefix = "carmen_bi_getting_started_v1:anonymous",
  onImportTemplates,
  onOpenImportedReport,
}) {
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [selectedSheetNames, setSelectedSheetNames] = useState(new Set());
  const [configuredSheetName, setConfiguredSheetName] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [importedReports, setImportedReports] = useState([]);
  const importTourStorageKey = `${guideStoragePrefix}:import:${step}`;
  const [isImportTourOpen, setIsImportTourOpen] = useState(
    () => window.localStorage.getItem(`${guideStoragePrefix}:import:upload`) !== "done",
  );
  const [importTourStep, setImportTourStep] = useState(0);
  const mappingCatalogs = useMemo(
    () => ({ depts: departments, accCodes: accountCodes, dimensions }),
    [accountCodes, departments, dimensions],
  );

  const recommendedSheets = useMemo(
    () => workbook?.sheets.filter((sheet) => sheet.isRecommended) || [],
    [workbook],
  );
  const activeStepIndex = getStepIndex(step);
  useEffect(() => {
    setImportTourStep(0);
    setIsImportTourOpen(window.localStorage.getItem(importTourStorageKey) !== "done");
  }, [importTourStorageKey]);
  const configuredSheet = useMemo(
    () => workbook?.sheets.find((sheet) => sheet.name === configuredSheetName),
    [configuredSheetName, workbook],
  );
  const invalidSelectedSheets = useMemo(
    () =>
      workbook?.sheets.filter(
        (sheet) => selectedSheetNames.has(sheet.name) && !sheet.isRecommended,
      ) || [],
    [selectedSheetNames, workbook],
  );

  const resetWizard = () => {
    setStep("upload");
    setFile(null);
    setWorkbook(null);
    setSelectedSheetNames(new Set());
    setConfiguredSheetName("");
    setError("");
    setImportedReports([]);
  };

  const handleFileChange = async (nextFile) => {
    setError("");
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (!/\.(?:xlsx?|xlsm)$/i.test(nextFile.name)) {
      setError("Choose an Excel workbook in .xlsx or .xls format.");
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setError("The workbook is larger than 25 MB.");
      return;
    }

    setFile(nextFile);
    setWorkbook(null);
    setIsReading(true);
    try {
      const nextWorkbook = await parseExcelWorkbook(nextFile, mappingCatalogs);
      setWorkbook(nextWorkbook);
      setSelectedSheetNames(
        new Set(
          nextWorkbook.sheets
            .filter((sheet) => sheet.isRecommended)
            .map((sheet) => sheet.name),
        ),
      );
      setConfiguredSheetName(
        nextWorkbook.sheets.find((sheet) => sheet.isRecommended)?.name ||
          nextWorkbook.sheets[0]?.name ||
          "",
      );
      setStep("select");
    } catch (readError) {
      setError(
        readError?.message ||
          "Unable to read this workbook. Choose a valid Excel file and try again.",
      );
    } finally {
      setIsReading(false);
    }
  };

  const setSheetSelected = (sheetName, isSelected) => {
    setSelectedSheetNames((current) => {
      const next = new Set(current);
      if (isSelected) next.add(sheetName);
      else next.delete(sheetName);
      return next;
    });
  };

  const updateSheetImportConfig = (sheetName, importConfig) => {
    setWorkbook((current) => {
      if (!current) return current;
      return {
        ...current,
        sheets: current.sheets.map((sheet) =>
          sheet.name === sheetName
            ? configureExcelSheetImport(sheet, importConfig, mappingCatalogs)
            : sheet,
        ),
      };
    });
  };

  const resetSheetImportConfig = (sheetName) => {
    const sheet = workbook?.sheets.find((item) => item.name === sheetName);
    if (!sheet) return;
    updateSheetImportConfig(
      sheetName,
      sheet.autoImportConfig || sheet.importConfig,
    );
  };

  const handleImport = async () => {
    if (
      !workbook ||
      selectedSheetNames.size === 0 ||
      invalidSelectedSheets.length > 0
    ) {
      setError(
        "Resolve worksheet import setting errors before creating reports.",
      );
      return;
    }
    setIsImporting(true);
    setError("");
    try {
      const reports = createReportsFromExcelSheets(
        workbook,
        selectedSheetNames,
        { companyName, userIds, owner },
      );
      await onImportTemplates(reports);
      setImportedReports(reports);
      setStep("done");
    } catch (importError) {
      setError(
        importError?.message ||
          "Unable to create reports from the selected worksheets.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <section className="mx-auto flex h-full w-full max-w-7xl flex-col gap-3 overflow-y-auto px-2 py-2 sm:px-4">
      <header className="flex flex-row items-start justify-between gap-2">
        <section className="flex items-center gap-3">
          <section className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileSpreadsheet className="size-5" aria-hidden="true" />
          </section>
          <section>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Excel report import
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Create one report per worksheet, then review its mappings before use.
            </p>
          </section>
        </section>
        <Button type="button" variant="ghost" size="icon" onClick={() => { setImportTourStep(0); setIsImportTourOpen(true); }} aria-label="Open import guide" title="Import guide">
          <CircleHelp aria-hidden="true" />
        </Button>
      </header>

      <nav data-tour="import-progress" aria-label="Import progress" className="data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:rounded-xl data-[tour-active=true]:bg-background data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary">
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {STEPS.map((item, index) => {
            const isActive = index === activeStepIndex;
            const isComplete = index < activeStepIndex;
            return (
              <li
                key={item.id}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
                  isActive
                    ? "border-primary/30 bg-primary/8 text-foreground"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                <Badge
                  variant={isActive || isComplete ? "default" : "outline"}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full p-0"
                >
                  {isComplete ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </Badge>
                <p className="text-sm font-medium">{item.label}</p>
              </li>
            );
          })}
        </ol>
      </nav>

      {step === "upload" && (
        <Card className="border border-border bg-card shadow-none ring-0">
          <CardHeader data-tour="import-select-header" className="border-b pb-4 data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:bg-background data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary">
            <CardTitle className="text-base font-semibold sm:text-lg">
              Choose a workbook
            </CardTitle>
            <CardDescription className="max-w-2xl leading-6">
              Excel files are processed in your browser and are not uploaded.
              Maximum file size is 25 MB.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <input
              id="excel-template-file"
              type="file"
              accept=".xlsx,.xls,.xlsm"
              aria-label="Choose an Excel workbook"
              className="peer sr-only"
              onChange={(event) =>
                handleFileChange(event.target.files?.[0] || null)
              }
            />
            <label
              data-tour="import-upload"
              htmlFor="excel-template-file"
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                handleFileChange(event.dataTransfer.files?.[0] || null);
              }}
              className={cn(
                "flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center outline-none transition-colors data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:bg-background data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary",
                "peer-focus-visible:border-primary peer-focus-visible:ring-3 peer-focus-visible:ring-primary/20",
                isDragging
                  ? "border-primary bg-primary/8"
                  : "border-border bg-muted/25 hover:border-primary/40 hover:bg-muted/45",
              )}
            >
              <section className="flex size-14 items-center justify-center rounded-xl border border-border bg-background text-primary shadow-sm">
                {isReading ? (
                  <LoaderCircle
                    className="size-6 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <UploadCloud className="size-6" aria-hidden="true" />
                )}
              </section>
              <h2 className="mt-4 text-base font-semibold text-foreground">
                {isReading ? "Reading workbook" : "Drop your Excel file here"}
              </h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                {isReading
                  ? file?.name
                  : "or click to browse from your computer (.xlsx or .xls)"}
              </p>
              {!isReading && (
                <section
                  aria-hidden="true"
                  className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-foreground"
                >
                  <FileSpreadsheet aria-hidden="true" />
                  Browse files
                </section>
              )}
            </label>

            {error && (
              <section
                role="alert"
                className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/8 p-3 text-destructive"
              >
                <AlertCircle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <p className="text-sm leading-5">{error}</p>
              </section>
            )}
          </CardContent>
        </Card>
      )}

      {step === "select" && workbook && (
        <Card className="min-h-0 border border-border bg-card shadow-none ring-0">
          <CardHeader className="border-b pb-4">
            <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <section className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
                  <FileCheck2
                    className="size-5 text-primary"
                    aria-hidden="true"
                  />
                  Select worksheets
                </CardTitle>
                <CardDescription className="mt-1 truncate">
                  {workbook.fileName}
                </CardDescription>
              </section>
              <section className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="h-7 rounded-lg px-2.5">
                  {selectedSheetNames.size} of {workbook.sheets.length} selected
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedSheetNames(
                      new Set(recommendedSheets.map((sheet) => sheet.name)),
                    )
                  }
                >
                  Select recommended
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSheetNames(new Set())}
                >
                  Clear
                </Button>
              </section>
            </section>
          </CardHeader>

          <CardContent data-tour="import-worksheets" className="p-0 data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:bg-background data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary">
            <ScrollArea className="h-80 sm:h-96">
              <ul
                aria-label="Worksheets"
                className="w-full min-w-0 max-w-full divide-y divide-border overflow-hidden"
              >
                {workbook.sheets.map((sheet) => {
                  const isSelected = selectedSheetNames.has(sheet.name);
                  const isConfigured = configuredSheetName === sheet.name;
                  const checkboxId = `sheet-${sheet.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
                  return (
                    <li
                      key={sheet.name}
                      className={cn(
                        "w-full min-w-0 max-w-full overflow-hidden transition-colors",
                        isSelected || isConfigured
                          ? "bg-primary/5"
                          : "hover:bg-muted/35",
                      )}
                    >
                      <section className="grid min-h-16 w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                        <Checkbox
                          id={checkboxId}
                          checked={isSelected}
                          disabled={!sheet.isRecommended && !isSelected}
                          onCheckedChange={(checked) =>
                            setSheetSelected(sheet.name, checked === true)
                          }
                          aria-label={`Import worksheet ${sheet.name}`}
                        />
                        <label
                          htmlFor={checkboxId}
                          className={cn(
                            "min-w-0 flex-1",
                            sheet.isRecommended || isSelected
                              ? "cursor-pointer"
                              : "cursor-not-allowed opacity-65",
                          )}
                        >
                          <p className="truncate text-sm font-medium text-foreground">
                            {sheet.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {sheet.rowCount} populated rows ·{" "}
                            {sheet.columnCount} populated columns
                            {sheet.isRecommended
                              ? ` · ${sheet.detectedRows.length} template rows · ${sheet.detectedColumns.length} report columns`
                              : " · No report structure detected"}
                          </p>
                          {sheet.previewRows.length > 0 && (
                            <p className="mt-1 truncate text-xs text-muted-foreground/80">
                              {sheet.previewRows.join(" · ")}
                            </p>
                          )}
                        </label>
                        {sheet.isRecommended && (
                          <section
                            data-slot="worksheet-actions"
                            className="col-start-2 flex min-w-0 flex-wrap items-center gap-2 sm:col-start-3 sm:flex-nowrap sm:justify-self-end"
                          >
                            <Badge
                              variant="secondary"
                              className="max-w-full rounded-lg"
                            >
                              <CheckCircle2 aria-hidden="true" />
                              Ready
                            </Badge>
                            <Button
                              type="button"
                              variant={isConfigured ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => setConfiguredSheetName(sheet.name)}
                            >
                              <Settings2 aria-hidden="true" />
                              Configure
                            </Button>
                          </section>
                        )}
                      </section>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
            {configuredSheet && (
              <section className="border-t border-border">
                <ExcelImportAdvancedSettings
                  sheet={configuredSheet}
                  onChange={(importConfig) =>
                    updateSheetImportConfig(configuredSheet.name, importConfig)
                  }
                  onReset={() => resetSheetImportConfig(configuredSheet.name)}
                />
              </section>
            )}
          </CardContent>

          {error && (
            <section
              role="alert"
              className="mx-4 mb-4 flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/8 p-3 text-destructive"
            >
              <AlertCircle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <p className="text-sm leading-5">{error}</p>
            </section>
          )}

          <CardFooter className="flex flex-col-reverse items-stretch justify-between gap-3 border-t bg-muted/20 p-4 sm:flex-row sm:items-center">
            <Button type="button" variant="outline" onClick={resetWizard}>
              <ArrowLeft aria-hidden="true" />
              Choose another file
            </Button>
            <Button
              data-tour="import-create"
              className="data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary"
              type="button"
              disabled={
                selectedSheetNames.size === 0 ||
                invalidSelectedSheets.length > 0 ||
                isImporting
              }
              onClick={handleImport}
            >
              {isImporting ? (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Import aria-hidden="true" />
              )}
              Create {selectedSheetNames.size} {selectedSheetNames.size === 1 ? "report" : "reports"}
              {!isImporting && <ArrowRight aria-hidden="true" />}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "done" && (
        <Card data-tour="import-done" className="border border-primary/20 bg-card shadow-none ring-0 data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <section className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </section>
            <h2 data-tour="import-done-heading" className="mt-5 rounded-lg text-xl font-semibold tracking-tight text-foreground data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:bg-background data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary">
              {importedReports.length} {importedReports.length === 1 ? "report" : "reports"} created
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Your imported reports are in the report list. Review mappings and
              calculation rules in Setup before using them.
            </p>
            <section className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={() => onOpenImportedReport(importedReports[0]?.id)}
              >
                Open first report
                <ArrowRight aria-hidden="true" />
              </Button>
              <Button type="button" variant="outline" onClick={resetWizard}>
                <RotateCcw aria-hidden="true" />
                Import another workbook
              </Button>
            </section>
          </CardContent>
        </Card>
      )}
      <GettingStartedTour
        canSetup
        steps={IMPORT_TOUR_STEPS[step]}
        open={isImportTourOpen}
        stepIndex={importTourStep}
        onStepChange={setImportTourStep}
        onClose={() => {
          window.localStorage.setItem(importTourStorageKey, "done");
          setIsImportTourOpen(false);
        }}
      />
    </section>
  );
}
