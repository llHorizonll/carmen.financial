import React from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  FilePlus,
  Palette,
  Settings2,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { Separator } from '@/components/ui/separator.jsx';

const EMPTY_REPORT_OPTIONS = {};
const REPORT_TYPE_OPTIONS = [
  { id: 'Monthly', label: 'Monthly' },
  { id: 'Daily', label: 'Daily' },
];
const PERIOD_FORMAT_LABELS = {
  standard: "Standard (Period : 2026-02)",
  year_month: "Year-Month (2026-02)",
  numeric: "Numeric Full (02/2026)",
  numeric_short: "Numeric Short (02/26)",
  short: "Short Month + YYYY (Feb 2026)",
  short_yy: "Short Month + YY (Feb '26)",
  long: "Long Month + YYYY (February 2026)",
  month_only: "Month Only (February)",
  day_month_year: "Day Month Year (28 Feb 2026)",
  end_of_month: "End of Month (February 28, 2026)",
};

function ReportActionButtons({
  friendlyButtonClassName,
  handleCloneReport,
  handleCreateBlankReport,
  handleDeleteReport,
  setIsAccessModalOpen,
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button type="button" variant="outline" className={`w-full sm:w-auto ${friendlyButtonClassName}`} onClick={handleCloneReport}>
        <Copy />
        Clone
      </Button>
      <Button type="button" variant="outline" className={`w-full sm:w-auto ${friendlyButtonClassName}`} onClick={handleCreateBlankReport}>
        <FilePlus />
        Blank
      </Button>
      <Button type="button" variant="outline" className={`w-full sm:w-auto ${friendlyButtonClassName}`} onClick={() => setIsAccessModalOpen(true)}>
        <UserCheck />
        Access
      </Button>
      <Button
        type="button"
        variant="destructive"
        className="w-full sm:w-auto border-destructive/30 bg-destructive/10 text-destructive hover:border-destructive/40 hover:bg-destructive/20"
        onClick={handleDeleteReport}
      >
        <Trash2 className="text-destructive" />
        Delete
      </Button>
    </div>
  );
}

function ReportAccessSummary({
  activeReport,
  friendlyButtonClassName,
  masterData,
  setIsAccessModalOpen,
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <ShieldCheck className="size-4 text-muted-foreground" />
          Access Summary
        </div>
        <p className="text-sm text-muted-foreground">Assigned users and visibility control.</p>
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <Button type="button" variant="outline" className={`shrink-0 ${friendlyButtonClassName}`} onClick={() => setIsAccessModalOpen(true)}>
          Manage access
        </Button>
        <div className="flex h-8 min-w-0 items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground dark:bg-input/30">
          {activeReport.assignedUsers.length > 0
            ? activeReport.assignedUsers.map((uid) => masterData?.users?.find((user) => user.id === uid)?.name || uid).join(', ')
            : 'None'}
        </div>
      </div>
    </div>
  );
}

function ReportStatusCard({ activeReport, updateActiveReport }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <Eye className="size-4 text-muted-foreground" />
          Status
        </div>
        <p className="text-sm text-muted-foreground">Toggle whether this report is visible.</p>
      </div>
      <Button
        variant="outline"
        className={`w-full justify-center border ${activeReport.isActive !== false
          ? 'border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150'
          : 'border-border bg-background text-muted-foreground hover:bg-muted transition-all duration-150'
        }`}
        onClick={() => updateActiveReport({ isActive: activeReport.isActive === false ? true : false })}
      >
        {activeReport.isActive !== false ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        {activeReport.isActive !== false ? 'Active' : 'Inactive'}
      </Button>
    </div>
  );
}

export default function ReportDetailsPanel({
  activeReport,
  activeCategories,
  masterData,
  reportOptions = EMPTY_REPORT_OPTIONS,
  updateActiveReport,
  handleCloneReport,
  handleCreateBlankReport,
  handleDeleteReport,
  setIsAccessModalOpen,
  onBusyTransition,
}) {
  const themeOptions = reportOptions.themes?.length > 0
    ? reportOptions.themes
    : [
        { id: 'blue', label: 'Classic Blue' },
        { id: 'green', label: 'Emerald Green' },
        { id: 'gray', label: 'Slate Gray' },
      ];
  const periodFormatOptions = (reportOptions.periodFormats?.length > 0
    ? reportOptions.periodFormats
    : [
        { id: 'standard', label: 'Standard (Period : 2026-02)' },
        { id: 'year_month', label: 'Year-Month (2026-02)' },
        { id: 'numeric', label: 'Numeric Full (02/2026)' },
        { id: 'numeric_short', label: 'Numeric Short (02/26)' },
        { id: 'short', label: 'Short Month + YYYY (Feb 2026)' },
        { id: 'short_yy', label: "Short Month + YY (Feb '26)" },
        { id: 'long', label: 'Long Month + YYYY (February 2026)' },
        { id: 'month_only', label: 'Month Only (February)' },
        { id: 'day_month_year', label: 'Day Month Year (28 Feb 2026)' },
        { id: 'end_of_month', label: 'End of Month (February 28, 2026)' },
      ]).map(option => ({
        ...option,
        label: PERIOD_FORMAT_LABELS[option.id] || option.label
      }));
  const accountCategoryOptions = reportOptions.accountCategories?.length > 0
    ? reportOptions.accountCategories
    : [
        { id: 'ALL', label: 'All Categories' },
        { id: 'I', label: 'Income Statement (I)' },
        { id: 'B', label: 'Balance Sheet (B)' },
      ];
  const accountCategoryLabelMap = new Map(accountCategoryOptions.map((option) => [option.id, option.label]));
  const dateDisplayValue = activeReport.overrideDateDisplay ?? activeReport.customDateLabel ?? '';
  const periodDisplayValue = activeReport.overridePeriodDisplay ?? activeReport.customPeriodLabel ?? '';
  const friendlyButtonClassName = 'border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150';

  return (
    <Card className="border border-border shadow-none ring-0">
      <CardHeader className="border-b pb-5">
        <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
          <Settings2 className="size-4 text-muted-foreground" />
          Report Details
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">Configure the report, its access, and display labels.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-foreground">Report Name</Label>
            <Input value={activeReport.name} onChange={(e) => updateActiveReport({ name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Company Name</Label>
            <Input
              value={activeReport.companyName || ''}
              onChange={(e) => updateActiveReport({ companyName: e.target.value })}
              placeholder="Auto mode"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground">
              <Palette className="size-4 text-muted-foreground" />
              Report Theme
            </Label>
            <Select
              value={activeReport.theme || 'blue'}
              onValueChange={(value) => {
                onBusyTransition?.();
                updateActiveReport({ theme: value });
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent position="popper">
                {themeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Auto Period Format</Label>
            <Select
              value={activeReport.periodFormat || 'standard'}
              onValueChange={(value) => {
                onBusyTransition?.();
                updateActiveReport({ periodFormat: value });
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent position="popper">
                {periodFormatOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Report Type</Label>
            <Select
              value={activeReport.reportType || 'Monthly'}
              onValueChange={(value) => {
                onBusyTransition?.();
                updateActiveReport({
                  reportType: value,
                  day: value === 'Daily' ? (activeReport.day || '') : '',
                });
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent position="popper">
                {REPORT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Override Date Display</Label>
            <Input
              value={dateDisplayValue}
              onChange={(e) => updateActiveReport({ customDateLabel: e.target.value, overrideDateDisplay: e.target.value })}
              placeholder="Auto (Based on format)"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Override Period Display</Label>
            <Input
              value={periodDisplayValue}
              onChange={(e) => updateActiveReport({ customPeriodLabel: e.target.value, overridePeriodDisplay: e.target.value })}
              placeholder="Auto (Based on format)"
            />
          </div>
          {activeReport.reportType === 'Daily' && (
            <div className="space-y-2">
              <Label className="text-foreground">Day</Label>
              <Input
                value={activeReport.day || ''}
                onChange={(e) => updateActiveReport({ day: e.target.value })}
                placeholder="Daily reports only"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-foreground">Owner</Label>
            <Input
              value={activeReport.owner || ''}
              placeholder={masterData?.users?.[0]?.id || 'Creator user id'}
              readOnly
              aria-readonly="true"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Account Category</Label>
          <div className="flex flex-col gap-2 lg:flex-row">
            <Select
              value=""
              onValueChange={(value) => {
                if (!value) return;
                let currentCats = [...activeCategories];
                if (value === 'ALL') {
                  updateActiveReport({ category: ['ALL'] });
                } else {
                  currentCats = currentCats.filter((cat) => cat !== 'ALL');
                  if (!currentCats.includes(value)) currentCats.push(value);
                  updateActiveReport({ category: currentCats });
                }
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl lg:w-[260px]">
                <SelectValue placeholder="+ Add Category" />
              </SelectTrigger>
              <SelectContent position="popper">
                {accountCategoryOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex min-w-0 flex-1 flex-wrap gap-2 rounded-xl border border-border bg-muted/30 p-3">
              {activeCategories.map((cat) => (
                <Badge key={cat} variant="secondary" className="rounded-full px-2.5 py-1">
                  {accountCategoryLabelMap.get(cat) || cat}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        <ReportActionButtons
          friendlyButtonClassName={friendlyButtonClassName}
          handleCloneReport={handleCloneReport}
          handleCreateBlankReport={handleCreateBlankReport}
          handleDeleteReport={handleDeleteReport}
          setIsAccessModalOpen={setIsAccessModalOpen}
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <ReportAccessSummary
            activeReport={activeReport}
            friendlyButtonClassName={friendlyButtonClassName}
            masterData={masterData}
            setIsAccessModalOpen={setIsAccessModalOpen}
          />
          <ReportStatusCard
            activeReport={activeReport}
            updateActiveReport={updateActiveReport}
          />
        </div>
      </CardContent>
    </Card>
  );
}
