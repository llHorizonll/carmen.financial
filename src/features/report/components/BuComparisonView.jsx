import React from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { formatReportCell } from '../lib/reportLogic.js';
import { useTranslation } from '@/lib/i18n.js';

function ComparisonTable({ report, groups, theme, getIndentClass }) {
  const t = useTranslation();
  const columns = report.columns.filter((col) => col.isActive);
  const rowMaps = new Map(groups.map((group) => [group.tenant, new Map(group.rows.map((row) => [row.id, row]))]));
  return <Table containerClassName="overflow-visible" className="w-max min-w-full border-collapse whitespace-nowrap tabular-nums" aria-label={t('Business unit financial comparison')}>
    <TableHeader className={`sticky top-0 z-20 ${theme.header}`}>
      <TableRow>
        <TableHead rowSpan={2} scope="col" className={`sticky left-0 z-30 min-w-64 border-r text-center ${theme.header}`}>{t('Description')}</TableHead>
        {groups.map((group) => <TableHead scope="colgroup" key={group.tenant} colSpan={columns.length} className={`border-r text-center font-semibold ${theme.header}`}>
          {group.name}{group.currency ? ` (${group.currency})` : ''}
        </TableHead>)}
      </TableRow>
      <TableRow>{groups.flatMap((group) => columns.map((col) => <TableHead scope="col" key={JSON.stringify([group.tenant, col.id])} className={`min-w-24 whitespace-pre-line border-r text-center text-xs ${theme.header}`}>{col.label}</TableHead>))}</TableRow>
    </TableHeader>
    <TableBody>{report.rows.filter((row) => row.isActive !== false).map((row) => {
      const rowTheme = row.isTotal ? theme.total : row.isHeader ? theme.subHeader : theme.rowHover;
      return <TableRow key={row.id} className={rowTheme}>
        <TableCell className={`sticky left-0 z-10 border-r bg-background font-semibold ${row.isTotal ? theme.total : row.isHeader ? theme.subHeader : ''}`}>
          <p className={getIndentClass(row.indent || 0)}>{row.desc}</p>
        </TableCell>
        {groups.flatMap((group) => columns.map((col) => {
          const resultRow = rowMaps.get(group.tenant).get(row.id);
          const negative = Number(resultRow?.results?.[col.id]) < 0;
          return <TableCell key={JSON.stringify([group.tenant, col.id])} className={`border-r text-right tabular-nums ${col.isFormula ? 'bg-muted/70' : ''} ${negative ? 'font-bold text-destructive' : ''}`}>
            {row.isHeader ? '' : formatReportCell(resultRow || { results: {} }, col)}
          </TableCell>;
        }))}
      </TableRow>;
    })}</TableBody>
  </Table>;
}

export default function BuComparisonView({ activeReport, groups, displayCompanyLabel, displayDateLabel, displayPeriodLabel, currentTheme, getIndentClass, appliedFilters }) {
  const t = useTranslation();
  return <VStack gap={3} className="h-full min-h-0 min-w-0 border border-border bg-card print:h-auto print:overflow-visible">
    <header className="space-y-1 border-b border-border p-4 text-center">
      <h2 className="text-balance text-2xl font-semibold">{displayCompanyLabel}</h2>
      <p className="font-medium">{activeReport.name}</p>
      <p className="text-sm text-muted-foreground">{displayDateLabel} · {displayPeriodLabel}</p>
      {activeReport.remark && <p className="whitespace-pre-line text-sm text-muted-foreground">{activeReport.remark}</p>}
      <p className="text-sm text-muted-foreground">{t('Applied business units')}: {groups.filter((group) => group.tenant !== '__total').map((group) => group.name).join(', ')}</p>
      {appliedFilters && <p className="text-xs text-muted-foreground">{t('Budget revision')}: {appliedFilters.appliedRevision} · {t('Departments')}: {Object.entries(appliedFilters.departmentsByTenant || {}).map(([tenant, codes]) => `${tenant}: ${codes.join(', ')}`).join(' / ') || t('All')}</p>}
      <p className="text-xs text-muted-foreground print:hidden">{t('Scroll horizontally to compare business units. Each group uses the original report columns.')}</p>
    </header>
    <section className="min-h-0 min-w-0 flex-1 overflow-auto print:hidden" aria-label={t('Comparison results')}>
      <ComparisonTable report={activeReport} groups={groups} theme={currentTheme} getIndentClass={getIndentClass} />
    </section>
    {groups.map((group) => <section key={group.tenant} className="hidden break-after-page last:break-after-auto print:block">
      <ComparisonTable report={activeReport} groups={[group]} theme={currentTheme} getIndentClass={getIndentClass} />
    </section>)}
  </VStack>;
}
