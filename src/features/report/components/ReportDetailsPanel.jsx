import React from 'react';
import { Copy, Eye, EyeOff, FilePlus, Palette, ScanText, Settings2, ShieldCheck, Trash2, UserCheck } from 'lucide-react';

export default function ReportDetailsPanel({
  activeReport,
  activeCategories,
  masterData,
  reportOptions = {},
  updateActiveReport,
  handleCloneReport,
  handleCreateBlankReport,
  handleDeleteReport,
  handleOCRUpload,
  setIsAccessModalOpen,
}) {
  const themeOptions = reportOptions.themes?.length > 0
    ? reportOptions.themes
    : [
        { id: 'blue', label: 'Classic Blue' },
        { id: 'green', label: 'Emerald Green' },
        { id: 'gray', label: 'Slate Gray' },
      ];
  const periodFormatOptions = reportOptions.periodFormats?.length > 0
    ? reportOptions.periodFormats
    : [
        { id: 'standard', label: 'Standard (Period : YYYY-MM)' },
        { id: 'year_month', label: 'Year-Month (YYYY-MM)' },
        { id: 'numeric', label: 'Numeric Full (MM/YYYY)' },
        { id: 'numeric_short', label: 'Numeric Short (MM/YY)' },
        { id: 'short', label: 'Short Month + YYYY (Feb 2025)' },
        { id: 'short_yy', label: "Short Month + YY (Feb '25)" },
        { id: 'long', label: 'Long Month + YYYY (February 2025)' },
        { id: 'month_only', label: 'Month Only (February)' },
        { id: 'day_month_year', label: 'Day Month Year (28 Feb 2025)' },
        { id: 'end_of_month', label: 'End of Month (February 28, 2025)' },
      ];
  const accountCategoryOptions = reportOptions.accountCategories?.length > 0
    ? reportOptions.accountCategories
    : [
        { id: 'ALL', label: 'All Categories' },
        { id: 'I', label: 'Income Statement (I)' },
        { id: 'B', label: 'Balance Sheet (B)' },
      ];
  const reportTypeOptions = [
    { id: 'Monthly', label: 'Monthly' },
    { id: 'Daily', label: 'Daily' },
  ];
  const dateDisplayValue = activeReport.overrideDateDisplay ?? activeReport.customDateLabel ?? '';
  const periodDisplayValue = activeReport.overridePeriodDisplay ?? activeReport.customPeriodLabel ?? '';

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-100 flex flex-col xl:flex-row gap-6 flex-shrink-0">
      <div className="flex-1 space-y-3">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
          <Settings2 size={14} className="text-purple-500" /> Report Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Report Name</label>
            <input value={activeReport.name} onChange={e => updateActiveReport({ name: e.target.value })} className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Company Name</label>
            <input value={activeReport.companyName || ''} onChange={e => updateActiveReport({ companyName: e.target.value })} className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-purple-500" placeholder="Auto Mode" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1 flex items-center gap-1"><Palette size={10} /> Report Color Theme</label>
            <select value={activeReport.theme || 'blue'} onChange={e => updateActiveReport({ theme: e.target.value })} className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-purple-500 bg-white">
              {themeOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Auto Period Format</label>
            <select value={activeReport.periodFormat || 'standard'} onChange={e => updateActiveReport({ periodFormat: e.target.value })} className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-purple-500 bg-white">
              {periodFormatOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Report Type</label>
            <select
              value={activeReport.reportType || 'Monthly'}
              onChange={e => updateActiveReport({
                reportType: e.target.value,
                day: e.target.value === 'Daily' ? (activeReport.day || '') : '',
              })}
              className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-purple-500 bg-white"
            >
              {reportTypeOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Override Date Display</label>
            <input
              value={dateDisplayValue}
              onChange={e => updateActiveReport({ customDateLabel: e.target.value, overrideDateDisplay: e.target.value })}
              className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-purple-500"
              placeholder="Auto (Based on format)"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Override Period Display</label>
            <input
              value={periodDisplayValue}
              onChange={e => updateActiveReport({ customPeriodLabel: e.target.value, overridePeriodDisplay: e.target.value })}
              className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-purple-500"
              placeholder="Auto (Based on format)"
            />
          </div>
          {activeReport.reportType === 'Daily' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Day</label>
              <input
                value={activeReport.day || ''}
                onChange={e => updateActiveReport({ day: e.target.value })}
                className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-purple-500"
                placeholder="Daily reports only"
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Owner</label>
            <input
              value={activeReport.owner || ''}
              onChange={e => updateActiveReport({ owner: e.target.value })}
              className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-purple-500"
              placeholder={masterData?.users?.[0]?.id || 'Creator user id'}
            />
          </div>
          <div className="col-span-1 md:col-span-3 flex flex-col md:flex-row items-start gap-3 mt-1">
            <div className="w-full md:w-1/3">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Account Category (AccType from DB)</label>
              <select
                value=""
                onChange={e => {
                  const val = e.target.value;
                  if (!val) return;
                  let currentCats = [...activeCategories];
                  if (val === 'ALL') {
                    updateActiveReport({ category: ['ALL'] });
                  } else {
                    currentCats = currentCats.filter(c => c !== 'ALL');
                    if (!currentCats.includes(val)) currentCats.push(val);
                    updateActiveReport({ category: currentCats });
                  }
                }}
                className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-purple-500 cursor-pointer text-purple-700 font-bold bg-purple-50"
              >
                <option value="" disabled>+ Add Category...</option>
                {accountCategoryOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </div>

            <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap items-center gap-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Categories:</div>
              {activeCategories.map(cat => (
                <span key={cat} className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-600">{cat}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={handleCloneReport} className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-bold hover:bg-slate-50 shadow-sm"><Copy size={12} /> Clone</button>
          <button onClick={handleCreateBlankReport} className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-bold hover:bg-slate-50 shadow-sm"><FilePlus size={12} /> Blank</button>
          <label className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-bold hover:bg-slate-50 shadow-sm cursor-pointer">
            <ScanText size={12} /> OCR
            <input type="file" accept="image/*,.pdf" onChange={handleOCRUpload} className="hidden" />
          </label>
          <button onClick={() => setIsAccessModalOpen(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-bold hover:bg-slate-50 shadow-sm"><UserCheck size={12} /> Access</button>
          <button onClick={handleDeleteReport} className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-red-200 text-red-500 rounded-lg text-[9px] font-bold hover:bg-red-50 shadow-sm"><Trash2 size={12} /> Delete</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
          <div className="bg-purple-50/40 p-4 rounded-xl border border-purple-100 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={12} className="text-purple-500" /> Access Summary</h4>
              <button onClick={() => setIsAccessModalOpen(true)} className="text-[10px] font-bold text-purple-700 hover:underline">Manage</button>
            </div>
            <p className="text-[10px] text-slate-500">Assigned Users</p>
            <div className="bg-white rounded-lg border border-purple-100 p-3 text-xs font-medium text-slate-600 min-h-[62px] overflow-y-auto custom-scrollbar">
              {activeReport.assignedUsers.length > 0
                ? activeReport.assignedUsers.map(uid => masterData?.users?.find(u => u.id === uid)?.name || uid).join(', ')
                : 'None'}
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Eye size={12} className="text-slate-500" /> Status</h4>
            <button
              onClick={() => updateActiveReport({ isActive: activeReport.isActive === false ? true : false })}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold border transition-colors ${activeReport.isActive !== false ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'}`}
            >
              {activeReport.isActive !== false ? <Eye size={12} /> : <EyeOff size={12} />}
              {activeReport.isActive !== false ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
