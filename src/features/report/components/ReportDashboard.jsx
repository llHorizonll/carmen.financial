import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine, WalletCards } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { cn } from '@/lib/utils.js';
import ReportViewModeToggle from './ReportViewModeToggle.jsx';

const EMPTY_ROWS = [];
const EMPTY_COLUMNS = [];
const amountFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatAmount = (value) => {
  const amount = Number(value) || 0;
  return amount < 0 ? `(${amountFormatter.format(Math.abs(amount))})` : amountFormatter.format(amount);
};

const getRowValue = (row, columnId) => Number(row?.results?.[columnId]) || 0;

const buildSummary = (rows, columnId) => {
  const detailRows = rows.filter((row) => row.isActive !== false && !row.isHeader && !row.isTotal);
  const positiveTotal = detailRows.reduce((sum, row) => sum + Math.max(0, getRowValue(row, columnId)), 0);
  const negativeTotal = detailRows.reduce((sum, row) => sum + Math.abs(Math.min(0, getRowValue(row, columnId))), 0);

  return {
    positiveTotal,
    negativeTotal,
    net: positiveTotal - negativeTotal,
    contributors: detailRows
      .map((row) => ({ id: row.id, label: row.desc || 'Untitled row', value: getRowValue(row, columnId) }))
      .filter((row) => row.value !== 0)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 5),
  };
};

const buildSectionTotals = (rows, columnId) => {
  const sections = [];
  let currentSection = null;

  const commitCurrentSection = () => {
    if (currentSection?.dataRowCount > 0) sections.push(currentSection);
  };

  rows.filter((row) => row.isActive !== false).forEach((row) => {
    if (row.isHeader) {
      commitCurrentSection();
      currentSection = {
        id: row.id,
        label: row.desc || 'Untitled section',
        value: 0,
        dataRowCount: 0,
      };
      return;
    }

    if (!currentSection || row.isTotal) return;
    currentSection.value += getRowValue(row, columnId);
    currentSection.dataRowCount += 1;
  });

  commitCurrentSection();
  return sections;
};

function SummaryChart({ positiveTotal, negativeTotal, net }) {
  const maxMagnitude = Math.max(positiveTotal, negativeTotal, Math.abs(net), 1);
  const maxBarHeight = 78;
  const baseline = 116;
  const bars = [
    { id: 'positive', label: 'Positive', value: positiveTotal, displayValue: positiveTotal, x: 92, className: 'fill-emerald-600 dark:fill-emerald-500' },
    { id: 'negative', label: 'Negative', value: -negativeTotal, displayValue: -negativeTotal, x: 292, className: 'fill-destructive' },
    { id: 'net', label: 'Net result', value: net, displayValue: net, x: 492, className: 'fill-primary' },
  ];

  return (
    <svg
      className="mx-auto hidden h-auto w-full max-w-2xl min-w-0 sm:block"
      viewBox="0 0 680 230"
      role="img"
      aria-labelledby="summary-chart-title summary-chart-description"
    >
      <title id="summary-chart-title">Report value summary chart</title>
      <desc id="summary-chart-description">Positive total, negative total, and net result for the selected report column.</desc>
      <line x1="48" x2="632" y1={baseline} y2={baseline} className="stroke-border" strokeWidth="2" />
      {bars.map((bar) => {
        const height = Math.max(2, (Math.abs(bar.value) / maxMagnitude) * maxBarHeight);
        const y = bar.value >= 0 ? baseline - height : baseline;
        const valueY = bar.value >= 0 ? Math.max(18, y - 10) : Math.min(206, y + height + 18);
        return (
          <g key={bar.id}>
            <rect x={bar.x} y={y} width="96" height={height} rx="8" className={bar.className} />
            <text x={bar.x + 48} y={valueY} textAnchor="middle" className="fill-foreground text-lg font-semibold tabular-nums">
              {formatAmount(bar.displayValue)}
            </text>
            <text x={bar.x + 48} y="220" textAnchor="middle" className="fill-muted-foreground text-base font-medium">
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SummaryCompactChart({ positiveTotal, negativeTotal, net }) {
  const maxMagnitude = Math.max(positiveTotal, negativeTotal, Math.abs(net), 1);
  const movements = [
    { id: 'positive', label: 'Positive', value: positiveTotal, className: 'fill-emerald-600 dark:fill-emerald-500' },
    { id: 'negative', label: 'Negative', value: -negativeTotal, className: 'fill-destructive' },
    { id: 'net', label: 'Net result', value: net, className: 'fill-primary' },
  ];

  return (
    <ul className="mt-5 w-full space-y-4 sm:hidden" aria-label="Report value summary chart">
      {movements.map((movement) => (
        <li key={movement.id} className="space-y-1.5">
          <span className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-foreground">{movement.label}</span>
            <span className={cn('font-semibold tabular-nums text-foreground', movement.value < 0 && 'text-destructive')}>
              {formatAmount(movement.value)}
            </span>
          </span>
          <svg className="h-2 w-full" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
            <rect width="100" height="8" rx="4" className="fill-muted" />
            <rect width={Math.max(1.5, (Math.abs(movement.value) / maxMagnitude) * 100)} height="8" rx="4" className={movement.className} />
          </svg>
        </li>
      ))}
    </ul>
  );
}

function SectionTotalsChart({ sections }) {
  if (sections.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-pretty text-muted-foreground">
        No header sections with data rows are available.
      </p>
    );
  }

  const maxMagnitude = Math.max(...sections.map((section) => Math.abs(section.value)), 1);

  return (
    <ul className="divide-y divide-border" aria-label="Totals by report header">
      {sections.map((section) => {
        const barWidth = Math.max(1.5, (Math.abs(section.value) / maxMagnitude) * 100);
        const isNegative = section.value < 0;

        return (
          <li key={section.id} className="space-y-2.5 px-4 py-3.5">
            <span className="flex items-start justify-between gap-4">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground" title={section.label}>{section.label}</span>
                <span className="block text-xs tabular-nums text-muted-foreground">{section.dataRowCount} data {section.dataRowCount === 1 ? 'row' : 'rows'}</span>
              </span>
              <span className={cn('shrink-0 text-sm font-semibold tabular-nums text-foreground', isNegative && 'text-destructive')}>
                {formatAmount(section.value)}
              </span>
            </span>
            <svg className="h-3 w-full" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
              <rect
                width={barWidth}
                height="8"
                y="2"
                className={isNegative ? 'fill-destructive' : 'fill-primary'}
              />
            </svg>
          </li>
        );
      })}
    </ul>
  );
}

function TopContributors({ rows }) {
  if (rows.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-pretty text-muted-foreground">No non-zero detail rows are available.</p>;
  }

  const maxMagnitude = Math.max(...rows.map((row) => Math.abs(row.value)), 1);

  return (
    <ol className="divide-y divide-border" aria-label="Top value contributors">
      {rows.map((row, index) => (
        <li key={row.id} className="space-y-2 px-4 py-3">
          <span className="flex items-start justify-between gap-4">
            <span className="min-w-0 truncate text-sm font-medium text-foreground" title={row.label}>
              {index + 1}. {row.label}
            </span>
            <span className={cn('shrink-0 text-sm font-semibold tabular-nums text-foreground', row.value < 0 && 'text-destructive')}>
              {formatAmount(row.value)}
            </span>
          </span>
          <svg className="h-2 w-full" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
            <rect width={Math.max(1.5, (Math.abs(row.value) / maxMagnitude) * 100)} height="8" className={row.value < 0 ? 'fill-destructive' : 'fill-primary'} />
          </svg>
        </li>
      ))}
    </ol>
  );
}

function Metric({ icon: Icon, label, value, tone = 'default' }) {
  return (
    <article className="flex min-w-0 items-center gap-3 p-4">
      <span className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground',
        tone === 'positive' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        tone === 'negative' && 'bg-destructive/10 text-destructive',
      )}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn(
          'block truncate text-lg font-semibold tabular-nums text-foreground',
          tone === 'positive' && 'text-emerald-700 dark:text-emerald-400',
          tone === 'negative' && 'text-destructive',
        )}>
          {formatAmount(value)}
        </span>
      </span>
    </article>
  );
}

export default function ReportDashboard({
  activeReport,
  displayCompanyLabel,
  displayDateLabel,
  displayPeriodLabel,
  departmentContext = 'All departments',
  reportData = EMPTY_ROWS,
  activeCols = EMPTY_COLUMNS,
  viewMode = 'dashboard',
  onViewModeChange,
}) {
  const [selectedColumnId, setSelectedColumnId] = React.useState('');

  if (!activeReport) return null;

  const numericColumns = activeCols.filter((column) => !column.isPercent && !column.formatAsPercent && column.logicType !== 'MIX');
  const primaryColumn = numericColumns.find((column) => column.id === selectedColumnId) || numericColumns[0];
  const visibleRows = reportData.filter((row) => row.isActive !== false);
  const summary = primaryColumn ? buildSummary(visibleRows, primaryColumn.id) : { positiveTotal: 0, negativeTotal: 0, net: 0, contributors: [] };
  const sectionTotals = primaryColumn ? buildSectionTotals(visibleRows, primaryColumn.id) : [];
  const hasValues = Boolean(primaryColumn && visibleRows.length > 0);

  return (
    <Card className="flex h-full min-h-0 flex-col border border-border shadow-none ring-0">
      <CardHeader className="relative space-y-1 border-b px-4 pt-14 pb-3 sm:px-5 sm:pt-4 sm:pb-4">
        <ReportViewModeToggle
          className="absolute top-3 right-3 sm:top-4 sm:right-4"
          value={viewMode}
          onChange={onViewModeChange}
        />
        <CardTitle className="text-center text-2xl font-semibold text-balance text-foreground sm:px-20 lg:text-3xl">
          {displayCompanyLabel}
        </CardTitle>
        <CardDescription className="text-center text-sm font-medium text-foreground/80 sm:text-[0.95rem]">
          {activeReport.name}
        </CardDescription>
        <CardDescription className="text-center text-sm text-muted-foreground">
          {displayDateLabel}
        </CardDescription>
        <CardDescription className="text-center text-sm text-muted-foreground">
          {displayPeriodLabel}
        </CardDescription>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        <ScrollArea className="h-full">
          <section className="space-y-4 p-3 sm:p-4">
            {!hasValues ? (
              <section className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 text-center">
                <WalletCards className="mb-3 size-8 text-muted-foreground" />
                <h2 className="text-base font-semibold text-balance text-foreground">No dashboard values available</h2>
                <p className="mt-1 max-w-md text-sm text-pretty text-muted-foreground">Apply report filters or add an active numeric column to show the dashboard.</p>
              </section>
            ) : (
              <>
                <section className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="block text-sm font-semibold text-foreground">Dashboard value column</span>
                    <span className="block text-xs text-pretty text-muted-foreground">
                      {primaryColumn.label || primaryColumn.id} · {displayPeriodLabel} · {departmentContext}
                    </span>
                  </span>
                  <Select value={primaryColumn.id} onValueChange={setSelectedColumnId}>
                    <SelectTrigger id="dashboard-value-column" size="sm" className="w-full bg-background sm:w-64" aria-label="Dashboard value column">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" align="end">
                      <SelectGroup>
                        {numericColumns.map((column) => (
                          <SelectItem key={column.id} value={column.id}>{column.label || column.id}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </section>

                <section className="grid overflow-hidden rounded-xl border border-border bg-background divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <Metric icon={ArrowDownToLine} label="Positive total" value={summary.positiveTotal} tone="positive" />
                  <Metric icon={ArrowUpFromLine} label="Negative total" value={-summary.negativeTotal} tone="negative" />
                  <Metric icon={WalletCards} label="Net result" value={summary.net} tone={summary.net < 0 ? 'negative' : 'default'} />
                </section>

                <section className="grid gap-4 xl:grid-cols-2">
                  <section className="flex min-h-80 flex-col rounded-xl border border-border bg-background p-4">
                    <header>
                      <span>
                        <h2 className="text-base font-semibold text-balance text-foreground">Value summary</h2>
                        <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
                          Calculated from active detail rows. Header and total rows are excluded.
                        </p>
                      </span>
                    </header>
                    <div className="flex min-h-0 flex-1 items-center">
                      <SummaryChart positiveTotal={summary.positiveTotal} negativeTotal={summary.negativeTotal} net={summary.net} />
                      <SummaryCompactChart positiveTotal={summary.positiveTotal} negativeTotal={summary.negativeTotal} net={summary.net} />
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-xl border border-border bg-background">
                    <header className="border-b border-border px-4 py-3">
                      <span>
                        <h2 className="text-base font-semibold text-balance text-foreground">Top contributors</h2>
                        <p className="mt-0.5 text-sm text-pretty text-muted-foreground">Largest detail rows by absolute value.</p>
                      </span>
                    </header>
                    <TopContributors rows={summary.contributors} />
                  </section>
                </section>

                <section className="overflow-hidden rounded-xl border border-border bg-background">
                  <header className="border-b border-border px-4 py-3">
                    <h2 className="text-base font-semibold text-balance text-foreground">Section totals</h2>
                    <p className="mt-0.5 text-sm text-pretty text-muted-foreground">Sum of active detail rows under each report header.</p>
                  </header>
                  <SectionTotalsChart sections={sectionTotals} />
                </section>
              </>
            )}
          </section>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
