import React, { useMemo, useState } from 'react';
import { BookmarkPlus, Layers3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { normalizeAccLookupCode } from '../lib/normalizeCode.js';
import { buildBulkMappingPreview, createApplyUpdates, createUndoUpdates } from '../lib/bulkMapping.js';
import MultiSelectDropdown from './MultiSelectDropdown.jsx';

const OPERATION_OPTIONS = [
  { id: 'set', label: 'Replace existing values' },
  { id: 'add', label: 'Add to existing values' },
  { id: 'remove', label: 'Remove selected values' },
  { id: 'clear', label: 'Clear mapping values' },
];

const compactValue = (value) => {
  const items = String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) return '—';
  if (items.length <= 3) return items.join(', ');
  return `${items.slice(0, 2).join(', ')} +${items.length - 2}`;
};

export default function BulkMappingDialog({
  rows,
  selectedIds,
  masterData,
  presets,
  setPresets,
  setConfirmAction,
  onApply,
  onClose,
}) {
  const [operation, setOperation] = useState('set');
  const [applyDept, setApplyDept] = useState(true);
  const [applyAccounts, setApplyAccounts] = useState(true);
  const [deptValues, setDeptValues] = useState([]);
  const [accountValues, setAccountValues] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetName, setPresetName] = useState('');
  const [presetError, setPresetError] = useState('');

  const preview = useMemo(() => buildBulkMappingPreview(rows, selectedIds, {
    operation,
    applyDept,
    applyAccounts,
    deptValues,
    accountValues,
  }), [accountValues, applyAccounts, applyDept, deptValues, operation, rows, selectedIds]);
  const changedPreview = preview.filter((item) => item.changedFields.length > 0);
  const hasRequiredValues = operation === 'clear'
    || ((!applyDept || deptValues.length > 0) && (!applyAccounts || accountValues.length > 0));
  const canApply = (applyDept || applyAccounts) && hasRequiredValues && changedPreview.length > 0;

  const loadPreset = (presetId) => {
    setSelectedPresetId(presetId);
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    const presetDepartments = preset.deptValues || [];
    const presetAccounts = preset.accountValues || [];
    setOperation('set');
    setApplyDept(presetDepartments.length > 0);
    setApplyAccounts(presetAccounts.length > 0);
    setDeptValues(presetDepartments);
    setAccountValues(presetAccounts);
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) {
      setPresetError('Enter a preset name.');
      return;
    }
    const savedDepartments = applyDept ? deptValues : [];
    const savedAccounts = applyAccounts ? accountValues : [];
    if (savedDepartments.length === 0 && savedAccounts.length === 0) {
      setPresetError('Select at least one department or account code.');
      return;
    }
    const preset = {
      id: `mapping-preset-${Date.now()}`,
      name,
      deptValues: savedDepartments,
      accountValues: savedAccounts,
    };
    setPresets((current) => [...(Array.isArray(current) ? current : []), preset]);
    setSelectedPresetId(preset.id);
    setPresetName('');
    setPresetError('');
  };

  const deletePreset = () => {
    if (!selectedPresetId) return;
    const preset = presets.find((item) => item.id === selectedPresetId);
    setConfirmAction({
      msg: `Delete mapping preset “${preset?.name || 'Unnamed'}”?`,
      onConfirm: () => {
        setPresets((current) => (Array.isArray(current) ? current : []).filter((item) => item.id !== selectedPresetId));
        setSelectedPresetId('');
      },
    });
  };

  const applyChanges = () => {
    onApply({
      applyUpdates: createApplyUpdates(preview),
      undoUpdates: createUndoUpdates(changedPreview),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-balance">
            <Layers3 className="size-4" />
            Bulk mapping
          </DialogTitle>
          <DialogDescription className="text-pretty">
            Configure {selectedIds.length} selected data rows together. Only enabled mapping fields will change.
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-4 lg:grid-cols-2">
          <section className="grid gap-4 rounded-xl border border-border p-4">
            <fieldset className="grid gap-3">
              <Label htmlFor="bulk-operation">Change mode</Label>
              <Select value={operation} onValueChange={setOperation}>
                <SelectTrigger id="bulk-operation" aria-label="Bulk mapping change mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATION_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </fieldset>

            <fieldset className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <Label className="flex items-center gap-2">
                <Checkbox
                  aria-label="Update departments"
                  checked={applyDept}
                  onCheckedChange={(checked) => setApplyDept(checked === true)}
                />
                Update departments
              </Label>
              {applyDept && operation !== 'clear' && (
                <MultiSelectDropdown
                  options={masterData?.depts || []}
                  selected={deptValues}
                  onChange={setDeptValues}
                  label="DEPT"
                  testIdPrefix="bulk-departments"
                  searchPlaceholder="Search departments..."
                  emptyLabel="None selected"
                />
              )}
            </fieldset>

            <fieldset className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <Label className="flex items-center gap-2">
                <Checkbox
                  aria-label="Update account codes"
                  checked={applyAccounts}
                  onCheckedChange={(checked) => setApplyAccounts(checked === true)}
                />
                Update account codes
              </Label>
              {applyAccounts && operation !== 'clear' && (
                <MultiSelectDropdown
                  options={masterData?.accCodes || []}
                  selected={accountValues}
                  onChange={setAccountValues}
                  label="ACCOUNT"
                  testIdPrefix="bulk-accounts"
                  normalizeValue={normalizeAccLookupCode}
                  searchPlaceholder="Search account codes..."
                  emptyLabel="None selected"
                />
              )}
            </fieldset>

            {!hasRequiredValues && (
              <p className="text-sm text-destructive" role="alert">
                Select values for every enabled field, or choose Clear mapping values.
              </p>
            )}
          </section>

          <section className="grid content-start gap-4 rounded-xl border border-border p-4">
            <header className="grid gap-1">
              <h3 className="text-sm font-semibold text-balance">Mapping presets</h3>
              <p className="text-sm text-pretty text-muted-foreground">Reuse department and account selections across reports.</p>
            </header>

            <section className="flex gap-2">
              <Select value={selectedPresetId} onValueChange={loadPreset}>
                <SelectTrigger aria-label="Select mapping preset" className="min-w-0 flex-1">
                  <SelectValue placeholder={presets.length > 0 ? 'Choose preset' : 'No presets yet'} />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>{preset.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label="Delete selected mapping preset"
                disabled={!selectedPresetId}
                onClick={deletePreset}
              >
                <Trash2 />
              </Button>
            </section>

            <fieldset className="grid gap-2">
              <Label htmlFor="mapping-preset-name">Save current selections</Label>
              <section className="flex gap-2">
                <Input
                  id="mapping-preset-name"
                  value={presetName}
                  onChange={(event) => {
                    setPresetName(event.target.value);
                    setPresetError('');
                  }}
                  placeholder="Preset name"
                  aria-invalid={Boolean(presetError)}
                  aria-describedby={presetError ? 'mapping-preset-error' : undefined}
                />
                <Button type="button" variant="outline" onClick={savePreset}>
                  <BookmarkPlus />
                  Save
                </Button>
              </section>
              {presetError && <p id="mapping-preset-error" className="text-sm text-destructive">{presetError}</p>}
            </fieldset>
          </section>
        </section>

        <section className="overflow-hidden rounded-xl border border-border">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
            <h3 className="text-sm font-semibold text-balance">Preview</h3>
            <p className="text-sm tabular-nums text-muted-foreground">
              {changedPreview.length} of {preview.length} rows will change
            </p>
          </header>
          <section className="max-h-64 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Department before → after</TableHead>
                  <TableHead>Account before → after</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.slice(0, 20).map((item) => (
                  <TableRow key={item.id} className={item.changedFields.length === 0 ? 'opacity-60' : ''}>
                    <TableCell className="max-w-48 truncate font-medium">{item.desc}</TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {compactValue(item.before.dept)} → {compactValue(item.after.dept)}
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {compactValue(item.before.accCodes)} → {compactValue(item.after.accCodes)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
          {preview.length > 20 && (
            <p className="border-t px-3 py-2 text-xs tabular-nums text-muted-foreground">
              Showing first 20 of {preview.length} selected rows.
            </p>
          )}
        </section>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={!canApply} onClick={applyChanges}>
            Apply to {changedPreview.length} rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
