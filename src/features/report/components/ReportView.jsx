import React from 'react';
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
import { getReportDisplayColumns } from '../lib/reportLogic.js';

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
}) {
  if (!activeReport) return null;
  const displayColumns = getReportDisplayColumns(activeReport, activeCols);
  const descriptionIsFirst = displayColumns[0]?.isDescription;

  return (
    <Card className="flex h-full min-h-0 flex-col border border-border shadow-none ring-0">
      <CardHeader className="space-y-1 border-b px-4 pt-3 pb-3 sm:px-5 sm:pt-4 sm:pb-4">
        <CardTitle className="text-center text-[1.55rem] font-semibold tracking-tight text-foreground sm:text-2xl lg:text-[2rem]">
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
        <div className="pt-1 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:hidden">
          Swipe horizontally to inspect columns
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        <ScrollArea className="h-full print:overflow-visible">
          <div className="w-max min-w-full">
            <Table
              className="min-w-full whitespace-nowrap print:table-auto"
              style={{ zoom: tableZoom / 100 }}
              data-testid="report-print-header"
            >
              <TableHeader className={`sticky top-0 z-20 ${currentTheme.header}`}>
                <TableRow>
                  {displayColumns.map((col) => col.isDescription ? (
                    <TableHead
                      key={col.id}
                      className={`${descriptionIsFirst ? 'sticky left-0 z-30' : ''} min-w-[240px] border-r text-center text-[10px] uppercase tracking-[0.2em] sm:min-w-[300px] ${currentTheme.header}`}
                    >
                      Description
                    </TableHead>
                  ) : (
                    <TableHead
                      key={col.id}
                      style={{ width: col.width ? `${col.width}px` : 'auto', minWidth: col.width ? `${col.width}px` : '96px' }}
                      className={`border-r text-center ${currentTheme.header}`}
                    >
                      <div className="text-[10px] tracking-[0.16em] sm:text-[11px] sm:tracking-wider">{col.label}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="bg-background text-xs font-medium">
                {reportData.map((row) => {
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
                            {isDisplayPercent
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
    </Card>
  );
}
