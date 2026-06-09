import React from 'react';
import { ArrowLeft, ArrowRight, Percent, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
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
import { findBrokenReferences } from '../lib/reportLogic.js';

export default function ColumnsConfigurator({
  activeReport,
  reportOptions = {},
  handleAddCol,
  handleUpdateCol,
  moveCol,
  handleDeleteCol,
}) {
  const reportType = activeReport?.reportType || 'Monthly';
  const allowedColumnTypes = reportType === 'Daily'
    ? new Set(['DAC', 'PTD', 'DACBG', 'PTDBG'])
    : new Set(['AC', 'ACC', 'BUD', 'BUDACC']);
  const columnTypeOptions = (reportOptions.columnTypes?.length > 0
    ? reportOptions.columnTypes
    : [
        { id: 'AC', label: 'AC' },
        { id: 'ACC', label: 'ACC' },
        { id: 'BUD', label: 'BUD' },
        { id: 'BUDACC', label: 'BUDACC' },
        { id: 'DAC', label: 'DAC' },
        { id: 'PTD', label: 'PTD' },
        { id: 'DACBG', label: 'DACBG' },
        { id: 'PTDBG', label: 'PTDBG' },
      ]).filter((option) => allowedColumnTypes.has(option.id));
  const yearModeOptions = reportOptions.yearModes?.length > 0
    ? reportOptions.yearModes
    : [
        { id: 'current', label: 'Current' },
        { id: '-1', label: 'Prev' },
      ];
  const periodModeOptions = reportOptions.periodModes?.length > 0
    ? reportOptions.periodModes
    : [
        { id: 'current', label: 'Current' },
        { id: '-1', label: 'Prev' },
        { id: 'FY', label: 'FY' },
        { id: 'Q1', label: 'Q1' },
        { id: 'Q2', label: 'Q2' },
        { id: 'Q3', label: 'Q3' },
        { id: 'Q4', label: 'Q4' },
      ];
  const hasIncompatibleColumns = activeReport.columns.some((col) => col.type && !allowedColumnTypes.has(String(col.type).trim().toUpperCase()));
  const brokenColumnReferences = findBrokenReferences(activeReport).filter((issue) => issue.scope === 'column');

  return (
    <Card className="min-h-0 border border-border shadow-none ring-0">
      <CardHeader className="border-b pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">Columns Configurator</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Set column types, formulas, percentages, and widths.</CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[24rem]">
            <Button variant="outline" size="sm" className="w-full" onClick={() => handleAddCol('data')}>+ Data</Button>
            <Button variant="outline" size="sm" className="w-full" onClick={() => handleAddCol('formula')}>+ Formula</Button>
            <Button variant="outline" size="sm" className="w-full" onClick={() => handleAddCol('percent')}>
              <Percent />
              Mix %
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {hasIncompatibleColumns && (
          <div className="border-b bg-amber-500/5 px-4 py-2 text-sm text-amber-700">
            {reportType} reports should only use compatible column types. Update any mismatched columns before saving.
          </div>
        )}
        {brokenColumnReferences.length > 0 && (
          <div className="border-b bg-destructive/5 px-4 py-2 text-sm text-destructive">
            Broken column references found. Fix {brokenColumnReferences.length} invalid reference(s) before saving.
          </div>
        )}

        <div className="overflow-auto">
          <Table className="min-w-[1200px]">
            <TableHeader className="sticky top-0 z-10 bg-muted/50">
              <TableRow>
                <TableHead className="w-16 text-center align-middle">Del</TableHead>
                <TableHead className="w-24 text-center align-middle">Move</TableHead>
                <TableHead className="min-w-[14rem]">Label</TableHead>
                <TableHead className="w-28 text-center align-middle">Active</TableHead>
                <TableHead className="w-32 text-center align-middle">Type</TableHead>
                <TableHead className="w-32 text-center align-middle">Target</TableHead>
                <TableHead className="w-28 text-center align-middle">Year</TableHead>
                <TableHead className="w-28 text-center align-middle">Period</TableHead>
                <TableHead className="w-24 text-center align-middle">Pct</TableHead>
                <TableHead className="w-28 text-center align-middle">Width</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeReport.columns.map((col, idx) => (
                <TableRow key={col.id} className="[&>td]:align-middle">
                  <TableCell className="px-2 py-2 align-middle">
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      className="border-destructive/30 bg-destructive/10 text-destructive hover:border-destructive/40 hover:bg-destructive/20"
                      aria-label={`Delete column ${col.id}`}
                      title={`Delete column ${col.id}`}
                      onClick={() => handleDeleteCol(col.id)}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </TableCell>
                  <TableCell className="px-2 py-2 align-middle">
                    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Move column ${col.id} left`}
                        title={`Move column ${col.id} left`}
                        onClick={() => moveCol(idx, 'left')}
                      >
                        <ArrowLeft />
                      </Button>
                      <Badge variant="secondary">C{idx + 1}</Badge>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Move column ${col.id} right`}
                        title={`Move column ${col.id} right`}
                        onClick={() => moveCol(idx, 'right')}
                      >
                        <ArrowRight />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-2 align-middle">
                    <Input
                      value={col.label}
                      onChange={(e) => handleUpdateCol(col.id, 'label', e.target.value)}
                      placeholder="Column label"
                      className="min-w-0"
                    />
                  </TableCell>
                  <TableCell className="px-2 py-2 align-middle">
                    <div className="flex justify-center">
                      <Checkbox checked={col.isActive} onCheckedChange={(checked) => handleUpdateCol(col.id, 'isActive', Boolean(checked))} />
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-2 align-middle">
                    <Select value={col.type || (reportType === 'Daily' ? 'DAC' : 'AC')} onValueChange={(value) => handleUpdateCol(col.id, 'type', value)}>
                      <SelectTrigger className="mx-auto h-8 w-full max-w-[10rem] rounded-lg text-center">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {columnTypeOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                        {col.type && !allowedColumnTypes.has(String(col.type).trim().toUpperCase()) && (
                          <SelectItem value={col.type}>{col.type}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-2 py-2 align-middle">
                    <Select value={col.targetCol || '__blank__'} onValueChange={(value) => handleUpdateCol(col.id, 'targetCol', value === '__blank__' ? '' : value)}>
                      <SelectTrigger className={`mx-auto h-8 w-full max-w-[8rem] rounded-lg text-center ${String(col.targetCol || '').includes('!REF!') || brokenColumnReferences.some((issue) => issue.id === col.id && issue.field === 'targetCol') ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="__blank__">-</SelectItem>
                        {activeReport.columns.map((column) => <SelectItem key={column.id} value={column.id}>{column.id}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-2 py-2 align-middle">
                    <Select value={col.yearMode || 'current'} onValueChange={(value) => handleUpdateCol(col.id, 'yearMode', value)}>
                      <SelectTrigger className="mx-auto h-8 w-full max-w-[8rem] rounded-lg text-center">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {yearModeOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-2 py-2 align-middle">
                    <Select value={col.periodMode || 'current'} onValueChange={(value) => handleUpdateCol(col.id, 'periodMode', value)}>
                      <SelectTrigger className="mx-auto h-8 w-full max-w-[8rem] rounded-lg text-center">
                        <SelectValue placeholder="Period" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {periodModeOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-2 py-2 align-middle">
                    <div className="flex justify-center">
                      <Checkbox checked={col.isPercent || false} onCheckedChange={(checked) => handleUpdateCol(col.id, 'isPercent', Boolean(checked))} />
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-2 align-middle">
                    <Input
                      value={col.width || ''}
                      onChange={(e) => handleUpdateCol(col.id, 'width', e.target.value)}
                      type="number"
                      placeholder="Auto"
                      className="mx-auto max-w-[7rem] text-center"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
