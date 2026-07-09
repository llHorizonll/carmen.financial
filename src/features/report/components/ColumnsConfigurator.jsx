import React from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Percent, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { findBrokenReferences } from '../lib/reportLogic.js';

const EMPTY_REPORT_OPTIONS = {};

const COLUMN_CLASY_MAP = {
  formula: {
    label: 'Formula',
    borderClass: 'border-t-2 border-t-purple-500 dark:border-t-purple-400',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50',
  },
  percent: {
    label: 'Mix %',
    borderClass: 'border-t-2 border-t-emerald-500 dark:border-t-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50',
  },
  data: {
    label: 'Data',
    borderClass: 'border-t-2 border-t-blue-500 dark:border-t-blue-400',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50',
  },
};

export default function ColumnsConfigurator({
  activeReport,
  reportOptions = EMPTY_REPORT_OPTIONS,
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
  const headerActionClassName = 'w-full justify-center rounded-xl border shadow-sm transition-colors';
  const friendlyActionClassName = 'border-stone-300 bg-stone-100 text-stone-800 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100';

  return (
    <Card className="w-full max-w-full min-h-0 overflow-hidden border border-border bg-card/95 shadow-none ring-0">
      <CardHeader className="border-b bg-muted/20 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">Columns Configurator</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Set column types, formulas, percentages, and widths.</CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[24rem]">
            <Button variant="outline" size="sm" className={`${headerActionClassName} ${friendlyActionClassName}`} onClick={() => handleAddCol('data')}>+ Data</Button>
            <Button variant="outline" size="sm" className={`${headerActionClassName} ${friendlyActionClassName}`} onClick={() => handleAddCol('formula')}>+ Formula</Button>
            <Button variant="outline" size="sm" className={`${headerActionClassName} ${friendlyActionClassName}`} onClick={() => handleAddCol('percent')}>
              <Percent />
              Mix %
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 w-full overflow-hidden">
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

        <div className="relative w-full overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-10 bg-gradient-to-l from-background via-background/80 to-transparent md:block" />
          <div className="flex gap-4 overflow-x-auto p-5 scrollbar-thin scrollbar-thumb-muted-foreground/20 pb-6 w-full">
            {activeReport.columns.map((col, idx) => {
              const colClassy = col.isFormula 
                ? COLUMN_CLASY_MAP.formula 
                : col.isPercent 
                  ? COLUMN_CLASY_MAP.percent 
                  : COLUMN_CLASY_MAP.data;

              return (
                <div
                  key={col.id}
                  data-testid="column-card"
                  className={`column-card w-[310px] shrink-0 border border-border bg-card shadow-sm hover:shadow-md transition-all duration-200 rounded-xl flex flex-col min-h-0 ${colClassy.borderClass}`}
                >
                  {/* Card Header: Reordering, visibility, deletion */}
                  <div className="flex flex-row items-center justify-between border-b border-border bg-muted/30 px-3 py-2.5 rounded-t-xl gap-2 w-full overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <Badge variant="secondary" className="font-mono text-xs font-semibold px-2 py-0.5 shrink-0">
                        C{idx + 1}
                      </Badge>
                      <Badge className={`text-[10px] font-medium px-1.5 py-0 rounded-md shrink-0 ${colClassy.badgeClass}`}>
                        {colClassy.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono font-medium truncate" title={col.id}>{col.id}</span>
                    </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Move Left */}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => moveCol(idx, 'left')}
                      aria-label={`Move column ${col.id} left`}
                      title={`Move column ${col.id} left`}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="size-3.5" />
                    </Button>
                    
                    {/* Move Right */}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => moveCol(idx, 'right')}
                      aria-label={`Move column ${col.id} right`}
                      title={`Move column ${col.id} right`}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowRight className="size-3.5" />
                    </Button>
                    
                    {/* Visibility toggle (Eye) */}
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className={
                        col.isActive !== false
                          ? 'h-7 w-7 border-stone-300 bg-stone-100 text-stone-800 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100'
                          : 'h-7 w-7 border-border bg-background text-muted-foreground hover:bg-muted'
                      }
                      aria-label={`${col.isActive !== false ? 'Hide' : 'Show'} column ${col.id}`}
                      title={`${col.isActive !== false ? 'Hide' : 'Show'} column ${col.id}`}
                      onClick={() => handleUpdateCol(col.id, 'isActive', !(col.isActive !== false))}
                    >
                      {col.isActive !== false ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </Button>
                    
                    {/* Delete column */}
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      className="h-7 w-7 border-destructive/30 bg-destructive/10 text-destructive hover:border-destructive/40 hover:bg-destructive/20"
                      aria-label={`Delete column ${col.id}`}
                      title={`Delete column ${col.id}`}
                      onClick={() => handleDeleteCol(col.id)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Card Content: Inputs and configurations */}
                <div className="p-4 space-y-4">
                  {/* Label */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/80 tracking-wide">Column Label</label>
                    <Input
                      value={col.label}
                      onChange={(e) => handleUpdateCol(col.id, 'label', e.target.value)}
                      placeholder="Column label"
                      className="h-9 text-sm"
                    />
                  </div>

                  {col.isFormula ? (
                    <div className="grid grid-cols-2 gap-3.5">
                      {/* Formula (Span 2) */}
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Formula</label>
                        <Input
                          value={col.formula || ''}
                          onChange={(e) => handleUpdateCol(col.id, 'formula', e.target.value)}
                          placeholder="e.g. C1-C2+C3"
                          className="h-8.5 text-xs font-mono"
                        />
                      </div>

                      {/* Width */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Width (px)</label>
                        <Input
                          value={col.width || ''}
                          onChange={(e) => handleUpdateCol(col.id, 'width', e.target.value)}
                          type="number"
                          placeholder="Auto"
                          className="h-8.5 text-xs text-center"
                        />
                      </div>

                      {/* Show data as percentage checkbox */}
                      <div className="flex flex-col justify-center pl-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground/80 font-medium select-none">
                          <Checkbox
                            checked={col.formatAsPercent || false}
                            onCheckedChange={(checked) => handleUpdateCol(col.id, 'formatAsPercent', Boolean(checked))}
                          />
                          <span>Show as %</span>
                        </label>
                      </div>
                    </div>
                  ) : col.isPercent ? (
                    <div className="grid grid-cols-2 gap-3.5">
                      {/* Target Column (Span 2) */}
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Target Column</label>
                        <Input
                          value={col.targetCol || ''}
                          onChange={(e) => handleUpdateCol(col.id, 'targetCol', e.target.value)}
                          placeholder="e.g. C1"
                          className="h-8.5 text-xs font-mono"
                        />
                      </div>

                      {/* Width */}
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Width (px)</label>
                        <Input
                          value={col.width || ''}
                          onChange={(e) => handleUpdateCol(col.id, 'width', e.target.value)}
                          type="number"
                          placeholder="Auto"
                          className="h-8.5 text-xs text-center"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3.5">
                      {/* Type */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
                        <Select
                          value={col.type || (reportType === 'Daily' ? 'DAC' : 'AC')}
                          onValueChange={(value) => handleUpdateCol(col.id, 'type', value)}
                        >
                          <SelectTrigger className="h-8.5 w-full text-xs rounded-lg">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {columnTypeOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                            {col.type && !allowedColumnTypes.has(String(col.type).trim().toUpperCase()) && (
                              <SelectItem value={col.type}>{col.type}</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Target */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Target</label>
                        <Select
                          value={col.targetCol || '__blank__'}
                          onValueChange={(value) => handleUpdateCol(col.id, 'targetCol', value === '__blank__' ? '' : value)}
                        >
                          <SelectTrigger
                            className={`h-8.5 w-full text-xs rounded-lg ${
                              String(col.targetCol || '').includes('!REF!') ||
                              brokenColumnReferences.some((issue) => issue.id === col.id && issue.field === 'targetCol')
                                ? 'border-destructive bg-destructive/5 text-destructive'
                                : ''
                            }`}
                          >
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectItem value="__blank__">-</SelectItem>
                            {activeReport.columns.map((column) => (
                              <SelectItem key={column.id} value={column.id}>
                                {column.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Year */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Year</label>
                        <Select
                          value={col.yearMode || 'current'}
                          onValueChange={(value) => handleUpdateCol(col.id, 'yearMode', value)}
                        >
                          <SelectTrigger className="h-8.5 w-full text-xs rounded-lg">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {yearModeOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Period */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Period</label>
                        <Select
                          value={col.periodMode || 'current'}
                          onValueChange={(value) => handleUpdateCol(col.id, 'periodMode', value)}
                        >
                          <SelectTrigger className="h-8.5 w-full text-xs rounded-lg">
                            <SelectValue placeholder="Period" />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {periodModeOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Width */}
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Width (px)</label>
                        <Input
                          value={col.width || ''}
                          onChange={(e) => handleUpdateCol(col.id, 'width', e.target.value)}
                          type="number"
                          placeholder="Auto"
                          className="h-8.5 text-xs text-center"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );})}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
