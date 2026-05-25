import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Printer, Menu, BarChart3,
  ShieldCheck,
  ZoomIn, ZoomOut, UploadCloud, Download
} from 'lucide-react';

import DetailSelectorModal from '../features/report/components/DetailSelectorModal.jsx';
import MultiSelectDropdown from '../features/report/components/MultiSelectDropdown.jsx';
import ReportView from '../features/report/components/ReportView.jsx';
import ReportSetup from '../features/report/components/ReportSetup.jsx';
import AccessModal from '../features/report/components/AccessModal.jsx';
import EditMappingModal from '../features/report/components/EditMappingModal.jsx';
import usePersistentState from '../hooks/usePersistentState.js';
import { getDefaultReports } from '../features/report/data/defaultReports.js';
import { createBlankReport, createOcrReport } from '../features/report/data/reportTemplates.js';
import { fetchCarmenMasterData, isCarmenApiConfigured } from '../features/report/lib/reportApi.js';
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
} from '../features/report/lib/reportLogic.js';

const hasFinancialReportPermission = (user) => Boolean(user?.permissions?.financialReport);

const canSetupFinancialReports = (user) => {
  const permission = user?.permissions?.financialReport;
  if (permission) {
    return Boolean(permission.setup || permission.add || permission.update || permission.delete);
  }
  return user?.role === 'Admin';
};

const canViewFinancialReports = (user) => {
  const permission = user?.permissions?.financialReport;
  if (permission) {
    return Boolean(permission.view || permission.setup || permission.add || permission.update || permission.delete);
  }
  return Boolean(user);
};

const getAccessibleReports = (reports, user) => {
  if (!canViewFinancialReports(user)) return [];
  if (canSetupFinancialReports(user)) return reports;
  if (hasFinancialReportPermission(user)) {
    // Carmen report definitions still use local assignedUsers, so View-only API users
    // can see active local reports until report access is backed by Carmen UserId.
    return reports.filter((report) => report.isActive !== false);
  }
  return reports.filter((report) => report.assignedUsers.includes(user.id) && report.isActive !== false);
};

// ============================================================================
// 1. MAIN APPLICATION
// ============================================================================
export default function App({ onLogout = null }) {
  const [activeTab, setActiveTab] = useState('report');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [alertMsg, setAlertMsg] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  
  const [masterData, setMasterData] = usePersistentState('carmen_bi_master_v5_16', INITIAL_MASTER_DATA);
  const [periodOptions, setPeriodOptions] = useState([]);
  const [budgetRevisionOptions, setBudgetRevisionOptions] = useState([]);
  const [masterDataError, setMasterDataError] = useState(null);
  const [isMasterDataLoading, setIsMasterDataLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState(masterData.users[0] || INITIAL_MASTER_DATA.users[0]);
  const [tableZoom, setTableZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(false);

  const [globalDepts, setGlobalDepts] = useState([]);
  const [globalYear, setGlobalYear] = useState(new Date().getFullYear().toString()); 
  const [globalPeriod, setGlobalPeriod] = useState('2'); 
  const [globalRevision, setGlobalRevision] = useState('0');

  const [appliedDepts, setAppliedDepts] = useState([]);
  const [appliedYear, setAppliedYear] = useState(new Date().getFullYear().toString());
  const [appliedPeriod, setAppliedPeriod] = useState('2');
  const [appliedRevision, setAppliedRevision] = useState('0');

  const [engineData, setEngineData] = useState([]); 
  const [budgetData, setBudgetData] = useState([]); 

  useEffect(() => {
    if (!isCarmenApiConfigured() || !/^\d{4}$/.test(String(globalYear))) return;

    let isCancelled = false;
    const loadCarmenMasterData = async () => {
      setIsMasterDataLoading(true);
      try {
        const apiData = await fetchCarmenMasterData({ year: globalYear });
        if (isCancelled) return;

        setMasterData(prev => ({
          ...prev,
          companyProfile: apiData.companyProfile || prev.companyProfile,
          users: apiData.currentUser ? [apiData.currentUser] : prev.users,
          depts: apiData.depts.length > 0 ? apiData.depts : prev.depts,
          accCodes: apiData.accCodes.length > 0 ? apiData.accCodes : prev.accCodes,
        }));
        if (apiData.currentUser) setCurrentUser(apiData.currentUser);
        setPeriodOptions(apiData.periods || []);
        setBudgetRevisionOptions(apiData.budgetRevisions || []);
        setMasterDataError(null);
      } catch (error) {
        if (!isCancelled) setMasterDataError(error.message || 'Unable to load Carmen master data.');
      } finally {
        if (!isCancelled) setIsMasterDataLoading(false);
      }
    };

    loadCarmenMasterData();
    return () => {
      isCancelled = true;
    };
  }, [globalYear, setMasterData]);

  // ============================================================================
  // 🚀 CSV PARSER
  // ============================================================================
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const parsed = parseGlCsvText(event.target.result);
      if (parsed.error) {
        setAlertMsg("ไฟล์ CSV ไม่ถูกต้อง หรือไม่มีข้อมูล");
        setIsLoading(false); return;
      }
      const { parsedData, newDeptsMap, newAccCodesMap, newGroups, detectedYear } = parsed;
      
      setMasterData(prev => ({
        ...prev,
        depts: mergeAndSort(prev.depts, newDeptsMap),
        accCodes: mergeAndSort(prev.accCodes, newAccCodesMap),
        groups: {
          L1: mergeAndSort(prev.groups.L1, newGroups.L1),
          L2: mergeAndSort(prev.groups.L2, newGroups.L2),
          L3: mergeAndSort(prev.groups.L3, newGroups.L3),
          L4: mergeAndSort(prev.groups.L4, newGroups.L4)
        }
      }));

      if (detectedYear) {
         setGlobalYear(detectedYear);
         setAppliedYear(detectedYear);
      }

      setEngineData(parsedData); 
      setIsLoading(false);
      setAlertMsg(`โหลดข้อมูล Transaction (GL) สำเร็จ ${parsedData.length} รายการ!\n(อัปเดตตัวกรองปีเป็น ${detectedYear || 'ปัจจุบัน'} ให้อัตโนมัติแล้ว)`);
    };
    reader.onerror = () => { setAlertMsg("เกิดข้อผิดพลาดในการอ่านไฟล์"); setIsLoading(false); };
    reader.readAsText(file);
    e.target.value = null; 
  };

  const handleBudgetUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const parsed = parseBudgetCsvText(event.target.result);
      if (parsed.error) { setAlertMsg("ไฟล์ Budget CSV ไม่ถูกต้อง"); setIsLoading(false); return; }
      const { parsedData, newDeptsMap, newAccCodesMap } = parsed;

      setMasterData(prev => ({
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

  // --- Report Configuration Data ---
  const [reports, setReports] = usePersistentState('carmen_bi_reports_config_v5_16', getDefaultReports);

  const [currentReportId, setCurrentReportId] = useState('rep-carmen-pnl');
  const [editingRow, setEditingRow] = useState(null);
  const [detailSelecting, setDetailSelecting] = useState(null); 
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false); 
  const [modalAccCategory, setModalAccCategory] = useState('ALL'); 

  const canSetupReports = canSetupFinancialReports(currentUser);
  const accessibleReports = useMemo(() => getAccessibleReports(reports, currentUser), [reports, currentUser]);

  const activeReport = accessibleReports.find(r => r.id === currentReportId) || accessibleReports[0] || null;
  const updateActiveReport = (updates) => {
    if (!activeReport) return;
    setReports(reports.map(r => r.id === activeReport.id ? { ...r, ...updates } : r));
  };

  useEffect(() => {
    if (!canSetupReports && activeTab === 'setup') setActiveTab('report');
  }, [activeTab, canSetupReports]);

  useEffect(() => {
    if (accessibleReports.length > 0 && !accessibleReports.some(report => report.id === currentReportId)) {
      setCurrentReportId(accessibleReports[0].id);
    }
  }, [accessibleReports, currentReportId]);

  const handleApplyFilters = () => {
    setAppliedDepts([...globalDepts]);
    setAppliedYear(globalYear);
    setAppliedPeriod(globalPeriod);
    setAppliedRevision(globalRevision);
  };

  const handleCloneReport = () => {
    const newId = 'rep-' + Date.now();
    const clonedReport = cloneReport(activeReport, newId);
    setReports([...reports, clonedReport]);
    setCurrentReportId(newId);
  };

  const handleCreateBlankReport = () => {
    const newId = 'rep-' + Date.now();
    const newReport = createBlankReport(masterData.companyProfile.name, masterData.users.map(u => u.id), newId);
    setReports([...reports, newReport]);
    setCurrentReportId(newId);
  };

  const handleDeleteReport = () => {
    setConfirmAction({
      msg: 'Are you sure you want to completely delete this report?',
      onConfirm: () => {
        const newReports = reports.filter(r => r.id !== currentReportId);
        setReports(newReports);
        setCurrentReportId(newReports.length > 0 ? newReports[0].id : null);
      }
    });
  };

  const handleOCRUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);
    setTimeout(() => {
        const newId = 'rep-ocr-' + Date.now();
        const newReport = createOcrReport(file.name, masterData.companyProfile.name, masterData.users.map(u => u.id), newId);
        setReports([...reports, newReport]);
        setCurrentReportId(newId);
        setIsLoading(false);
        setAlertMsg('ดำเนินการอ่านภาพ OCR และสร้างรายงานเรียบร้อยแล้ว!');
    }, 2000);
    e.target.value = null;
  };

  // --- ENGINE ---
  const reportData = useMemo(() => buildReportData({
    activeReport,
    engineData,
    budgetData,
    appliedDepts,
    appliedYear,
    appliedPeriod,
    appliedRevision,
    masterData,
  }), [activeReport, engineData, budgetData, appliedDepts, appliedYear, appliedPeriod, appliedRevision, masterData]);

  // --- Handlers ---
  const handleUpdateRow = (id, field, val) => updateActiveReport({ rows: activeReport.rows.map(r => r.id === id ? { ...r, [field]: val } : r) });
  const handleUpdateRowMulti = (id, updates) => updateActiveReport({ rows: activeReport.rows.map(r => r.id === id ? { ...r, ...updates } : r) });
  const handleUpdateCol = (id, field, val) => updateActiveReport({ columns: activeReport.columns.map(c => c.id === id ? { ...c, [field]: val } : c) });

  const handleAddCol = (type) => {
    const newColId = 'C' + (activeReport.columns.length + 1) + '-' + Date.now();
    const newCol = {
      id: newColId,
      label: type === 'data' ? 'New Column' : type === 'percent' ? '% Mix' : 'Variance',
      isActive: true, isFormula: type === 'formula', isPercent: type === 'percent', formatAsPercent: false, 
      formula: type === 'formula' ? 'C1-C2' : '', targetCol: type === 'percent' ? 'C1' : undefined,
      yearMode: type === 'data' ? 'current' : undefined, periodMode: type === 'data' ? 'current' : undefined, type: type === 'data' ? 'AC' : undefined,
      width: ''
    };
    updateActiveReport({ columns: [...activeReport.columns, newCol] });
  };

  const handleAddRow = (type) => {
    const lastRow = activeReport.rows.length > 0 ? activeReport.rows[activeReport.rows.length - 1] : null;
    const newRow = { 
        id: 'r-'+Date.now(), desc: type === 'header' ? 'HEADER' : (type === 'formula' ? 'Total' : 'New Line'), 
        isActive: true, isTotal: type === 'formula', isHeader: type === 'header', dept: '', accCodes: '', 
        groupLevel: 'L4', groups: '', percentBase: lastRow ? lastRow.percentBase : '', formula: type === 'formula' ? 'R1+R2' : '', indent: lastRow ? lastRow.indent : 0 
    };
    updateActiveReport({ rows: [...activeReport.rows, newRow] });
  };

  const handleDeleteRow = (rowId) => {
    updateActiveReport(deleteRowAndRewriteReferences(activeReport, rowId));
  };

  const handleDeleteCol = (colId) => {
    updateActiveReport(deleteColAndRewriteReferences(activeReport, colId));
  };

  const moveCol = (idx, dir) => {
    updateActiveReport(moveColumnsAndRewriteReferences(activeReport, idx, dir));
  };

  const moveRow = (idx, dir) => {
    updateActiveReport(moveRowsAndRewriteReferences(activeReport, idx, dir));
  };

  // --- Display Labels (Configurable Period Formats) ---
  const defaultPeriodOptions = useMemo(
    () => [...Array(12).keys()].map(i => ({ id: String(i + 1), label: `P${i + 1}` })),
    []
  );
  const periodSelectOptions = periodOptions.length > 0 ? periodOptions : defaultPeriodOptions;
  const revisionSelectOptions = useMemo(() => {
    const options = new Map([['0', { id: '0', label: 'Rev 0' }]]);
    budgetRevisionOptions.forEach(option => options.set(String(option.id), option));
    return Array.from(options.values()).sort((a, b) =>
      String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [budgetRevisionOptions]);
  const selectedAppliedPeriod = periodSelectOptions.find(option => String(option.id) === String(appliedPeriod));
  const selectedPeriodCode = `P${String(appliedPeriod).padStart(2, '0')}`;
  const displayCompanyLabel = activeReport?.companyName || masterData.companyProfile.name;
  const autoDateLabel = selectedAppliedPeriod?.dateLabel
    ? `As of ${selectedAppliedPeriod.dateLabel}`
    : `As of ${formatAutoPeriod(appliedYear, appliedPeriod, 'end_of_month')}`;
  const displayDateLabel = activeReport?.customDateLabel || autoDateLabel;
  const autoPeriodLabel = selectedAppliedPeriod?.dateLabel
    ? `Period : ${appliedYear}-${selectedPeriodCode}${selectedAppliedPeriod.status ? ` (${selectedAppliedPeriod.status})` : ''}`
    : (activeReport?.periodFormat !== 'standard' ? formatAutoPeriod(appliedYear, appliedPeriod, activeReport?.periodFormat) : formatAutoPeriod(appliedYear, appliedPeriod, 'standard'));
  const displayPeriodLabel = activeReport?.customPeriodLabel || autoPeriodLabel;
  const activeCategories = Array.isArray(activeReport?.category) ? activeReport.category : ['ALL'];
  const activeCols = activeReport?.columns.filter(c => c.isActive) || [];
  const userSelectorLabel = hasFinancialReportPermission(currentUser) ? 'Signed In As:' : 'View As Role:';

  // --- Export Excel (HTML-to-XLSX) ---
  const exportToExcel = () => {
    if (!activeReport) return;
    const themeColors = THEMES[activeReport.theme || 'blue'];
    const tableHtml = buildExcelHtml({
      activeReport,
      activeCols,
      displayCompanyLabel,
      displayDateLabel,
      displayPeriodLabel,
      reportData,
      themeColors,
    });
    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeReport.name.replace(/[^a-zA-Z0-9]/g, '_')}_Export.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentTheme = THEMES[activeReport?.theme || 'blue'];

  // ============================================================================
  // 4. RENDER UI
  // ============================================================================
  return (
    <div className="flex h-screen bg-[#FDFCFE] overflow-hidden font-sans text-slate-800">
      
      {/* CUSTOM ALERTS & CONFIRMS */}
      {alertMsg && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 text-center border border-purple-100">
            <p className="text-slate-800 font-bold mb-6 whitespace-pre-line text-sm">{alertMsg}</p>
            <button onClick={() => setAlertMsg(null)} className="bg-purple-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-purple-700 shadow-md">OK</button>
          </div>
        </div>
      )}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 text-center border border-purple-100">
            <p className="text-slate-800 font-bold mb-6 text-sm">{confirmAction.msg}</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setConfirmAction(null)} className="bg-slate-100 text-slate-600 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-200">Cancel</button>
              <button onClick={() => { confirmAction.onConfirm(); setConfirmAction(null); }} className="bg-red-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-red-600 shadow-md">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`bg-white border-r border-purple-100 transition-all duration-300 flex flex-col print:hidden flex-shrink-0 ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
        <div className="p-5 flex items-center justify-between border-b border-purple-100">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'hidden'}`}>
            <div className="bg-purple-600 p-2 rounded-lg shadow-md text-white"><BarChart3 size={18}/></div>
            <div className="flex flex-col">
               <span className="font-black text-base tracking-tight uppercase text-purple-900 leading-none">BI HUB</span>
               <span className="text-[9px] font-bold text-purple-400">Version 1.0</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hover:bg-purple-50 p-2 rounded-lg text-purple-600 transition-colors"><Menu size={18}/></button>
        </div>
        
        {/* Simulate Role Selector */}
        <div className={`p-4 mx-4 mt-4 bg-purple-50 rounded-xl border border-purple-100 ${!isSidebarOpen && 'hidden'}`}>
          <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-1 mb-1.5"><ShieldCheck size={12}/> {userSelectorLabel}</span>
          <select value={currentUser?.id || ''} onChange={e => {
              const selectedUser = masterData.users.find(u=>u.id===e.target.value);
              if (!selectedUser) return;
              const selectedReports = getAccessibleReports(reports, selectedUser);
              setCurrentUser(selectedUser);
              if (!selectedReports.some(report => report.id === currentReportId)) {
                setCurrentReportId(selectedReports[0]?.id || null);
              }
              if (!canSetupFinancialReports(selectedUser)) {
                setActiveTab('report');
              }
            }} className="w-full bg-white text-xs font-bold text-purple-900 border border-purple-200 rounded-md px-2 py-1 outline-none cursor-pointer">
            {masterData.users.map(u => <option key={u.id} value={u.id}>{u.name} ({canSetupFinancialReports(u) ? 'Admin' : 'User'})</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 mt-2">
          {accessibleReports.map(rep => (
            <button key={rep.id} onClick={() => setCurrentReportId(rep.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-bold ${currentReportId === rep.id ? 'bg-purple-100 text-purple-800' : 'text-slate-500 hover:bg-purple-50 hover:text-purple-700'}`}>
              <FileText size={16} className={currentReportId === rep.id ? 'text-purple-600' : 'text-slate-400'}/>
              {isSidebarOpen && <span className="text-sm truncate">{rep.name}</span>}
            </button>
          ))}
          {accessibleReports.length === 0 && <div className="text-xs text-slate-400 text-center mt-10">No Reports Available</div>}
        </div>
      </aside>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 overflow-hidden flex flex-col relative print:bg-white bg-[#FDFCFE]">
        
        {/* Header แบ่ง 2 บรรทัด */}
        <header className="flex-shrink-0 z-40 bg-white/90 backdrop-blur-md border-b border-purple-100 p-3 px-6 flex flex-col gap-3 print:hidden shadow-sm">
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="flex bg-purple-50 p-1 rounded-lg border border-purple-100">
                  <button onClick={() => setActiveTab('report')} className={`px-5 py-1.5 rounded-md text-[11px] font-black transition-all ${activeTab === 'report' ? 'bg-white shadow-sm text-purple-700' : 'text-purple-400 hover:text-purple-600'}`}>VIEW</button>
                  {canSetupReports && (
                    <button onClick={() => setActiveTab('setup')} className={`px-5 py-1.5 rounded-md text-[11px] font-black transition-all ${activeTab === 'setup' ? 'bg-white shadow-sm text-purple-700' : 'text-purple-400 hover:text-purple-600'}`}>SETUP</button>
                  )}
                </div>
                {activeTab === 'setup' && <h2 className="text-lg font-black text-slate-800 tracking-tight">Configuration Mode</h2>}
                {isMasterDataLoading && <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Syncing Carmen</span>}
                {masterDataError && <span className="text-[10px] font-black uppercase tracking-widest text-red-500" title={masterDataError}>Carmen API unavailable</span>}
              </div>
            {typeof onLogout === 'function' && (
              <button
                onClick={onLogout}
                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
              >
                Logout
              </button>
            )}

            {activeTab === 'report' && (
               <div className="flex items-center gap-2 bg-white p-1 px-3 rounded-lg border border-purple-100 shadow-sm hidden md:flex flex-shrink-0">
                  <ZoomOut size={14} className="text-purple-400 cursor-pointer hover:text-purple-700" onClick={()=>setTableZoom(Math.max(50, tableZoom - 10))}/>
                  <input type="range" min="50" max="150" value={tableZoom} onChange={e=>setTableZoom(Number(e.target.value))} className="w-16 accent-purple-600" />
                  <ZoomIn size={14} className="text-purple-400 cursor-pointer hover:text-purple-700" onClick={()=>setTableZoom(Math.min(150, tableZoom + 10))}/>
                  <span className="text-[10px] font-black text-purple-700 w-8 text-right">{tableZoom}%</span>
               </div>
            )}
          </div>

          {/* Row 2: Parameters & Export Panel (ใช้เลื่อนซ้ายขวาตามแบบ V5.12 ต้นฉบับ) */}
          {activeTab === 'report' && (
               <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-purple-100 shadow-sm w-full relative z-40">
                  <MultiSelectDropdown testIdPrefix="dept" label="DEPT" options={masterData.depts} selected={globalDepts} onChange={setGlobalDepts} />
                  <div className="h-4 w-px bg-purple-100 flex-shrink-0 mx-1"></div>
                  
                  <div className="flex items-center gap-1 flex-shrink-0">
                     <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Year:</span>
                     <input type="number" value={globalYear} onChange={e=>setGlobalYear(e.target.value)} className="w-12 text-[11px] font-bold bg-transparent outline-none text-purple-900" />
                  </div>
                  <div className="h-4 w-px bg-purple-100 flex-shrink-0 mx-1"></div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                     <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Period:</span>
                     <select value={globalPeriod} onChange={e=>setGlobalPeriod(e.target.value)} className="text-[11px] font-bold bg-transparent outline-none text-purple-900 cursor-pointer">
                        {periodSelectOptions.map(option => <option key={option.id} value={String(option.id)}>{option.label}</option>)}
                     </select>
                  </div>
                  <div className="h-4 w-px bg-purple-100 flex-shrink-0 mx-1"></div>
                  
                  <div className="flex items-center gap-1 flex-shrink-0">
                     <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Rev:</span>
                     <select value={globalRevision} onChange={e=>setGlobalRevision(e.target.value)} className="text-[11px] font-bold bg-transparent outline-none text-purple-900 cursor-pointer">
                        {revisionSelectOptions.map(option => <option key={option.id} value={String(option.id)}>{option.label}</option>)}
                     </select>
                  </div>
                  
                  <div className="h-4 w-px bg-purple-100 mx-2 flex-shrink-0"></div>
                  <button onClick={handleApplyFilters} className="px-5 py-1.5 bg-purple-600 text-white text-[10px] font-black rounded-lg shadow-sm hover:bg-purple-700 transition-colors uppercase tracking-widest flex-shrink-0">OK</button>

                  <div className="flex-1 min-w-[20px]"></div>

                  <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black rounded-lg hover:bg-emerald-100 transition-colors uppercase tracking-widest flex-shrink-0">
                    <UploadCloud size={14}/> GL
                    <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e)} className="hidden" />
                  </label>
                  <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black rounded-lg hover:bg-blue-100 transition-colors uppercase tracking-widest flex-shrink-0">
                    <UploadCloud size={14}/> BUD
                    <input type="file" accept=".csv" onChange={(e) => handleBudgetUpload(e)} className="hidden" />
                  </label>
                  
                  <div className="h-4 w-px bg-purple-100 mx-1 flex-shrink-0"></div>
                  
                  <button onClick={exportToExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-[10px] font-black rounded-lg shadow-sm hover:bg-green-700 transition-colors uppercase tracking-widest flex-shrink-0" title="Export to Excel">
                     <Download size={14}/> Excel
                  </button>
                  <button onClick={() => window.print()} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all flex-shrink-0 border border-slate-200"><Printer size={16}/></button>
               </div>
          )}
        </header>

        <div className="p-4 md:p-6 max-w-full mx-auto w-full print:p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
          {activeTab === 'report' && activeReport && (
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
          )}

          {activeTab === 'report' && !activeReport && (
            <div className="h-full flex items-center justify-center text-sm font-bold text-slate-400">
              No reports available for this user.
            </div>
          )}

          {activeTab === 'setup' && canSetupReports && activeReport && (
            <ReportSetup
              masterData={masterData}
              activeReport={activeReport}
              activeCategories={activeCategories}
              updateActiveReport={updateActiveReport}
              handleCloneReport={handleCloneReport}
              handleCreateBlankReport={handleCreateBlankReport}
              handleDeleteReport={handleDeleteReport}
              handleOCRUpload={handleOCRUpload}
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
          )}
        </div>
      </main>

      {/* --- MODALS --- */}
      <AccessModal
        isOpen={isAccessModalOpen}
        masterData={masterData}
        activeReport={activeReport}
        onClose={() => setIsAccessModalOpen(false)}
        onUpdateUsers={(newUsers) => updateActiveReport({ assignedUsers: newUsers })}
      />

      <EditMappingModal
        isOpen={!!editingRow}
        editingRow={editingRow}
        setEditingRow={setEditingRow}
        masterData={masterData}
        modalAccCategory={modalAccCategory}
        setModalAccCategory={setModalAccCategory}
        onOpenDetailSelector={({ field, title, subTitle, items }) => setDetailSelecting({ field, title, subTitle, items })}
        onApply={() => {
          handleUpdateRowMulti(editingRow.id, {
            desc: editingRow.desc,
            dept: editingRow.dept,
            accCodes: editingRow.accCodes,
            groupLevel: editingRow.groupLevel,
            groups: editingRow.groups
          });
          setEditingRow(null);
        }}
        onClose={() => setEditingRow(null)}
      />

      {detailSelecting && (
        <DetailSelectorModal
          masterData={masterData}
          title={detailSelecting.title}
          subTitle={detailSelecting.subTitle || 'Select Items'}
          availableItems={detailSelecting.items}
          selectedItems={editingRow[detailSelecting.field]?.split(',').map(s => s.trim()).filter(Boolean) || []}
          onCancel={() => setDetailSelecting(null)}
          onSave={(newSelection) => {
            setEditingRow({ ...editingRow, [detailSelecting.field]: newSelection.join(', ') });
            setDetailSelecting(null);
          }}
        />
      )}

      

      

      {/* Custom CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f3e8ff; border-radius: 8px; border: 1px solid #e9d5ff; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d8b4fe; border-radius: 8px; border: 2px solid #f3e8ff; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #c084fc; }
        @media print {
          @page { size: A4 portrait; margin: 1cm; }
          body { background: white; }
          .print\\:hidden { display: none !important; }
          table { width: 100% !important; border: 1px solid #e2e8f0 !important; zoom: 1 !important; }
          th, td { padding: 4pt !important; border: 1px solid #e2e8f0 !important; font-size: 7pt !important; }
        }
      `}} />
    </div>
  );
}
