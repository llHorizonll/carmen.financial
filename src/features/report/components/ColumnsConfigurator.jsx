import React from 'react';
import { ArrowLeft, ArrowRight, Percent, Plus, Trash2 } from 'lucide-react';
import { findBrokenReferences } from '../lib/reportLogic.js';

export default function ColumnsConfigurator({
  activeReport,
  reportOptions = {},
  handleAddCol,
  handleUpdateCol,
  moveCol,
  handleDeleteCol,
}) {
  const reportType = activeReport?.reportType || 'Monthly';
  const allowedColumnTypes = reportType === 'Daily'
    ? new Set(['DAC', 'PTD', 'DACBG', 'PTDBG'])
    : new Set(['AC', 'ACC', 'BUD', 'BUDACC']);
  const columnTypeOptions = (reportOptions.columnTypes?.length > 0
    ? reportOptions.columnTypes
    : [
        { id: 'AC', label: 'AC' },
        { id: 'ACC', label: 'ACC' },
        { id: 'BUD', label: 'BUD' },
        { id: 'BUDACC', label: 'BUDACC' },
        { id: 'DAC', label: 'DAC' },
        { id: 'PTD', label: 'PTD' },
        { id: 'DACBG', label: 'DACBG' },
        { id: 'PTDBG', label: 'PTDBG' },
      ]).filter((option) => allowedColumnTypes.has(option.id));
  const yearModeOptions = reportOptions.yearModes?.length > 0
    ? reportOptions.yearModes
    : [
        { id: 'current', label: 'Current' },
        { id: '-1', label: 'Prev' },
      ];
  const periodModeOptions = reportOptions.periodModes?.length > 0
    ? reportOptions.periodModes
    : [
        { id: 'current', label: 'Current' },
        { id: '-1', label: 'Prev' },
        { id: 'FY', label: 'FY' },
        { id: 'Q1', label: 'Q1' },
        { id: 'Q2', label: 'Q2' },
        { id: 'Q3', label: 'Q3' },
        { id: 'Q4', label: 'Q4' },
      ];
  const hasIncompatibleColumns = activeReport.columns.some((col) => col.type && !allowedColumnTypes.has(String(col.type).trim().toUpperCase()));
  const brokenColumnReferences = findBrokenReferences(activeReport).filter((issue) => issue.scope === 'column');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden flex-shrink-0">
      <div className="p-3 bg-purple-50/80 flex items-center justify-between border-b border-purple-200">
        <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">Columns Configurator</h3>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={() => handleAddCol('data')} className="px-2.5 py-1 bg-purple-600 text-white rounded text-[9px] font-black uppercase tracking-widest hover:bg-purple-700 shadow-sm">+ Data</button>
          <button onClick={() => handleAddCol('formula')} className="px-2.5 py-1 bg-purple-500 text-white rounded text-[9px] font-black uppercase tracking-widest hover:bg-purple-600 shadow-sm">+ Formula</button>
          <button onClick={() => handleAddCol('percent')} className="px-2.5 py-1 bg-purple-400 text-white rounded text-[9px] font-black uppercase tracking-widest hover:bg-purple-500 shadow-sm flex items-center gap-1"><Percent size={10} /> Mix %</button>
        </div>
      </div>
      {hasIncompatibleColumns && (
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-800 border-b border-amber-100">
          {reportType} reports should only use compatible column types. Update any mismatched columns before saving.
        </div>
      )}
      {brokenColumnReferences.length > 0 && (
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-red-50 text-red-700 border-b border-red-100">
          Broken column references found. Fix {brokenColumnReferences.length} invalid reference(s) before saving.
        </div>
      )}

      <div className="overflow-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="sticky top-0 z-30 bg-purple-100 shadow-sm">
            <tr className="text-purple-900 text-[9px] font-black uppercase tracking-widest">
              <th className="p-2 border-r border-purple-200 w-24 text-center">Del</th>
              <th className="p-2 border-r border-purple-200 w-20 text-center">Move</th>
              <th className="p-2 border-r border-purple-200 w-40">Label</th>
              <th className="p-2 border-r border-purple-200 w-24 text-center">Active</th>
              <th className="p-2 border-r border-purple-200 w-24 text-center">Type</th>
              <th className="p-2 border-r border-purple-200 w-28 text-center">Target</th>
              <th className="p-2 border-r border-purple-200 w-24 text-center">Year</th>
              <th className="p-2 border-r border-purple-200 w-24 text-center">Period</th>
              <th className="p-2 border-r border-purple-200 w-16 text-center">Pct</th>
              <th className="p-2 border-r border-purple-200 w-24 text-center">Width</th>
            </tr>
          </thead>
          <tbody>
            {activeReport.columns.map((col, idx) => (
              <tr key={col.id} className="border-b border-purple-50 hover:bg-purple-50/40">
                <td className="p-1 border-r border-purple-100 text-center">
                  <button onClick={() => handleDeleteCol(col.id)} className="text-slate-300 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                </td>
                <td className="p-1 border-r border-purple-100 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => moveCol(idx, 'left')} className="p-1 hover:bg-purple-50 rounded text-slate-400"><ArrowLeft size={12} /></button>
                    <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1 rounded">C{idx + 1}</span>
                    <button onClick={() => moveCol(idx, 'right')} className="p-1 hover:bg-purple-50 rounded text-slate-400"><ArrowRight size={12} /></button>
                  </div>
                </td>
                <td className="p-1 border-r border-purple-100">
                  <input value={col.label} onChange={e => handleUpdateCol(col.id, 'label', e.target.value)} className="w-full text-[11px] font-bold border-b border-transparent focus:border-purple-200 outline-none mb-1 bg-transparent text-center text-slate-700" placeholder="Column Label" />
                </td>
                <td className="p-1 border-r border-purple-100 text-center">
                  <input type="checkbox" checked={col.isActive} onChange={e => handleUpdateCol(col.id, 'isActive', e.target.checked)} />
                </td>
                <td className="p-1 border-r border-purple-100 text-center">
                  <select value={col.type || (reportType === 'Daily' ? 'DAC' : 'AC')} onChange={e => handleUpdateCol(col.id, 'type', e.target.value)} className="w-full text-[9px] font-bold bg-purple-50 border border-purple-200 rounded p-1 outline-none text-purple-700">
                    {columnTypeOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                    {col.type && !allowedColumnTypes.has(String(col.type).trim().toUpperCase()) && (
                      <option value={col.type}>{col.type}</option>
                    )}
                  </select>
                </td>
                <td className="p-1 border-r border-purple-100 text-center">
                  <select
                    value={col.targetCol || ''}
                    onChange={e => handleUpdateCol(col.id, 'targetCol', e.target.value)}
                    className={`w-full text-[10px] font-bold bg-white rounded p-1 outline-none text-purple-800 border ${String(col.targetCol || '').includes('!REF!') || brokenColumnReferences.some((issue) => issue.id === col.id && issue.field === 'targetCol') ? 'border-red-400 bg-red-50' : 'border-purple-200'}`}
                    title={brokenColumnReferences.some((issue) => issue.id === col.id && issue.field === 'targetCol')
                      ? 'Reference Error! Please update the target column.'
                      : ''}
                  >
                    <option value="">-</option>
                    {activeReport.columns.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                  </select>
                </td>
                <td className="p-1 border-r border-purple-100 text-center">
                  <select value={col.yearMode || 'current'} onChange={e => handleUpdateCol(col.id, 'yearMode', e.target.value)} className="w-full text-[9px] font-bold bg-slate-50 border border-slate-200 rounded p-1 outline-none text-slate-700">
                    {yearModeOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </td>
                <td className="p-1 border-r border-purple-100 text-center">
                  <select value={col.periodMode || 'current'} onChange={e => handleUpdateCol(col.id, 'periodMode', e.target.value)} className="w-full text-[9px] font-bold bg-slate-50 border border-slate-200 rounded p-1 outline-none text-slate-700">
                    {periodModeOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </td>
                <td className="p-1 border-r border-purple-100 text-center">
                  <input type="checkbox" checked={col.isPercent || false} onChange={e => handleUpdateCol(col.id, 'isPercent', e.target.checked)} />
                </td>
                <td className="p-1 border-r border-purple-100 text-center">
                  <input value={col.width || ''} onChange={e => handleUpdateCol(col.id, 'width', e.target.value)} type="number" placeholder="Auto" className="w-full text-[10px] text-right font-bold outline-none bg-transparent" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
