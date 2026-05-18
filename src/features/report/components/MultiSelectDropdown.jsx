import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { normalizeDeptLookupCode } from '../lib/normalizeCode.js';

export default function MultiSelectDropdown({ options, selected, onChange, label, testIdPrefix }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const validOptions = useMemo(() => {
    const filtered = options.filter(o => {
      if (typeof o === 'string') return o.trim() !== '';
      return o && o.id && String(o.id).trim() !== '';
    });

    const unique = [];
    const seen = new Set();

    for (const opt of filtered) {
      const isObj = typeof opt === 'object';
      const strId = isObj ? String(opt.id).trim() : String(opt).trim();
      if (!seen.has(strId)) {
        seen.add(strId);
        unique.push({
          id: strId,
          display: isObj && opt.name && opt.name !== opt.id && opt.name !== `Dept ${opt.id}`
            ? `${strId} - ${opt.name}`
            : strId
        });
      }
    }
    return unique.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
  }, [options]);

  const selectedLookupKeys = useMemo(() => new Set(selected.map(normalizeDeptLookupCode)), [selected]);

  const isSelected = (id) => selectedLookupKeys.has(normalizeDeptLookupCode(id));
  const toggleSelected = (id) => {
    const key = normalizeDeptLookupCode(id);
    const existingIndex = selected.findIndex(item => normalizeDeptLookupCode(item) === key);
    if (existingIndex >= 0) onChange(selected.filter((_, idx) => idx !== existingIndex));
    else onChange([...selected, id]);
  };

  return (
    <div className="print:hidden relative" data-testid={`dropdown-${testIdPrefix}`}>
      <div
        ref={triggerRef}
        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-2 shadow-sm hover:border-slate-400 transition-all"
        onClick={toggleDropdown}
      >
        <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest">{label}:</span>
        <span className="truncate max-w-[120px]" data-testid={`selected-value-${testIdPrefix}`}>{selected.length === 0 ? 'ALL' : selected.join(', ')}</span>
        <ChevronDown size={12} className="text-slate-400" />
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div
            className="absolute left-0 top-full mt-2 min-w-[200px] bg-white border border-slate-200 shadow-xl rounded-2xl z-50 p-2 overflow-hidden animate-in fade-in zoom-in duration-150 max-h-[300px] overflow-y-auto custom-scrollbar"
          >
            {validOptions.map(opt => (
              <label key={opt.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl cursor-pointer text-sm text-slate-700 font-medium transition-colors">
                <input data-testid={`check-${testIdPrefix}-${opt.id}`} type="checkbox" checked={isSelected(opt.id)} onChange={() => toggleSelected(opt.id)} className="rounded-md text-slate-600 w-4 h-4 border-slate-300" />
                <span>{opt.display}</span>
              </label>
            ))}
            {validOptions.length === 0 && <div className="px-3 py-2 text-xs text-slate-400 text-center">No Data</div>}
          </div>
        </>
      )}
    </div>
  );
}
