import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { normalizeDeptLookupCode } from '../lib/normalizeCode.js';

export default function DetailSelectorModal({
  title,
  subTitle,
  availableItems,
  selectedItems,
  onSave,
  onCancel,
  masterData,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelected, setTempSelected] = useState([...selectedItems].map(String));

  const uniqueSortedAvailable = useMemo(() => {
    const uniqueMap = new Map();
    availableItems.forEach(item => {
      const idKey = String(item.id).trim();
      if (idKey !== '' && !uniqueMap.has(idKey)) uniqueMap.set(idKey, item);
    });
    return Array.from(uniqueMap.values()).sort((a, b) =>
      String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [availableItems]);

  const availableByLookupKey = useMemo(() => {
    const lookup = new Map();
    uniqueSortedAvailable.forEach(item => {
      const key = normalizeDeptLookupCode(item.id);
      if (!lookup.has(key)) lookup.set(key, item);
    });
    return lookup;
  }, [uniqueSortedAvailable]);

  const selectedLookupKeys = useMemo(
    () => new Set(tempSelected.map(normalizeDeptLookupCode)),
    [tempSelected]
  );

  const filteredAvailable = uniqueSortedAvailable.filter(item =>
    !selectedLookupKeys.has(normalizeDeptLookupCode(item.id)) &&
    (String(item.id).toLowerCase().includes(searchTerm.toLowerCase()) || String(item.name).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (id) => {
    const key = normalizeDeptLookupCode(id);
    if (!selectedLookupKeys.has(key)) setTempSelected([...tempSelected, String(id)]);
  };
  const handleRemove = (id) => {
    const key = normalizeDeptLookupCode(id);
    setTempSelected(tempSelected.filter(i => normalizeDeptLookupCode(i) !== key));
  };
  const handleSelectAll = () => setTempSelected([...tempSelected, ...filteredAvailable.map(i => String(i.id))]);
  const handleRemoveAll = () => setTempSelected([]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[800px] flex flex-col border border-purple-100 overflow-hidden">
        <div className="bg-purple-50 px-6 py-4 border-b border-purple-100"><h2 className="text-xl font-bold text-purple-900">{title}</h2></div>
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-700">{subTitle}</h3>
          <div className="flex border border-purple-200 rounded-xl overflow-hidden h-[350px] shadow-sm">
            <div className="flex-1 flex flex-col border-r border-purple-200 bg-white">
              <div className="flex items-center border-b border-purple-200 bg-purple-50/50">
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="w-full px-4 py-3 text-sm outline-none bg-transparent placeholder-slate-400 text-slate-700 flex-1" />
                <button onClick={handleSelectAll} className="bg-purple-600 text-white px-6 py-3 text-sm font-bold hover:bg-purple-700 transition-colors">Select All</button>
              </div>
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                {filteredAvailable.map(item => (
                  <div key={item.id} onClick={() => handleSelect(item.id)} className="px-4 py-3 text-sm text-slate-700 hover:bg-purple-50 cursor-pointer border-b border-slate-50 transition-colors">
                    <span className="font-mono font-bold text-purple-700 mr-2">{item.id}</span> {item.name}
                  </div>
                ))}
                {filteredAvailable.length === 0 && <div className="p-4 text-center text-slate-400 text-sm">No items found</div>}
              </div>
            </div>
            <div className="flex-1 flex flex-col bg-white">
              <div className="flex items-center justify-between border-b border-purple-200 bg-purple-50/50">
                <div className="px-4 py-3 text-sm font-bold text-purple-700">{tempSelected.length} Items selected</div>
                <button onClick={handleRemoveAll} className="bg-red-500 text-white px-6 py-3 text-sm font-bold hover:bg-red-600 transition-colors">Remove All</button>
              </div>
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                {tempSelected.map(id => {
                  const normalizedId = normalizeDeptLookupCode(id);
                  const fullItem = availableByLookupKey.get(normalizedId)
                    || [...(masterData?.accCodes || []), ...(masterData?.depts || [])].find(i => normalizeDeptLookupCode(i.id) === normalizedId);
                  return (
                    <div key={id} onClick={() => handleRemove(id)} className="px-4 py-3 text-sm text-slate-800 hover:bg-red-50 cursor-pointer border-b border-slate-50 flex justify-between group transition-colors">
                      <span><span className="font-mono font-bold text-purple-700 mr-2">{id}</span> {fullItem?.name}</span>
                      <X size={14} className="text-red-400 opacity-0 group-hover:opacity-100" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 flex justify-end gap-3 bg-purple-50/50 border-t border-purple-100">
          <button onClick={onCancel} className="bg-white border border-purple-200 text-slate-600 px-6 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 font-bold text-sm transition-all">CANCEL</button>
          <button onClick={() => onSave(tempSelected)} className="bg-purple-600 text-white px-8 py-2.5 rounded-xl shadow-md hover:bg-purple-700 font-bold text-sm transition-all">SAVE SELECTION</button>
        </div>
      </div>
    </div>
  );
}
