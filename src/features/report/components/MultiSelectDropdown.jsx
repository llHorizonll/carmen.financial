import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { normalizeDeptLookupCode } from '../lib/normalizeCode.js';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.jsx';
import { cn } from '@/lib/utils.js';

export default function MultiSelectDropdown({ options, selected, onChange, label, testIdPrefix }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const validOptions = useMemo(() => {
    const unique = [];
    const seen = new Set();

    options.forEach((option) => {
      if (typeof option === 'string') {
        const id = option.trim();
        if (!id || seen.has(id)) return;
        seen.add(id);
        unique.push({ id, display: id, searchText: id });
        return;
      }

      if (!option?.id) return;
      const id = String(option.id).trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      const display = option.name && option.name !== option.id && option.name !== `Dept ${option.id}`
        ? `${id} - ${option.name}`
        : id;
      unique.push({ id, display, searchText: `${id} ${option.name || ''}`.trim() });
    });

    return unique.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
  }, [options]);

  const selectedLookupKeys = useMemo(() => new Set(selected.map(normalizeDeptLookupCode)), [selected]);
  const selectedItems = useMemo(
    () => validOptions.filter((option) => selectedLookupKeys.has(normalizeDeptLookupCode(option.id))),
    [selectedLookupKeys, validOptions]
  );
  const isAllSelected = validOptions.length > 0 && selectedItems.length === validOptions.length;
  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return validOptions;
    return validOptions.filter((option) =>
      option.display.toLowerCase().includes(term) || option.id.toLowerCase().includes(term)
    );
  }, [searchTerm, validOptions]);

  const isSelected = (id) => selectedLookupKeys.has(normalizeDeptLookupCode(id));
  const selectAll = () => onChange(validOptions.map((option) => option.id));
  const clearAll = () => onChange([]);
  const toggleSelected = (id) => {
    const key = normalizeDeptLookupCode(id);
    const existingIndex = selected.findIndex((item) => normalizeDeptLookupCode(item) === key);
    if (existingIndex >= 0) onChange(selected.filter((_, index) => index !== existingIndex));
    else onChange([...selected, id]);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-10 w-full justify-between gap-2 rounded-xl px-3 text-left"
          data-testid={`dropdown-${testIdPrefix}`}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="mt-0.5 block truncate text-sm font-medium" data-testid={`selected-value-${testIdPrefix}`}>
              {selected.length === 0 || isAllSelected
                ? 'All'
                : selectedItems.length <= 2
                  ? selectedItems.map((item) => item.display).join(', ')
                  : `${selectedItems.length} selected`}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(28rem,calc(100vw-2rem))] overflow-hidden border border-border p-0 shadow-[0_24px_72px_-24px_rgba(15,23,42,0.22)] ring-1 ring-black/5"
        align="start"
      >
        <div className="border-b border-border/60 px-3 py-2">
          <div className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setSearchTerm('');
                }
              }}
              placeholder="Search department..."
              className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-7 rounded-full px-3 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              onClick={selectAll}
              disabled={validOptions.length === 0 || isAllSelected}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-7 rounded-full px-3 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              onClick={clearAll}
              disabled={selected.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="max-h-[min(60vh,320px)] overflow-y-auto p-1">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No data</div>
          ) : (
            filteredOptions.map((option) => {
              const selectedState = isSelected(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleSelected(option.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50',
                    selectedState && 'bg-muted text-foreground'
                  )}
                  data-testid={`check-${testIdPrefix}-${option.id}`}
                  aria-pressed={selectedState}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded border border-border bg-background text-transparent transition-colors',
                      selectedState && 'border-primary bg-primary text-primary-foreground'
                    )}
                  >
                    <Check className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{option.display}</span>
                  {selectedState && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
