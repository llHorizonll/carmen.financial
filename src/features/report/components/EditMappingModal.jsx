import React from 'react';
import { ChevronDown, SearchIcon, Settings2 } from 'lucide-react';
import { Accordion } from 'radix-ui';
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
import { Label } from '@/components/ui/label.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import MultiSelectDropdown from './MultiSelectDropdown.jsx';
import GroupSelectDropdown from './GroupSelectDropdown.jsx';

const EMPTY_REPORT_OPTIONS = {};
const EMPTY_DIMENSION_OPTIONS = {};
const EMPTY_DIMENSION_DEFINITIONS = [];
const DIMENSION_FIELDS = Array.from({ length: 10 }, (_, index) => ({
  key: `dim${index + 1}`,
  label: `DIM ${index + 1}`,
}));
const parseDimensionValues = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const normalizeDimensionValue = (value) => String(value || '').trim().toUpperCase();

export default function EditMappingModal({
  isOpen,
  editingRow,
  setEditingRow,
  masterData,
  reportOptions = EMPTY_REPORT_OPTIONS,
  dimensionOptions = EMPTY_DIMENSION_OPTIONS,
  dimensionDefinitions = EMPTY_DIMENSION_DEFINITIONS,
  modalAccCategory,
  setModalAccCategory,
  onOpenDetailSelector,
  onApply,
  onClose,
}) {
  if (!isOpen || !editingRow) return null;
  const friendlyButtonClassName = 'border-border bg-background text-foreground hover:bg-muted';

  const accountCategoryOptions = reportOptions.accountCategories?.length > 0
    ? reportOptions.accountCategories
    : [
        { id: 'ALL', label: 'All Categories' },
        { id: 'I', label: 'Income Statement' },
        { id: 'B', label: 'Balance Sheet' },
      ];
  const accountGroups = masterData.accountGroups || [];
  const departmentGroups = masterData.deptGroups || [];
  const selectedAccountGroup = accountGroups.find((group) => String(group.id).toUpperCase() === String(editingRow.groups || '').toUpperCase());
  const selectedDepartmentGroup = departmentGroups.find((group) => String(group.id).toUpperCase() === String(editingRow.deptGroup || '').toUpperCase());
  const hasAccountGroup = Boolean(selectedAccountGroup);
  const hasDepartmentGroup = Boolean(selectedDepartmentGroup);
  const departmentCount = parseDimensionValues(editingRow.dept).length;
  const accountCount = parseDimensionValues(editingRow.accCodes).length;
  const departmentSummary = selectedDepartmentGroup?.name || editingRow.deptGroup || (departmentCount ? `${departmentCount} department${departmentCount === 1 ? '' : 's'}` : 'Not configured');
  const accountSummary = selectedAccountGroup?.name || editingRow.groups || (accountCount ? `${accountCount} account code${accountCount === 1 ? '' : 's'}` : 'Not configured');
  const dimensionCount = DIMENSION_FIELDS.filter(({ key }) => parseDimensionValues(editingRow[key]).length > 0).length;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-full min-h-0 flex-col overflow-hidden bg-popover sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-4" />
            Edit Mapping
          </DialogTitle>
          <DialogDescription>Adjust row mapping details and detail selectors.</DialogDescription>
        </DialogHeader>

        <section className="grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1">
          <section className="space-y-2">
            <Label>Description</Label>
            <Input value={editingRow.desc} onChange={(e) => setEditingRow({ ...editingRow, desc: e.target.value })} />
          </section>

          <Accordion.Root type="multiple" defaultValue={['department', 'account']} className="grid gap-3">
          <Accordion.Item value="department" className="rounded-xl border border-border bg-background">
            <Accordion.Header>
              <Accordion.Trigger aria-label={`Department: ${departmentSummary}`} className="flex w-full items-center gap-3 p-4 text-left text-sm font-medium focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&[data-state=open]>svg]:rotate-180">
                <span>Department</span><span className="min-w-0 flex-1 truncate text-xs font-normal text-muted-foreground">{departmentSummary}</span><ChevronDown className="size-4 shrink-0 transition-transform" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="space-y-3 px-4 pb-4">
            <section className="space-y-2">
              <Label>Department Group</Label>
              <GroupSelectDropdown
                ariaLabel="Department group"
                emptyLabel="No department group"
                groups={departmentGroups}
                memberKey="deptIds"
                value={selectedDepartmentGroup?.id || '__none__'}
                onChange={(value) => {
                  const group = departmentGroups.find((item) => item.id === value);
                  setEditingRow({
                    ...editingRow,
                    deptGroup: group?.id || '',
                    ...(group ? { dept: '' } : {}),
                  });
                }}
              />
              {selectedDepartmentGroup && (
                <p className="text-xs text-muted-foreground">
                  This group maps {selectedDepartmentGroup.deptIds?.length || 0} department(s). Clear the group before selecting individual departments.
                </p>
              )}
            </section>

            <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>Departments</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`w-full justify-start sm:w-auto ${friendlyButtonClassName}`}
                aria-label="Select departments"
                disabled={hasDepartmentGroup}
                onClick={() => onOpenDetailSelector({ field: 'dept', title: 'Select Departments', subTitle: editingRow.desc, items: masterData.depts })}
              >
                <SearchIcon />
                Select Departments
              </Button>
            </section>
            <Input
              value={editingRow.dept}
              onChange={(e) => setEditingRow({ ...editingRow, dept: e.target.value })}
              placeholder="e.g. 101, 102"
              disabled={hasDepartmentGroup}
            />
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item value="account" className="rounded-xl border border-border bg-background">
            <Accordion.Header>
              <Accordion.Trigger aria-label={`Account: ${accountSummary}`} className="flex w-full items-center gap-3 p-4 text-left text-sm font-medium focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&[data-state=open]>svg]:rotate-180">
                <span>Account</span><span className="min-w-0 flex-1 truncate text-xs font-normal text-muted-foreground">{accountSummary}</span><ChevronDown className="size-4 shrink-0 transition-transform" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="space-y-3 px-4 pb-4">
            <section className="space-y-2">
              <Label>Account Group</Label>
              <GroupSelectDropdown
                ariaLabel="Account group"
                emptyLabel="No account group"
                groups={accountGroups}
                memberKey="accountIds"
                value={selectedAccountGroup?.id || '__none__'}
                onChange={(value) => {
                  const group = accountGroups.find((item) => item.id === value);
                  setEditingRow({
                    ...editingRow,
                    groups: group?.id || '',
                    ...(group ? {
                      groupLevel: group.level,
                      accCodes: '',
                    } : {}),
                  });
                }}
              />
              {selectedAccountGroup && (
                <p className="text-xs text-muted-foreground">
                  This {selectedAccountGroup.level} group maps {selectedAccountGroup.accountIds?.length || 0} account code(s). Clear the group before selecting individual accounts.
                </p>
              )}
            </section>

            <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>Account Codes Filter</Label>
              <Select value={modalAccCategory} onValueChange={setModalAccCategory} disabled={hasAccountGroup}>
                <SelectTrigger className="h-9 w-full sm:w-40">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {accountCategoryOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            <section className="space-y-2">
              <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label>Account Codes</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`w-full justify-start sm:w-auto ${friendlyButtonClassName}`}
                  aria-label="Select account details"
                  disabled={hasAccountGroup}
                  onClick={() => onOpenDetailSelector({ field: 'accCodes', title: 'Select Account Detail', subTitle: editingRow.desc, items: masterData.accCodes.filter((item) => modalAccCategory === 'ALL' || item.type === modalAccCategory) })}
                >
                  <SearchIcon />
                  Select Account Detail
                </Button>
              </section>
              <Textarea
                aria-label="Account codes"
                value={editingRow.accCodes}
                onChange={(e) => setEditingRow({ ...editingRow, accCodes: e.target.value })}
                placeholder="e.g. 4001, 4002"
                className="min-h-24"
                disabled={hasAccountGroup}
              />
            </section>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item value="dimensions" className="rounded-xl border border-border bg-background">
            <Accordion.Header>
              <Accordion.Trigger aria-label={`Dimensions: ${dimensionCount} of 10 configured`} className="flex w-full items-center gap-3 p-4 text-left text-sm font-medium focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&[data-state=open]>svg]:rotate-180">
                <span>Dimensions</span><span className="min-w-0 flex-1 truncate text-xs font-normal text-muted-foreground">{dimensionCount ? `${dimensionCount} of 10 configured` : 'Not configured'}</span><ChevronDown className="size-4 shrink-0 transition-transform" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="px-4 pb-4">
            <section className="grid gap-3 md:grid-cols-2">
              {DIMENSION_FIELDS.map(({ key, label }) => {
                const definition = dimensionDefinitions.find((item) => item.key === key);
                const dimensionLabel = definition?.caption || label;
                const selected = parseDimensionValues(editingRow[key]);
                const options = [...new Set([...(definition?.values || dimensionOptions[key] || []), ...selected])];
                return (
                  <MultiSelectDropdown
                    key={key}
                    options={options}
                    selected={selected}
                    onChange={(values) => setEditingRow({ ...editingRow, [key]: values.join(', ') })}
                    label={dimensionLabel}
                    testIdPrefix={`mapping-${key}`}
                    normalizeValue={normalizeDimensionValue}
                    searchPlaceholder={`Search ${dimensionLabel.toLowerCase()}...`}
                    emptyLabel="Not selected"
                  />
                );
              })}
            </section>
            </Accordion.Content>
          </Accordion.Item>
          </Accordion.Root>
        </section>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="sm" className={`w-full sm:w-auto ${friendlyButtonClassName}`} onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="w-full sm:w-auto" onClick={onApply}>
            Apply Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
