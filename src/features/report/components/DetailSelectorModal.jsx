import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { normalizeDeptLookupCode } from '../lib/normalizeCode.js';
import { Button } from '@/components/ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { Separator } from '@/components/ui/separator.jsx';

const toSelectedIds = (selectedItems) => [...selectedItems].map(String);

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
  const [tempSelected, setTempSelected] = useState(() => toSelectedIds(selectedItems));
  const friendlyButtonClassName = 'border-stone-300 bg-stone-100 text-stone-800 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100';

  const uniqueSortedAvailable = useMemo(() => {
    const uniqueMap = new Map();
    availableItems.forEach((item) => {
      const idKey = String(item.id).trim();
      if (idKey !== '' && !uniqueMap.has(idKey)) uniqueMap.set(idKey, item);
    });
    return Array.from(uniqueMap.values()).sort((a, b) =>
      String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [availableItems]);

  const availableByLookupKey = useMemo(() => {
    const lookup = new Map();
    uniqueSortedAvailable.forEach((item) => {
      const key = normalizeDeptLookupCode(item.id);
      if (!lookup.has(key)) lookup.set(key, item);
    });
    return lookup;
  }, [uniqueSortedAvailable]);

  const selectedLookupKeys = useMemo(
    () => new Set(tempSelected.map(normalizeDeptLookupCode)),
    [tempSelected]
  );

  const filteredAvailable = uniqueSortedAvailable.filter((item) =>
    !selectedLookupKeys.has(normalizeDeptLookupCode(item.id)) &&
    (String(item.id).toLowerCase().includes(searchTerm.toLowerCase()) || String(item.name).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (id) => {
    const key = normalizeDeptLookupCode(id);
    if (!selectedLookupKeys.has(key)) setTempSelected([...tempSelected, String(id)]);
  };
  const handleRemove = (id) => {
    const key = normalizeDeptLookupCode(id);
    setTempSelected(tempSelected.filter((item) => normalizeDeptLookupCode(item) !== key));
  };
  const handleSelectAll = () => setTempSelected([...tempSelected, ...filteredAvailable.map((item) => String(item.id))]);
  const handleRemoveAll = () => setTempSelected([]);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        className="w-[calc(100vw-1rem)] max-w-6xl"
        style={{ width: 'min(98vw, 90rem)', maxWidth: 'min(98vw, 90rem)' }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subTitle}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background">
            <div className="flex flex-col gap-2 border-b bg-muted/30 p-3 sm:flex-row">
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="h-9" />
              <Button type="button" variant="outline" className={`w-full sm:w-auto ${friendlyButtonClassName}`} onClick={handleSelectAll}>
                Select all
              </Button>
            </div>
            <ScrollArea className="h-[min(54vh,420px)]">
              <div className="divide-y">
                {filteredAvailable.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-muted/30"
                  >
                    <span className="font-mono font-semibold text-primary">{item.id}</span>
                    <span className="text-foreground">{item.name}</span>
                  </button>
                ))}
                {filteredAvailable.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">No items found</div>}
              </div>
            </ScrollArea>
          </div>

          <div className="rounded-xl border border-border bg-background">
            <div className="flex items-center justify-between gap-2 border-b bg-muted/30 p-3">
              <div className="text-sm font-medium">{tempSelected.length} Items selected</div>
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto border-destructive/30 bg-destructive/10 text-destructive hover:border-destructive/40 hover:bg-destructive/20"
                onClick={handleRemoveAll}
              >
                Remove all
              </Button>
            </div>
            <ScrollArea className="h-[min(54vh,420px)]">
              <div className="divide-y">
                {tempSelected.map((id) => {
                  const normalizedId = normalizeDeptLookupCode(id);
                  const fullItem = availableByLookupKey.get(normalizedId)
                    || [...(masterData?.accCodes || []), ...(masterData?.depts || [])].find((item) => normalizeDeptLookupCode(item.id) === normalizedId);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleRemove(id)}
                      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-destructive/5"
                    >
                      <span>
                        <span className="font-mono font-semibold text-primary">{id}</span>{' '}
                        <span>{fullItem?.name}</span>
                      </span>
                      <X className="size-4 text-destructive" />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex-col-reverse sm:flex-row">
          <Button variant="outline" className={`w-full sm:w-auto ${friendlyButtonClassName}`} onClick={onCancel}>Cancel</Button>
          <Button className={`w-full sm:w-auto border ${friendlyButtonClassName}`} onClick={() => onSave(tempSelected)}>Save selection</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
