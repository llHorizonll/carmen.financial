import React from 'react';
import { SearchIcon, Settings2, X } from 'lucide-react';

export default function EditMappingModal({
  isOpen,
  editingRow,
  setEditingRow,
  masterData,
  reportOptions = {},
  modalAccCategory,
  setModalAccCategory,
  onOpenDetailSelector,
  onApply,
  onClose,
}) {
  if (!isOpen || !editingRow) return null;

  const accountCategoryOptions = reportOptions.accountCategories?.length > 0
    ? reportOptions.accountCategories
    : [
        { id: 'ALL', label: 'All Categories' },
        { id: 'I', label: 'Income Statement' },
        { id: 'B', label: 'Balance Sheet' },
      ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[500px] flex flex-col border border-purple-100 overflow-hidden">
        <div className="p-4 border-b border-purple-100 flex justify-between items-center bg-purple-50">
          <div className="flex items-center gap-2 text-purple-900"><Settings2 size={16} className="text-purple-600" /><h2 className="text-sm font-bold">Edit Mapping</h2></div>
          <button onClick={onClose} className="text-purple-400 hover:text-purple-600 transition-colors"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
            <input value={editingRow.desc} onChange={e => setEditingRow({ ...editingRow, desc: e.target.value })} className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-purple-500" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-slate-700">Departments</label>
              <button onClick={() => onOpenDetailSelector({ field: 'dept', title: 'Select Departments', subTitle: editingRow.desc, items: masterData.depts })} className="text-purple-600 text-[10px] font-bold flex items-center gap-1 hover:underline"><SearchIcon size={10} /> Select</button>
            </div>
            <input value={editingRow.dept} onChange={e => setEditingRow({ ...editingRow, dept: e.target.value })} placeholder="e.g. 101, 102" className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-purple-500" />
          </div>

          <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700">Group Level Target</label>
              <select
                value={editingRow.groupLevel || 'L4'}
                onChange={e => setEditingRow({
                  ...editingRow,
                  groupLevel: e.target.value,
                  groups: '',
                })}
                className="bg-white border border-purple-200 rounded-md px-2 py-1 text-xs font-bold text-purple-700 outline-none focus:border-purple-500 w-32 cursor-pointer"
              >
                <option value="L1">L1 (Category)</option><option value="L2">L2 (Sub Category)</option><option value="L3">L3 (Group)</option><option value="L4">L4 (Detail)</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-slate-700">Group Names</label>
                <button onClick={() => onOpenDetailSelector({ field: 'groups', title: 'Select Groups', subTitle: editingRow.desc, items: masterData.groups[editingRow.groupLevel || 'L4'] })} className="text-purple-600 text-[10px] font-bold flex items-center gap-1 hover:underline"><SearchIcon size={10} /> Select</button>
              </div>
              <input value={editingRow.groups} onChange={e => setEditingRow({ ...editingRow, groups: e.target.value })} placeholder="e.g. Food Revenue" className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-purple-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Dim 1</label>
                <input
                  value={editingRow.dim1 || ''}
                  onChange={e => setEditingRow({ ...editingRow, dim1: e.target.value })}
                  placeholder="Optional"
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Dim 2</label>
                <input
                  value={editingRow.dim2 || ''}
                  onChange={e => setEditingRow({ ...editingRow, dim2: e.target.value })}
                  placeholder="Optional"
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-700">Account Codes Filter</label>
              <select value={modalAccCategory} onChange={e => setModalAccCategory(e.target.value)} className="bg-white border border-slate-300 rounded px-2 py-0.5 text-[11px] font-bold text-indigo-700 outline-none cursor-pointer">
                {accountCategoryOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-slate-700">Account Codes</label>
                <button onClick={() => onOpenDetailSelector({ field: 'accCodes', title: 'Select Account Detail', subTitle: editingRow.desc, items: masterData.accCodes.filter(a => modalAccCategory === 'ALL' || a.type === modalAccCategory) })} className="text-purple-600 text-[10px] font-bold flex items-center gap-1 hover:underline"><SearchIcon size={10} /> Select Detail</button>
              </div>
              <textarea value={editingRow.accCodes} onChange={e => setEditingRow({ ...editingRow, accCodes: e.target.value })} placeholder="e.g. 4001, 4002" className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-purple-500 h-16 resize-none" />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-purple-100 flex justify-end gap-2 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-1.5 text-slate-600 font-bold hover:bg-slate-200 rounded-md text-xs transition-colors">Cancel</button>
          <button onClick={onApply} className="px-5 py-1.5 bg-purple-600 text-white font-bold rounded-md shadow-sm hover:bg-purple-700 transition-colors text-xs">Apply Mapping</button>
        </div>
      </div>
    </div>
  );
}
