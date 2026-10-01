import React from 'react';
import { Settings2 } from 'lucide-react';
import { CardDescription } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
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

export default function ReportDetailsPanel({
  activeReport,
  reportOptions = EMPTY_REPORT_OPTIONS,
  updateActiveReport,
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

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-balance text-foreground"><Settings2 className="size-5 text-muted-foreground" />{activeReport.name}</h2>
          <CardDescription className="mt-1 text-sm text-pretty text-muted-foreground"><span className="font-medium text-foreground">Report Details</span> and display labels.</CardDescription>
        </div>
      </header>

      <div className="space-y-5">
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="report-remark" className="text-foreground">Remark</Label>
          <Textarea id="report-remark" value={activeReport.remark || ''} onChange={(e) => updateActiveReport({ remark: e.target.value })} />
        </div>

      </div>
    </section>
  );
}
