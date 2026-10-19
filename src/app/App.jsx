import { useTranslation, getLocale } from "@/lib/i18n.js";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FileText,
  FilePlus,
  FileSpreadsheet,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  Check,
  Monitor,
  Type,
  ZoomIn,
  ZoomOut,
  Download,
  RefreshCw,
  Printer,
  LogOut,
  MoonStar,
  SunMedium,
  AlertTriangle,
  ArrowUp,
  CircleHelp,
  LoaderCircle,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile.js";
import { Button } from "@/components/ui/button.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import ReportHistory from "@/features/report/components/ReportHistory.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.jsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.jsx";
import {
  applyShellTemplate,
  DEFAULT_SHELL_TEMPLATE,
  getStoredTheme,
  setStoredTheme,
} from "../lib/theme.js";

import MultiSelectDropdown from "../features/report/components/MultiSelectDropdown.jsx";
import LanguagePreference from "./LanguagePreference.jsx";
import useBusinessUnitReports, { reportKey } from "../features/report/hooks/useBusinessUnitReports.js";
import { BusinessUnitSelector, BusinessUnitReportList, BusinessUnitTargetDialog } from "../features/report/components/BusinessUnitReports.jsx";
import usePersistentState from "../hooks/usePersistentState.js";
import { getDefaultReports } from "../features/report/data/defaultReports.js";
import { createBlankReport } from "../features/report/data/reportTemplates.js";
import {
  createCarmenReport,
  cloneCarmenReport,
  deleteCarmenReport,
  fetchCarmenDimensions,
  fetchCarmenMasterData,
  fetchCarmenReport,
  fetchCarmenReportData,
  fetchCarmenReportOptions,
  fetchCarmenReports,
  getStoredCarmenSession,
  isCarmenApiConfigured,
  saveCarmenReport,
  saveCarmenReports,
} from "../features/report/lib/reportApi.js";
import { clearCarmenApiFailure } from "../lib/carmenApiFailure.js";
import {
  THEMES,
  INITIAL_MASTER_DATA,
  formatAutoPeriod,
  getIndentClass,
  cloneReport,
  buildReportData,
  deleteRowAndRewriteReferences,
  deleteColAndRewriteReferences,
  moveColumnsAndRewriteReferences,
  moveRowsAndRewriteReferences,
  buildExcelHtml,
  findBrokenReferences,
  findRowMappingConflicts,
  rowDimensionsOverlap,
  rowDepartmentsOverlap,
  getLatestCreatedReport,
} from "../features/report/lib/reportLogic.js";
import { mergeCarmenMasterData } from "../features/report/lib/reportAdapters.js";
import { normalizeAccLookupCode } from "../features/report/lib/normalizeCode.js";
import {
  canSetupFinancialReports,
  canViewFinancialReports,
  getAccessibleReports,
} from "./reportAccess.js";

const ReportView = React.lazy(
  () => import("../features/report/components/ReportView.jsx"),
);
const ReportSetup = React.lazy(
  () => import("../features/report/components/ReportSetup.jsx"),
);
const ExcelTemplateImportWizard = React.lazy(
  () => import("../features/report/components/ExcelTemplateImportWizard.jsx"),
);
const EditMappingModal = React.lazy(
  () => import("../features/report/components/EditMappingModal.jsx"),
);
const DetailSelectorModal = React.lazy(
  () => import("../features/report/components/DetailSelectorModal.jsx"),
);
const GettingStartedTour = React.lazy(
  () => import("../features/report/components/GettingStartedTour.jsx"),
);

const DEFAULT_REPORT_OPTIONS = {
  themes: [
    { id: "blue", label: "Classic Blue" },
    { id: "green", label: "Emerald Green" },
    { id: "gray", label: "Slate Gray" },
  ],
  periodFormats: [
    { id: "standard", label: "Standard (Period : 2026-02)" },
    { id: "year_month", label: "Year-Month (2026-02)" },
    { id: "numeric", label: "Numeric Full (02/2026)" },
    { id: "numeric_short", label: "Numeric Short (02/26)" },
    { id: "short", label: "Short Month + YYYY (Feb 2026)" },
    { id: "short_yy", label: "Short Month + YY (Feb '26)" },
    { id: "long", label: "Long Month + YYYY (February 2026)" },
    { id: "month_only", label: "Month Only (February)" },
    { id: "day_month_year", label: "Day Month Year (28 Feb 2026)" },
    { id: "end_of_month", label: "End of Month (February 28, 2026)" },
  ],
  accountCategories: [
    { id: "ALL", label: "All Categories" },
    { id: "I", label: "Income / Expense" },
    { id: "B", label: "Balance Sheet" },
  ],
  columnTypes: [
    { id: "DAC", label: "DAC (Actual Daily)" },
    { id: "PTD", label: "PTD" },
    { id: "YTD", label: "YTD (Actual Year to Date by Day)" },
    { id: "AC", label: "AC (Actual Month)" },
    { id: "ACC", label: "ACC (Actual YTD)" },
    { id: "DACBG", label: "DACBG" },
    { id: "PTDBG", label: "PTDBG" },
    { id: "YTDBG", label: "YTDBG (Budget Year to Date by Day)" },
    { id: "BC", label: "BC (Budget Month)" },
    { id: "BCC", label: "BCC (Budget YTD)" },
  ],
  columnLogicTypes: [
    { id: "DATA", label: "Data" },
    { id: "FORMULA", label: "Formula" },
    { id: "MIX", label: "Mix %" },
  ],
  yearModes: [
    { id: "current", label: "Current Year" },
    { id: "-1", label: "Previous Year" },
    { id: "+1", label: "Next Year" },
    { id: "specific", label: "Specific Year" },
  ],
  periodModes: [
    { id: "current", label: "Period (Parameter)" },
    { id: "-1", label: "Period -1" },
    { id: "Q1", label: "Q1" },
    { id: "Q2", label: "Q2" },
    { id: "Q3", label: "Q3" },
    { id: "Q4", label: "Q4" },
    ...Array.from({ length: 12 }, (_, index) => {
      const period = String(index + 1).padStart(2, "0");
      return { id: `P${period}`, label: `P${period} (Period ${index + 1})` };
    }),
  ],
  rowTypes: [
    { id: "header", label: "Header" },
    { id: "detail", label: "Detail" },
    { id: "total", label: "Total" },
  ],
  indentLevels: Array.from({ length: 8 }, (_, index) => ({
    id: String(index),
    label: `Level ${index}`,
  })),
};

const DAILY_COLUMN_TYPES = new Set([
  "DAC",
  "PTD",
  "YTD",
  "DACBG",
  "PTDBG",
  "YTDBG",
]);
const SUPPORTED_COLUMN_TYPES = new Set([
  ...DAILY_COLUMN_TYPES,
  "AC",
  "ACC",
  "BUD",
  "BC",
  "BUDACC",
  "BCC",
]);
const BUDGET_COLUMN_TYPES = new Set([
  "BUD",
  "BC",
  "BUDACC",
  "BCC",
  "DACBG",
  "PTDBG",
  "YTDBG",
]);
const createCurrentYearValue = () => new Date().getFullYear().toString();
const parseSelectedItems = (value) =>
  String(value || "")
    .split(",")
    .flatMap((item) => {
      const trimmed = item.trim();
      return trimmed ? [trimmed] : [];
    });
const isSessionExpiredError = (error) =>
  String(error?.message || "")
    .toLowerCase()
    .includes("session expired");
const isBlockingSetupWarning = (warning) =>
  String(warning || "").includes("cannot be mapped together");

export const getSetupWarnings = (report, masterData) => {
  if (!report) return [];
  const warnings = [];
  const describeItem = (scope, id) => {
    const items = scope === "row" ? report.rows || [] : report.columns || [];
    const index = items.findIndex((item) => item?.id === id);
    const item = items[index];
    const code = `${scope === "row" ? "R" : "C"}${index + 1}`;
    const name = scope === "row" ? item?.desc : item?.label;
    return `${scope === "row" ? "Row" : "Column"} ${code}${name ? ` (${name})` : ""}`;
  };

  findBrokenReferences(report).forEach((issue) => {
    warnings.push(
      `${describeItem(issue.scope, issue.id)}: ${issue.field} contains invalid reference ${issue.value}.`,
    );
  });
  findRowMappingConflicts(report, masterData).forEach((issue) => {
    warnings.push(`${describeItem("row", issue.id)}: ${issue.value}`);
  });

  (report.columns || []).forEach((column) => {
    if (column?.isFormula || column?.isPercent) return;
    const type = String(column?.type || "")
      .trim()
      .toUpperCase();
    if (type && !SUPPORTED_COLUMN_TYPES.has(type)) {
      warnings.push(
        `${describeItem("column", column.id)}: unsupported type ${type}.`,
      );
    }
  });

  return [...new Set(warnings)];
};

const mergeOptionArrays = (fallbackItems, nextItems) => {
  const merged = new Map();
  fallbackItems.forEach((item) => merged.set(String(item.id), item));
  (Array.isArray(nextItems) ? nextItems : []).forEach((item) => {
    if (!item) return;
    const id = String(item.id || item.Id || "").trim();
    if (!id) return;
    merged.set(id, { ...item, id });
  });
  return Array.from(merged.values());
};

const mergeReportOptions = (defaults, loaded) => ({
  ...defaults,
  ...loaded,
  themes: mergeOptionArrays(defaults.themes, loaded?.themes),
  periodFormats: mergeOptionArrays(
    defaults.periodFormats,
    loaded?.periodFormats,
  ),
  accountCategories: mergeOptionArrays(
    defaults.accountCategories,
    loaded?.accountCategories,
  ),
  columnTypes: mergeOptionArrays(defaults.columnTypes, loaded?.columnTypes),
  columnLogicTypes: mergeOptionArrays(
    defaults.columnLogicTypes,
    loaded?.columnLogicTypes,
  ),
  yearModes: mergeOptionArrays(defaults.yearModes, loaded?.yearModes),
  periodModes: mergeOptionArrays(defaults.periodModes, loaded?.periodModes),
  rowTypes: mergeOptionArrays(defaults.rowTypes, loaded?.rowTypes),
  indentLevels: mergeOptionArrays(defaults.indentLevels, loaded?.indentLevels),
});

const REPORT_STORAGE_KEY = "carmen_bi_reports_config_v5_23";
const GETTING_STARTED_STORAGE_PREFIX = "carmen_bi_getting_started_v1:";
const NO_REPORT_SELECTED = "__no_report_selected__";
const NEUTRAL_BUTTON_CLASS =
  "border-border bg-background text-foreground hover:bg-muted transition-colors duration-150";
const NEUTRAL_FILTER_TRIGGER_CLASS =
  "border-border bg-background text-foreground hover:bg-muted transition-colors duration-150";

const readStoredReports = () => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(REPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeStoredReports = (reports) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // Ignore storage write failures and keep the API-backed state in memory.
  }
};

// ============================================================================
// 1. MAIN APPLICATION
// ============================================================================
const FONT_SIZE_OPTIONS = [
  ["small", "Small", 14, "size-3"],
  ["normal", "Normal", 16, "size-3.5"],
  ["big", "Big", 18, "size-4"],
  ["bigger", "Bigger", 20, "size-4.5"],
  ["biggest", "Biggest", 22, "size-5"],
];

export default function App({ onLogout = null }) {
  const t = useTranslation();
  const apiConfigured = isCarmenApiConfigured();
  const storedCarmenSession = apiConfigured ? getStoredCarmenSession() : null;
  const businessUnitsEnabled = apiConfigured && Boolean(storedCarmenSession?.businessUnit?.tenant);
  const [activeTab, setActiveTab] = useState("report");
  const [tabMotionDirection, setTabMotionDirection] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState(() => getStoredTheme());
  const [fontSize, setFontSize] = usePersistentState(
    "carmen_font_size_v1",
    "normal",
  );
  const activeFontSize =
    FONT_SIZE_OPTIONS.find(([value]) => value === fontSize)?.[2] || 16;
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [isSetupSaving, setIsSetupSaving] = useState(false);
  const [isGettingStartedOpen, setIsGettingStartedOpen] = useState(false);
  const [gettingStartedStep, setGettingStartedStep] = useState(0);
  const setupGuideRef = useRef(null);
  const importGuideRef = useRef(null);

  const [alertMsg, setAlertMsg] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const confirmActionRef = useRef(null);
  const [setupSaveWarnings, setSetupSaveWarnings] = useState([]);

  const [localMasterData, setLocalMasterData] = usePersistentState(
    "carmen_bi_master_api_v1",
    INITIAL_MASTER_DATA,
  );
  const [apiMasterData, setApiMasterData] = useState(INITIAL_MASTER_DATA);
  const masterData = apiConfigured ? apiMasterData : localMasterData;
  const setMasterData = apiConfigured ? setApiMasterData : setLocalMasterData;
  const [periodOptions, setPeriodOptions] = useState([]);
  const [budgetRevisionOptions, setBudgetRevisionOptions] = useState([]);
  const [reportOptions, setReportOptions] = useState(DEFAULT_REPORT_OPTIONS);
  const [masterDataError, setMasterDataError] = useState(null);
  const [isMasterDataLoading, setIsMasterDataLoading] = useState(false);
  const [isReportCatalogLoading, setIsReportCatalogLoading] = useState(false);
  const [reportCatalogError, setReportCatalogError] = useState(null);

  const [currentUser, setCurrentUser] = useState(() => {
    if (apiConfigured) {
      return storedCarmenSession?.user || null;
    }

    return INITIAL_MASTER_DATA.users[0];
  });
  const [tableZoom, setTableZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(false);

  const [globalDepts, setGlobalDepts] = useState([]);
  const [globalYear, setGlobalYear] = useState(createCurrentYearValue);
  const [globalPeriod, setGlobalPeriod] = useState("2");
  const [globalRevision, setGlobalRevision] = useState("0");
  const [dayFilterState, setDayFilterState] = useState(null);

  const [appliedDepts, setAppliedDepts] = useState([]);
  const [appliedYear, setAppliedYear] = useState(createCurrentYearValue);
  const [appliedPeriod, setAppliedPeriod] = useState("2");
  const [appliedRevision, setAppliedRevision] = useState("0");

  const [engineData, setEngineData] = useState([]);
  const [budgetData, setBudgetData] = useState([]);
  const [apiDimensions, setApiDimensions] = useState({});
  const dimensionDefinitions = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => `dim${index + 1}`).map(
        (field, index) => {
          const apiDefinition = apiDimensions.definitions?.find(
            (definition) => definition.key === field,
          );
          const fallbackValues = [
            ...new Set(
              [...engineData, ...budgetData]
                .map((row) =>
                  String(
                    row?.[field] ?? row?.[field.toUpperCase()] ?? "",
                  ).trim(),
                )
                .filter(Boolean),
            ),
          ].sort((a, b) =>
            a.localeCompare(b, undefined, {
              numeric: true,
              sensitivity: "base",
            }),
          );
          return {
            key: field,
            caption: apiDefinition?.caption || `DIM ${index + 1}`,
            values:
              apiDefinition?.values?.length > 0
                ? apiDefinition.values
                : fallbackValues,
          };
        },
      ),
    [apiDimensions, budgetData, engineData],
  );
  const pageTransitionTimerRef = useRef(null);
  const reportDataFetchSkipRef = useRef(false);
  const latestReportDataRequestRef = useRef(0);
  const loadedReportDataRef = useRef(null);
  const masterDataLoadKeysRef = useRef(new Set());
  const reportCatalogLoadRef = useRef(false);

  // --- Report Configuration Data ---
  const [reports, setReports] = useState(() => {
    if (apiConfigured) return [];
    return readStoredReports() || getDefaultReports();
  });
  const [reportsLoaded, setReportsLoaded] = useState(!apiConfigured);
  const [currentReportId, setCurrentReportId] = useState(null);
  const businessUnits = useBusinessUnitReports({ enabled: businessUnitsEnabled, session: storedCarmenSession, setReports });
  const [createTargetOpen, setCreateTargetOpen] = useState(false);
  const creatingReportRef = useRef(false);
  const [loadedTenant, setLoadedTenant] = useState(null);
  const [setupDraft, setSetupDraft] = useState(null);
  const [isSetupDirty, setIsSetupDirty] = useState(false);
  const [setupUndoHistory, setSetupUndoHistory] = useState([]);
  const lastSetupUndoGroupRef = useRef(null);
  const [editingRow, setEditingRow] = useState(null);
  const [detailSelecting, setDetailSelecting] = useState(null);
  const [modalAccCategory, setModalAccCategory] = useState("ALL");
  const isMobile = useIsMobile(1024);
  const gettingStartedStorageKey = `${GETTING_STARTED_STORAGE_PREFIX}${currentUser?.id || "anonymous"}`;
  const accessibleReports = useMemo(
    () => businessUnitsEnabled ? reports.filter((report) => businessUnits.selected.includes(report.tenant)) : getAccessibleReports(reports, currentUser),
    [reports, currentUser, businessUnitsEnabled, businessUnits.selected],
  );
  const latestAccessibleReport = useMemo(
    () => getLatestCreatedReport(accessibleReports),
    [accessibleReports],
  );
  const resolvedCurrentReportId = useMemo(() => {
    if (currentReportId === NO_REPORT_SELECTED) return null;
    if (accessibleReports.some((report) => reportKey(report) === currentReportId)) {
      return currentReportId;
    }

    return reportKey(latestAccessibleReport) || null;
  }, [accessibleReports, currentReportId, latestAccessibleReport]);
  const activeReport = resolvedCurrentReportId
    ? accessibleReports.find(
        (report) => reportKey(report) === resolvedCurrentReportId,
      ) || null
    : null;
  const activeTenant = activeReport?.tenant || businessUnits.selected[0];
  const context = activeTenant ? { tenant: activeTenant } : {};
  const unitPermission = businessUnits.units.find((unit) => unit.id === activeTenant)?.permission;
  const tenantContextReady = !businessUnitsEnabled || loadedTenant === activeTenant;
  const canSetupReports = businessUnitsEnabled ? Boolean(unitPermission?.setup) && tenantContextReady : canSetupFinancialReports(currentUser);
  const creationUnits = businessUnits.units.filter((unit) => businessUnits.selected.includes(unit.id) && unit.permission?.setup);
  const canCreateReports = businessUnitsEnabled ? creationUnits.length > 0 : canSetupReports;
  const setupReport =
    reportKey(setupDraft) === reportKey(activeReport) ? setupDraft : activeReport;

  useEffect(() => {
    if (!businessUnitsEnabled) return;
    latestReportDataRequestRef.current += 1;
    loadedReportDataRef.current = null;
    setLoadedTenant(null); setEngineData([]); setBudgetData([]); setApiDimensions({});
    setMasterData(INITIAL_MASTER_DATA); setPeriodOptions([]); setBudgetRevisionOptions([]);
    setGlobalDepts([]); setAppliedDepts([]); setMasterDataError(null);
  }, [businessUnitsEnabled, activeTenant, setMasterData]);

  useEffect(() => {
    setSetupDraft(activeReport);
    setIsSetupDirty(false);
    setSetupUndoHistory([]);
    lastSetupUndoGroupRef.current = null;
  }, [resolvedCurrentReportId]);
  useEffect(() => {
    if (!currentUser?.id || !reportsLoaded) return;
    setGettingStartedStep(0);
    setIsGettingStartedOpen(
      window.localStorage.getItem(gettingStartedStorageKey) !== "done",
    );
  }, [currentUser?.id, gettingStartedStorageKey, reportsLoaded]);
  useEffect(() => {
    if (!isGettingStartedOpen) return;
    if (!isMobile) {
      setIsSidebarCollapsed(false);
      return;
    }
    setIsSidebarOpen(false);
  }, [isGettingStartedOpen, isMobile]);
  const activeReportUsesDayFilter = useMemo(() => {
    if (!activeReport) return false;
    return (
      Array.isArray(activeReport.columns) &&
      activeReport.columns.some((col) => {
        const type = String(col?.type || "")
          .trim()
          .toUpperCase();
        return DAILY_COLUMN_TYPES.has(type);
      })
    );
  }, [activeReport]);
  const defaultReportDay = activeReportUsesDayFilter ? "1" : "";
  const currentDayFilter =
    dayFilterState?.reportId === reportKey(activeReport) &&
    dayFilterState?.reportDay === defaultReportDay
      ? dayFilterState
      : null;
  const globalDay = currentDayFilter?.globalDay ?? defaultReportDay;
  const activeReportDay = activeReportUsesDayFilter
    ? (currentDayFilter?.appliedDay ?? defaultReportDay)
    : "";
  const activeReportUsesBudget = useMemo(
    () =>
      Boolean(
        activeReport?.columns?.some((col) => {
          const type = String(col?.type || "")
            .trim()
            .toUpperCase();
          return BUDGET_COLUMN_TYPES.has(type);
        }),
      ),
    [activeReport],
  );
  const appliedBudgetRevision = activeReportUsesBudget ? appliedRevision : "0";

  const loadReportDataFromApi = useCallback(
    async ({
      reportId,
      year,
      period,
      revision,
      deptIds,
      day = "",
      source = "report",
    } = {}) => {
      if (!apiConfigured || !activeReport?.id || !tenantContextReady) return null;

      if (activeReportUsesDayFilter && String(day || "").trim()) {
        const dayNumber = Number.parseInt(day, 10);
        const selectedPeriod = periodOptions.find(
          (option) => String(option.id) === String(period),
        );
        const referenceDate = selectedPeriod?.date
          ? new Date(selectedPeriod.date)
          : new Date(Number(year), Math.max(0, Number(period) - 1), 1);
        const maxDay = Number.isNaN(referenceDate.getTime())
          ? 31
          : new Date(
              referenceDate.getFullYear(),
              referenceDate.getMonth() + 1,
              0,
            ).getDate();
        if (
          !Number.isInteger(dayNumber) ||
          dayNumber < 1 ||
          dayNumber > maxDay
        ) {
          throw new Error(
            `Day must be between 1 and ${maxDay} for the selected fiscal period.`,
          );
        }
      }

      const dataScope = JSON.stringify([activeReport, reportId || activeReport.id, year, period, revision, [...(deptIds || [])].sort()]);
      const loaded = loadedReportDataRef.current;
      // The API returns the full source period/year, so only a day change
      // within the same report/filter scope can reuse the loaded dataset.
      // Applying the same day explicitly still refreshes from the server.
      if (loaded?.scope === dataScope && loaded.day !== String(day)) {
        loadedReportDataRef.current = { ...loaded, day: String(day) };
        setAlertMsg(null);
        return loaded.data;
      }
      const requestId = ++latestReportDataRequestRef.current;
      loadedReportDataRef.current = null;
      setIsLoading(true);
      try {
        const apiData = await fetchCarmenReportData({
          ...context,
          reportId: reportId || activeReport.id,
          year,
          period,
          revision,
          deptIds,
          day,
        });

        if (requestId === latestReportDataRequestRef.current) {
          loadedReportDataRef.current = { scope: dataScope, day: String(day), data: apiData };
          setEngineData(apiData.actualRows || []);
          setBudgetData(apiData.budgetRows || []);
          setAlertMsg(null);
        }
        return apiData;
      } catch (error) {
        if (requestId === latestReportDataRequestRef.current && isSessionExpiredError(error) && typeof onLogout === "function") {
          onLogout();
          return null;
        }
        const message =
          error.message || `Unable to load Carmen ${source} data.`;
        if (requestId === latestReportDataRequestRef.current)
          setAlertMsg(message);
        throw error;
      } finally {
        if (requestId === latestReportDataRequestRef.current)
          setIsLoading(false);
      }
    },
    [apiConfigured, activeReport, activeTenant, tenantContextReady, activeReportUsesDayFilter, periodOptions, onLogout],
  );

  useEffect(() => {
    if (!apiConfigured || !/^\d{4}$/.test(String(globalYear))) return;
    if (businessUnitsEnabled && !activeTenant) return;

    const masterDataLoadKey = String(globalYear);
    if (!businessUnitsEnabled && masterDataLoadKeysRef.current.has(masterDataLoadKey)) return;

    let isCancelled = false;
    const loadCarmenMasterData = async () => {
      setIsMasterDataLoading(true);
      try {
        const [apiData, dimensions] = await Promise.all([
          fetchCarmenMasterData({ year: globalYear, ...context }),
          businessUnitsEnabled ? fetchCarmenDimensions(context) : fetchCarmenDimensions().catch(() => ({})),
        ]);
        if (isCancelled) return;

        masterDataLoadKeysRef.current.add(masterDataLoadKey);
        setApiDimensions(dimensions);
        setMasterData((prev) => mergeCarmenMasterData(prev, apiData));
        if (apiData.currentUser) setCurrentUser(apiData.currentUser);
        else if (Array.isArray(apiData.users) && apiData.users.length > 0)
          setCurrentUser(apiData.users[0]);
        setPeriodOptions(apiData.periods || []);
        setBudgetRevisionOptions(apiData.budgetRevisions || []);
        setLoadedTenant(activeTenant);
        setMasterDataError(null);
      } catch (error) {
        if (!isCancelled) {
          if (isSessionExpiredError(error) && typeof onLogout === "function") {
            onLogout();
            return;
          }
          setMasterDataError(
            error.message || "Unable to load Carmen master data.",
          );
        }
      } finally {
        if (!isCancelled) {
          // react-doctor-disable-next-line no-loading-flag-reset-outside-finally -- This reset is already in finally; the guard prevents updates after effect cleanup.
          setIsMasterDataLoading(false);
        }
      }
    };

    loadCarmenMasterData();
    return () => {
      isCancelled = true;
    };
  }, [globalYear, apiConfigured, businessUnitsEnabled, activeTenant, onLogout, setMasterData]);

  useEffect(() => {
    if (!apiConfigured) return;
    if (reportCatalogLoadRef.current) return;

    let isCancelled = false;
    const loadCarmenCatalog = async () => {
      setIsReportCatalogLoading(true);
      try {
        const [optionsResult, reportsResult] = await Promise.allSettled([
          fetchCarmenReportOptions(),
          businessUnitsEnabled ? Promise.resolve([]) : fetchCarmenReports(),
        ]);
        if (isCancelled) return;

        reportCatalogLoadRef.current = true;

        if (optionsResult.status === "fulfilled") {
          setReportOptions(
            mergeReportOptions(DEFAULT_REPORT_OPTIONS, optionsResult.value),
          );
        }
        if (
          reportsResult.status === "fulfilled" &&
          Array.isArray(reportsResult.value) &&
          reportsResult.value.length > 0
        ) {
          setReports(reportsResult.value);
          setReportsLoaded(true);
        } else if (reportsResult.status === "fulfilled") {
          setReportsLoaded(true);
        }
        if (
          optionsResult.status === "rejected" ||
          reportsResult.status === "rejected"
        ) {
          const reason =
            optionsResult.status === "rejected"
              ? optionsResult.reason
              : reportsResult.reason;
          setReportsLoaded(true);
          throw reason || new Error("Unable to load Carmen report catalog.");
        }
        setReportCatalogError(null);
      } catch (error) {
        if (!isCancelled) {
          if (isSessionExpiredError(error) && typeof onLogout === "function") {
            onLogout();
            return;
          }
          setReportsLoaded(true);
          setReportCatalogError(
            error.message || "Unable to load Carmen report catalog.",
          );
        }
      } finally {
        if (!isCancelled) {
          // react-doctor-disable-next-line no-loading-flag-reset-outside-finally -- This reset is already in finally; the guard prevents updates after effect cleanup.
          setIsReportCatalogLoading(false);
        }
      }
    };

    loadCarmenCatalog();
    return () => {
      isCancelled = true;
    };
  }, [apiConfigured, businessUnitsEnabled, onLogout]);

  useEffect(() => {
    if (!reportsLoaded || apiConfigured) return;
    writeStoredReports(reports);
  }, [reports, reportsLoaded, apiConfigured]);

  // react-doctor-disable-next-line no-set-state-after-await-in-effect -- Cleanup flips isCancelled before any late request can update effect-owned notice state.
  useEffect(() => {
    if (
      !apiConfigured ||
      !/^\d{4}$/.test(String(appliedYear)) ||
      !activeReport?.id
    )
      return;
    if (!tenantContextReady) return;
    if (
      activeReportUsesDayFilter &&
      String(activeReportDay).trim() &&
      periodOptions.length === 0
    )
      return;

    let isCancelled = false;
    const loadCarmenReportData = async () => {
      if (reportDataFetchSkipRef.current) {
        reportDataFetchSkipRef.current = false;
        return;
      }

      try {
        await loadReportDataFromApi({
          reportId: activeReport.id,
          year: appliedYear,
          period: appliedPeriod,
          revision: appliedBudgetRevision,
          deptIds: appliedDepts,
          day: activeReportDay,
        });
      } catch (error) {
        if (!isCancelled) {
          setAlertMsg(error.message || "Unable to load Carmen report data.");
        }
      }
    };

    loadCarmenReportData();
    return () => {
      isCancelled = true;
    };
  }, [
    appliedYear,
    appliedPeriod,
    appliedBudgetRevision,
    appliedDepts,
    activeReport?.id,
    activeTenant,
    tenantContextReady,
    activeReportDay,
    activeReportUsesDayFilter,
    periodOptions,
    apiConfigured,
    loadReportDataFromApi,
  ]);

  const updateActiveReport = (updates) => {
    if (!activeReport) return;
    const now = Date.now();
    const groupKey = Object.keys(updates).sort().join(",");
    const lastGroup = lastSetupUndoGroupRef.current;
    if (lastGroup?.key !== groupKey || now - lastGroup.time > 700) {
      setSetupUndoHistory((history) => [...history.slice(-49), {
        report: structuredClone(setupReport),
        isDirty: isSetupDirty,
      }]);
    }
    lastSetupUndoGroupRef.current = { key: groupKey, time: now };
    setSetupDraft((currentDraft) => ({
      ...(reportKey(currentDraft) === reportKey(activeReport) ? currentDraft : activeReport),
      ...updates,
    }));
    setIsSetupDirty(true);
    setReportCatalogError(null);
  };

  const persistSetup = async () => {
    setIsSetupSaving(true);
    try {
      const saveResult = apiConfigured
        ? await saveCarmenReport(setupReport, ...(activeTenant ? [context] : []))
        : null;
      const savedVersion = saveResult?.lastModified || saveResult?.LastModified;
      const savedReport = savedVersion
        ? { ...setupReport, lastModified: savedVersion }
        : setupReport;
      setReports((currentReports) =>
        currentReports.map((report) =>
          reportKey(report) === reportKey(savedReport) ? savedReport : report,
        ),
      );
      setSetupDraft(savedReport);
      setIsSetupDirty(false);
      setSetupUndoHistory([]);
      lastSetupUndoGroupRef.current = null;
      setReportCatalogError(null);
      applyTabChange("report");
    } catch (error) {
      setReportCatalogError(
        error.message || "Unable to save report definition.",
      );
    } finally {
      setIsSetupSaving(false);
    }
  };

  const handleSaveSetup = async () => {
    if (!setupReport || !isSetupDirty || isSetupSaving) return;
    const warnings = getSetupWarnings(setupReport, masterData);
    if (warnings.length > 0) {
      setSetupSaveWarnings(warnings);
      return;
    }
    await persistSetup();
  };

  const discardSetupChanges = () => {
    setSetupDraft(activeReport);
    setIsSetupDirty(false);
    setSetupUndoHistory([]);
    lastSetupUndoGroupRef.current = null;
    setReportCatalogError(null);
  };

  const handleUndoSetup = () => {
    const previous = setupUndoHistory[setupUndoHistory.length - 1];
    if (!previous || isSetupSaving) return;
    setSetupDraft(previous.report);
    setIsSetupDirty(previous.isDirty);
    setSetupUndoHistory((history) => history.slice(0, -1));
    lastSetupUndoGroupRef.current = null;
    setReportCatalogError(null);
  };

  const requestConfirmation = ({ title, msg, actionLabel, onConfirm }) => {
    confirmActionRef.current = onConfirm;
    setConfirmAction({ title, msg, actionLabel });
  };

  const closeConfirmation = () => {
    confirmActionRef.current = null;
    setConfirmAction(null);
  };

  const confirmPendingAction = () => {
    const onConfirm = confirmActionRef.current;
    closeConfirmation();
    onConfirm?.();
  };

  const confirmDiscardSetup = () => {
    if (!isSetupDirty) {
      return;
    }
    confirmActionRef.current = discardSetupChanges;
    setConfirmAction({
      title: "Discard unsaved changes?",
      msg: "Changes since the last save will be lost.",
      actionLabel: "Discard changes",
    });
  };

  const handleCancelSetup = () => confirmDiscardSetup();

  const handleApplyFilters = async () => {
    const nextDepts = [...globalDepts];
    const nextRevision = activeReportUsesBudget ? globalRevision : "0";
    const nextDay = activeReportUsesDayFilter ? String(globalDay).trim() : "";
    // Apply owns the request; the new department array also triggers the
    // effect when filter values are unchanged, so skip that duplicate load.
    if (apiConfigured) reportDataFetchSkipRef.current = true;
    setAppliedDepts(nextDepts);
    setAppliedYear(globalYear);
    setAppliedPeriod(globalPeriod);
    setDayFilterState({
      reportId: reportKey(activeReport),
      reportDay: defaultReportDay,
      globalDay: nextDay,
      appliedDay: nextDay,
    });
    if (!activeReportUsesBudget && String(globalRevision) !== "0") {
      setAlertMsg(
        "Revision selector is ignored for reports without budget columns.",
      );
    }
    setGlobalRevision(nextRevision);
    setAppliedRevision(nextRevision);
    if (!apiConfigured) return;
    try {
      await loadReportDataFromApi({
        reportId: activeReport?.id,
        year: globalYear,
        period: globalPeriod,
        revision: nextRevision,
        deptIds: nextDepts,
        day: nextDay,
      });
    } catch (error) {
      setAlertMsg(error.message || "Unable to load Carmen report data.");
    }
  };

  const handleCloneReport = async () => {
    const sourceReport = setupReport || activeReport;
    if (!sourceReport) return;
    if (apiConfigured) {
      try {
        const apiClone = await cloneCarmenReport(sourceReport.id, ...(activeTenant ? [context] : []));
        if (apiClone) {
          const scopedClone = activeTenant ? { ...apiClone, tenant: activeTenant } : apiClone;
          setReports((prev) => [...prev, scopedClone]);
          setCurrentReportId(reportKey(scopedClone));
          return;
        }
        setReportCatalogError("Unable to clone report in Carmen API.");
      } catch (error) {
        setReportCatalogError(
          error.message || "Unable to clone report in Carmen API.",
        );
      }
      return;
    }

    const newId = "rep-" + Date.now();
    const clonedReport = cloneReport(
      sourceReport,
      newId,
      currentUser?.id || "",
    );
    setReports((prev) => [...prev, clonedReport]);
    setCurrentReportId(newId);
  };

  const handleCreateBlankReport = async (targetTenant = activeTenant) => {
    const newId = "rep-" + Date.now();
    const newReport = createBlankReport(
      masterData.companyProfile.name,
      [],
      newId,
      currentUser?.id || "",
    );
    if (apiConfigured) {
      try {
        const targetContext = targetTenant ? { tenant: targetTenant } : {};
        if (targetTenant && targetTenant !== activeTenant) {
          const targetMaster = await fetchCarmenMasterData({ year: globalYear, ...targetContext });
          newReport.companyName = targetMaster.companyProfile.name;
        }
        const created = await createCarmenReport(newReport, ...(targetTenant ? [targetContext] : []));
        const createdReport = targetTenant ? { ...created, tenant: targetTenant } : created;
        setReports((prev) => [...prev, createdReport]);
        setCurrentReportId(reportKey(createdReport));
        return createdReport;
      } catch (error) {
        setReportCatalogError(
          error.message || "Unable to save new report to Carmen API.",
        );
        return null;
      }
    }

    setReports((prev) => [...prev, newReport]);
    setCurrentReportId(newId);
    return newReport;
  };

  const handleImportExcelTemplates = async (importedReports) => {
    if (!Array.isArray(importedReports) || importedReports.length === 0) return;
    if (apiConfigured) {
      await saveCarmenReports(importedReports, ...(activeTenant ? [context] : []));
    }
    const scoped = activeTenant ? importedReports.map((report) => ({ ...report, tenant: activeTenant })) : importedReports;
    setReports((currentReports) => [...currentReports, ...scoped]);
    setCurrentReportId(reportKey(scoped[0]));
  };

  const handleDeleteReport = () => {
    confirmActionRef.current = async () => {
      const deletedReport = activeReport;
      if (apiConfigured && deletedReport?.id) {
        try {
          await deleteCarmenReport(deletedReport.id, deletedReport.tenant ? { tenant: deletedReport.tenant } : {});
        } catch (error) {
          setReportCatalogError(
            error.message || "Unable to delete report from Carmen API.",
          );
          return;
        }
      }
      const newReports = reports.filter((r) => reportKey(r) !== reportKey(deletedReport));
      setReports(newReports);
      setCurrentReportId(NO_REPORT_SELECTED);
    };
    setConfirmAction({
      title: t("Delete “{name}”?", { name: activeReport?.name || t("Reports") }),
      msg: "This permanently removes the report and cannot be undone.",
      actionLabel: "Delete report",
    });
  };

  // --- ENGINE ---
  const reportData = useMemo(
    () =>
      tenantContextReady ? buildReportData({
        activeReport,
        engineData,
        budgetData,
        appliedDepts,
        appliedYear,
        appliedPeriod,
        appliedDay: activeReportDay,
        appliedRevision: appliedBudgetRevision,
        periodOptions,
        masterData,
      }) : [],
    [
      activeReport,
      engineData,
      budgetData,
      appliedDepts,
      appliedYear,
      appliedPeriod,
      activeReportDay,
      appliedBudgetRevision,
      periodOptions,
      masterData,
      tenantContextReady,
    ],
  );

  // --- Handlers ---
  const handleUpdateRow = (id, field, val) =>
    updateActiveReport({
      rows: setupReport.rows.map((r) =>
        r.id === id ? { ...r, [field]: val } : r,
      ),
    });
  const handleUpdateRowMulti = (id, updates) =>
    updateActiveReport({
      rows: setupReport.rows.map((r) =>
        r.id === id ? { ...r, ...updates } : r,
      ),
    });
  const handleUpdateCol = (id, field, val) =>
    updateActiveReport({
      columns: setupReport.columns.map((c) =>
        c.id === id ? { ...c, [field]: val } : c,
      ),
    });

  const handleAddCol = (type) => {
    const newColId = "C" + (setupReport.columns.length + 1) + "-" + Date.now();
    const defaultDataType = setupReport?.columns?.some((column) =>
      ["DAC", "PTD"].includes(String(column.type || "").toUpperCase()),
    )
      ? "DAC"
      : "AC";
    const newCol = {
      id: newColId,
      label:
        type === "data"
          ? "New Column"
          : type === "percent"
            ? "% Mix"
            : "Variance",
      isActive: true,
      isFormula: type === "formula",
      isPercent: type === "percent",
      formatAsPercent: false,
      formula: type === "formula" ? "C1-C2" : "",
      targetCol: type === "percent" ? "C1" : undefined,
      yearMode: type === "data" ? "current" : undefined,
      periodMode: type === "data" ? "current" : undefined,
      type: type === "data" ? defaultDataType : undefined,
      width: "",
    };
    const descriptionPosition = Number(setupReport.descriptionPosition);
    updateActiveReport({
      columns: [...setupReport.columns, newCol],
      ...(Number.isInteger(descriptionPosition) &&
      descriptionPosition === setupReport.columns.length
        ? { descriptionPosition: descriptionPosition + 1 }
        : {}),
    });
  };

  const handleDuplicateCol = (columnId) => {
    const source = setupReport.columns.find((column) => column.id === columnId);
    if (!source) return;
    const descriptionPosition = Number(setupReport.descriptionPosition);
    updateActiveReport({
      columns: [
        ...setupReport.columns,
        {
          ...source,
          id: `${source.id}-copy-${Date.now()}`,
          label: `Copy of ${source.label || source.id}`,
          isActive: true,
        },
      ],
      ...(Number.isInteger(descriptionPosition) &&
      descriptionPosition === setupReport.columns.length
        ? { descriptionPosition: descriptionPosition + 1 }
        : {}),
    });
  };

  const handleAddRow = (type) => {
    const isFormula = type === "formula" || type === "formula-percent";
    const lastRow =
      setupReport.rows.length > 0
        ? setupReport.rows[setupReport.rows.length - 1]
        : null;
    const newRow = {
      id: "r-" + Date.now(),
      desc:
        type === "header"
          ? "HEADER"
          : isFormula
            ? "Total"
            : "New Line",
      isActive: true,
      isTotal: isFormula,
      numberFormat: type === "formula-percent" ? "percent" : "column",
      isHeader: type === "header",
      dept: "",
      deptGroup: "",
      accCodes: "",
      groupLevel: "L4",
      groups: "",
      percentBase: lastRow ? lastRow.percentBase : "",
      formula: isFormula ? "R1+R2" : "",
      indent: lastRow ? lastRow.indent : 0,
    };
    updateActiveReport({ rows: [...setupReport.rows, newRow] });
  };

  const handleDuplicateRow = (rowId) => {
    const source = setupReport.rows.find((row) => row.id === rowId);
    if (!source) return;
    updateActiveReport({
      rows: [
        ...setupReport.rows,
        {
          ...source,
          id: `r-${Date.now()}`,
          desc: `Copy of ${source.desc || source.id}`,
          isActive: true,
        },
      ],
    });
  };

  const handleDeleteRow = (rowId) => {
    updateActiveReport(deleteRowAndRewriteReferences(setupReport, rowId));
  };

  const handleDeleteCol = (colId) => {
    const deletedIndex = setupReport.columns.findIndex(
      (column) => column.id === colId,
    );
    const nextReport = deleteColAndRewriteReferences(setupReport, colId);
    const descriptionPosition = Number(setupReport.descriptionPosition);
    updateActiveReport({
      ...nextReport,
      ...(Number.isInteger(descriptionPosition) &&
      deletedIndex >= 0 &&
      deletedIndex < descriptionPosition
        ? { descriptionPosition: descriptionPosition - 1 }
        : {}),
    });
  };

  const moveCol = (idx, dir) => {
    updateActiveReport(moveColumnsAndRewriteReferences(setupReport, idx, dir));
  };

  const moveRow = (idx, dir) => {
    updateActiveReport(moveRowsAndRewriteReferences(setupReport, idx, dir));
  };

  // --- Display Labels (Configurable Period Formats) ---
  const defaultPeriodOptions = useMemo(
    () =>
      [...Array(12).keys()].map((i) => ({
        id: String(i + 1),
        label: `P${i + 1}`,
      })),
    [],
  );
  const periodSelectOptions =
    periodOptions.length > 0 ? periodOptions : defaultPeriodOptions;
  const revisionSelectOptions = useMemo(() => {
    const options = new Map([["0", { id: "0", label: "Rev 0" }]]);
    budgetRevisionOptions.forEach((option) =>
      options.set(String(option.id), option),
    );
    return Array.from(options.values()).sort((a, b) =>
      String(a.id).localeCompare(String(b.id), undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [budgetRevisionOptions]);
  const selectedAppliedPeriod = periodSelectOptions.find(
    (option) => String(option.id) === String(appliedPeriod),
  );
  const selectedPeriodCode = `P${String(appliedPeriod).padStart(2, "0")}`;
  const displayCompanyLabel =
    activeReport?.companyName || masterData.companyProfile.name;
  const dailyReportDate = activeReportUsesDayFilter && activeReportDay
    ? new Date(Number(appliedYear), Number(appliedPeriod) - 1, Number(activeReportDay))
    : null;
  if (dailyReportDate && selectedAppliedPeriod?.date) {
    const periodStart = new Date(selectedAppliedPeriod.date);
    if (!Number.isNaN(periodStart.getTime())) {
      dailyReportDate.setFullYear(periodStart.getFullYear(), periodStart.getMonth(), Number(activeReportDay));
    }
  }
  const autoDateLabel = dailyReportDate && !Number.isNaN(dailyReportDate.getTime())
    ? `${t("As of")} ${dailyReportDate.toLocaleDateString(getLocale(), { year: 'numeric', month: 'long', day: 'numeric' })}`
    : selectedAppliedPeriod?.dateLabel
    ? `As of ${selectedAppliedPeriod.dateLabel}`
    : `As of ${formatAutoPeriod(appliedYear, appliedPeriod, "end_of_month")}`;
  const displayDateLabel =
    activeReport?.overrideDateDisplay ||
    activeReport?.customDateLabel ||
    autoDateLabel;
  const autoPeriodLabel =
    activeReport?.periodFormat && activeReport.periodFormat !== "standard"
      ? formatAutoPeriod(appliedYear, appliedPeriod, activeReport.periodFormat)
      : selectedAppliedPeriod?.dateLabel
        ? `Period : ${appliedYear}-${selectedPeriodCode}${selectedAppliedPeriod.status ? ` (${selectedAppliedPeriod.status})` : ""}`
        : formatAutoPeriod(appliedYear, appliedPeriod, "standard");
  const displayPeriodLabel =
    activeReport?.overridePeriodDisplay ||
    activeReport?.customPeriodLabel ||
    autoPeriodLabel;
  const activeCategories = Array.isArray(setupReport?.category)
    ? setupReport.category
    : ["ALL"];
  const activeCols = useMemo(
    () => activeReport?.columns?.filter((c) => c.isActive) || [],
    [activeReport],
  );
  // --- Export Excel (HTML-to-XLSX) ---
  const exportToExcel = () => {
    if (!activeReport) return;
    const themeColors = THEMES[activeReport.theme || "blue"];
    const tableHtml = buildExcelHtml({
      activeReport,
      activeCols,
      displayCompanyLabel,
      displayDateLabel,
      displayPeriodLabel,
      reportData,
      themeColors,
    });
    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${activeReport.name.replace(/[^a-zA-Z0-9]/g, "_")}_Export.xls`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const currentTheme = THEMES[activeReport?.theme || "blue"];
  const showPageSkeleton = isPageTransitioning;
  const visibleActiveTab = canSetupReports ? activeTab : "report";
  const contextualGuideLabel =
    visibleActiveTab === "setup"
      ? "Open setup guide"
      : visibleActiveTab === "import"
        ? "Open import guide"
        : "Open getting started guide";
  const activeTabMotionClass =
    tabMotionDirection === null
      ? ""
      : visibleActiveTab === "report"
        ? "app-pane-enter-from-left"
        : "app-pane-enter-from-right";
  const mainContentPaddingClass =
    visibleActiveTab === "setup" || visibleActiveTab === "import"
      ? "p-0"
      : "p-4";
  const mainContentWidthClass =
    visibleActiveTab === "setup" || visibleActiveTab === "import"
      ? "flex h-full w-full min-h-0 flex-col"
      : "flex h-full w-full min-h-0 flex-col gap-3";

  const applyTabChange = (nextTab) => {
    if (nextTab === "setup" || nextTab === "import") {
      setIsGettingStartedOpen(false);
    }
    setTabMotionDirection(nextTab === "report" ? "backward" : "forward");
    setActiveTab(nextTab);
  };

  const handleTabChange = (nextTab) => {
    if (nextTab === visibleActiveTab) return;
    if ((nextTab === "setup" || nextTab === "import") && !canSetupReports)
      return;
    if (visibleActiveTab === "setup" && isSetupDirty) {
      confirmActionRef.current = () => {
        discardSetupChanges();
        applyTabChange(nextTab);
      };
      setConfirmAction({
        title: "Discard unsaved changes?",
        msg: "Changes since the last save will be lost.",
        actionLabel: "Discard changes",
      });
      return;
    }
    applyTabChange(nextTab);
  };

  const handleReportChange = (reportId) => {
    if (isSetupSaving || creatingReportRef.current) return;
    const openReport = () => {
      latestReportDataRequestRef.current += 1;
      loadedReportDataRef.current = null;
      setEngineData([]); setBudgetData([]);
      setCurrentReportId(reportId);
      applyTabChange("report");
      setIsSidebarOpen(false);
    };
    if (visibleActiveTab === "setup" && isSetupDirty) {
      confirmActionRef.current = () => {
        discardSetupChanges();
        openReport();
      };
      setConfirmAction({
        title: "Discard unsaved changes?",
        msg: "Changes since the last save will be lost.",
        actionLabel: "Discard changes",
      });
      return;
    }
    openReport();
  };

  const handleCreateReportFromSidebar = (targetTenant) => {
    if (isSetupSaving || creatingReportRef.current) return;
    if (typeof targetTenant !== "string") {
      if (businessUnitsEnabled && businessUnits.selected.length > 1) { setCreateTargetOpen(true); return; }
      targetTenant = activeTenant;
    }
    if (businessUnitsEnabled && !creationUnits.some((unit) => unit.id === targetTenant)) return;
    setCreateTargetOpen(false);
    const createAndOpenReport = async () => {
      if (creatingReportRef.current) return;
      creatingReportRef.current = true;
      try {
        const createdReport = await handleCreateBlankReport(targetTenant);
        if (!createdReport) return;
        applyTabChange("setup");
        setIsSidebarOpen(false);
      } finally { creatingReportRef.current = false; }
    };

    if (visibleActiveTab === "setup" && isSetupDirty) {
      confirmActionRef.current = () => {
        discardSetupChanges();
        void createAndOpenReport();
      };
      setConfirmAction({
        title: "Discard unsaved changes?",
        msg: "Changes since the last save will be lost.",
        actionLabel: "Discard changes",
      });
      return;
    }

    void createAndOpenReport();
  };

  const handleBusinessUnitSelection = (selection) => {
    if (isSetupSaving || creatingReportRef.current || businessUnits.loading) return;
    const change = () => {
      latestReportDataRequestRef.current += 1;
      loadedReportDataRef.current = null;
      setCurrentReportId(null); setEngineData([]); setBudgetData([]);
      businessUnits.setSelected(selection);
      applyTabChange("report");
    };
    if (isSetupDirty) {
      requestConfirmation({ title: "Discard unsaved changes?", msg: "Changing business units will discard unsaved report changes.",
        actionLabel: "Discard changes", onConfirm: () => { discardSetupChanges(); change(); } });
    } else change();
  };

  const closeGettingStarted = () => {
    window.localStorage.setItem(gettingStartedStorageKey, "done");
    setIsGettingStartedOpen(false);
  };

  const openContextualGuide = () => {
    if (visibleActiveTab === "report") {
      setGettingStartedStep(0);
      setIsGettingStartedOpen(true);
      return;
    }
    const guideRef =
      visibleActiveTab === "setup" ? setupGuideRef : importGuideRef;
    guideRef.current?.openGuide();
  };

  useEffect(() => {
    if (!isSetupDirty) return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isSetupDirty]);

  const triggerPageTransition = () => {
    if (pageTransitionTimerRef.current) {
      clearTimeout(pageTransitionTimerRef.current);
    }
    setIsPageTransitioning(true);
    pageTransitionTimerRef.current = setTimeout(() => {
      setIsPageTransitioning(false);
      pageTransitionTimerRef.current = null;
    }, 700);
  };

  useLayoutEffect(() => {
    setStoredTheme(themeMode);
  }, [themeMode]);

  useLayoutEffect(() => {
    applyShellTemplate(DEFAULT_SHELL_TEMPLATE, themeMode);
  }, [themeMode]);

  useLayoutEffect(() => {
    document.documentElement.style.fontSize = `${activeFontSize}px`;
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [activeFontSize]);

  useEffect(() => {
    if (themeMode !== "system") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      setStoredTheme("system");
      applyShellTemplate(DEFAULT_SHELL_TEMPLATE, "system");
    };
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, [themeMode]);

  useEffect(() => {
    return () => {
      const timerId = pageTransitionTimerRef.current;
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, []);

  // ============================================================================
  // 4. RENDER UI
  // ============================================================================
  const sidebarPanel = (
    <div className="flex h-full min-w-0 flex-col bg-muted/30">
      <div className="flex shrink-0 items-center justify-start py-1 pl-5">
        <span className="relative block w-56 max-w-full">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Carmen Finance Intelligence for Hospitality"
            className="h-auto w-full object-contain dark:brightness-0 dark:invert"
          />
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 hidden h-auto w-full object-contain dark:block [clip-path:inset(0_77%_0_0)]"
          />
        </span>
      </div>

      <ScrollArea className="min-w-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <div className="text-xs font-medium text-muted-foreground">{t("Reports")}</div>
          </div>
          <div
            className="flex flex-col gap-1 data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:rounded-xl data-[tour-active=true]:bg-background data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary"
            data-tour="reports"
          >
            {businessUnitsEnabled ? <BusinessUnitReportList key={currentUser?.id || "anonymous"} storageKey={`carmen_report_navigation:${currentUser?.id || "anonymous"}`} catalog={businessUnits} reports={accessibleReports}
              currentKey={resolvedCurrentReportId} onSelect={handleReportChange} /> : accessibleReports.map((report) => (
              <Button
                key={report.id}
                variant={
                  resolvedCurrentReportId === report.id ? "secondary" : "ghost"
                }
                className={`min-w-0 w-full justify-start gap-2 overflow-hidden ${resolvedCurrentReportId === report.id ? "border-l-2 border-primary bg-primary/10 text-primary hover:bg-primary/15" : ""}`}
                onClick={() => handleReportChange(report.id)}
                aria-current={
                  resolvedCurrentReportId === report.id ? "page" : undefined
                }
              >
                <FileText className="size-4 shrink-0" />
                <span
                  className="min-w-0 flex-1 truncate text-left"
                  title={report.name}
                >
                  {report.name}
                </span>
              </Button>
            ))}
          </div>
          {!businessUnitsEnabled && accessibleReports.length === 0 && (
            <div className="px-2 py-8 text-sm text-muted-foreground">{t("No reports available.")}</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <BusinessUnitTargetDialog open={createTargetOpen} units={creationUnits}
        onSelect={handleCreateReportFromSidebar} onClose={() => setCreateTargetOpen(false)} />
      {alertMsg && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4 sm:right-4 sm:left-auto sm:w-full sm:max-w-136 sm:px-0">
          <Card className="pointer-events-auto mx-auto w-full max-w-136 border border-border/80 bg-background/98 shadow-xl ring-1 ring-black/5 backdrop-blur-sm">
            <CardHeader className="space-y-1.5 pb-3">
              <CardTitle className="text-base tracking-tight">
                {String(alertMsg).includes(t("Revision selector"))
                  ? t("Budget revision not applied")
                  : t("Unable to load report data")}
              </CardTitle>
              <CardDescription className="whitespace-pre-line text-sm leading-6">
                {alertMsg}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAlertMsg(null)}
              >{t("Dismiss")}</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {showPageSkeleton && (
        <div className="fixed inset-0 z-60 bg-background/80 backdrop-blur-sm">
          <div className="flex h-full flex-col">
            <div className="border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur lg:px-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-16 rounded-xl" />
                  <Skeleton className="h-8 w-16 rounded-xl" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden p-4 lg:p-6">
              <div className="mx-auto flex h-full w-full max-w-450 min-h-0 flex-col gap-4">
                {visibleActiveTab === "report" ? (
                  <>
                    <Skeleton className="h-34 w-full rounded-2xl border border-border/50 bg-card/80" />
                    <div className="flex justify-end">
                      <Skeleton className="h-20 w-full max-w-88 rounded-2xl border border-border/50 bg-card/80" />
                    </div>
                    <Skeleton className="min-h-0 flex-1 w-full rounded-2xl border border-border/50 bg-card/80" />
                  </>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col gap-4">
                    <Skeleton className="h-48 w-full rounded-2xl border border-border/50 bg-card/80" />
                    <Skeleton className="h-80 w-full rounded-2xl border border-border/50 bg-card/80" />
                    <Skeleton className="h-112 w-full rounded-2xl border border-border/50 bg-card/80" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isLoading}>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          className="sm:max-w-sm"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" />{t("Loading report data")}</DialogTitle>
            <DialogDescription>{t("Please wait while Carmen prepares the report. Other actions are temporarily unavailable.")}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={setupSaveWarnings.length > 0}
        onOpenChange={(open) => !open && setSetupSaveWarnings([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {setupSaveWarnings.some(isBlockingSetupWarning)
                ? t("Fix invalid row mappings")
                : t("Save incomplete report template?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {setupSaveWarnings.some(isBlockingSetupWarning)
                ? t("Group mappings and individual-code mappings are mutually exclusive. Clear one mapping type before saving.")
                : t("This template can be saved, but report data may be incomplete or incorrect until these items are fixed.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="max-h-72 rounded-lg border border-border">
            <ul className="space-y-2 p-4 text-sm text-foreground">
              {setupSaveWarnings.map((warning) => (
                <li key={warning} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <span className="text-pretty">{warning}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSetupSaveWarnings([])}>{t("Go back")}</AlertDialogCancel>
            {!setupSaveWarnings.some(isBlockingSetupWarning) && (
              <AlertDialogAction
                onClick={() => {
                  setSetupSaveWarnings([]);
                  persistSetup();
                }}
              >{t("Save anyway")}</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => !open && closeConfirmation()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(confirmAction?.title || "Confirm action")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(confirmAction?.msg || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeConfirmation}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className={confirmAction?.actionLabel === "Delete report" ? "bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90" : undefined}
              onClick={confirmPendingAction}
            >
              {t(confirmAction?.actionLabel || "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isMobile ? (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>{t("Reports")}</SheetTitle>
              <SheetDescription>{t("Report navigation.")}</SheetDescription>
            </SheetHeader>
            {sidebarPanel}
          </SheetContent>
        </Sheet>
      ) : !isSidebarCollapsed ? (
        <aside className="hidden w-72 flex-col border-r bg-muted/30 lg:flex print:hidden">
          {sidebarPanel}
        </aside>
      ) : null}

      <main
        className={`flex min-w-0 flex-1 flex-col ${visibleActiveTab === "setup" ? "overflow-visible" : "overflow-hidden"}`}
      >
        <header className="w-full border-b border-border bg-card/95 backdrop-blur print:hidden">
          <div className="flex items-center justify-between gap-2 px-2 py-2.5 sm:gap-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              {isMobile ? (
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label={t("Open navigation")}
                  className="size-8 shrink-0 rounded-lg border-primary/30 text-primary hover:bg-primary/5"
                >
                  <PanelLeftOpen className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="size-8 shrink-0 rounded-lg border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() =>
                    setIsSidebarCollapsed((collapsed) => !collapsed)
                  }
                  aria-label={
                    isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                  }
                  title={
                    isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                  }
                >
                  {isSidebarCollapsed ? (
                    <PanelLeftOpen className="size-4" />
                  ) : (
                    <PanelLeftClose className="size-4" />
                  )}
                </Button>
              )}

              {visibleActiveTab !== "report" && (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-w-0 max-w-64 truncate font-semibold text-foreground"
                  onClick={() => handleTabChange("report")}
                >
                  {activeReport?.name || t("Reports")}
                </Button>
              )}

              <div className="hidden items-center gap-2 xl:flex">
                {visibleActiveTab === "setup" && (
                  <Badge variant="secondary">{t("Configuration")}</Badge>
                )}
                {visibleActiveTab === "import" && (
                  <Badge variant="secondary">{t("Excel template wizard")}</Badge>
                )}
                {isMasterDataLoading && (
                  <Badge variant="outline">{t("Syncing master data")}</Badge>
                )}
                {isReportCatalogLoading && (
                  <Badge variant="outline">{t("Loading catalog")}</Badge>
                )}
                {masterDataError && (
                  <Badge
                    variant="destructive"
                    title={masterDataError}
                    className="rounded-full border-destructive/30 bg-destructive/15 px-2.5 py-1 text-xs text-destructive"
                  >{t("Carmen API unavailable")}</Badge>
                )}
                {reportCatalogError && (
                  <Badge
                    variant="destructive"
                    title={reportCatalogError}
                    className="rounded-full border-destructive/30 bg-destructive/15 px-2.5 py-1 text-xs text-destructive"
                  >{t("Report catalog error")}</Badge>
                )}
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
              {visibleActiveTab === "report" && (
                  <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card/80 px-1 py-1 shadow-sm sm:px-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() =>
                        setTableZoom((current) => Math.max(50, current - 10))
                      }
                      aria-label={t("Zoom out")}
                      title={t("Zoom out")}
                    >
                      <ZoomOut className="size-3.5" />
                    </Button>
                    <Slider
                      value={[tableZoom]}
                      min={50}
                      max={150}
                      step={10}
                      onValueChange={(value) => setTableZoom(value[0] || 100)}
                      className="hidden w-20 min-w-20 md:flex"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() =>
                        setTableZoom((current) => Math.min(150, current + 10))
                      }
                      aria-label={t("Zoom in")}
                      title={t("Zoom in")}
                    >
                      <ZoomIn className="size-3.5" />
                    </Button>
                    <span className="hidden w-10 text-right text-xs font-medium tabular-nums text-foreground/70 sm:inline">
                      {tableZoom}%
                    </span>
                  </div>
                )}

              {businessUnitsEnabled && <BusinessUnitSelector catalog={businessUnits} onChange={handleBusinessUnitSelection} />}
<Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={openContextualGuide}
                aria-label={contextualGuideLabel}
                title={contextualGuideLabel.replace("Open ", "")}
              >
                <CircleHelp className="size-4" />
              </Button>

              {/* User profile dropdown button with Avatar as in image */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={t("Account preferences")}
                    className="h-10 gap-2.5 rounded-xl border-border bg-background px-3 hover:bg-muted"
                  >
                    <div className="hidden flex-col text-right lg:flex">
                      <span className="text-xs font-semibold leading-tight text-foreground max-w-36 truncate">
                        {currentUser?.name || currentUser?.id || t("User")}
                      </span>
                      <span className="text-[10px] leading-tight text-muted-foreground max-w-36 truncate">
                        {currentUser?.role
                          ? `${currentUser.role} Account`
                          : "Rooms General Account"}
                      </span>
                    </div>
                    <span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {(currentUser?.avatarUrl ||
                        currentUser?.avatar ||
                        currentUser?.photoUrl) && (
                        <img
                          src={
                            currentUser.avatarUrl ||
                            currentUser.avatar ||
                            currentUser.photoUrl
                          }
                          alt=""
                          className="absolute inset-0 size-full object-cover"
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                          }}
                        />
                      )}
                      {String(currentUser?.name || currentUser?.id || "TX")
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-68 gap-1 p-2 shadow-lg"
                >
                  <div className="flex items-center gap-3 border-b px-3 py-2.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {String(currentUser?.name || currentUser?.id || "TX")
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {currentUser?.name || currentUser?.id || t("User")}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {currentUser?.userName || currentUser?.id || "user"}
                        @carmen.financial
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {currentUser?.role
                          ? `${currentUser.role} Account`
                          : "Rooms General Account"}
                      </p>
                    </div>
                  </div>

                  <div className="px-2 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t("Preferences")}</div>

                  <LanguagePreference />

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-start text-xs font-normal"
                      >
                        {themeMode === "dark" ? (
                          <MoonStar className="size-4" />
                        ) : themeMode === "system" ? (
                          <Monitor className="size-4" />
                        ) : (
                          <SunMedium className="size-4" />
                        )}{t("Theme")}<ChevronRight className="ml-auto size-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="left"
                      align="start"
                      className="w-44 gap-1 p-2"
                    >
                      {[
                        ["light", t("Light"), SunMedium],
                        ["dark", t("Dark"), MoonStar],
                        ["system", t("System"), Monitor],
                      ].map(([value, label, Icon]) => (
                        <Button
                          key={value}
                          type="button"
                          variant="ghost"
                          className="w-full justify-start text-xs"
                          onClick={() => setThemeMode(value)}
                        >
                          <Icon className="size-4" />
                          {label}
                          {themeMode === value && (
                            <Check className="ml-auto size-4" />
                          )}
                        </Button>
                      ))}
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-start text-xs font-normal"
                      >
                        <Type className="size-4" />{t("Font size")}<ChevronRight className="ml-auto size-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="left"
                      align="start"
                      className="w-44 gap-1 p-2"
                    >
                      {FONT_SIZE_OPTIONS.map(([value, label, , iconSize]) => (
                        <Button
                          key={value}
                          type="button"
                          variant="ghost"
                          className="w-full justify-start text-xs"
                          aria-pressed={fontSize === value}
                          onClick={() => setFontSize(value)}
                        >
                          <Type className={iconSize} />
                          <span className="flex-1 text-left">{t(label)}</span>
                          {fontSize === value && <Check className="size-4" />}
                        </Button>
                      ))}
                    </PopoverContent>
                  </Popover>

                  {typeof onLogout === "function" && (
                    <>
                      <div className="my-1 border-t border-border" />
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-start text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={onLogout}
                      >
                        <LogOut className="size-4" />{t("Log out")}</Button>
                    </>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        {/* Filter bar: separated below topbar, shown in VIEW mode */}
        {visibleActiveTab === "report" && (
          <div className="px-4 pt-4 print:hidden">
            <section
              className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3"
              aria-label={t("Report title and actions")}
            >
              <h1 className="min-w-0 flex-1 text-balance text-xl font-semibold text-foreground">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto max-w-full justify-start px-0 py-1 text-left text-xl font-semibold hover:bg-transparent"
                  onClick={() => handleTabChange("report")}
                  title={activeReport?.name || "Reports"}
                >
                  <span className="truncate">
                    {activeReport?.name || t("Reports")}
                  </span>
                </Button>
              </h1>
              {(canSetupReports || canCreateReports) && (
                <div data-tour="report-actions" className="flex flex-wrap items-center justify-end gap-2 data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:rounded-lg data-[tour-active=true]:bg-background data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary">
                  <Button
                    size="sm"
                    onClick={handleCreateReportFromSidebar}
                  >
                    <FilePlus />{t("New Report")}</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canSetupReports}
                    onClick={() => handleTabChange("import")}
                  >
                    <FileSpreadsheet />{t("Import Excel")}</Button>
                  {activeReport && canSetupReports && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTabChange("setup")}
                      >
                        <Pencil />{t("Edit")}</Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                        onClick={handleDeleteReport}
                      >
                        <Trash2 />{t("Delete")}</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCloneReport}
                      >
                        <Copy />{t("Duplicate")}</Button>
                      {apiConfigured && (
                        <ReportHistory
                          key={reportKey(activeReport)}
                          report={activeReport}
                          isDirty={false}
                          onRestored={(restored) => {
                            setReports((currentReports) =>
                              currentReports.map((report) =>
                                reportKey(report) === reportKey({ ...restored, tenant: activeReport.tenant }) ? { ...restored, tenant: activeReport.tenant } : report,
                              ),
                            );
                            setSetupDraft({ ...restored, tenant: activeReport.tenant });
                            setIsSetupDirty(false);
                            setSetupUndoHistory([]);
                            lastSetupUndoGroupRef.current = null;
                            setReportCatalogError(null);
                          }}
                        />
                      )}
                    </>
                  )}
                </div>
              )}
            </section>
            <Card data-tour="report-filters" className="border border-border bg-card/95 shadow-none ring-0 data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary">
              <CardContent className="p-3">
                <div className="flex flex-col gap-2 2xl:flex-row 2xl:items-end 2xl:justify-between">
                  <div
                    className={`grid gap-2 sm:grid-cols-2 sm:items-end md:grid-cols-3 lg:grid-cols-4 2xl:flex-none ${activeReportUsesDayFilter ? "2xl:grid-cols-[180px_110px_180px_120px_88px_88px]" : "2xl:grid-cols-[180px_110px_180px_88px_88px]"}`}
                  >
                    <div className="min-w-0">
                      <MultiSelectDropdown
                        testIdPrefix="dept"
                        label="DEPT"
                        options={masterData.depts}
                        selected={globalDepts}
                        onChange={setGlobalDepts}
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="block text-xs font-medium text-muted-foreground">{t("Year")}</span>
                      <Input
                        type="number"
                        value={globalYear}
                        onChange={(event) => setGlobalYear(event.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="block text-xs font-medium text-muted-foreground">{t("Period")}</span>
                      <Select
                        value={globalPeriod}
                        onValueChange={setGlobalPeriod}
                      >
                        <SelectTrigger
                          className={`h-9 min-w-0 text-sm ${NEUTRAL_FILTER_TRIGGER_CLASS}`}
                        >
                          <SelectValue placeholder={t("Period")} />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {periodSelectOptions.map((option) => (
                            <SelectItem
                              key={option.id}
                              value={String(option.id)}
                            >
                              {t(option.label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {activeReportUsesDayFilter && (
                      <div className="space-y-1">
                        <label
                          htmlFor="view-day"
                          className="block text-xs font-medium text-muted-foreground"
                        >{t("Day")}</label>
                        <Input
                          id="view-day"
                          type="number"
                          min="1"
                          max="31"
                          value={globalDay}
                          onChange={(event) =>
                            setDayFilterState({
                              reportId: reportKey(activeReport),
                              reportDay: defaultReportDay,
                              globalDay: event.target.value,
                              appliedDay: activeReportDay,
                            })
                          }
                          className="h-9 text-sm"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <span className="block text-xs font-medium text-muted-foreground">{t("Budget revision")}</span>
                      <Select
                        value={globalRevision}
                        onValueChange={(nextValue) => {
                          if (!activeReportUsesBudget && nextValue !== "0") {
                            setGlobalRevision("0");
                            setAppliedRevision("0");
                            setAlertMsg(
                              "Revision selector is ignored for reports without budget columns.",
                            );
                            return;
                          }
                          setGlobalRevision(nextValue);
                        }}
                      >
                        <SelectTrigger
                          className={`h-9 w-full min-w-0 text-sm ${NEUTRAL_FILTER_TRIGGER_CLASS}`}
                        >
                          <SelectValue placeholder={t("Revision")} />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {revisionSelectOptions.map((option) => (
                            <SelectItem
                              key={option.id}
                              value={String(option.id)}
                            >
                              {t(option.label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      size="sm"
                      className="h-9 w-full self-end px-3 text-sm sm:w-auto sm:min-w-24 sm:justify-self-start"
                      onClick={handleApplyFilters}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <LoaderCircle className="animate-spin motion-reduce:animate-none" />
                      ) : null}
                      {isLoading ? t("Loading...") : t("Apply")}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 2xl:ml-4 2xl:flex-nowrap 2xl:self-end 2xl:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-9 w-full px-3 text-sm sm:w-auto ${NEUTRAL_BUTTON_CLASS}`}
                      onClick={exportToExcel}
                      title={t("Export to Excel")}
                    >
                      <Download />
                      Excel
                    </Button>
                    <Button
                      className={`h-9 w-full px-3 text-sm sm:w-9 sm:px-0 pointer-coarse:sm:w-11 ${NEUTRAL_BUTTON_CLASS}`}
                      size="sm"
                      variant="outline"
                      onClick={() => window.print()}
                      title={t("Print")}
                      aria-label={t("Print")}
                    >
                      <Printer />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div
          className={`min-h-0 flex-1 ${visibleActiveTab === "setup" ? "overflow-visible" : "overflow-hidden"} ${mainContentPaddingClass}`}
        >
          <div className={`${mainContentWidthClass} ${activeTabMotionClass}`}>
            {visibleActiveTab === "report" && (masterDataError || reportCatalogError) && reports.length === 0 ? (
              <Card className="mx-auto w-full max-w-[500px] border border-destructive/20 bg-destructive/5 shadow-none ring-0">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center sm:p-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-4">
                    <AlertTriangle className="size-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {masterDataError
                      ? t("Unable to load master data")
                      : t("Unable to load report catalog")}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    {masterDataError || reportCatalogError}
                  </p>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="h-9 border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:border-destructive/40 transition-colors gap-2"
                  >
                    <RefreshCw className="size-3.5" />{t("Retry")}</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {visibleActiveTab === "report" && activeReport && (
                  <React.Suspense
                    fallback={
                      <Card className="flex h-full min-h-0 items-center justify-center border border-border shadow-none ring-0">
                        <CardContent className="py-16 text-center text-sm text-muted-foreground">{t("Loading report view...")}</CardContent>
                      </Card>
                    }
                  >
                      <ReportView
                        activeReport={activeReport}
                        engineData={engineData}
                        budgetData={budgetData}
                        appliedDepts={appliedDepts}
                        appliedYear={appliedYear}
                        appliedPeriod={appliedPeriod}
                        appliedRevision={appliedBudgetRevision}
                        periodOptions={periodOptions}
                        masterData={masterData}
                        displayCompanyLabel={displayCompanyLabel}
                        displayDateLabel={displayDateLabel}
                        displayPeriodLabel={displayPeriodLabel}
                        remark={activeReport.remark}
                        reportData={reportData}
                        activeCols={activeCols}
                        currentTheme={currentTheme}
                        tableZoom={tableZoom}
                        getIndentClass={getIndentClass}
                      />
                  </React.Suspense>
                )}

                {visibleActiveTab === "report" && !activeReport && (
                  <Card className="flex h-full items-center justify-center border border-border shadow-none ring-0">
                    <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                      <h3 className="text-lg font-semibold text-foreground">{t("No reports yet")}</h3>
                      <p className="max-w-md text-sm text-muted-foreground">
                        {canSetupReports
                          ? t("Create a blank report or import an Excel workbook to get started.")
                          : t("No financial reports are available.")}
                      </p>
                      {canCreateReports && (
                        <Button
                          size="sm"
                          onClick={handleCreateReportFromSidebar}
                        >{t("New report")}</Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {visibleActiveTab === "setup" &&
                  canSetupReports &&
                  activeReport && (
                    <React.Suspense
                      fallback={
                        <Card className="flex h-full min-h-0 items-center justify-center border border-border shadow-none ring-0">
                          <CardContent className="py-16 text-center text-sm text-muted-foreground">{t("Loading setup tools...")}</CardContent>
                        </Card>
                      }
                    >
                      <ReportSetup
                        ref={setupGuideRef}
                        guideStoragePrefix={gettingStartedStorageKey}
                        themeMode={themeMode}
                        masterData={masterData}
                        reportOptions={reportOptions}
                        activeReport={setupReport}
                        savedReport={activeReport}
                        activeCategories={activeCategories}
                        updateActiveReport={updateActiveReport}
                        isDirty={isSetupDirty}
                        isSaving={isSetupSaving}
                        apiConfigured={apiConfigured}
                        onHistoryRestored={(restored) => {
                          const scopedRestored = activeReport.tenant ? { ...restored, tenant: activeReport.tenant } : restored;
                          setReports((currentReports) =>
                            currentReports.map((report) =>
                              reportKey(report) === reportKey(scopedRestored) ? scopedRestored : report,
                            ),
                          );
                          setSetupDraft(scopedRestored);
                          setIsSetupDirty(false);
                          setSetupUndoHistory([]);
                          lastSetupUndoGroupRef.current = null;
                          setReportCatalogError(null);
                        }}
                        onSave={handleSaveSetup}
                        onBack={() => handleTabChange("report")}
                        onCancel={handleCancelSetup}
                        onUndo={handleUndoSetup}
                        canUndo={setupUndoHistory.length > 0}
                        onBusyTransition={triggerPageTransition}
                        onOpenImport={() => handleTabChange("import")}
                        handleCloneReport={handleCloneReport}
                        handleCreateBlankReport={handleCreateBlankReport}
                        handleDeleteReport={handleDeleteReport}
                        handleAddCol={handleAddCol}
                        handleUpdateCol={handleUpdateCol}
                        moveCol={moveCol}
                        handleDeleteCol={handleDeleteCol}
                        handleAddRow={handleAddRow}
                        handleDuplicateRow={handleDuplicateRow}
                        handleDuplicateCol={handleDuplicateCol}
                        handleUpdateRow={handleUpdateRow}
                        handleUpdateRowMulti={handleUpdateRowMulti}
                        moveRow={moveRow}
                        handleDeleteRow={handleDeleteRow}
                        setEditingRow={setEditingRow}
                        setConfirmAction={requestConfirmation}
                      />
                    </React.Suspense>
                  )}

                {visibleActiveTab === "import" && canSetupReports && (
                  <React.Suspense
                    fallback={
                      <Card className="flex h-full min-h-0 items-center justify-center border border-border shadow-none ring-0">
                        <CardContent className="py-16 text-center text-sm text-muted-foreground">{t("Loading Excel template wizard...")}</CardContent>
                      </Card>
                    }
                  >
                    <ExcelTemplateImportWizard
                      ref={importGuideRef}
                      guideStoragePrefix={gettingStartedStorageKey}
                      companyName={
                        masterData.companyProfile.name ||
                        activeReport?.companyName ||
                        "Carmen Hotel & Resorts"
                      }
                      owner={currentUser?.id || ""}
                      departments={masterData.depts}
                      accountCodes={masterData.accCodes}
                      dimensions={dimensionDefinitions}
                      onImportTemplates={handleImportExcelTemplates}
                      onOpenImportedReport={(reportId) => {
                        if (reportId) setCurrentReportId(reportId);
                        handleTabChange("setup");
                      }}
                    />
                  </React.Suspense>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Button
        type="button"
        size="icon"
        className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 rounded-full shadow-md print:hidden"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label={t("Scroll to top")}
        title={t("Scroll to top")}
      >
        <ArrowUp />
      </Button>

      <React.Suspense fallback={null}>
        <GettingStartedTour
          canSetup={canSetupReports}
          open={isGettingStartedOpen && !isLoading && !isReportCatalogLoading}
          stepIndex={gettingStartedStep}
          onStepChange={setGettingStartedStep}
          onClose={closeGettingStarted}
        />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <EditMappingModal
          isOpen={!!editingRow}
          editingRow={editingRow}
          setEditingRow={setEditingRow}
          masterData={masterData}
          reportOptions={reportOptions}
          dimensionDefinitions={dimensionDefinitions}
          modalAccCategory={modalAccCategory}
          setModalAccCategory={setModalAccCategory}
          onOpenDetailSelector={({ field, title, subTitle, items }) =>
            setDetailSelecting({ field, title, subTitle, items })
          }
          onApply={() => {
            const nextAccCodes = String(editingRow.accCodes || "")
              .split(/[;,\n]/)
              .map((code) => code.trim())
              .filter(Boolean);
            const selectedCodes = new Set(nextAccCodes.map(normalizeAccLookupCode));
            const nextDimensions = dimensionDefinitions
              .map(({ key }) => ({ key, value: String(editingRow[key] || "").trim() }))
              .filter(({ value }) => value);
            const conflictingRows = setupReport.rows.filter((row) =>
              row.id !== editingRow.id &&
              rowDepartmentsOverlap(editingRow, row, masterData) &&
              rowDimensionsOverlap({ ...editingRow, dimensions: nextDimensions }, row) &&
              String(row.accCodes || "")
                .split(/[;,\n]/)
                .some((code) => selectedCodes.has(normalizeAccLookupCode(code.trim()))),
            );
            const conflictingCodes = [...new Set(conflictingRows.flatMap((row) =>
              String(row.accCodes || "")
                .split(/[;,\n]/)
                .map((code) => code.trim())
                .filter((code) => selectedCodes.has(normalizeAccLookupCode(code))),
            ))];
            if (conflictingCodes.length && !window.confirm(
              `Account code ${conflictingCodes.join(", ")} is already used in another row. Replace its current mapping?`,
            )) return;

            const updates = {
              desc: editingRow.desc,
              dept: editingRow.dept,
              deptGroup: editingRow.deptGroup,
              accCodes: nextAccCodes.join(", "),
              groupLevel: editingRow.groupLevel,
              groups: editingRow.groups,
              dimensions: nextDimensions,
              ...Object.fromEntries(
                dimensionDefinitions.map(({ key }) => [key, editingRow[key]]),
              ),
            };
            updateActiveReport({
              rows: setupReport.rows.map((row) => row.id === editingRow.id
                ? { ...row, ...updates }
                : conflictingRows.some((conflict) => conflict.id === row.id)
                  ? {
                      ...row,
                      accCodes: String(row.accCodes || "")
                        .split(/[;,\n]/)
                        .map((code) => code.trim())
                        .filter((code) => !conflictingCodes.some((conflict) =>
                          normalizeAccLookupCode(conflict) === normalizeAccLookupCode(code),
                        ))
                        .join(", "),
                    }
                  : row),
            });
            setEditingRow(null);
          }}
          onClose={() => setEditingRow(null)}
        />
      </React.Suspense>

      {detailSelecting && (
        <React.Suspense fallback={null}>
          <DetailSelectorModal
            masterData={masterData}
            title={detailSelecting.title}
            subTitle={detailSelecting.subTitle || "Select Items"}
            availableItems={detailSelecting.items}
            selectedItems={parseSelectedItems(
              editingRow[detailSelecting.field],
            )}
            onCancel={() => setDetailSelecting(null)}
            onSave={(newSelection) => {
              setEditingRow({
                ...editingRow,
                [detailSelecting.field]: newSelection.join(", "),
              });
              setDetailSelecting(null);
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
}
