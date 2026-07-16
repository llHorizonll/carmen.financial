import React from 'react';
import { SearchIcon, Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
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

const EMPTY_REPORT_OPTIONS = {};

export default function EditMappingModal({
  isOpen,
  editingRow,
  setEditingRow,
  masterData,
  reportOptions = EMPTY_REPORT_OPTIONS,
  modalAccCategory,
  setModalAccCategory,
  onOpenDetailSelector,
  onApply,
  onClose,
}) {
  if (!isOpen || !editingRow) return null;
  const friendlyButtonClassName = 'border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150';

  const accountCategoryOptions = reportOptions.accountCategories?.length > 0
    ? reportOptions.accountCategories
    : [
        { id: 'ALL', label: 'All Categories' },
        { id: 'I', label: 'Income Statement' },
        { id: 'B', label: 'Balance Sheet' },
      ];
  const accountCodeTokens = String(editingRow.accCodes || '')
    .split(',')
    .flatMap((item) => {
      const trimmed = item.trim();
      return trimmed ? [trimmed] : [];
    });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[calc(100vw-1rem)] bg-popover sm:w-[calc(100vw-1rem)]"
        style={{ width: 'min(96vw, 72rem)', maxWidth: 'min(96vw, 72rem)' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-4" />
            Edit Mapping
          </DialogTitle>
          <DialogDescription>Adjust row mapping details and detail selectors.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 max-h-[72vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={editingRow.desc} onChange={(e) => setEditingRow({ ...editingRow, desc: e.target.value })} />
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-background p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>Departments</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`w-full justify-start sm:w-auto ${friendlyButtonClassName}`}
                aria-label="Select departments"
                onClick={() => onOpenDetailSelector({ field: 'dept', title: 'Select Departments', subTitle: editingRow.desc, items: masterData.depts })}
              >
                <SearchIcon />
                Select Departments
              </Button>
            </div>
            <Input
              value={editingRow.dept}
              onChange={(e) => setEditingRow({ ...editingRow, dept: e.target.value, deptGroup: '' })}
              placeholder="e.g. 101, 102"
              />
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-background p-4">
            <div className="space-y-2">
              <Label>Department Group</Label>
              <Select
                value={editingRow.deptGroup || '__none__'}
                onValueChange={(value) => setEditingRow({
                  ...editingRow,
                  deptGroup: value === '__none__' ? '' : value,
                  dept: value === '__none__' ? editingRow.dept : '',
                })}
              >
                <SelectTrigger className="h-10 w-full rounded-xl">
                  <SelectValue placeholder="Select department group" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="__none__">No department group</SelectItem>
                  {(masterData.deptGroups || []).map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>Group Level Target</Label>
              <Select
                value={editingRow.groupLevel || 'L4'}
                onValueChange={(value) => setEditingRow({ ...editingRow, groupLevel: value, groups: '' })}
              >
                <SelectTrigger className="h-10 w-full rounded-xl sm:w-40">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="L1">L1 (Category)</SelectItem>
                  <SelectItem value="L2">L2 (Sub Category)</SelectItem>
                  <SelectItem value="L3">L3 (Group)</SelectItem>
                  <SelectItem value="L4">L4 (Detail)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label>Group Names</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`w-full justify-start sm:w-auto ${friendlyButtonClassName}`}
                  aria-label="Select groups"
                  onClick={() => onOpenDetailSelector({ field: 'groups', title: 'Select Groups', subTitle: editingRow.desc, items: masterData.groups[editingRow.groupLevel || 'L4'] })}
                >
                  <SearchIcon />
                  Select Groups
                </Button>
              </div>
              <Input
                value={editingRow.groups}
                onChange={(e) => setEditingRow({ ...editingRow, groups: e.target.value })}
                placeholder="e.g. Food Revenue"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Dim 1</Label>
                <Input
                  value={editingRow.dim1 || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, dim1: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Dim 2</Label>
                <Input
                  value={editingRow.dim2 || ''}
                  onChange={(e) => setEditingRow({ ...editingRow, dim2: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-background p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>Account Codes Filter</Label>
              <Select value={modalAccCategory} onValueChange={setModalAccCategory}>
                <SelectTrigger className="h-10 w-full rounded-xl sm:w-40">
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
            </div>

            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label>Account Codes</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`w-full justify-start sm:w-auto ${friendlyButtonClassName}`}
                  aria-label="Select account details"
                  onClick={() => onOpenDetailSelector({ field: 'accCodes', title: 'Select Account Detail', subTitle: editingRow.desc, items: masterData.accCodes.filter((item) => modalAccCategory === 'ALL' || item.type === modalAccCategory) })}
                >
                  <SearchIcon />
                  Select Account Detail
                </Button>
              </div>
              {accountCodeTokens.length > 0 && (
                <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-background/70 p-3">
                  {accountCodeTokens.map((token) => (
                    <Badge key={token} variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em]">
                      {token}
                    </Badge>
                  ))}
                </div>
              )}
              <Textarea
                value={editingRow.accCodes}
                onChange={(e) => setEditingRow({ ...editingRow, accCodes: e.target.value })}
                placeholder="e.g. 4001, 4002"
                className="min-h-24"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
