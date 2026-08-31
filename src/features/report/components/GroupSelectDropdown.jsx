import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { cn } from '@/lib/utils.js';

const formatGroupLabel = (group, memberKey) => {
  if (!group) return '';
  const level = group.level ? `${group.level} · ` : '';
  const memberCount = Array.isArray(group[memberKey]) ? group[memberKey].length : 0;
  return `${level}${group.id} — ${group.name} (${memberCount})`;
};

export default function GroupSelectDropdown({
  ariaLabel,
  emptyLabel,
  groups,
  memberKey,
  onChange,
  value,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectedGroup = groups.find((group) => String(group.id) === String(value)) || null;
  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase();
    if (!term) return groups;
    return groups.filter((group) => (
      `${group.level || ''} ${group.id || ''} ${group.name || ''}`.toLocaleLowerCase().includes(term)
    ));
  }, [groups, searchTerm]);

  const chooseGroup = (nextValue) => {
    onChange(nextValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          className="h-9 w-full justify-between bg-background px-3 text-left font-normal"
        >
          <span className={cn('truncate', !selectedGroup && 'text-muted-foreground')}>
            {selectedGroup ? formatGroupLabel(selectedGroup, memberKey) : emptyLabel}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 gap-0 overflow-hidden p-0" align="start">
        <section className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label={`Search ${ariaLabel.toLowerCase()}`}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by level, code, or name"
            className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
        </section>
        <section aria-label={`${ariaLabel} options`} className="max-h-72 overflow-y-auto p-1">
          <button
            type="button"
            aria-pressed={!selectedGroup}
            onClick={() => chooseGroup('__none__')}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Check className={cn('size-4 shrink-0', selectedGroup ? 'invisible' : 'visible')} aria-hidden="true" />
            <span>{emptyLabel}</span>
          </button>
          {filteredGroups.map((group) => {
            const isSelected = String(group.id) === String(value);
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => chooseGroup(group.id)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50',
                  isSelected && 'bg-muted text-foreground',
                )}
              >
                <Check className={cn('mt-0.5 size-4 shrink-0 text-primary', isSelected ? 'visible' : 'invisible')} aria-hidden="true" />
                <span className="min-w-0 leading-5 text-pretty">{formatGroupLabel(group, memberKey)}</span>
              </button>
            );
          })}
          {filteredGroups.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matching groups</p>
          )}
        </section>
      </PopoverContent>
    </Popover>
  );
}
