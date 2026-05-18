import React from 'react';
import { Check, UserCheck, X } from 'lucide-react';

export default function AccessModal({ isOpen, masterData, activeReport, onClose, onUpdateUsers }) {
  if (!isOpen || !activeReport) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[400px] flex flex-col border border-purple-100 overflow-hidden">
        <div className="p-5 border-b border-purple-100 flex justify-between items-center bg-purple-50">
          <h2 className="text-sm font-bold text-purple-900 flex items-center gap-2"><UserCheck size={16} className="text-purple-600" /> Manage Report Access</h2>
          <button onClick={onClose} className="text-purple-400 hover:text-purple-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-2 max-h-[300px] overflow-y-auto">
          {masterData.users.map(u => (
            <label key={u.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${activeReport.assignedUsers.includes(u.id) ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <input type="checkbox" className="hidden" checked={activeReport.assignedUsers.includes(u.id)} onChange={() => {
                const newUsers = activeReport.assignedUsers.includes(u.id) ? activeReport.assignedUsers.filter(id => id !== u.id) : [...activeReport.assignedUsers, u.id];
                onUpdateUsers(newUsers);
              }} />
              <div className={`w-5 h-5 rounded border flex items-center justify-center ${activeReport.assignedUsers.includes(u.id) ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300'}`}>
                {activeReport.assignedUsers.includes(u.id) && <Check size={14} className="text-white font-bold" />}
              </div>
              <div><p className="text-sm font-bold">{u.name}</p><p className="text-[10px] text-slate-400">{u.role}</p></div>
            </label>
          ))}
        </div>
        <div className="p-4 bg-slate-50 border-t border-purple-100 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-purple-700">Done</button>
        </div>
      </div>
    </div>
  );
}
