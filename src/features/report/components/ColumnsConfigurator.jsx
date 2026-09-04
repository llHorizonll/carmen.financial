import React from 'react';
import { Eye, EyeOff, GripVertical, Percent, Trash2 } from 'lucide-react';
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
import { findBrokenReferences, getReportDisplayColumns, moveDisplayColumnsAndRewriteReferences } from '../lib/reportLogic.js';
import useDragReorder from '../hooks/useDragReorder.js';
import MoveToPositionDialog from './MoveToPositionDialog.jsx';

const EMPTY_REPORT_OPTIONS = {};

const COLUMN_CLASY_MAP = {
  formula: {
    label: 'Formula',
    badgeClass: 'border-border bg-muted text-foreground',
  },
  percent: {
    label: 'Mix %',
    badgeClass: 'border-border bg-muted text-foreground',
  },
  data: {
    label: 'Data',
    badgeClass: 'border-border bg-muted text-foreground',
  },
};

const getColumnLogicType = (column) => (
  column.isFormula ? 'FORMULA' : column.isPercent ? 'MIX' : 'DATA'
);

export const buildColumnLogicTypeUpdates = (column, logicType, columns, defaultDataType) => {
  if (logicType === 'FORMULA') {
    return {
      isFormula: true,
      isPercent: false,
      formatAsPercent: false,
      formula: column.formula || 'C1-C2',
      targetCol: undefined,
      yearMode: undefined,
      periodMode: undefined,
      type: undefined,
    };
  }

  if (logicType === 'MIX') {
    const targetColumn = columns.find((candidate) => candidate.id !== column.id && !candidate.isPercent);
    return {
      isFormula: false,
      isPercent: true,
      formatAsPercent: false,
      formula: '',
      targetCol: targetColumn?.id || '',
      yearMode: undefined,
      periodMode: undefined,
      type: undefined,
    };
  }

  return {
    isFormula: false,
    isPercent: false,
    formatAsPercent: false,
    formula: '',
    targetCol: '',
    yearMode: 'current',
    periodMode: 'current',
    type: defaultDataType,
  };
};

export default function ColumnsConfigurator({
  activeReport,
  reportOptions = EMPTY_REPORT_OPTIONS,
  handleAddCol,
  handleUpdateCol,
  updateActiveReport,
  handleDeleteCol,
}) {
  const columnsCountRef = React.useRef(activeReport.columns.length);

  React.useEffect(() => {
    let scrollTimer;
    if (activeReport.columns.length > columnsCountRef.current) {
      scrollTimer = setTimeout(() => {
        const cards = document.querySelectorAll('.column-card');
        if (cards.length > 0) {
          const lastCard = cards[cards.length - 1];
          lastCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
          const input = lastCard.querySelector('input');
          if (input) {
            input.focus();
            input.select();
          }
        }
      }, 50);
    }
    columnsCountRef.current = activeReport.columns.length;
    return () => clearTimeout(scrollTimer);
  }, [activeReport.columns.length]);

  const reportType = activeReport?.reportType || 'Monthly';
  const allowedColumnTypes = reportType === 'Daily'
    ? new Set(['DAC', 'PTD', 'DACBG', 'PTDBG'])
    : new Set(['AC', 'ACC', 'BC', 'BCC', 'BUD', 'BUDACC']); // Keep BUD and BUDACC internally allowed for backward compatibility
  const columnTypeOptions = (reportOptions.columnTypes?.length > 0
    ? reportOptions.columnTypes
    : [
        { id: 'DAC', label: 'DAC' },
        { id: 'PTD', label: 'PTD' },
        { id: 'AC', label: 'AC' },
        { id: 'ACC', label: 'ACC' },
        { id: 'DACBG', label: 'DACBG' },
        { id: 'PTDBG', label: 'PTDBG' },
        { id: 'BC', label: 'BC' },
        { id: 'BCC', label: 'BCC' },
      ]).filter((option) => allowedColumnTypes.has(option.id));
  const logicTypeLabels = new Map((reportOptions.columnLogicTypes?.length > 0
    ? reportOptions.columnLogicTypes
    : [
        { id: 'DATA', label: 'Data' },
        { id: 'FORMULA', label: 'Formula' },
        { id: 'MIX', label: 'Mix %' },
      ]).map((option) => [String(option.id).toUpperCase(), option.label]));
  const logicTypeOptions = Array.from(logicTypeLabels, ([id, label]) => ({ id, label }));
  const yearModeOptions = reportOptions.yearModes?.length > 0
    ? reportOptions.yearModes
    : [
        { id: 'current', label: 'Current' },
        { id: '-1', label: 'Prev' },
        { id: '+1', label: 'Next' },
        { id: 'specific', label: 'Specific' },
      ];
  const periodModeOptions = reportOptions.periodModes?.length > 0
    ? reportOptions.periodModes
    : [
        { id: 'current', label: 'Period (Parameter)' },
        { id: '-1', label: 'Period -1' },
        { id: 'Q1', label: 'Q1' },
        { id: 'Q2', label: 'Q2' },
        { id: 'Q3', label: 'Q3' },
        { id: 'Q4', label: 'Q4' },
      ];
  const hasIncompatibleColumns = activeReport.columns.some((col) => (
    !col.isFormula &&
    !col.isPercent &&
    col.type &&
    !allowedColumnTypes.has(String(col.type).trim().toUpperCase())
  ));
  const brokenColumnReferences = React.useMemo(
    () => findBrokenReferences(activeReport).filter((issue) => issue.scope === 'column'),
    [activeReport],
  );
  const displayColumns = React.useMemo(() => getReportDisplayColumns(activeReport), [activeReport]);
  const columnIndexById = React.useMemo(
    () => new Map(activeReport.columns.map((column, index) => [column.id, index])),
    [activeReport.columns],
  );
  const displayColumnIds = displayColumns.map((column) => column.id);
  const reorderColumns = React.useCallback((fromIndex, toIndex) => {
    updateActiveReport(moveDisplayColumnsAndRewriteReferences(activeReport, fromIndex, toIndex));
  }, [activeReport, updateActiveReport]);
  const changeColumnLogicType = React.useCallback((column, logicType) => {
    const defaultDataType = reportType === 'Daily' ? 'DAC' : 'AC';
    const updates = buildColumnLogicTypeUpdates(column, logicType, activeReport.columns, defaultDataType);
    updateActiveReport({
      columns: activeReport.columns.map((candidate) => (
        candidate.id === column.id ? { ...candidate, ...updates } : candidate
      )),
    });
  }, [activeReport.columns, reportType, updateActiveReport]);
  const {
    announcement,
    containerRef,
    getHandleProps,
    getItemProps,
  } = useDragReorder({
    items: displayColumnIds,
    onReorder: reorderColumns,
    axis: 'horizontal',
    itemLabel: (id) => id === '__description__' ? 'Description column' : `column ${id}`,
  });
  const headerActionClassName = 'w-full justify-center border shadow-none';

  return (
    <Card className="w-full max-w-full min-h-0 overflow-hidden border border-border bg-card/95 shadow-none ring-0">
      <CardHeader className="border-b bg-muted/20 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">Columns Configurator</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Drag for nearby changes, or choose an exact position for long moves.</CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[24rem]">
            <Button variant="outline" size="sm" className={headerActionClassName} onClick={() => handleAddCol('data')}>+ {logicTypeLabels.get('DATA') || 'Data'}</Button>
            <Button variant="outline" size="sm" className={headerActionClassName} onClick={() => handleAddCol('formula')}>+ {logicTypeLabels.get('FORMULA') || 'Formula'}</Button>
            <Button variant="outline" size="sm" className={headerActionClassName} onClick={() => handleAddCol('percent')}>
              <Percent className="size-4" />
              {logicTypeLabels.get('MIX') || 'Mix %'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 w-full overflow-hidden">
        <p className="sr-only" aria-live="polite">{announcement}</p>
        {hasIncompatibleColumns && (
          <div className="border-b bg-amber-500/5 px-4 py-2 text-sm text-amber-700">
            {reportType} reports should only use compatible column types. Mismatched columns may produce incomplete report data.
          </div>
        )}
        {brokenColumnReferences.length > 0 && (
          <div className="border-b bg-destructive/5 px-4 py-2 text-sm text-destructive">
            Broken column references found. These {brokenColumnReferences.length} invalid reference(s) may produce incomplete report data.
          </div>
        )}

        <div className="relative w-full overflow-hidden">
          <div ref={containerRef} className="flex gap-4 overflow-x-auto px-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 pb-6 w-full">
            {displayColumns.map((col, visualIndex) => {
              if (col.isDescription) {
                return (
                  <section
                    key={col.id}
                    {...getItemProps(col.id)}
                    data-testid="description-column-card"
                    className="column-card flex min-h-0 w-[310px] shrink-0 flex-col rounded-xl border border-border bg-card transition-[opacity,box-shadow,transform] duration-200 ease-out data-[dragging=true]:opacity-40 data-[drag-over=true]:ring-2 data-[drag-over=true]:ring-primary/40 motion-reduce:transition-none"
                  >
                    <header className="flex w-full flex-row items-center justify-between gap-2 overflow-hidden rounded-t-xl border-b border-border bg-muted/30 px-3 py-2.5">
                      <h3 className="flex min-w-0 flex-1 items-center gap-1.5">
                        <Badge variant="secondary" className="shrink-0 px-2 py-0.5 text-xs font-semibold">
                          Description
                        </Badge>
                        <Badge variant="outline" className="shrink-0 rounded-md bg-muted px-1.5 py-0 text-xs font-medium text-muted-foreground">
                          Label
                        </Badge>
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        {...getHandleProps(col.id, visualIndex)}
                        className="h-7 w-7 shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                      >
                        <GripVertical className="size-4" />
                      </Button>
                      <MoveToPositionDialog
                        currentPosition={visualIndex + 1}
                        itemCount={displayColumns.length}
                        itemLabel="Description column"
                        onMove={reorderColumns}
                        triggerSize="icon-xs"
                      />
                    </header>
                    <section className="space-y-2 p-4">
                      <p className="text-sm font-semibold text-foreground">Row description</p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        Display-only column. Moving it does not change C references or calculations.
                      </p>
                    </section>
                  </section>
                );
              }

              const idx = columnIndexById.get(col.id) ?? -1;
              const fieldId = (field) => `${col.id}-${field}`;
              const colClassy = col.isFormula 
                ? COLUMN_CLASY_MAP.formula 
                : col.isPercent 
                ? COLUMN_CLASY_MAP.percent 
                : COLUMN_CLASY_MAP.data;

              return (
                <section
                  key={col.id}
                  {...getItemProps(col.id)}
                  data-testid="column-card"
                  className="column-card flex min-h-0 w-[310px] shrink-0 flex-col rounded-xl border border-border bg-card transition-[opacity,box-shadow,transform] duration-200 ease-out data-[dragging=true]:opacity-40 data-[drag-over=true]:ring-2 data-[drag-over=true]:ring-primary/40 motion-reduce:transition-none"
                >
                  {/* Card Header: identify, reorder, and control the column */}
                  <div className="flex flex-row items-center justify-between border-b border-border bg-muted/30 px-3 py-2.5 rounded-t-xl gap-2 w-full overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <Badge variant="secondary" className="font-mono text-xs font-semibold px-2 py-0.5 shrink-0">
                        C{idx + 1}
                      </Badge>
                      <Badge variant="outline" className={`shrink-0 rounded-md px-1.5 py-0 text-xs font-medium ${colClassy.badgeClass}`}>
                        {colClassy.label}
                      </Badge>
                      <span className="truncate font-mono text-xs font-medium text-muted-foreground" title={col.id}>{col.id}</span>
                    </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className={
                        col.isActive !== false
                          ? 'h-7 w-7 border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150'
                          : 'h-7 w-7 border-border bg-background text-muted-foreground hover:bg-muted'
                      }
                      aria-label={`${col.isActive !== false ? 'Hide' : 'Show'} column ${col.id}`}
                      title={`${col.isActive !== false ? 'Hide' : 'Show'} column ${col.id}`}
                      onClick={() => handleUpdateCol(col.id, 'isActive', !(col.isActive !== false))}
                    >
                      {col.isActive !== false ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </Button>
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
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      {...getHandleProps(col.id, visualIndex)}
                      className="h-7 w-7 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    >
                      <GripVertical className="size-4" />
                    </Button>
                    <MoveToPositionDialog
                      currentPosition={visualIndex + 1}
                      itemCount={displayColumns.length}
                      itemLabel={`column C${idx + 1}`}
                      onMove={reorderColumns}
                      triggerSize="icon-xs"
                    />
                  </div>
                </div>

                {/* Card Content: Inputs and configurations */}
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor={fieldId('logic-type')} className="text-sm font-medium text-foreground">Logic type</label>
                    <Select
                      value={getColumnLogicType(col)}
                      onValueChange={(value) => changeColumnLogicType(col, value)}
                    >
                      <SelectTrigger id={fieldId('logic-type')} className="h-9 w-full text-sm">
                        <SelectValue placeholder="Logic type" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {logicTypeOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Label */}
                  <div className="space-y-1.5">
                    <label htmlFor={fieldId('label')} className="text-sm font-medium text-foreground">Column label</label>
                    <Input
                      id={fieldId('label')}
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
                        <label htmlFor={fieldId('formula')} className="text-xs font-medium text-muted-foreground">Formula</label>
                        <Input
                          id={fieldId('formula')}
                          value={col.formula || ''}
                          onChange={(e) => handleUpdateCol(col.id, 'formula', e.target.value)}
                          placeholder="e.g. C1-C2+C3"
                          className="h-9 font-mono text-sm"
                        />
                      </div>

                      {/* Width */}
                      <div className="space-y-1.5">
                        <label htmlFor={fieldId('formula-width')} className="text-xs font-medium text-muted-foreground">Width (px)</label>
                        <Input
                          id={fieldId('formula-width')}
                          value={col.width || ''}
                          onChange={(e) => handleUpdateCol(col.id, 'width', e.target.value)}
                          type="number"
                          placeholder="Auto"
                          className="h-9 text-center text-sm"
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
                        <label htmlFor={fieldId('target-column')} className="text-xs font-medium text-muted-foreground">Target column</label>
                        <Input
                          id={fieldId('target-column')}
                          value={col.targetCol || ''}
                          onChange={(e) => handleUpdateCol(col.id, 'targetCol', e.target.value)}
                          placeholder="e.g. C1"
                          className="h-9 font-mono text-sm"
                        />
                      </div>

                      {/* Width */}
                      <div className="col-span-2 space-y-1.5">
                        <label htmlFor={fieldId('percent-width')} className="text-xs font-medium text-muted-foreground">Width (px)</label>
                        <Input
                          id={fieldId('percent-width')}
                          value={col.width || ''}
                          onChange={(e) => handleUpdateCol(col.id, 'width', e.target.value)}
                          type="number"
                          placeholder="Auto"
                          className="h-9 text-center text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3.5">
                      {/* Type */}
                      <div className="space-y-1.5">
                        <label htmlFor={fieldId('type')} className="text-xs font-medium text-muted-foreground">Type</label>
                        <Select
                          value={col.type || (reportType === 'Daily' ? 'DAC' : 'AC')}
                          onValueChange={(value) => handleUpdateCol(col.id, 'type', value)}
                        >
                          <SelectTrigger id={fieldId('type')} className="h-9 w-full text-sm">
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
                        <label htmlFor={fieldId('target')} className="text-xs font-medium text-muted-foreground">Target</label>
                        <Select
                          value={col.targetCol || '__blank__'}
                          onValueChange={(value) => handleUpdateCol(col.id, 'targetCol', value === '__blank__' ? '' : value)}
                        >
                          <SelectTrigger
                            id={fieldId('target')}
                            className={`h-9 w-full text-sm ${
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
                        <label htmlFor={fieldId('year')} className="text-xs font-medium text-muted-foreground">Year</label>
                        <Select
                          value={col.yearMode || 'current'}
                          onValueChange={(value) => handleUpdateCol(col.id, 'yearMode', value)}
                        >
                          <SelectTrigger id={fieldId('year')} className="h-9 w-full text-sm">
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
                        {col.yearMode === 'specific' && (
                          <Input
                            aria-label={'Specific year for ' + col.id}
                            type="number"
                            value={col.specificYear || ''}
                            onChange={(event) => handleUpdateCol(col.id, 'specificYear', event.target.value)}
                            placeholder="2026"
                            className="mt-2 h-9 text-sm"
                          />
                        )}
                      </div>

                      {/* Period */}
                      <div className="space-y-1.5">
                        <label htmlFor={fieldId('period')} className="text-xs font-medium text-muted-foreground">Period</label>
                        <Select
                          value={col.periodMode || 'current'}
                          onValueChange={(value) => handleUpdateCol(col.id, 'periodMode', value)}
                        >
                          <SelectTrigger id={fieldId('period')} className="h-9 w-full text-sm">
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
                        <label htmlFor={fieldId('data-width')} className="text-xs font-medium text-muted-foreground">Width (px)</label>
                        <Input
                          id={fieldId('data-width')}
                          value={col.width || ''}
                          onChange={(e) => handleUpdateCol(col.id, 'width', e.target.value)}
                          type="number"
                          placeholder="Auto"
                          className="h-9 text-center text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );})}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
