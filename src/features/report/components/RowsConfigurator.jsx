import React from 'react';
import { ArrowDown, ArrowUp, Calculator, Edit3, Layout, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { findBrokenReferences, getRowMappingWarnings } from '../lib/reportLogic.js';

export default function RowsConfigurator({
  activeReport,
  masterData,
  themeMode = 'light',
  handleAddRow,
  handleUpdateRow,
  handleUpdateRowMulti,
  moveRow,
  handleDeleteRow,
  setEditingRow,
  setConfirmAction,
}) {
  const brokenRowReferences = findBrokenReferences(activeReport).filter((issue) => issue.scope === 'row');
  const headerActionClassName = 'w-full justify-center rounded-xl border shadow-sm transition-colors';
  const friendlyActionClassName = 'border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150';

  const rowsCountRef = React.useRef(activeReport.rows.length);

  React.useEffect(() => {
    if (activeReport.rows.length > rowsCountRef.current) {
      setTimeout(() => {
        const rows = document.querySelectorAll('.row-configurator-row');
        if (rows.length > 0) {
          const lastRow = rows[rows.length - 1];
          lastRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          const input = lastRow.querySelector('input');
          if (input) {
            input.focus();
            input.select();
          }
        }
      }, 50);
    }
    rowsCountRef.current = activeReport.rows.length;
  }, [activeReport.rows.length]);

  return (
    <Card className="min-h-0 overflow-hidden border border-border bg-card/95 shadow-none ring-0">
      <CardHeader className="border-b bg-muted/20 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
              <Layout className="size-4 text-muted-foreground" />
              Rows Configurator
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Control report row structure, formulas, and mappings.</CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[24rem]">
            <Button variant="outline" size="sm" className={`${headerActionClassName} ${friendlyActionClassName}`} onClick={() => handleAddRow('data')}>+ Add Data Row</Button>
            <Button variant="outline" size="sm" className={`${headerActionClassName} ${friendlyActionClassName}`} onClick={() => handleAddRow('header')}>+ Add Header Row</Button>
            <Button variant="outline" size="sm" className={`${headerActionClassName} ${friendlyActionClassName}`} onClick={() => handleAddRow('formula')}>+ Add Formula Row</Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {brokenRowReferences.length > 0 && (
          <div className="border-b bg-destructive/5 px-4 py-2 text-sm text-destructive">
            Broken row references found. Fix {brokenRowReferences.length} invalid reference(s) before saving.
          </div>
        )}

        <div className="overflow-auto">
          <Table className="min-w-[1000px]">
            <TableHeader className="sticky top-0 z-10 bg-muted/50">
              <TableRow>
                <TableHead className="w-16 text-center align-middle">Del</TableHead>
                <TableHead className="w-24 text-center align-middle">Type</TableHead>
                <TableHead className="min-w-[16rem]">Description</TableHead>
                <TableHead className="w-24 text-center align-middle">Indent</TableHead>
                <TableHead className="w-24 text-center align-middle">Row</TableHead>
                <TableHead className="w-24 text-center align-middle">% Base</TableHead>
                <TableHead className="min-w-[24rem]">Mapping Rules Setup</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeReport.rows.map((row, idx) => {
                const isHeader = row.isHeader || false;
                const isTotal = row.isTotal || false;
                const rowType = isTotal ? 'F' : (isHeader ? 'H' : 'D');
                const rowFormulaIssues = brokenRowReferences.filter((issue) => issue.id === row.id && issue.field === 'formula');
                const rowPercentBaseIssues = brokenRowReferences.filter((issue) => issue.id === row.id && issue.field === 'percentBase');

                const isPctBroken = rowPercentBaseIssues.length > 0 || (row.percentBase && row.percentBase.includes('!REF!'));
                const isFormulaBroken = rowFormulaIssues.length > 0 || (row.formula && row.formula.includes('!REF!'));
                const rowWarnings = getRowMappingWarnings(row, activeReport.rows, masterData);

                return (
                  <TableRow key={row.id} className={`row-configurator-row ${isTotal ? 'bg-muted/30' : isHeader ? 'bg-muted/10' : ''}`}>
                  <TableCell className="px-2 py-2 align-middle">
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      className="border-destructive/30 bg-destructive/10 text-destructive hover:border-destructive/40 hover:bg-destructive/20"
                        aria-label={`Delete row ${row.id}`}
                        title={`Delete row ${row.id}`}
                        onClick={() => setConfirmAction({ msg: 'Delete Row?', onConfirm: () => handleDeleteRow(row.id) })}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </TableCell>
                  <TableCell className="px-2 py-2 align-middle">
                    <Select
                      value={rowType}
                      onValueChange={(value) => {
                        if (value === 'D') handleUpdateRowMulti(row.id, { isTotal: false, isHeader: false });
                        else if (value === 'H') handleUpdateRowMulti(row.id, { isTotal: false, isHeader: true, formula: '', percentBase: '', dept: '', deptGroup: '', accCodes: '', groups: '' });
                        else if (value === 'F') handleUpdateRowMulti(row.id, { isTotal: true, isHeader: false, dept: '', deptGroup: '', accCodes: '', groups: '' });
                      }}
                    >
                      <SelectTrigger className="mx-auto h-8 w-full max-w-[10rem] rounded-lg text-center">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="D">Data (D)</SelectItem>
                        <SelectItem value="H">Header (H)</SelectItem>
                        <SelectItem value="F">Formula (F)</SelectItem>
                      </SelectContent>
                    </Select>
                    </TableCell>
                    <TableCell className="px-2 py-2 align-middle">
                      <Input
                        value={row.desc}
                        onChange={(e) => handleUpdateRow(row.id, 'desc', e.target.value)}
                        className="min-w-0"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-2 align-middle">
                      <Select value={String(row.indent || 0)} onValueChange={(value) => handleUpdateRow(row.id, 'indent', parseInt(value, 10))}>
                        <SelectTrigger className="mx-auto h-8 w-full max-w-[7rem] rounded-lg text-center">
                          <SelectValue placeholder="Lvl 0" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="0">Lvl 0</SelectItem>
                          <SelectItem value="1">Lvl 1</SelectItem>
                          <SelectItem value="2">Lvl 2</SelectItem>
                          <SelectItem value="3">Lvl 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-2 py-2 align-middle">
                      <div className="flex flex-col items-center gap-1.5 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Move row ${row.id} up`}
                          title={`Move row ${row.id} up`}
                          onClick={() => moveRow(idx, 'up')}
                        >
                          <ArrowUp />
                        </Button>
                        <Badge variant="secondary">R{idx + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Move row ${row.id} down`}
                          title={`Move row ${row.id} down`}
                          onClick={() => moveRow(idx, 'down')}
                        >
                          <ArrowDown />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-2 align-middle">
                      {!isHeader ? (
                        <Input
                          value={row.percentBase}
                          onChange={(e) => handleUpdateRow(row.id, 'percentBase', e.target.value.toUpperCase())}
                          className={isPctBroken ? 'border-destructive' : ''}
                          placeholder="R3"
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="px-2 py-2 align-middle">
                      {isHeader ? (
                        <span className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-sm text-muted-foreground">Header Row (No data mapping)</span>
                      ) : isTotal ? (
                        <div className={`flex items-center gap-2 rounded-lg border p-2.5 ${isFormulaBroken ? 'border-destructive/60 bg-destructive/5' : ''}`}>
                          <Calculator className={isFormulaBroken ? 'text-destructive' : 'text-muted-foreground'} />
                          <Input
                            value={row.formula}
                            onChange={(e) => handleUpdateRow(row.id, 'formula', e.target.value)}
                            placeholder="e.g. R1+R2"
                            className="min-w-0 font-mono"
                          />
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1 text-sm text-muted-foreground">
                            <div className="truncate"><span className="font-medium text-foreground">DEPT:</span> {row.dept || '-'}</div>
                            <div className="truncate"><span className="font-medium text-foreground">DEPT GRP:</span> {row.deptGroup || '-'}</div>
                            <div className="truncate"><span className="font-medium text-foreground">GRP ({row.groupLevel || 'L4'}):</span> {row.groups || '-'}</div>
                            <div className="truncate"><span className="font-medium text-foreground">CODE:</span> {row.accCodes || '-'}</div>
                            <div className="truncate"><span className="font-medium text-foreground">DIM:</span> {[row.dim1, row.dim2].filter(Boolean).join(', ') || '-'}</div>
                            {rowWarnings.length > 0 && (
                              <div className="space-y-1 pt-1">
                            {rowWarnings.map((warning) => {
                              const isUnknown = /unknown/i.test(warning);
                              const isDuplicate = /double count/i.test(warning);
                              return isUnknown ? (
                                <Badge
                                  key={warning}
                                  variant="destructive"
                                  className="h-auto whitespace-normal rounded-md px-2 py-1 text-left text-xs font-normal normal-case tracking-normal"
                                  style={{
                                    backgroundColor: 'color-mix(in oklch, var(--destructive) 16%, transparent)',
                                    borderColor: 'color-mix(in oklch, var(--destructive) 30%, transparent)',
                                  }}
                                >
                                  {warning}
                                </Badge>
                              ) : isDuplicate ? (
                                <Badge
                                  key={warning}
                                  variant="outline"
                                  className="h-auto whitespace-normal rounded-md border-amber-500/60 bg-amber-500/10 px-2 py-1 text-left text-xs font-semibold normal-case tracking-normal shadow-sm"
                                  style={{ color: themeMode === 'dark' ? '#ffffff' : '#000000' }}
                                >
                                  {warning}
                                </Badge>
                              ) : (
                                <div key={warning} className="rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1 text-xs text-destructive">
                                  {warning}
                                </div>
                              );
                            })}
                          </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Edit mapping for row ${row.id}`}
                            title={`Edit mapping for row ${row.id}`}
                            onClick={() => setEditingRow({ ...row })}
                            className="mt-0.5 shrink-0"
                          >
                            <Edit3 />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
