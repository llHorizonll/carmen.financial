import React from 'react';
import { ArrowDown, ArrowUp, Calculator, Edit3, Layout, Trash2 } from 'lucide-react';
import { findBrokenReferences, getRowMappingWarnings } from '../lib/reportLogic.js';

export default function RowsConfigurator({
  activeReport,
  masterData,
  handleAddRow,
  handleUpdateRow,
  handleUpdateRowMulti,
  moveRow,
  handleDeleteRow,
  setEditingRow,
  setConfirmAction,
}) {
  const brokenRowReferences = findBrokenReferences(activeReport).filter((issue) => issue.scope === 'row');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden flex-1 min-h-[350px] flex flex-col">
      <div className="p-3 bg-purple-50/80 flex items-center justify-between border-b border-purple-200 flex-shrink-0">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Layout size={14} className="text-purple-500" /> Rows Configurator</h3>
        <div className="flex gap-2">
          <button onClick={() => handleAddRow('data')} className="px-3 py-1.5 bg-white border border-purple-200 rounded text-[8px] font-bold uppercase tracking-widest text-purple-700 shadow-sm hover:bg-purple-50 transition-colors">+ Add Data Row</button>
          <button onClick={() => handleAddRow('header')} className="px-3 py-1.5 bg-white border border-purple-200 rounded text-[8px] font-bold uppercase tracking-widest text-purple-700 shadow-sm hover:bg-purple-50 transition-colors">+ Add Header Row</button>
          <button onClick={() => handleAddRow('formula')} className="px-3 py-1.5 bg-purple-600 text-white rounded text-[8px] font-bold uppercase tracking-widest shadow-sm hover:bg-purple-700 transition-colors">+ Add Formula Row</button>
        </div>
      </div>
      {brokenRowReferences.length > 0 && (
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-red-50 text-red-700 border-b border-red-100">
          Broken row references found. Fix {brokenRowReferences.length} invalid reference(s) before saving.
        </div>
      )}

      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="sticky top-0 z-30 bg-purple-100 shadow-sm">
            <tr className="text-purple-900 text-[9px] font-black uppercase tracking-widest">
              <th className="p-3 border-r border-purple-200 sticky left-0 bg-purple-100 z-40 w-[40px] text-center shadow-[1px_0_0_0_#e9d5ff]">Del</th>
              <th className="p-3 border-r border-purple-200 sticky left-[40px] bg-purple-100 z-40 w-20 text-center shadow-[1px_0_0_0_#e9d5ff]">Type</th>
              <th className="p-3 border-r border-purple-200 sticky left-[120px] bg-purple-100 z-40 w-56 min-w-[14rem] shadow-[1px_0_0_0_#e9d5ff]">Description</th>
              <th className="p-3 border-r border-purple-200 w-12 text-center bg-purple-100">Indent</th>
              <th className="p-3 border-r border-purple-200 w-10 text-center bg-purple-100">Row</th>
              <th className="p-3 border-r border-purple-200 w-16 text-center text-purple-600 bg-purple-100">% Base</th>
              <th className="p-3 border-r border-purple-200 w-[350px] bg-purple-100">Mapping Rules Setup</th>
            </tr>
          </thead>
          <tbody>
            {activeReport.rows.map((row, idx) => {
              const isHeader = row.isHeader || false;
              const isTotal = row.isTotal || false;
              const rowType = isTotal ? 'F' : (isHeader ? 'H' : 'D');
              const rowFormulaIssues = brokenRowReferences.filter((issue) => issue.id === row.id && issue.field === 'formula');
              const rowPercentBaseIssues = brokenRowReferences.filter((issue) => issue.id === row.id && issue.field === 'percentBase');

              const isPctBroken = rowPercentBaseIssues.length > 0 || (row.percentBase && row.percentBase.includes('!REF!'));
              const isFormulaBroken = rowFormulaIssues.length > 0 || (row.formula && row.formula.includes('!REF!'));
              const rowWarnings = getRowMappingWarnings(row, activeReport.rows, masterData);

              return (
                <tr key={row.id} className={`border-b border-purple-50 ${isTotal ? 'bg-purple-50/50' : isHeader ? 'bg-purple-100/40' : 'hover:bg-slate-50/50'}`}>
                  <td className="p-1 border-r border-purple-100 sticky left-0 bg-white z-20 text-center shadow-[1px_0_0_0_#e9d5ff]">
                    <button onClick={() => setConfirmAction({ msg: 'Delete Row?', onConfirm: () => handleDeleteRow(row.id) })} className="text-slate-300 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                  </td>
                  <td className="p-1 border-r border-purple-100 sticky left-[40px] bg-white z-20 text-center shadow-[1px_0_0_0_#e9d5ff]">
                    <select
                      value={rowType}
                      onChange={(e) => {
                        const t = e.target.value;
                        if (t === 'D') handleUpdateRowMulti(row.id, { isTotal: false, isHeader: false });
                        else if (t === 'H') handleUpdateRowMulti(row.id, { isTotal: false, isHeader: true, formula: '', percentBase: '', dept: '', accCodes: '', groups: '' });
                        else if (t === 'F') handleUpdateRowMulti(row.id, { isTotal: true, isHeader: false, dept: '', accCodes: '', groups: '' });
                      }}
                      className="text-[9px] font-bold bg-slate-50 border border-slate-200 rounded p-1 outline-none text-slate-700 text-center w-full cursor-pointer hover:bg-slate-100"
                    >
                      <option value="D">Data (D)</option>
                      <option value="H">Header (H)</option>
                      <option value="F">Formula (F)</option>
                    </select>
                  </td>
                  <td className="p-1 border-r border-purple-100 sticky left-[120px] bg-white z-20 shadow-[1px_0_0_0_#e9d5ff]">
                    <input value={row.desc} onChange={e => handleUpdateRow(row.id, 'desc', e.target.value)} className={`w-full text-[11px] font-bold bg-transparent outline-none focus:text-purple-600 p-1.5 ${isHeader ? 'text-purple-900' : ''}`} />
                  </td>
                  <td className="p-1 border-r border-purple-100 text-center bg-slate-50/30">
                    <select value={row.indent || 0} onChange={e => handleUpdateRow(row.id, 'indent', parseInt(e.target.value, 10))} className="text-[9px] bg-white border border-slate-200 rounded p-1 outline-none text-slate-700">
                      <option value={0}>Lvl 0</option><option value={1}>Lvl 1</option><option value={2}>Lvl 2</option><option value={3}>Lvl 3</option>
                    </select>
                  </td>
                  <td className="p-1 border-r border-purple-100 text-center bg-slate-50/30">
                    <div className="flex flex-col items-center gap-0">
                      <button onClick={() => moveRow(idx, 'up')} className="text-slate-300 hover:text-purple-600"><ArrowUp size={10} /></button>
                      <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1 rounded">R{idx + 1}</span>
                      <button onClick={() => moveRow(idx, 'down')} className="text-slate-300 hover:text-purple-600"><ArrowDown size={10} /></button>
                    </div>
                  </td>
                  <td className="p-1 border-r border-purple-100 text-center bg-purple-50/30">
                    {!isHeader && (
                        <input
                          value={row.percentBase}
                          onChange={e => handleUpdateRow(row.id, 'percentBase', e.target.value.toUpperCase())}
                          className={`w-10 text-center text-[9px] font-mono font-bold border rounded p-1 outline-none ${isPctBroken ? 'border-red-500 bg-red-50 text-red-600' : 'border-purple-200 text-purple-700 bg-white'}`}
                          placeholder="R3"
                          title={isPctBroken ? "Reference Error! Please update the % base reference." : ""}
                        />
                      )}
                  </td>
                  <td className="p-2 border-r border-purple-100 bg-slate-50/20">
                    {isHeader ? (
                      <span className="text-[10px] text-purple-400 italic">Header Row (No data mapping)</span>
                    ) : isTotal ? (
                      <div className={`flex items-center gap-2 bg-white border rounded-md p-1.5 shadow-sm max-w-[280px] ${isFormulaBroken ? 'border-red-400 bg-red-50' : 'border-purple-200'}`}>
                        <Calculator size={12} className={isFormulaBroken ? "text-red-500" : "text-purple-500"} />
                        <input
                          value={row.formula}
                          onChange={e => handleUpdateRow(row.id, 'formula', e.target.value)}
                          className={`w-full bg-transparent text-[10px] font-mono font-bold outline-none ${isFormulaBroken ? 'text-red-600' : 'text-purple-700'}`}
                          placeholder="e.g. R1+R2"
                          title={isFormulaBroken ? "Reference Error! Please update the formula." : ""}
                        />
                      </div>
                    ) : (
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="text-[9px] font-medium text-slate-600 truncate"><span className="font-bold text-slate-400 text-[7px] uppercase mr-1.5">DEPT:</span>{row.dept || '-'}</div>
                          <div className="text-[9px] font-medium text-slate-600 truncate"><span className="font-bold text-slate-400 text-[7px] uppercase mr-1.5">GRP ({row.groupLevel || 'L4'}):</span>{row.groups || '-'}</div>
                          <div className="text-[9px] font-medium text-slate-600 truncate"><span className="font-bold text-slate-400 text-[7px] uppercase mr-1.5">CODE:</span>{row.accCodes || '-'}</div>
                          <div className="text-[9px] font-medium text-slate-600 truncate"><span className="font-bold text-slate-400 text-[7px] uppercase mr-1.5">DIM:</span>{[row.dim1, row.dim2].filter(Boolean).join(', ') || '-'}</div>
                          {rowWarnings.length > 0 && (
                            <div className="space-y-0.5 pt-1">
                              {rowWarnings.map((warning) => (
                                <div key={warning} className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-100 rounded px-2 py-1">
                                  {warning}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => setEditingRow({ ...row })} className="p-1.5 text-purple-600 bg-white hover:bg-purple-50 rounded transition-all border border-purple-200 shadow-sm"><Edit3 size={12} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
