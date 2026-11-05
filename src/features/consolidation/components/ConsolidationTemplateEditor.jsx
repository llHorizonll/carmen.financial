import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Button } from '@/components/ui/button.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { cn } from '@/lib/utils.js';
import { useTranslation } from '@/lib/i18n.js';
import ReportSetup from '../../report/components/ReportSetup.jsx';
import EditMappingModal from '../../report/components/EditMappingModal.jsx';
import DetailSelectorModal from '../../report/components/DetailSelectorModal.jsx';
import { fetchCarmenDimensions, fetchCarmenMasterData, fetchCarmenReport, fetchCarmenReportOptions, fetchCarmenReports, getStoredCarmenSession } from '../../report/lib/reportApi.js';
import { deleteColAndRewriteReferences, deleteRowAndRewriteReferences, getIndentClass, getReportDisplayColumns, moveColumnsAndRewriteReferences, moveRowsAndRewriteReferences } from '../../report/lib/reportLogic.js';
import { saveReport } from '../lib/consolidationApi.js';
import { appendTemplateColumn, appendTemplateRow, createConsolidationTemplate } from '../lib/templateModel.js';
import TemplateMappingSummary from './TemplateMappingSummary.jsx';

const hasUnsavedChanges = (draft, saved, row, detail) => Boolean(detail)
  || Boolean(draft && (!saved || JSON.stringify(draft) !== JSON.stringify(saved)))
  || Boolean(row && JSON.stringify(row) !== JSON.stringify(draft?.rows.find(item => item.id === row.id)));

export default function ConsolidationTemplateEditor({ profile, units, template, onSaved, onDirtyChange, onBusyChange, onClose, previewContainer }) {
  const t = useTranslation();
  const [draft, setDraft] = useState(template);
  const [saved, setSaved] = useState(template);
  const [undo, setUndo] = useState([]);
  const [lookups, setLookups] = useState(null);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [lookupError, setLookupError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copyMode, setCopyMode] = useState(false);
  const [sources, setSources] = useState(null);
  const [sourceId, setSourceId] = useState('');
  const [preview, setPreview] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [detail, setDetail] = useState(null);
  const [category, setCategory] = useState('ALL');
  const [confirmation, setConfirmation] = useState(null);
  const dirty = hasUnsavedChanges(draft, saved, editingRow, detail);
  useEffect(() => {
    let cancelled = false;
    setLookups(null); setLookupError('');
    Promise.all([
      fetchCarmenMasterData({ year: new Date().getFullYear(), tenant: profile.tenant }),
      fetchCarmenDimensions({ tenant: profile.tenant }),
      fetchCarmenReportOptions({ tenant: profile.tenant }),
    ]).then(([master, dimensions, options]) => {
      if (!cancelled) setLookups({ master, dimensions, options });
    }).catch(failure => { if (!cancelled) setLookupError(failure.message || 'Unable to load HQ setup data.'); });
    return () => { cancelled = true; };
  }, [profile.tenant, lookupAttempt]);
  useEffect(() => {
    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const commitDraft = (next, baseline = saved) => {
    setDraft(next); onDirtyChange?.(hasUnsavedChanges(next, baseline, editingRow, detail));
  };
  const commitEditingRow = (next, nextDetail = detail) => {
    setEditingRow(next); onDirtyChange?.(hasUnsavedChanges(draft, saved, next, nextDetail));
  };
  const commitBusy = value => { setBusy(value); onBusyChange?.(value); };
  const update = values => {
    if (!profile.canManage || busy) return;
    const next = { ...draft, ...values };
    if (JSON.stringify(next) === JSON.stringify(draft)) return;
    setUndo(previous => [...previous, draft]); commitDraft(next); setError('');
  };
  const updateRow = (id, values) => update({ rows: draft.rows.map(row => row.id === id ? { ...row, ...values } : row) });
  const updateColumn = (id, field, value) => update({ columns: draft.columns.map(column => column.id === id ? { ...column, [field]: value } : column) });
  const begin = source => {
    commitDraft(createConsolidationTemplate(profile, source, getStoredCarmenSession()?.username || ''), null);
    setSaved(null); setUndo([]); setError('');
  };
  const chooseCopy = async () => {
    setCopyMode(true); commitBusy(true); setError('');
    try { setSources(await fetchCarmenReports({ tenant: profile.tenant })); }
    catch (failure) { setError(failure.message || 'Unable to load HQ reports.'); }
    finally { commitBusy(false); }
  };
  const copy = async () => {
    commitBusy(true); setError('');
    try { begin(await fetchCarmenReport(sourceId, { tenant: profile.tenant })); }
    catch (failure) { setError(failure.message || 'Unable to copy the HQ report.'); }
    finally { commitBusy(false); }
  };
  const save = async () => {
    if (busy || !profile.canManage) return;
    if (!draft.name?.trim()) { setError('Report name is required.'); return; }
    commitBusy(true); setError('');
    try {
      const result = await saveReport({ ...draft, profileRevision: draft.profileRevision || profile.revision });
      setDraft(result); setSaved(result); setUndo([]); onDirtyChange?.(false); onSaved?.(result);
    } catch (failure) { setError(failure.message || 'Unable to save the consolidation template.'); }
    finally { commitBusy(false); }
  };
  const cancel = () => {
    if (!saved) { setDraft(null); setCopyMode(false); }
    else setDraft(saved);
    setUndo([]); setError(''); onDirtyChange?.(false);
  };
  const removeColumn = id => {
    const index = draft.columns.findIndex(column => column.id === id);
    update({ ...deleteColAndRewriteReferences(draft, id),
      ...(index >= 0 && index < Number(draft.descriptionPosition) ? { descriptionPosition: Number(draft.descriptionPosition) - 1 } : {}) });
  };
  const applyRowMapping = () => {
    const definitions = lookups.dimensions.definitions || [];
    updateRow(editingRow.id, { ...editingRow,
      dimensions: definitions.map(({ key }) => ({ key, value: String(editingRow[key] || '').trim() })).filter(item => item.value) });
    setEditingRow(null);
  };
  const displayColumns = draft ? getReportDisplayColumns(draft, draft.columns.filter(column => column.isActive !== false)) : [];
  const previewButton = draft && <Button size="sm" variant="outline" disabled={busy} onClick={() => setPreview(value => !value)}>{t(preview ? 'Edit template' : 'Structure preview')}</Button>;

  return <VStack as="section" gap={4} className="min-w-0 w-full" aria-label="Consolidation template editor">
    {previewContainer ? createPortal(previewButton, previewContainer) : previewContainer === undefined && previewButton}
    <TemplateMappingSummary profile={profile} units={units} onOpenMapping={onClose} />
    {error && <p className="px-4 text-pretty text-sm text-destructive" role="alert">{error}</p>}
    {!draft && profile.canManage && <VStack gap={3} className="p-4">
      <h3 className="text-balance font-semibold">{t('Start a consolidation template')}</h3>
      <HStack gap={2} wrap="wrap">
        <Button size="sm" disabled={busy} onClick={() => begin(null)}>{t('Blank template')}</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={chooseCopy}>{t('Copy from HQ')}</Button>
      </HStack>
      {copyMode && <HStack gap={2} wrap="wrap">
        <Label htmlFor="hq-source-report">{t('HQ report')}</Label>
        <Select value={sourceId} onValueChange={setSourceId} disabled={busy || !sources?.length}>
          <SelectTrigger id="hq-source-report" className="w-full sm:w-72"><SelectValue placeholder={t('Select HQ report')} /></SelectTrigger>
          <SelectContent>{sources?.map(source => <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" disabled={busy || !sourceId} onClick={copy}>{t('Use this report')}</Button>
      </HStack>}
      {copyMode && sources?.length === 0 && <p className="text-pretty text-sm text-muted-foreground">{t('No HQ reports available. Start with a blank template.')}</p>}
      {busy && <p role="status" className="text-pretty text-sm">{t('Loading…')}</p>}
    </VStack>}
    {!draft && !profile.canManage && <p className="px-4 text-pretty text-sm">{t('You do not have permission to create consolidation templates.')}</p>}
    {draft && (preview || !profile.canManage) && <VStack gap={3} className="p-4">
      <h3 className="text-balance font-semibold">{draft.name}</h3>
      <p role="status" className="text-pretty text-sm text-muted-foreground">{t('Structure only. Consolidated amounts are not calculated in this phase.')}</p>
      <Table aria-label="Consolidation template structure">
        <TableHeader><TableRow>{displayColumns.map(column => <TableHead key={column.id} className="whitespace-pre-line">{column.label}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{draft.rows.filter(row => row.isActive !== false).map(row => <TableRow key={row.id} className={cn(row.isTotal && 'bg-muted font-semibold', row.isHeader && 'font-semibold')}>
          {displayColumns.map(column => <TableCell key={column.id} className={cn(column.isDescription ? getIndentClass(row.indent) : 'text-right tabular-nums')}>
            {column.isDescription ? row.desc : row.isHeader ? '' : '—'}
          </TableCell>)}
        </TableRow>)}</TableBody>
      </Table>
    </VStack>}
    {draft && !preview && profile.canManage && <>
      {lookupError ? <HStack gap={2} className="p-4" wrap="wrap"><p role="alert" className="text-pretty text-sm text-destructive">{lookupError}</p><Button size="sm" variant="outline" onClick={() => setLookupAttempt(value => value + 1)}>{t('Retry')}</Button></HStack>
        : !lookups ? <p role="status" className="px-4 text-pretty text-sm">{t('Loading HQ setup data…')}</p>
          : <fieldset disabled={busy} className="min-w-0">
            <ReportSetup guideStoragePrefix="carmen_consolidation" activeReport={draft} savedReport={saved}
              masterData={lookups.master} reportOptions={lookups.options} updateActiveReport={update}
              isDirty={dirty} isSaving={busy} onSave={save}
              onCancel={() => setConfirmation({ title: 'Discard unsaved changes?', msg: 'Changes since the last save will be lost.', onConfirm: cancel })}
              onUndo={() => { commitDraft(undo.at(-1)); setUndo(previous => previous.slice(0, -1)); }} canUndo={undo.length > 0}
              handleAddRow={type => update(appendTemplateRow(draft, type))}
              handleDuplicateRow={id => { const source = draft.rows.find(row => row.id === id); if (source) update({ rows: [...draft.rows, { ...structuredClone(source), id: crypto.randomUUID(), desc: `Copy of ${source.desc}`, isActive: true }] }); }}
              handleUpdateRow={(id, field, value) => updateRow(id, { [field]: value })} handleUpdateRowMulti={updateRow}
              moveRow={(index, direction) => update(moveRowsAndRewriteReferences(draft, index, direction))}
              handleDeleteRow={id => update(deleteRowAndRewriteReferences(draft, id))}
              handleAddCol={type => update(appendTemplateColumn(draft, type))}
              handleDuplicateCol={id => { const source = draft.columns.find(column => column.id === id); if (source) update(appendTemplateColumn(draft, '', source)); }}
              handleUpdateCol={updateColumn} moveCol={(index, direction) => update(moveColumnsAndRewriteReferences(draft, index, direction))}
              handleDeleteCol={removeColumn} setEditingRow={commitEditingRow} setConfirmAction={setConfirmation} />
          </fieldset>}
    </>}
    {editingRow && lookups && <EditMappingModal isOpen editingRow={editingRow} setEditingRow={commitEditingRow}
      masterData={lookups.master} reportOptions={lookups.options} dimensionOptions={lookups.dimensions}
      dimensionDefinitions={lookups.dimensions.definitions || []} modalAccCategory={category} setModalAccCategory={setCategory}
      onOpenDetailSelector={next => { setDetail(next); onDirtyChange?.(true); }} onApply={applyRowMapping}
      onClose={() => { commitEditingRow(null, null); setDetail(null); }} />}
    {detail && editingRow && lookups && <DetailSelectorModal title={detail.title} subTitle={detail.subTitle} availableItems={detail.items}
      masterData={lookups.master} selectedItems={String(editingRow[detail.field] || '').split(',').map(value => value.trim()).filter(Boolean)}
      onCancel={() => { commitEditingRow(editingRow, null); setDetail(null); }}
      onSave={items => { commitEditingRow({ ...editingRow, [detail.field]: items.join(', ') }, null); setDetail(null); }} />}
    <AlertDialog open={Boolean(confirmation)} onOpenChange={open => { if (!open) setConfirmation(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t(confirmation?.title || 'Confirm action')}</AlertDialogTitle>
        <AlertDialogDescription>{t(confirmation?.msg || '')}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>{t('Cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => { const action = confirmation?.onConfirm; setConfirmation(null); action?.(); }}>{t(confirmation?.actionLabel || 'Confirm')}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </VStack>;
}
