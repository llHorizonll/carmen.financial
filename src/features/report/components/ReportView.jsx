import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';
import { buildReportDrilldown, getReportDisplayColumns } from '../lib/reportLogic.js';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet.jsx';
import ReportViewModeToggle from './ReportViewModeToggle.jsx';

export default function ReportView({
  activeReport,
  displayCompanyLabel,
  displayDateLabel,
  displayPeriodLabel,
  reportData,
  activeCols,
  currentTheme,
  tableZoom,
  getIndentClass,
  viewMode = 'table',
  onViewModeChange,
  engineData,
  budgetData,
  appliedDepts,
  appliedYear,
  appliedPeriod,
  appliedRevision,
  periodOptions,
  masterData,
}) {
  const [selectedCell, setSelectedCell] = useState(null);
  const drilldown = useMemo(() => selectedCell && activeReport ? buildReportDrilldown({
    activeReport,
    row: selectedCell.row,
    col: selectedCell.col,
    engineData,
    budgetData,
    appliedDepts,
    appliedYear,
    appliedPeriod,
    appliedRevision,
    periodOptions,
    masterData,
  }) : null, [selectedCell, activeReport, engineData, budgetData, appliedDepts, appliedYear, appliedPeriod, appliedRevision, periodOptions, masterData]);
  if (!activeReport) return null;
  const displayColumns = getReportDisplayColumns(activeReport, activeCols);
  const descriptionIsFirst = displayColumns[0]?.isDescription;

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
        <div className="pt-1 text-center text-xs font-medium text-muted-foreground sm:hidden">
          Swipe horizontally to inspect columns
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        <ScrollArea className="h-full print:overflow-visible">
          <div className="w-max min-w-full">
            <Table
              className="min-w-full border-collapse whitespace-nowrap print:table-auto"
              style={{ zoom: tableZoom / 100 }}
              data-testid="report-print-header"
            >
              <TableHeader className={`sticky top-0 z-20 ${currentTheme.header}`}>
                <TableRow className="hover:bg-transparent">
                  {displayColumns.map((col) => col.isDescription ? (
                    <TableHead
                      key={col.id}
                      className={`${descriptionIsFirst ? 'sticky left-0 z-30 shadow-[1px_0_0_0_var(--border)]' : ''} min-w-[240px] border-r text-center text-xs font-semibold sm:min-w-[300px] ${currentTheme.header}`}
                    >
                      Description
                    </TableHead>
                  ) : (
                    <TableHead
                      key={col.id}
                      style={{ width: col.width ? `${col.width}px` : 'auto', minWidth: col.width ? `${col.width}px` : '96px' }}
                      className={`border-r text-center ${currentTheme.header}`}
                    >
                      <div className="text-xs font-semibold">{col.label}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="bg-background text-sm font-medium">
                {reportData.filter((row) => row.isActive !== false).map((row) => {
                  const isHeader = row.isHeader || false;
                  const isTotal = row.isTotal || false;
                  const indentClass = getIndentClass(row.indent || 0);

                  let rowThemeClass = 'hover:bg-muted/40';
                  if (isTotal) rowThemeClass = currentTheme.total;
                  else if (isHeader) rowThemeClass = currentTheme.subHeader;
                  else rowThemeClass = currentTheme.rowHover;

                  return (
                    <TableRow key={row.id} className={`border-b ${currentTheme.cellBorder} ${rowThemeClass}`}>
                      {displayColumns.map((col) => {
                        if (col.isDescription) {
                          return (
                            <TableCell
                              key={col.id}
                              className={`${descriptionIsFirst ? 'sticky left-0 z-10' : ''} border-r px-3 py-2.5 text-sm leading-6 sm:px-4 ${currentTheme.cellBorder} ${isTotal || isHeader ? '' : 'bg-background font-semibold'}`}
                            >
                              <span className={`block ${indentClass}`}>{row.desc}</span>
                            </TableCell>
                          );
                        }
                        const val = Number(row.results?.[col.id]) || 0;
                        const isNegativeVar = col.formula?.includes('-') && val < 0 && !col.isPercent;
                        if (isHeader) {
                          return <TableCell key={col.id} className={`border-r ${currentTheme.cellBorder}`} />;
                        }

                        const isDisplayPercent = col.isPercent || col.formatAsPercent;

                        return (
                          <TableCell
                            key={col.id}
                            className={`border-r px-2 py-2.5 text-right tabular-nums sm:px-3 ${currentTheme.cellBorder} ${isNegativeVar || val < 0 ? 'font-bold text-destructive' : ''}`}
                          >
                            {['AC', 'BC'].includes(String(col.type || '').toUpperCase()) && !row.isTotal && !col.isFormula && !col.isPercent ? (
                              <button type="button" className="w-full cursor-pointer text-right underline-offset-2 hover:underline focus-visible:underline" aria-label={`View ${row.desc} ${col.label} breakdown`} onClick={() => setSelectedCell({ row, col, value: val })}>
                                {val < 0 ? `(${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2 })})` : val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </button>
                            ) : isDisplayPercent
                              ? (val < 0 ? `(${Math.abs(val).toFixed(2)}%)` : `${val.toFixed(2)}%`)
                              : (val < 0 ? `(${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2 })})` : val.toLocaleString(undefined, { minimumFractionDigits: 2 }))}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
      <Sheet open={Boolean(selectedCell)} onOpenChange={(open) => { if (!open) setSelectedCell(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedCell?.row.desc} · {selectedCell?.col.label}</SheetTitle>
            <SheetDescription>Account and department contributions from the {drilldown?.source || 'report'} summary data.</SheetDescription>
          </SheetHeader>
          {drilldown && <section className="grid gap-3 p-4 text-sm">
            <p>Cell: {selectedCell.value.toLocaleString(undefined, { minimumFractionDigits: 2 })} · Breakdown: {drilldown.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p role="status" className={Math.abs(selectedCell.value - drilldown.total) < 0.005 ? 'text-emerald-700' : 'text-destructive'}>
              Difference: {(selectedCell.value - drilldown.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <table className="w-full text-left tabular-nums">
              <thead><tr className="border-b"><th className="py-2">Account</th><th>Department</th><th className="text-right">Amount</th></tr></thead>
              <tbody>{drilldown.lines.map((line) => <tr key={`${line.accountCode}:${line.departmentCode}`} className="border-b">
                <td className="py-2">{line.accountCode || '—'}</td><td>{line.departmentCode || '—'}</td>
                <td className="text-right">{line.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>)}</tbody>
            </table>
            {drilldown.lines.length === 0 && <p className="text-muted-foreground">No matching source rows.</p>}
          </section>}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
