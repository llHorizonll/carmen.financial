import React from 'react';
import {
  Copy,
  Settings2,
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

const EMPTY_REPORT_OPTIONS = {};
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
  handleDeleteReport,
  setIsAccessModalOpen,
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" className={`w-full sm:w-auto ${friendlyButtonClassName}`} onClick={handleCloneReport}>
        <Copy />
        Clone
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

export default function ReportDetailsPanel({
  activeReport,
  activeCategories,
  masterData,
  reportOptions = EMPTY_REPORT_OPTIONS,
  updateActiveReport,
  handleCloneReport,
  handleDeleteReport,
  setIsAccessModalOpen,
  onBusyTransition,
}) {
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
  const friendlyButtonClassName = 'border-border bg-background text-foreground hover:bg-muted';

  return (
    <Card className="border border-border shadow-none ring-0">
      <CardHeader className="flex flex-col gap-3 border-b pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-balance text-foreground"><Settings2 className="size-5 text-muted-foreground" />{activeReport.name}</CardTitle>
          <CardDescription className="mt-1 text-sm text-pretty text-muted-foreground"><span className="font-medium text-foreground">Report Details</span> and display labels.</CardDescription>
        </div>
        <ReportActionButtons friendlyButtonClassName={friendlyButtonClassName} handleCloneReport={handleCloneReport} handleDeleteReport={handleDeleteReport} setIsAccessModalOpen={setIsAccessModalOpen} />
      </CardHeader>

      <CardContent className="space-y-5 pt-0">
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
              placeholder="Use company default"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-type" className="text-foreground">Report Type</Label>
            <Select value={activeReport.reportType || 'Monthly'} onValueChange={(value) => updateActiveReport({ reportType: value })}>
              <SelectTrigger id="report-type" className="h-9 w-full">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="auto-period-format" className="text-foreground">Auto Period Format</Label>
            <Select
              value={activeReport.periodFormat || 'standard'}
              onValueChange={(value) => {
                onBusyTransition?.();
                updateActiveReport({ periodFormat: value });
              }}
            >
              <SelectTrigger id="auto-period-format" className="h-9 w-full">
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
          <div className="space-y-2">
            <Label className="text-foreground">Owner</Label>
            <Input
              value={activeReport.owner || ''}
              placeholder={masterData?.users?.[0]?.id || 'Creator user ID'}
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
              <SelectTrigger className="h-9 w-full lg:w-64">
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

      </CardContent>
    </Card>
  );
}
