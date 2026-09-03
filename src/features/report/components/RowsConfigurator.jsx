import React from 'react';
import { Calculator, Edit3, Eye, EyeOff, Filter, GripVertical, Layers3, Layout, RotateCcw, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils.js';
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
import { createRowMappingWarningContext, findBrokenReferences, getRowMappingWarnings } from '../lib/reportLogic.js';
import usePersistentState from '../../../hooks/usePersistentState.js';
import useDragReorder from '../hooks/useDragReorder.js';
import BulkMappingDialog from './BulkMappingDialog.jsx';

const MAPPING_PRESETS_STORAGE_KEY = 'carmen.mapping-presets.v1';

const isDataRow = (row) => !row.isHeader && !row.isTotal;
const isRowUnmapped = (row) => ![
  row.dept,
  row.deptGroup,
  row.accCodes,
  row.groups,
].some((value) => String(value || '').trim());

export default function RowsConfigurator({
  activeReport,
  masterData,
  handleAddRow,
  handleUpdateRow,
  handleUpdateRowMulti,
  handleBulkUpdateRows,
  moveRow,
  handleDeleteRow,
  setEditingRow,
  setConfirmAction,
}) {
  const [bulkMode, setBulkMode] = React.useState(false);
  const [selectedRowIds, setSelectedRowIds] = React.useState([]);
  const [rowFilter, setRowFilter] = React.useState('all');
  const [isBulkDialogOpen, setIsBulkDialogOpen] = React.useState(false);
  const [undoBatch, setUndoBatch] = React.useState(null);
  const [storedPresets, setStoredPresets] = usePersistentState(MAPPING_PRESETS_STORAGE_KEY, []);
  const presets = Array.isArray(storedPresets) ? storedPresets : [];
  const brokenRowReferences = React.useMemo(
    () => findBrokenReferences(activeReport).filter((issue) => issue.scope === 'row'),
    [activeReport],
  );
  const headerActionClassName = 'w-full justify-center border shadow-none';

  const rowsCountRef = React.useRef(activeReport.rows.length);
  const rowWarningsById = React.useMemo(() => {
    const warningContext = createRowMappingWarningContext(activeReport.rows, masterData);
    return new Map(activeReport.rows.map((row) => [
      row.id,
      getRowMappingWarnings(row, activeReport.rows, masterData, warningContext),
    ]));
  }, [activeReport.rows, masterData]);
  const brokenReferencesByRowId = React.useMemo(() => {
    const result = new Map();
    brokenRowReferences.forEach((issue) => {
      const existing = result.get(issue.id) || [];
      existing.push(issue);
      result.set(issue.id, existing);
    });
    return result;
  }, [brokenRowReferences]);
  const rowEntries = React.useMemo(() => activeReport.rows
    .map((row, originalIndex) => ({ row, originalIndex }))
    .filter(({ row }) => {
      if (rowFilter === 'unmapped') return isDataRow(row) && isRowUnmapped(row);
      if (rowFilter === 'warnings') return isDataRow(row) && (rowWarningsById.get(row.id)?.length || 0) > 0;
      return true;
    }), [activeReport.rows, rowFilter, rowWarningsById]);
  const eligibleRowIds = React.useMemo(
    () => new Set(activeReport.rows.filter(isDataRow).map((row) => row.id)),
    [activeReport.rows],
  );
  const selectedIds = selectedRowIds.filter((id) => eligibleRowIds.has(id));
  const visibleSelectableIds = rowEntries.filter(({ row }) => isDataRow(row)).map(({ row }) => row.id);
  const selectedLookup = new Set(selectedIds);
  const selectedVisibleCount = visibleSelectableIds.filter((id) => selectedLookup.has(id)).length;
  const allVisibleSelected = visibleSelectableIds.length > 0 && selectedVisibleCount === visibleSelectableIds.length;

  const toggleRowSelection = (rowId, checked) => {
    setSelectedRowIds((current) => (
      checked
        ? [...new Set([...current, rowId])]
        : current.filter((id) => id !== rowId)
    ));
  };

  const toggleVisibleRows = (checked) => {
    setSelectedRowIds((current) => {
      if (checked) return [...new Set([...current, ...visibleSelectableIds])];
      const visibleSet = new Set(visibleSelectableIds);
      return current.filter((id) => !visibleSet.has(id));
    });
  };

  const applyBulkMapping = ({ applyUpdates, undoUpdates }) => {
    handleBulkUpdateRows(applyUpdates);
    setUndoBatch({ updates: undoUpdates, count: applyUpdates.length });
    setSelectedRowIds([]);
    setIsBulkDialogOpen(false);
  };

  const undoBulkMapping = () => {
    if (!undoBatch) return;
    handleBulkUpdateRows(undoBatch.updates);
    setUndoBatch(null);
  };
  const reorderRows = React.useCallback((fromIndex, toIndex) => {
    moveRow(fromIndex, toIndex);
  }, [moveRow]);
  const {
    announcement,
    containerRef,
    getHandleProps,
    getItemProps,
  } = useDragReorder({
    items: activeReport.rows.map((row) => row.id),
    onReorder: reorderRows,
    axis: 'vertical',
    itemLabel: (id) => `row ${id}`,
  });

  React.useEffect(() => {
    let scrollTimer;
    if (activeReport.rows.length > rowsCountRef.current) {
      scrollTimer = setTimeout(() => {
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
    return () => clearTimeout(scrollTimer);
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
            <CardDescription className="text-sm text-muted-foreground">Control row details, then drag the grip to reorder.</CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              variant={bulkMode ? 'secondary' : 'outline'}
              size="sm"
              className={headerActionClassName}
              aria-pressed={bulkMode}
              onClick={() => {
                setBulkMode((current) => !current);
                setSelectedRowIds([]);
                setRowFilter('all');
              }}
            >
              <Layers3 />
              Bulk Mapping
            </Button>
            <Button variant="outline" size="sm" className={headerActionClassName} onClick={() => handleAddRow('data')}>+ Add Data Row</Button>
            <Button variant="outline" size="sm" className={headerActionClassName} onClick={() => handleAddRow('header')}>+ Add Header Row</Button>
            <Button variant="outline" size="sm" className={headerActionClassName} onClick={() => handleAddRow('formula')}>+ Add Formula Row</Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <p className="sr-only" aria-live="polite">{announcement}</p>
        {brokenRowReferences.length > 0 && (
          <div className="border-b bg-destructive/5 px-4 py-2 text-sm text-destructive">
            Broken row references found. These {brokenRowReferences.length} invalid reference(s) may produce incomplete report data.
          </div>
        )}

        {undoBatch && (
          <section className="flex flex-wrap items-center justify-between gap-2 border-b bg-emerald-500/10 px-4 py-2" aria-live="polite">
            <p className="text-sm tabular-nums text-foreground">Mapping updated for {undoBatch.count} rows.</p>
            <Button type="button" variant="outline" size="sm" onClick={undoBulkMapping}>
              <RotateCcw />
              Undo bulk mapping
            </Button>
          </section>
        )}

        {bulkMode && (
          <section className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-3 py-2" aria-label="Bulk mapping toolbar">
            <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
            <Select value={rowFilter} onValueChange={setRowFilter}>
              <SelectTrigger className="w-44" aria-label="Filter report rows">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rows</SelectItem>
                <SelectItem value="unmapped">Unmapped data rows</SelectItem>
                <SelectItem value="warnings">Rows with warnings</SelectItem>
              </SelectContent>
            </Select>
            <p className="mr-auto text-sm tabular-nums text-muted-foreground" aria-live="polite">
              {selectedIds.length} selected · {presets.length} presets
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={() => setSelectedRowIds([])}
            >
              <X />
              Clear selection
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={() => setIsBulkDialogOpen(true)}
            >
              <Layers3 />
              Map selected
            </Button>
          </section>
        )}

        <div className="overflow-auto">
          <Table className="min-w-[1000px] table-fixed [&_td]:px-1 [&_th]:px-1">
            <TableHeader className="sticky top-0 z-10 bg-muted/50">
              <TableRow>
                {bulkMode && (
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      aria-label="Select all visible data rows"
                      checked={allVisibleSelected ? true : selectedVisibleCount > 0 ? 'indeterminate' : false}
                      onCheckedChange={(checked) => toggleVisibleRows(checked === true)}
                    />
                  </TableHead>
                )}
                <TableHead className="w-16 text-center align-middle">Del</TableHead>
                <TableHead className="w-20 text-center align-middle">Visible</TableHead>
                <TableHead className="w-32 text-center align-middle">Type</TableHead>
                <TableHead className="w-48">Description</TableHead>
                <TableHead className="w-24 text-center align-middle">Indent</TableHead>
                <TableHead className="w-24 text-center align-middle">Row</TableHead>
                <TableHead className="w-24 text-center align-middle">% Base</TableHead>
                <TableHead className="w-96 min-w-96 max-w-96 whitespace-normal">Mapping Rules Setup</TableHead>
                <TableHead className="sticky right-0 z-20 w-24 border-l bg-muted/95 text-center align-middle">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody ref={containerRef}>
              {rowEntries.map(({ row, originalIndex: idx }) => {
                const isHeader = row.isHeader || false;
                const isTotal = row.isTotal || false;
                const rowType = isTotal ? 'F' : (isHeader ? 'H' : 'D');
                const rowReferenceIssues = brokenReferencesByRowId.get(row.id) || [];
                const rowFormulaIssues = rowReferenceIssues.filter((issue) => issue.field === 'formula');
                const rowPercentBaseIssues = rowReferenceIssues.filter((issue) => issue.field === 'percentBase');

                const isPctBroken = rowPercentBaseIssues.length > 0 || (row.percentBase && row.percentBase.includes('!REF!'));
                const isFormulaBroken = rowFormulaIssues.length > 0 || (row.formula && row.formula.includes('!REF!'));
                const rowWarnings = rowWarningsById.get(row.id) || [];

                return (
                  <TableRow
                    key={row.id}
                    {...getItemProps(row.id)}
                    className={cn(
                      'row-configurator-row transition-[opacity,box-shadow,transform,background-color] duration-200 ease-out data-[dragging=true]:opacity-40 data-[drag-over=true]:bg-primary/5 data-[drag-over=true]:ring-2 data-[drag-over=true]:ring-inset data-[drag-over=true]:ring-primary/35 motion-reduce:transition-none',
                      isTotal && 'bg-muted/30',
                      isHeader && 'bg-muted/10',
                      selectedLookup.has(row.id) && 'bg-primary/5',
                    )}
                  >
                  {bulkMode && (
                    <TableCell className="px-2 py-2 text-center align-middle">
                      {isDataRow(row) && (
                        <Checkbox
                          aria-label={`Select row ${idx + 1}: ${row.desc}`}
                          checked={selectedLookup.has(row.id)}
                          onCheckedChange={(checked) => toggleRowSelection(row.id, checked === true)}
                        />
                      )}
                    </TableCell>
                  )}
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
                    <TableCell className="px-2 py-2 text-center align-middle">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className={cn(
                          'mx-auto border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                          row.isActive !== false ? 'bg-muted/60' : 'bg-background',
                        )}
                        aria-label={`${row.isActive !== false ? 'Hide' : 'Show'} row ${row.id}`}
                        title={`${row.isActive !== false ? 'Hide' : 'Show'} row ${row.id}`}
                        onClick={() => handleUpdateRow(row.id, 'isActive', row.isActive === false)}
                      >
                        {row.isActive !== false ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
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
                      <section className="flex flex-col items-center gap-1.5 whitespace-nowrap">
                        <Badge variant="secondary">R{idx + 1}</Badge>
                        {!bulkMode && rowFilter === 'all' && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            {...getHandleProps(row.id, idx)}
                            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                          >
                            <GripVertical />
                          </Button>
                        )}
                      </section>
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
                    <TableCell className="w-96 min-w-96 max-w-96 whitespace-normal px-2 py-2 align-middle">
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
                        <section className="min-w-0 space-y-1 text-sm text-muted-foreground">
                          <p className="truncate"><span className="font-medium text-foreground">DEPT:</span> {row.dept || '-'}</p>
                          <p className="truncate"><span className="font-medium text-foreground">DEPT GRP:</span> {row.deptGroup || '-'}</p>
                          <p className="truncate"><span className="font-medium text-foreground">GRP ({row.groupLevel || 'L4'}):</span> {row.groups || '-'}</p>
                          <p className="truncate"><span className="font-medium text-foreground">CODE:</span> {row.accCodes || '-'}</p>
                          <p className="truncate"><span className="font-medium text-foreground">DIM:</span> {[row.dim1, row.dim2].filter(Boolean).join(', ') || '-'}</p>
                          {rowWarnings.length > 0 && (
                            <section className="min-w-0 space-y-1 pt-1">
                              {rowWarnings.map((warning) => {
                                const isUnknown = /unknown/i.test(warning);
                                return isUnknown ? (
                                  <Badge
                                    key={warning}
                                    variant="destructive"
                                    className="h-auto max-w-full whitespace-normal break-words rounded-md border-destructive/30 bg-destructive/15 px-2 py-1 text-left text-xs font-normal normal-case tracking-normal"
                                  >
                                    {warning}
                                  </Badge>
                                ) : (
                                  <section key={warning} className="max-w-full break-words rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1 text-xs text-destructive">
                                    {warning}
                                  </section>
                                );
                              })}
                            </section>
                          )}
                        </section>
                      )}
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 w-24 border-l bg-card px-2 py-2 text-center align-middle">
                      {!isHeader && !isTotal ? (
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Edit mapping for row ${row.id}`}
                          title={`Edit mapping for row ${row.id}`}
                          onClick={() => setEditingRow({ ...row })}
                          className="mx-auto"
                        >
                          <Edit3 />
                          Edit
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {isBulkDialogOpen && (
        <BulkMappingDialog
          rows={activeReport.rows}
          selectedIds={selectedIds}
          masterData={masterData}
          presets={presets}
          setPresets={setStoredPresets}
          setConfirmAction={setConfirmAction}
          onApply={applyBulkMapping}
          onClose={() => setIsBulkDialogOpen(false)}
        />
      )}
    </Card>
  );
}
