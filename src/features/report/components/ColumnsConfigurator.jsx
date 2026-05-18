import React from 'react';
import { ArrowLeft, ArrowRight, Percent, Plus, Trash2 } from 'lucide-react';

export default function ColumnsConfigurator({
  activeReport,
  handleAddCol,
  handleUpdateCol,
  moveCol,
  handleDeleteCol,
}) {
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
                  <select value={col.type || 'AC'} onChange={e => handleUpdateCol(col.id, 'type', e.target.value)} className="w-full text-[9px] font-bold bg-purple-50 border border-purple-200 rounded p-1 outline-none text-purple-700">
                    <option value="AC">AC</option>
                    <option value="ACC">ACC</option>
                    <option value="BUD">BUD</option>
                    <option value="BUDACC">BUDACC</option>
                  </select>
                </td>
                <td className="p-1 border-r border-purple-100 text-center">
                  <select value={col.targetCol || ''} onChange={e => handleUpdateCol(col.id, 'targetCol', e.target.value)} className="w-full text-[10px] font-bold bg-white rounded p-1 outline-none text-purple-800 border border-purple-200">
                    <option value="">-</option>
                    {activeReport.columns.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                  </select>
                </td>
                <td className="p-1 border-r border-purple-100 text-center">
                  <select value={col.yearMode || 'current'} onChange={e => handleUpdateCol(col.id, 'yearMode', e.target.value)} className="w-full text-[9px] font-bold bg-slate-50 border border-slate-200 rounded p-1 outline-none text-slate-700">
                    <option value="current">Current</option>
                    <option value="-1">Prev</option>
                  </select>
                </td>
                <td className="p-1 border-r border-purple-100 text-center">
                  <select value={col.periodMode || 'current'} onChange={e => handleUpdateCol(col.id, 'periodMode', e.target.value)} className="w-full text-[9px] font-bold bg-slate-50 border border-slate-200 rounded p-1 outline-none text-slate-700">
                    <option value="current">Current</option>
                    <option value="-1">Prev</option>
                    <option value="FY">FY</option>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
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
