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
  FileSpreadsheet,
  Menu,
  BarChart3,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Download,
  RefreshCw,
  Printer,
  LogOut,
  MoonStar,
  SunMedium,
  AlertTriangle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
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
import usePersistentState from "../hooks/usePersistentState.js";
import { getDefaultReports } from "../features/report/data/defaultReports.js";
import { createBlankReport } from "../features/report/data/reportTemplates.js";
import {
  cloneCarmenReport,
  deleteCarmenReport,
  fetchCarmenDimensions,
  fetchCarmenMasterData,
  fetchCarmenReportData,
  fetchCarmenReportOptions,
  fetchCarmenReports,
  getStoredCarmenSession,
  isCarmenApiConfigured,
  saveCarmenReport,
  saveCarmenReports,
} from "../features/report/lib/reportApi.js";
import {
  THEMES,
  INITIAL_MASTER_DATA,
  parseGlCsvText,
  parseBudgetCsvText,
  mergeAndSort,
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
} from "../features/report/lib/reportLogic.js";

const ReportView = React.lazy(
  () => import("../features/report/components/ReportView.jsx"),
);
const ReportSetup = React.lazy(
  () => import("../features/report/components/ReportSetup.jsx"),
);
const ExcelTemplateImportWizard = React.lazy(
  () =>
    import(
      "../features/report/components/ExcelTemplateImportWizard.jsx"
    ),
);
const AccessModal = React.lazy(
  () => import("../features/report/components/AccessModal.jsx"),
);
const EditMappingModal = React.lazy(
  () => import("../features/report/components/EditMappingModal.jsx"),
);
const DetailSelectorModal = React.lazy(
  () => import("../features/report/components/DetailSelectorModal.jsx"),
);

const hasFinancialReportPermission = (user) =>
  Boolean(user?.permissions?.financialReport);

const canSetupFinancialReports = (user) => {
  const permission = user?.permissions?.financialReport;
  if (permission) {
    return Boolean(
      permission.setup ||
      permission.add ||
      permission.update ||
      permission.delete,
    );
  }
  return user?.role === "Admin";
};

const canViewFinancialReports = (user) => {
  const permission = user?.permissions?.financialReport;
  if (permission) {
    return Boolean(
      permission.view ||
      permission.setup ||
      permission.add ||
      permission.update ||
      permission.delete,
    );
  }
  return Boolean(user);
};

const getAccessibleReports = (reports, user) => {
  if (!canViewFinancialReports(user)) return [];
  if (canSetupFinancialReports(user)) return reports;
  const userId = String(user?.id || "").trim();
  return reports.filter((report) => {
    if (report?.isActive === false) return false;
    if (String(report?.owner || "").trim() === userId) return true;
    if (
      Array.isArray(report?.assignedUsers) &&
      report.assignedUsers.includes(userId)
    )
      return true;
    return (
      Array.isArray(report?.access) &&
      report.access.some(
        (item) =>
          String(item?.userId || "").trim() === userId &&
          item?.canView !== false,
      )
    );
  });
};

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
    { id: "AC", label: "AC (Actual Month)" },
    { id: "ACC", label: "ACC (Actual YTD)" },
    { id: "DACBG", label: "DACBG" },
    { id: "PTDBG", label: "PTDBG" },
    { id: "BC", label: "BC (Budget Month)" },
    { id: "BCC", label: "BCC (Budget YTD)" },
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

const DAILY_COLUMN_TYPES = new Set(["DAC", "PTD", "DACBG", "PTDBG"]);
const MONTHLY_COLUMN_TYPES = new Set([
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
  yearModes: mergeOptionArrays(defaults.yearModes, loaded?.yearModes),
  periodModes: mergeOptionArrays(defaults.periodModes, loaded?.periodModes),
  rowTypes: mergeOptionArrays(defaults.rowTypes, loaded?.rowTypes),
  indentLevels: mergeOptionArrays(defaults.indentLevels, loaded?.indentLevels),
});

const REPORT_STORAGE_KEY = "carmen_bi_reports_config_v5_23";
const NEUTRAL_BUTTON_CLASS =
  "border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150";
const NEUTRAL_FILTER_TRIGGER_CLASS =
  "border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150";
const MODE_SWITCH_CLASS =
  "inline-flex items-center rounded-xl border border-border bg-muted/60 p-1 shadow-inner";
const ACTIVE_MODE_CLASS =
  "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20 transition-all duration-150";
const INACTIVE_MODE_CLASS =
  "text-muted-foreground hover:bg-background hover:text-foreground transition-all duration-150";

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
export default function App({ onLogout = null }) {
  const [activeTab, setActiveTab] = useState("report");
  const [tabMotionDirection, setTabMotionDirection] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [themeMode, setThemeMode] = useState(() => getStoredTheme());
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [isSetupSaving, setIsSetupSaving] = useState(false);

  const [alertMsg, setAlertMsg] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const [masterData, setMasterData] = usePersistentState(
    "carmen_bi_master_v5_23",
    INITIAL_MASTER_DATA,
  );
  const [periodOptions, setPeriodOptions] = useState([]);
  const [budgetRevisionOptions, setBudgetRevisionOptions] = useState([]);
  const [reportOptions, setReportOptions] = useState(DEFAULT_REPORT_OPTIONS);
  const [masterDataError, setMasterDataError] = useState(null);
  const [isMasterDataLoading, setIsMasterDataLoading] = useState(false);
  const [isReportCatalogLoading, setIsReportCatalogLoading] = useState(false);
  const [reportCatalogError, setReportCatalogError] = useState(null);
  const apiConfigured = isCarmenApiConfigured();
  const storedCarmenSession = apiConfigured ? getStoredCarmenSession() : null;

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

  const [appliedDepts, setAppliedDepts] = useState([]);
  const [appliedYear, setAppliedYear] = useState(createCurrentYearValue);
  const [appliedPeriod, setAppliedPeriod] = useState("2");
  const [appliedRevision, setAppliedRevision] = useState("0");

  const [engineData, setEngineData] = useState([]);
  const [budgetData, setBudgetData] = useState([]);
  const [apiDimensions, setApiDimensions] = useState([]);
  const dimensionOptions = useMemo(() => Object.fromEntries(
    ["dim1", "dim2"].map((field) => [
      field,
      apiDimensions.length > 0 ? apiDimensions : [...new Set([...engineData, ...budgetData]
        .map((row) => String(row?.[field] ?? row?.[field.toUpperCase()] ?? "").trim())
        .filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })),
    ]),
  ), [apiDimensions, budgetData, engineData]);
  const glUploadRef = useRef(null);
  const budUploadRef = useRef(null);
  const reportSaveTimerRef = useRef(null);
  const pageTransitionTimerRef = useRef(null);
  const reportDataFetchSkipRef = useRef(false);

  // --- Report Configuration Data ---
  const [reports, setReports] = useState(() => {
    if (apiConfigured) return [];
    return readStoredReports() || getDefaultReports();
  });
  const [reportsLoaded, setReportsLoaded] = useState(!apiConfigured);
  const [currentReportId, setCurrentReportId] = useState("rep-carmen-pnl");
  const [editingRow, setEditingRow] = useState(null);
  const [detailSelecting, setDetailSelecting] = useState(null);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [modalAccCategory, setModalAccCategory] = useState("ALL");
  const isMobile = useIsMobile();
  const canSetupReports = canSetupFinancialReports(currentUser);
  const accessibleReports = useMemo(
    () => getAccessibleReports(reports, currentUser),
    [reports, currentUser],
  );
  const resolvedCurrentReportId = useMemo(() => {
    if (accessibleReports.some((report) => report.id === currentReportId)) {
      return currentReportId;
    }

    return accessibleReports[0]?.id || null;
  }, [accessibleReports, currentReportId]);
  const reportUsers = useMemo(() => {
    const users = Array.isArray(masterData.users) ? masterData.users : [];
    if (!currentUser?.id) return users;
    if (users.some((user) => String(user.id) === String(currentUser.id)))
      return users;
    return [currentUser, ...users];
  }, [masterData.users, currentUser]);

  const activeReport =
    accessibleReports.find((r) => r.id === resolvedCurrentReportId) ||
    accessibleReports[0] ||
    null;
  const activeReportUsesDayFilter = useMemo(() => {
    if (!activeReport) return false;
    if (activeReport.reportType === "Daily") return true;
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
  const activeReportDay = activeReportUsesDayFilter
    ? activeReport?.day || ""
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
  const activeReportHasIncompatibleColumns = useMemo(() => {
    if (!activeReport) return false;
    const allowedTypes =
      activeReport.reportType === "Daily"
        ? DAILY_COLUMN_TYPES
        : MONTHLY_COLUMN_TYPES;
    return (
      Array.isArray(activeReport.columns) &&
      activeReport.columns.some((col) => {
        const type = String(col?.type || "")
          .trim()
          .toUpperCase();
        return Boolean(type) && !allowedTypes.has(type);
      })
    );
  }, [activeReport]);
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
      if (!apiConfigured || !activeReport?.id) return null;

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

      setIsLoading(true);
      try {
        const apiData = await fetchCarmenReportData({
          reportId: reportId || activeReport.id,
          year,
          period,
          revision,
          deptIds,
          day,
        });

        setEngineData(apiData.actualRows || []);
        setBudgetData(apiData.budgetRows || []);
        setAlertMsg(null);
        return apiData;
      } catch (error) {
        const message =
          error.message || `Unable to load Carmen ${source} data.`;
        setAlertMsg(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [apiConfigured, activeReport, activeReportUsesDayFilter, periodOptions],
  );

  useEffect(() => {
    if (!apiConfigured || !/^\d{4}$/.test(String(globalYear))) return;

    let isCancelled = false;
    const loadCarmenMasterData = async () => {
      setIsMasterDataLoading(true);
      try {
        const [apiData, dimensions] = await Promise.all([
          fetchCarmenMasterData({ year: globalYear }),
          fetchCarmenDimensions().catch(() => []),
        ]);
        if (isCancelled) return;

        setApiDimensions(dimensions);
        setMasterData((prev) => ({
          ...prev,
          companyProfile: apiData.companyProfile || prev.companyProfile,
          users:
            Array.isArray(apiData.users) && apiData.users.length > 0
              ? apiData.users
              : apiData.currentUser
                ? [apiData.currentUser]
                : prev.users,
          depts: apiData.depts.length > 0 ? apiData.depts : prev.depts,
          accCodes:
            apiData.accCodes.length > 0 ? apiData.accCodes : prev.accCodes,
          groups: {
            L1:
              apiData.groups?.L1?.length > 0
                ? apiData.groups.L1
                : prev.groups.L1,
            L2:
              apiData.groups?.L2?.length > 0
                ? apiData.groups.L2
                : prev.groups.L2,
            L3:
              apiData.groups?.L3?.length > 0
                ? apiData.groups.L3
                : prev.groups.L3,
            L4:
              apiData.groups?.L4?.length > 0
                ? apiData.groups.L4
                : prev.groups.L4,
          },
        }));
        if (apiData.currentUser) setCurrentUser(apiData.currentUser);
        else if (Array.isArray(apiData.users) && apiData.users.length > 0)
          setCurrentUser(apiData.users[0]);
        setPeriodOptions(apiData.periods || []);
        setBudgetRevisionOptions(apiData.budgetRevisions || []);
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
        if (!isCancelled) setIsMasterDataLoading(false);
      }
    };

    loadCarmenMasterData();
    return () => {
      isCancelled = true;
    };
  }, [globalYear, apiConfigured, onLogout, setMasterData]);

  useEffect(() => {
    if (!apiConfigured) return;

    let isCancelled = false;
    const loadCarmenCatalog = async () => {
      setIsReportCatalogLoading(true);
      try {
        const [optionsResult, reportsResult] = await Promise.allSettled([
          fetchCarmenReportOptions(),
          fetchCarmenReports(),
        ]);
        if (isCancelled) return;

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
          const fallbackReports = readStoredReports() || getDefaultReports();
          setReports(fallbackReports);
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
          const fallbackReports = readStoredReports() || getDefaultReports();
          setReports(fallbackReports);
          setReportsLoaded(true);
          setReportCatalogError(
            error.message || "Unable to load Carmen report catalog.",
          );
        }
      } finally {
        if (!isCancelled) setIsReportCatalogLoading(false);
      }
    };

    loadCarmenCatalog();
    return () => {
      isCancelled = true;
    };
  }, [apiConfigured, onLogout]);

  useEffect(() => {
    if (!reportsLoaded) return;
    writeStoredReports(reports);
  }, [reports, reportsLoaded]);

  useEffect(() => {
    if (
      !apiConfigured ||
      !/^\d{4}$/.test(String(appliedYear)) ||
      !activeReport?.id
    )
      return;
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
    activeReportDay,
    activeReportUsesDayFilter,
    periodOptions,
    apiConfigured,
    loadReportDataFromApi,
  ]);

  useEffect(() => {
    if (!apiConfigured || !activeReport?.id) return undefined;

    const brokenReferences = findBrokenReferences(activeReport);
    if (brokenReferences.length > 0) {
      setReportCatalogError(
        `Report contains ${brokenReferences.length} unresolved reference(s). Resolve invalid row or column references before saving.`,
      );
      return undefined;
    }

    const mappingConflicts = findRowMappingConflicts(activeReport, masterData);
    if (mappingConflicts.length > 0) {
      setReportCatalogError(
        `Report contains ${mappingConflicts.length} conflicting row mapping(s). Resolve mapping conflicts before saving.`,
      );
      return undefined;
    }

    if (activeReportHasIncompatibleColumns) {
      setReportCatalogError(
        `${activeReport.reportType || "Monthly"} reports should only use compatible column types. Update any mismatched columns before saving.`,
      );
      return undefined;
    }

    if (reportSaveTimerRef.current) {
      clearTimeout(reportSaveTimerRef.current);
    }

    setReportCatalogError(null);
    reportSaveTimerRef.current = setTimeout(() => {
      setIsSetupSaving(true);
      saveCarmenReport(activeReport)
        .then(() => {
          setReportCatalogError(null);
        })
        .catch((error) => {
          setReportCatalogError(
            error.message || "Unable to save report definition.",
          );
        })
        .finally(() => {
          setIsSetupSaving(false);
        });
    }, 350);

    return () => {
      if (reportSaveTimerRef.current) {
        clearTimeout(reportSaveTimerRef.current);
      }
    };
  }, [
    activeReport,
    apiConfigured,
    activeReportHasIncompatibleColumns,
    masterData,
  ]);

  // ============================================================================
  // 🚀 CSV PARSER
  // ============================================================================
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (apiConfigured) {
      e.target.value = null;
      return;
    }
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const parsed = parseGlCsvText(event.target.result);
      if (parsed.error) {
        setAlertMsg("ไฟล์ CSV ไม่ถูกต้อง หรือไม่มีข้อมูล");
        setIsLoading(false);
        return;
      }
      const {
        parsedData,
        newDeptsMap,
        newAccCodesMap,
        newGroups,
        detectedYear,
      } = parsed;

      setMasterData((prev) => ({
        ...prev,
        depts: mergeAndSort(prev.depts, newDeptsMap),
        accCodes: mergeAndSort(prev.accCodes, newAccCodesMap),
        groups: {
          L1: mergeAndSort(prev.groups.L1, newGroups.L1),
          L2: mergeAndSort(prev.groups.L2, newGroups.L2),
          L3: mergeAndSort(prev.groups.L3, newGroups.L3),
          L4: mergeAndSort(prev.groups.L4, newGroups.L4),
        },
      }));

      if (detectedYear) {
        setGlobalYear(detectedYear);
        setAppliedYear(detectedYear);
      }

      setEngineData(parsedData);
      setIsLoading(false);
      setAlertMsg(
        `โหลดข้อมูล Transaction (GL) สำเร็จ ${parsedData.length} รายการ!\n(อัปเดตตัวกรองปีเป็น ${detectedYear || "ปัจจุบัน"} ให้อัตโนมัติแล้ว)`,
      );
    };
    reader.onerror = () => {
      setAlertMsg("เกิดข้อผิดพลาดในการอ่านไฟล์");
      setIsLoading(false);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleBudgetUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (apiConfigured) {
      e.target.value = null;
      return;
    }
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const parsed = parseBudgetCsvText(event.target.result);
      if (parsed.error) {
        setAlertMsg("ไฟล์ Budget CSV ไม่ถูกต้อง");
        setIsLoading(false);
        return;
      }
      const { parsedData, newDeptsMap, newAccCodesMap } = parsed;

      setMasterData((prev) => ({
        ...prev,
        depts: mergeAndSort(prev.depts, newDeptsMap),
        accCodes: mergeAndSort(prev.accCodes, newAccCodesMap),
      }));

      setBudgetData(parsedData);
      setIsLoading(false);
      setAlertMsg(`โหลดข้อมูล Budget สำเร็จ!`);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const updateActiveReport = (updates) => {
    if (!activeReport) return;
    setReports((prevReports) =>
      prevReports.map((r) =>
        r.id === activeReport.id ? { ...r, ...updates } : r,
      ),
    );
  };

  const handleApplyFilters = () => {
    setAppliedDepts([...globalDepts]);
    setAppliedYear(globalYear);
    setAppliedPeriod(globalPeriod);
    const nextRevision = activeReportUsesBudget ? globalRevision : "0";
    if (!activeReportUsesBudget && String(globalRevision) !== "0") {
      setAlertMsg(
        "Revision selector is ignored for reports without budget columns.",
      );
    }
    setGlobalRevision(nextRevision);
    setAppliedRevision(nextRevision);
  };

  const handleSyncReportData = async (source) => {
    if (!apiConfigured) {
      if (source === "gl") {
        glUploadRef.current?.click();
      } else {
        budUploadRef.current?.click();
      }
      return;
    }

    const nextAppliedDepts = [...globalDepts];
    const nextAppliedYear = globalYear;
    const nextAppliedPeriod = globalPeriod;
    const nextAppliedRevision = activeReportUsesBudget ? globalRevision : "0";

    reportDataFetchSkipRef.current = true;
    setAppliedDepts(nextAppliedDepts);
    setAppliedYear(nextAppliedYear);
    setAppliedPeriod(nextAppliedPeriod);
    setGlobalRevision(nextAppliedRevision);
    setAppliedRevision(nextAppliedRevision);

    try {
      await loadReportDataFromApi({
        reportId: activeReport?.id,
        year: nextAppliedYear,
        period: nextAppliedPeriod,
        revision: nextAppliedRevision,
        deptIds: nextAppliedDepts,
        day: activeReportDay,
        source,
      });
      setAlertMsg(`${source.toUpperCase()} data synced from Carmen API.`);
    } catch {
      // Error already surfaced by loadReportDataFromApi.
    }
  };

  const handleCloneReport = async () => {
    if (!activeReport) return;
    if (apiConfigured) {
      try {
        const apiClone = await cloneCarmenReport(activeReport.id);
        if (apiClone) {
          setReports((prev) => [...prev, apiClone]);
          setCurrentReportId(apiClone.id);
          return;
        }
      } catch (error) {
        setReportCatalogError(
          error.message || "Unable to clone report in Carmen API.",
        );
      }
    }

    const newId = "rep-" + Date.now();
    const clonedReport = cloneReport(
      activeReport,
      newId,
      currentUser?.id || "",
    );
    setReports((prev) => [...prev, clonedReport]);
    setCurrentReportId(newId);
  };

  const handleCreateBlankReport = async () => {
    const newId = "rep-" + Date.now();
    const newReport = createBlankReport(
      masterData.companyProfile.name,
      reportUsers.map((u) => u.id),
      newId,
      currentUser?.id || "",
    );
    setReports((prev) => [...prev, newReport]);
    setCurrentReportId(newId);
    if (apiConfigured) {
      try {
        await saveCarmenReport(newReport);
      } catch (error) {
        setReportCatalogError(
          error.message || "Unable to save new report to Carmen API.",
        );
      }
    }
  };

  const handleImportExcelTemplates = async (importedReports) => {
    if (!Array.isArray(importedReports) || importedReports.length === 0) return;
    if (apiConfigured) {
      await saveCarmenReports(importedReports);
    }
    setReports((currentReports) => [...currentReports, ...importedReports]);
    setCurrentReportId(importedReports[0].id);
  };

  const handleDeleteReport = () => {
    setConfirmAction({
      msg: "Are you sure you want to completely delete this report?",
      onConfirm: async () => {
        const deletedReport = activeReport;
        const newReports = reports.filter((r) => r.id !== currentReportId);
        setReports(newReports);
        setCurrentReportId(newReports.length > 0 ? newReports[0].id : null);
        if (apiConfigured && deletedReport?.id) {
          try {
            await deleteCarmenReport(deletedReport.id);
          } catch (error) {
            setReportCatalogError(
              error.message || "Unable to delete report from Carmen API.",
            );
          }
        }
      },
    });
  };

  // --- ENGINE ---
  const reportData = useMemo(
    () =>
      buildReportData({
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
      }),
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
    ],
  );

  // --- Handlers ---
  const handleUpdateRow = (id, field, val) =>
    updateActiveReport({
      rows: activeReport.rows.map((r) =>
        r.id === id ? { ...r, [field]: val } : r,
      ),
    });
  const handleUpdateRowMulti = (id, updates) =>
    updateActiveReport({
      rows: activeReport.rows.map((r) =>
        r.id === id ? { ...r, ...updates } : r,
      ),
    });
  const handleUpdateCol = (id, field, val) =>
    updateActiveReport({
      columns: activeReport.columns.map((c) =>
        c.id === id ? { ...c, [field]: val } : c,
      ),
    });

  const handleAddCol = (type) => {
    const newColId = "C" + (activeReport.columns.length + 1) + "-" + Date.now();
    const defaultDataType = activeReport?.reportType === "Daily" ? "DAC" : "AC";
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
    const descriptionPosition = Number(activeReport.descriptionPosition);
    updateActiveReport({
      columns: [...activeReport.columns, newCol],
      ...(Number.isInteger(descriptionPosition) && descriptionPosition === activeReport.columns.length
        ? { descriptionPosition: descriptionPosition + 1 }
        : {}),
    });
  };

  const handleAddRow = (type) => {
    const lastRow =
      activeReport.rows.length > 0
        ? activeReport.rows[activeReport.rows.length - 1]
        : null;
    const newRow = {
      id: "r-" + Date.now(),
      desc:
        type === "header"
          ? "HEADER"
          : type === "formula"
            ? "Total"
            : "New Line",
      isActive: true,
      isTotal: type === "formula",
      isHeader: type === "header",
      dept: "",
      deptGroup: "",
      accCodes: "",
      groupLevel: "L4",
      groups: "",
      percentBase: lastRow ? lastRow.percentBase : "",
      formula: type === "formula" ? "R1+R2" : "",
      indent: lastRow ? lastRow.indent : 0,
    };
    updateActiveReport({ rows: [...activeReport.rows, newRow] });
  };

  const handleDeleteRow = (rowId) => {
    updateActiveReport(deleteRowAndRewriteReferences(activeReport, rowId));
  };

  const handleDeleteCol = (colId) => {
    const deletedIndex = activeReport.columns.findIndex((column) => column.id === colId);
    const nextReport = deleteColAndRewriteReferences(activeReport, colId);
    const descriptionPosition = Number(activeReport.descriptionPosition);
    updateActiveReport({
      ...nextReport,
      ...(Number.isInteger(descriptionPosition) && deletedIndex >= 0 && deletedIndex < descriptionPosition
        ? { descriptionPosition: descriptionPosition - 1 }
        : {}),
    });
  };

  const persistActiveReport = async (nextReport) => {
    if (!apiConfigured || !nextReport) return;

    try {
      await saveCarmenReport(nextReport);
      setReportCatalogError(null);
    } catch (error) {
      setReportCatalogError(
        error.message || "Unable to save report definition.",
      );
    }
  };

  const moveCol = (idx, dir) => {
    updateActiveReport(moveColumnsAndRewriteReferences(activeReport, idx, dir));
  };

  const moveRow = (idx, dir) => {
    updateActiveReport(moveRowsAndRewriteReferences(activeReport, idx, dir));
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
  const autoDateLabel = selectedAppliedPeriod?.dateLabel
    ? `As of ${selectedAppliedPeriod.dateLabel}`
    : `As of ${formatAutoPeriod(appliedYear, appliedPeriod, "end_of_month")}`;
  const displayDateLabel =
    activeReport?.overrideDateDisplay ||
    activeReport?.customDateLabel ||
    autoDateLabel;
  const autoPeriodLabel = selectedAppliedPeriod?.dateLabel
    ? `Period : ${appliedYear}-${selectedPeriodCode}${selectedAppliedPeriod.status ? ` (${selectedAppliedPeriod.status})` : ""}`
    : activeReport?.periodFormat !== "standard"
      ? formatAutoPeriod(appliedYear, appliedPeriod, activeReport?.periodFormat)
      : formatAutoPeriod(appliedYear, appliedPeriod, "standard");
  const displayPeriodLabel =
    activeReport?.overridePeriodDisplay ||
    activeReport?.customPeriodLabel ||
    autoPeriodLabel;
  const activeCategories = Array.isArray(activeReport?.category)
    ? activeReport.category
    : ["ALL"];
  const activeCols = useMemo(
    () => activeReport?.columns?.filter((c) => c.isActive) || [],
    [activeReport],
  );
  const userSelectorLabel = hasFinancialReportPermission(currentUser)
    ? "Signed In As:"
    : "View As Role:";

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
  };

  const currentTheme = THEMES[activeReport?.theme || "blue"];
  const showPageSkeleton = isPageTransitioning || isSetupSaving;
  const visibleActiveTab = canSetupReports ? activeTab : "report";
  const activeTabMotionClass =
    tabMotionDirection === null
      ? ""
      : visibleActiveTab === "report"
        ? "app-pane-enter-from-left"
        : "app-pane-enter-from-right";
  const mainContentPaddingClass = "p-3";
  const mainContentWidthClass =
    visibleActiveTab === "setup" || visibleActiveTab === "import"
      ? "flex h-full w-full min-h-0 flex-col"
      : "flex h-full w-full min-h-0 flex-col gap-3";

  const handleTabChange = (nextTab) => {
    if (nextTab === visibleActiveTab) return;
    if ((nextTab === "setup" || nextTab === "import") && !canSetupReports)
      return;
    setTabMotionDirection(
      nextTab === "report" ? "backward" : "forward",
    );
    setActiveTab(nextTab);
  };

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
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BarChart3 className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">BI HUB</div>
            <div className="text-xs text-muted-foreground">
              Financial reporting
            </div>
          </div>
        </div>
      </div>

      <div className="border-b p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="size-4" />
          {userSelectorLabel}
        </div>
        <Select
          aria-label="User selector"
          value={currentUser?.id || ""}
          onValueChange={(value) => {
            const selectedUser = reportUsers.find((user) => user.id === value);
            if (!selectedUser) return;
            const selectedReports = getAccessibleReports(reports, selectedUser);
            setCurrentUser(selectedUser);
            if (
              !selectedReports.some(
                (report) => report.id === resolvedCurrentReportId,
              )
            ) {
              setCurrentReportId(selectedReports[0]?.id || null);
            }
            if (!canSetupFinancialReports(selectedUser)) {
              setActiveTab("report");
            }
          }}
        >
          <SelectTrigger className="h-10 w-full rounded-xl">
            <SelectValue placeholder="Select user" />
          </SelectTrigger>
          <SelectContent position="popper">
            {reportUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({canSetupFinancialReports(user) ? "Admin" : "User"}
                )
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {canSetupReports && (
            <>
              <div className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Template tools
              </div>
              <Button
                variant={visibleActiveTab === "import" ? "secondary" : "ghost"}
                className="mb-4 w-full justify-start gap-2"
                onClick={() => {
                  handleTabChange("import");
                  setIsSidebarOpen(false);
                }}
              >
                <FileSpreadsheet className="size-4" />
                <span className="truncate">Import Excel templates</span>
              </Button>
            </>
          )}
          <div className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Reports
          </div>
          <div className="flex flex-col gap-1">
            {accessibleReports.map((report) => (
              <Button
                key={report.id}
                variant={
                  resolvedCurrentReportId === report.id ? "secondary" : "ghost"
                }
                className="w-full justify-start gap-2"
                onClick={() => {
                  setCurrentReportId(report.id);
                  handleTabChange("report");
                  setIsSidebarOpen(false);
                }}
              >
                <FileText className="size-4" />
                <span className="truncate">{report.name}</span>
              </Button>
            ))}
          </div>
          {accessibleReports.length === 0 && (
            <div className="px-2 py-8 text-sm text-muted-foreground">
              No reports available.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {alertMsg && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4 sm:right-4 sm:left-auto sm:w-full sm:max-w-136 sm:px-0">
          <Card className="pointer-events-auto mx-auto w-full max-w-136 border border-border/80 bg-background/98 shadow-xl ring-1 ring-black/5 backdrop-blur-sm">
            <CardHeader className="space-y-1.5 pb-3">
              <CardTitle className="text-base tracking-tight">Notice</CardTitle>
              <CardDescription className="whitespace-pre-line text-sm leading-6">
                {alertMsg}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAlertMsg(null)}
              >
                OK
              </Button>
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

      <AlertDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm action</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.msg || ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmAction(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                confirmAction?.onConfirm?.();
                setConfirmAction(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isMobile ? (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Reports</SheetTitle>
              <SheetDescription>
                Report navigation and user switching.
              </SheetDescription>
            </SheetHeader>
            {sidebarPanel}
          </SheetContent>
        </Sheet>
      ) : (
        <aside className="hidden w-80 flex-col border-r bg-background/95 lg:flex print:hidden">
          {sidebarPanel}
        </aside>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
          <div className={`flex flex-col gap-3 px-3 py-3`}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsSidebarOpen(true)}
                  >
                    <Menu />
                    <span className="sr-only">Open navigation</span>
                  </Button>
                )}

                <div className={MODE_SWITCH_CLASS}>
                  <Button
                    type="button"
                    variant="ghost"
                    className={`h-8 px-4 ${visibleActiveTab === "report" ? ACTIVE_MODE_CLASS : INACTIVE_MODE_CLASS}`}
                    onClick={() => handleTabChange("report")}
                    aria-current={
                      visibleActiveTab === "report" ? "page" : undefined
                    }
                  >
                    VIEW
                  </Button>
                  {canSetupReports && (
                    <Button
                      type="button"
                      variant="ghost"
                      className={`h-8 px-4 ${visibleActiveTab === "setup" ? ACTIVE_MODE_CLASS : INACTIVE_MODE_CLASS}`}
                      onClick={() => handleTabChange("setup")}
                      aria-current={
                        visibleActiveTab === "setup" ? "page" : undefined
                      }
                    >
                      SETUP
                    </Button>
                  )}
                  {canSetupReports && (
                    <Button
                      type="button"
                      variant="ghost"
                      className={`h-8 px-4 ${visibleActiveTab === "import" ? ACTIVE_MODE_CLASS : INACTIVE_MODE_CLASS}`}
                      onClick={() => handleTabChange("import")}
                      aria-current={
                        visibleActiveTab === "import" ? "page" : undefined
                      }
                    >
                      IMPORT
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {visibleActiveTab === "setup" && (
                    <Badge variant="secondary">Configuration</Badge>
                  )}
                  {visibleActiveTab === "import" && (
                    <Badge variant="secondary">Excel template wizard</Badge>
                  )}
                  {isMasterDataLoading && (
                    <Badge variant="outline">Syncing master data</Badge>
                  )}
                  {isReportCatalogLoading && (
                    <Badge variant="outline">Loading catalog</Badge>
                  )}
                  {masterDataError && (
                    <Badge
                      variant="destructive"
                      title={masterDataError}
                      className="rounded-full border-destructive/30 bg-destructive/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-destructive"
                    >
                      Carmen API unavailable
                    </Badge>
                  )}
                  {reportCatalogError && (
                    <Badge
                      variant="destructive"
                      title={reportCatalogError}
                      className="rounded-full border-destructive/30 bg-destructive/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-destructive"
                    >
                      Report catalog error
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 xl:max-w-168 xl:items-end">
                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  {visibleActiveTab === "report" && (
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-card/80 px-2 py-1 shadow-sm">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() =>
                          setTableZoom((current) => Math.max(50, current - 10))
                        }
                        aria-label="Zoom out"
                        title="Zoom out"
                      >
                        <ZoomOut className="size-3.5" />
                      </Button>
                      <Slider
                        value={[tableZoom]}
                        min={50}
                        max={150}
                        step={10}
                        onValueChange={(value) => setTableZoom(value[0] || 100)}
                        className="w-20 min-w-20"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() =>
                          setTableZoom((current) => Math.min(150, current + 10))
                        }
                        aria-label="Zoom in"
                        title="Zoom in"
                      >
                        <ZoomIn className="size-3.5" />
                      </Button>
                      <span className="w-9 text-right text-[11px] font-medium tabular-nums text-foreground/70">
                        {tableZoom}%
                      </span>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={NEUTRAL_BUTTON_CLASS}
                    onClick={() => {
                      setThemeMode(themeMode === "light" ? "dark" : "light");
                    }}
                    aria-pressed={themeMode === "dark"}
                    aria-label={
                      themeMode === "light"
                        ? "Switch to dark mode"
                        : "Switch to light mode"
                    }
                  >
                    {themeMode === "light" ? <MoonStar /> : <SunMedium />}
                    <span>
                      {themeMode === "light" ? "Dark mode" : "Light mode"}
                    </span>
                  </Button>
                  {typeof onLogout === "function" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={NEUTRAL_BUTTON_CLASS}
                      onClick={onLogout}
                    >
                      <LogOut />
                      Logout
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {visibleActiveTab === "report" && (
              <Card className="border border-border bg-card/95 shadow-none ring-0">
                <CardContent className="p-3">
                  <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
                    <div className="grid gap-2 sm:grid-cols-2 sm:items-end xl:flex-none xl:grid-cols-[180px_110px_180px_120px_88px]">
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
                        <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Year
                        </span>
                        <Input
                          type="number"
                          value={globalYear}
                          onChange={(event) =>
                            setGlobalYear(event.target.value)
                          }
                          className="h-8 rounded-lg px-2.5 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Period
                        </span>
                        <Select
                          value={globalPeriod}
                          onValueChange={setGlobalPeriod}
                        >
                          <SelectTrigger
                            size="sm"
                            className={`h-8 min-w-0 rounded-lg px-2.5 text-sm ${NEUTRAL_FILTER_TRIGGER_CLASS}`}
                          >
                            <SelectValue placeholder="Period" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {periodSelectOptions.map((option) => (
                              <SelectItem
                                key={option.id}
                                value={String(option.id)}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Rev
                        </span>
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
                            size="sm"
                            className={`h-8 w-full min-w-0 rounded-lg px-2.5 text-sm ${NEUTRAL_FILTER_TRIGGER_CLASS}`}
                          >
                            <SelectValue placeholder="Revision" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {revisionSelectOptions.map((option) => (
                              <SelectItem
                                key={option.id}
                                value={String(option.id)}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        size="sm"
                        className={`h-8 w-full self-end border px-3 text-xs xl:w-auto ${NEUTRAL_BUTTON_CLASS}`}
                        onClick={handleApplyFilters}
                      >
                        Apply
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:ml-4 xl:flex-nowrap xl:self-end xl:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`h-8 w-full sm:w-auto ${NEUTRAL_BUTTON_CLASS}`}
                        onClick={() => handleSyncReportData("gl")}
                        title={
                          apiConfigured
                            ? "Refresh GL data from Carmen API"
                            : "Fallback to GL CSV import"
                        }
                      >
                        <RefreshCw />
                        GL
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`h-8 w-full sm:w-auto ${NEUTRAL_BUTTON_CLASS}`}
                        onClick={() => handleSyncReportData("bud")}
                        title={
                          apiConfigured
                            ? "Refresh budget data from Carmen API"
                            : "Fallback to budget CSV import"
                        }
                      >
                        <RefreshCw />
                        BUD
                      </Button>
                      <input
                        ref={glUploadRef}
                        type="file"
                        accept=".csv"
                        aria-label="Upload GL CSV"
                        onChange={(e) => handleFileUpload(e)}
                        className="hidden"
                      />
                      <input
                        ref={budUploadRef}
                        type="file"
                        accept=".csv"
                        aria-label="Upload budget CSV"
                        onChange={(e) => handleBudgetUpload(e)}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-8 w-full px-3 text-xs sm:w-auto ${NEUTRAL_BUTTON_CLASS}`}
                        onClick={exportToExcel}
                        title="Export to Excel"
                      >
                        <Download />
                        Excel
                      </Button>
                      <Button
                        className={`h-8 w-full px-3 text-xs sm:w-auto ${NEUTRAL_BUTTON_CLASS}`}
                        size="sm"
                        variant="outline"
                        onClick={() => window.print()}
                        title="Print"
                      >
                        <Printer />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </header>

        <div
          className={`min-h-0 flex-1 overflow-hidden ${mainContentPaddingClass}`}
        >
          <div className={`${mainContentWidthClass} ${activeTabMotionClass}`}>
            {(masterDataError || reportCatalogError) && reports.length === 0 ? (
              <Card className="mx-auto w-full max-w-[500px] border border-destructive/20 bg-destructive/5 shadow-none ring-0">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center sm:p-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-4">
                    <AlertTriangle className="size-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    API Connection Error
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    {masterDataError || reportCatalogError}
                  </p>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="h-9 border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:border-destructive/40 transition-all gap-2"
                  >
                    <RefreshCw className="size-3.5" />
                    Retry Connection
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {visibleActiveTab === "report" && activeReport && (
                  <React.Suspense
                    fallback={
                      <Card className="flex h-full min-h-0 items-center justify-center border border-border shadow-none ring-0">
                        <CardContent className="py-16 text-center text-sm text-muted-foreground">
                          Loading report view...
                        </CardContent>
                      </Card>
                    }
                  >
                    <ReportView
                      activeReport={activeReport}
                      displayCompanyLabel={displayCompanyLabel}
                      displayDateLabel={displayDateLabel}
                      displayPeriodLabel={displayPeriodLabel}
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
                    <CardContent className="py-16 text-center text-sm text-muted-foreground">
                      No Reports Available
                    </CardContent>
                  </Card>
                )}

                {visibleActiveTab === "setup" &&
                  canSetupReports &&
                  activeReport && (
                    <React.Suspense
                      fallback={
                        <Card className="flex h-full min-h-0 items-center justify-center border border-border shadow-none ring-0">
                          <CardContent className="py-16 text-center text-sm text-muted-foreground">
                            Loading setup tools...
                          </CardContent>
                        </Card>
                      }
                    >
                      <ReportSetup
                        themeMode={themeMode}
                        masterData={masterData}
                        reportOptions={reportOptions}
                        activeReport={activeReport}
                        activeCategories={activeCategories}
                        updateActiveReport={updateActiveReport}
                        onBusyTransition={triggerPageTransition}
                        handleCloneReport={handleCloneReport}
                        handleCreateBlankReport={handleCreateBlankReport}
                        handleDeleteReport={handleDeleteReport}
                        setIsAccessModalOpen={setIsAccessModalOpen}
                        handleAddCol={handleAddCol}
                        handleUpdateCol={handleUpdateCol}
                        moveCol={moveCol}
                        handleDeleteCol={handleDeleteCol}
                        handleAddRow={handleAddRow}
                        handleUpdateRow={handleUpdateRow}
                        handleUpdateRowMulti={handleUpdateRowMulti}
                        moveRow={moveRow}
                        handleDeleteRow={handleDeleteRow}
                        setEditingRow={setEditingRow}
                        setConfirmAction={setConfirmAction}
                      />
                    </React.Suspense>
                  )}

                {visibleActiveTab === "import" && canSetupReports && (
                  <React.Suspense
                    fallback={
                      <Card className="flex h-full min-h-0 items-center justify-center border border-border shadow-none ring-0">
                        <CardContent className="py-16 text-center text-sm text-muted-foreground">
                          Loading Excel template wizard...
                        </CardContent>
                      </Card>
                    }
                  >
                    <ExcelTemplateImportWizard
                      companyName={
                        masterData.companyProfile.name ||
                        activeReport?.companyName ||
                        "Carmen Hotel & Resorts"
                      }
                      userIds={reportUsers.map((user) => user.id)}
                      owner={currentUser?.id || ""}
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

      <React.Suspense fallback={null}>
        <AccessModal
          isOpen={isAccessModalOpen}
          masterData={masterData}
          activeReport={activeReport}
          onClose={() => setIsAccessModalOpen(false)}
          onUpdateUsers={(newUsers) =>
            updateActiveReport({ assignedUsers: newUsers })
          }
        />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <EditMappingModal
          isOpen={!!editingRow}
          editingRow={editingRow}
          setEditingRow={setEditingRow}
          masterData={masterData}
          reportOptions={reportOptions}
          dimensionOptions={dimensionOptions}
          modalAccCategory={modalAccCategory}
          setModalAccCategory={setModalAccCategory}
          onOpenDetailSelector={({ field, title, subTitle, items }) =>
            setDetailSelecting({ field, title, subTitle, items })
          }
          onApply={async () => {
            const nextRows = activeReport.rows.map((row) =>
              row.id === editingRow.id
                ? {
                    ...row,
                    desc: editingRow.desc,
                    dept: editingRow.dept,
                    deptGroup: editingRow.deptGroup,
                    accCodes: editingRow.accCodes,
                    groupLevel: editingRow.groupLevel,
                    groups: editingRow.groups,
                    dim1: editingRow.dim1,
                    dim2: editingRow.dim2,
                  }
                : row,
            );
            const nextReport = { ...activeReport, rows: nextRows };
            handleUpdateRowMulti(editingRow.id, {
              desc: editingRow.desc,
              dept: editingRow.dept,
              deptGroup: editingRow.deptGroup,
              accCodes: editingRow.accCodes,
              groupLevel: editingRow.groupLevel,
              groups: editingRow.groups,
              dim1: editingRow.dim1,
              dim2: editingRow.dim2,
            });
            setEditingRow(null);
            await persistActiveReport(nextReport);
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
                ...(detailSelecting.field === "dept" ? { deptGroup: "" } : {}),
              });
              setDetailSelecting(null);
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
}
