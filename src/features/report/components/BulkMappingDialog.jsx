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
import GroupSelectDropdown from './GroupSelectDropdown.jsx';

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
  dimensionDefinitions = [],
}) {
  const [operation, setOperation] = useState('set');
  const [applyDept, setApplyDept] = useState(true);
  const [applyAccounts, setApplyAccounts] = useState(true);
  const [deptValues, setDeptValues] = useState([]);
  const [accountValues, setAccountValues] = useState([]);
  const [applyDeptGroup, setApplyDeptGroup] = useState(false);
  const [deptGroupValues, setDeptGroupValues] = useState([]);
  const [applyAccountGroup, setApplyAccountGroup] = useState(false);
  const [accountGroupValues, setAccountGroupValues] = useState([]);
  const [accountGroupLevel, setAccountGroupLevel] = useState('');
  const dimensionFields = Array.from({ length: 10 }, (_, index) => {
    const key = `dim${index + 1}`;
    const definition = dimensionDefinitions.find((item) => item.key === key);
    return { key, label: definition?.caption || `Dimension ${index + 1}`, options: definition?.values || [] };
  });
  const [dimensionValues, setDimensionValues] = useState(() => Object.fromEntries(dimensionFields.map(({ key }) => [key, { enabled: false, values: [] }])));
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetName, setPresetName] = useState('');
  const [presetError, setPresetError] = useState('');

  const preview = useMemo(() => buildBulkMappingPreview(rows, selectedIds, {
    operation,
    applyDept,
    applyAccounts,
    deptValues,
    accountValues,
    applyDeptGroup,
    deptGroupValues,
    applyAccountGroup,
    accountGroupValues,
    accountGroupLevel,
    dimensionValues,
  }), [accountValues, applyAccounts, applyDept, deptValues, operation, rows, selectedIds]);
  const changedPreview = preview.filter((item) => item.changedFields.length > 0);
  const enabledFields = applyDept || applyAccounts || applyDeptGroup || applyAccountGroup || Object.values(dimensionValues).some((config) => config.enabled);
  const hasRequiredValues = operation === 'clear' || [
    applyDept ? deptValues : null,
    applyAccounts ? accountValues : null,
    applyDeptGroup ? deptGroupValues : null,
    applyAccountGroup ? accountGroupValues : null,
    ...Object.values(dimensionValues).filter((config) => config.enabled).map((config) => config.values),
  ].filter(Boolean).every((values) => values.length > 0);
  const canApply = enabledFields && hasRequiredValues && changedPreview.length > 0;

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
    setApplyDeptGroup((preset.deptGroupValues || []).length > 0);
    setDeptGroupValues(preset.deptGroupValues || []);
    setApplyAccountGroup((preset.accountGroupValues || []).length > 0);
    setAccountGroupValues(preset.accountGroupValues || []);
    setAccountGroupLevel(preset.accountGroupLevel || '');
    setDimensionValues(preset.dimensionValues || Object.fromEntries(dimensionFields.map(({ key }) => [key, { enabled: false, values: [] }])));
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) {
      setPresetError('Enter a preset name.');
      return;
    }
    const savedDepartments = applyDept ? deptValues : [];
    const savedAccounts = applyAccounts ? accountValues : [];
    if (!enabledFields || !hasRequiredValues) {
      setPresetError('Enable a mapping field and select its values first.');
      return;
    }
    const preset = {
      id: `mapping-preset-${Date.now()}`,
      name,
      deptValues: savedDepartments,
      accountValues: savedAccounts,
      deptGroupValues: applyDeptGroup ? deptGroupValues : [],
      accountGroupValues: applyAccountGroup ? accountGroupValues : [],
      accountGroupLevel: applyAccountGroup ? accountGroupLevel : '',
      dimensionValues,
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
      <DialogContent className="max-h-[min(92dvh,60rem)] overflow-y-auto p-0 sm:max-w-6xl">
        <DialogHeader className="border-b bg-muted/20 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-balance">
            <Layers3 className="size-4" />
            Bulk mapping
          </DialogTitle>
          <DialogDescription className="text-pretty">
            Configure {selectedIds.length} selected data rows together. Only enabled mapping fields will change.
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-4 px-6 py-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="grid content-start gap-4 rounded-xl border border-border bg-card p-4 shadow-none">
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
                <Checkbox aria-label="Update department category" checked={applyDeptGroup} onCheckedChange={(checked) => setApplyDeptGroup(checked === true)} />
                Department category
              </Label>
              {applyDeptGroup && operation !== 'clear' && (
                <GroupSelectDropdown
                  ariaLabel="Department category"
                  emptyLabel="Choose department category"
                  groups={masterData?.deptGroups || []}
                  memberKey="deptIds"
                  value={deptGroupValues[0] || '__none__'}
                  onChange={(value) => setDeptGroupValues(value === '__none__' ? [] : [value])}
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

            <fieldset className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <Label className="flex items-center gap-2">
                <Checkbox aria-label="Update account group" checked={applyAccountGroup} onCheckedChange={(checked) => setApplyAccountGroup(checked === true)} />
                Account group
              </Label>
              {applyAccountGroup && operation !== 'clear' && (
                <GroupSelectDropdown
                  ariaLabel="Account group"
                  emptyLabel="Choose account group"
                  groups={masterData?.accountGroups || []}
                  memberKey="accountIds"
                  value={accountGroupValues[0] || '__none__'}
                  onChange={(value) => {
                    const selected = (masterData?.accountGroups || []).find((group) => String(group.id) === String(value));
                    setAccountGroupValues(value === '__none__' ? [] : [value]);
                    setAccountGroupLevel(selected?.level || '');
                  }}
                />
              )}
            </fieldset>

            <fieldset className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <Label>Dimensions</Label>
              <section className="grid gap-2 sm:grid-cols-2">
                {dimensionFields.map(({ key, label, options }) => {
                  const config = dimensionValues[key] || { enabled: false, values: [] };
                  return (
                    <section key={key} className="grid gap-2 rounded-lg border border-border/70 bg-background/60 p-2">
                      <Label className="flex items-center gap-2 text-xs font-medium">
                        <Checkbox
                          aria-label={`Update ${label}`}
                          checked={config.enabled}
                          onCheckedChange={(checked) => setDimensionValues((current) => ({ ...current, [key]: { ...config, enabled: checked === true } }))}
                        />
                        <span className="truncate">{label}</span>
                      </Label>
                      {config.enabled && operation !== 'clear' && (
                        <MultiSelectDropdown
                          options={options}
                          selected={config.values}
                          onChange={(values) => setDimensionValues((current) => ({ ...current, [key]: { ...config, values } }))}
                          label={key.toUpperCase()}
                          testIdPrefix={`bulk-${key}`}
                          searchPlaceholder={`Search ${label.toLowerCase()}...`}
                          emptyLabel="None selected"
                        />
                      )}
                    </section>
                  );
                })}
              </section>
            </fieldset>

            {!hasRequiredValues && (
              <p className="text-sm text-destructive" role="alert">
                Select values for every enabled field, or choose Clear mapping values.
              </p>
            )}
          </section>

          <section className="grid content-start gap-4 rounded-xl border border-border bg-card p-4 shadow-none">
            <header className="grid gap-1">
              <h3 className="text-sm font-semibold text-balance">Mapping presets</h3>
              <p className="text-sm text-pretty text-muted-foreground">Reuse complete mapping selections across reports.</p>
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

        <section className="mx-6 mb-5 overflow-hidden rounded-xl border border-border bg-card">
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
                  <TableHead>Mapping changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.slice(0, 20).map((item) => (
                  <TableRow key={item.id} className={item.changedFields.length === 0 ? 'opacity-60' : ''}>
                    <TableCell className="max-w-48 truncate font-medium">{item.desc}</TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {item.changedFields.map((field) => `${field}: ${compactValue(item.before[field])} → ${compactValue(item.after[field])}`).join(' · ') || 'No changes'}
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

        <DialogFooter className="sticky bottom-0 border-t bg-muted/20 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={!canApply} onClick={applyChanges}>
            Apply to {changedPreview.length} rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
