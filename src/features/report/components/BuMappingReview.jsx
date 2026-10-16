import React, { useState } from 'react';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Button } from '@/components/ui/button.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { useTranslation } from '@/lib/i18n.js';
import EditMappingModal from './EditMappingModal.jsx';
import DetailSelectorModal from './DetailSelectorModal.jsx';
import { findBuMappingOverlaps, getBuMapping, getMappingIssues, isMappingRow, normalizeTenant, pickMapping, setBuMapping, splitCodes, suggestBuMapping } from '../lib/buComparison.js';

export default function BuMappingReview({ report, comparison, updateActiveReport, reportOptions, disabled }) {
  const t = useTranslation();
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [editor, setEditor] = useState(null);
  const [selector, setSelector] = useState(null);
  const [category, setCategory] = useState('ALL');
  const [error, setError] = useState('');
  const targets = comparison.available.filter((unit) => normalizeTenant(unit.id) !== normalizeTenant(report.tenant));
  if (!targets.length) return null;
  const source = comparison.masters[report.tenant]?.master;
  const proposal = (row, tenant) => suggestBuMapping(row, source, comparison.masters[tenant]?.master);
  const pending = (row, tenant) => {
    const mapping = getBuMapping(row, tenant, report.tenant);
    return !mapping || getMappingIssues(mapping, comparison.masters[tenant]?.master).length > 0;
  };
  const confirmMatches = () => {
    let next = report;
    report.rows.filter(isMappingRow).forEach((row) => targets.forEach((unit) => {
      if (getBuMapping(row, unit.id, report.tenant) || !source || !comparison.masters[unit.id]?.master) return;
      const suggestion = proposal(row, unit.id);
      if (suggestion.matched) next = setBuMapping(next, row.id, { ...suggestion.mapping, tenant: unit.id, status: 'confirmed' });
    }));
    updateActiveReport({ rows: next.rows });
  };
  const rows = report.rows.filter(isMappingRow).filter((row) => !onlyIssues || targets.some((unit) => pending(row, unit.id)));
  const master = editor ? comparison.masters[editor.tenant]?.master : null;
  const overlaps = editor ? findBuMappingOverlaps(report, editor.row.id, pickMapping(editor.row), editor.tenant, master) : [];
  const saveMapping = (status) => {
    const mapping = pickMapping(editor.row);
    if (status === 'confirmed' && !(mapping.accCodes || mapping.groups || mapping.dept || mapping.deptGroup)) {
      setError(t('Select an account or department mapping, or mark this row not applicable.')); return;
    }
    const issues = status === 'confirmed' ? getMappingIssues(mapping, master) : [];
    if (issues.length) { setError(`${t('Review required')}: ${issues.join('; ')}`); return; }
    const next = setBuMapping(report, editor.row.id, { ...mapping, tenant: editor.tenant, status });
    updateActiveReport({ rows: next.rows }); setEditor(null); setError('');
  };
  return <VStack gap={3} className="min-w-0 border-y border-border py-4">
    <HStack gap={3} wrap="wrap" justify="between">
      <header><h3 className="text-balance font-semibold">{t('Business unit mapping review')}</h3><p className="text-sm text-muted-foreground">{t('Review matches once. Change only exceptions, then save the report.')}</p></header>
      <HStack gap={2} wrap="wrap">
        <Button type="button" variant="outline" size="sm" aria-pressed={onlyIssues} onClick={() => setOnlyIssues(!onlyIssues)}>{t('Show pending only')}</Button>
        <Button type="button" size="sm" disabled={disabled || !source} onClick={confirmMatches}>{t('Confirm matching mappings')}</Button>
      </HStack>
    </HStack>
    <section className="min-w-0 overflow-x-auto">
      <Table aria-label={t('Business unit mapping review')}>
        <TableHeader><TableRow><TableHead className="sticky left-0 z-10 min-w-64 bg-background">{t('Report row')}</TableHead>{targets.map((unit) => <TableHead key={unit.id} className="min-w-48">{unit.name}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.map((row) => <TableRow key={row.id}>
          <TableCell className="sticky left-0 z-10 bg-background font-medium">{row.desc}</TableCell>
          {targets.map((unit) => {
            const mapping = getBuMapping(row, unit.id, report.tenant);
            const entry = comparison.masters[unit.id];
            const issues = getMappingIssues(mapping, entry?.master);
            const suggestion = !mapping && entry?.master && source ? proposal(row, unit.id) : null;
            return <TableCell key={unit.id}>
              <Button type="button" variant="ghost" className="h-auto w-full flex-col items-start whitespace-normal text-left" disabled={disabled || !entry?.master}
                onClick={() => { setError(''); setEditor({ tenant: unit.id, row: { ...row, ...pickMapping(mapping || suggestion?.mapping || {}) } }); }}>
                <p>{mapping?.status === 'notApplicable' ? t('Not applicable') : mapping && !issues.length ? t('Confirmed') : suggestion?.matched ? t('Match found — review') : t('Review required')}</p>
                <p className="text-xs text-muted-foreground">{mapping?.status === 'notApplicable' ? '—' : issues.join('; ') || entry?.error || (!entry?.master ? t('Loading master data...') : mapping?.accCodes || mapping?.groups || suggestion?.issues.join('; ') || suggestion?.mapping.accCodes || suggestion?.mapping.groups || t('Select mapping'))}</p>
              </Button>
            </TableCell>;
          })}
        </TableRow>)}</TableBody>
      </Table>
      {!rows.length && <p className="py-3 text-sm text-muted-foreground">{t('No pending mappings.')}</p>}
    </section>
    {editor && master && <>
      <EditMappingModal isOpen editingRow={editor.row} setEditingRow={(row) => setEditor({ ...editor, row })}
        masterData={master} reportOptions={reportOptions} dimensionOptions={master.dimensionOptions} dimensionDefinitions={master.dimensionDefinitions}
        modalAccCategory={category} setModalAccCategory={setCategory} onClose={() => { setEditor(null); setSelector(null); }} onApply={() => saveMapping('confirmed')}
        onMarkNotApplicable={() => saveMapping('notApplicable')} mappingError={error} mappingContext={`${editor.tenant} / ${editor.row.desc}`}
        mappingWarning={overlaps.length ? `${t('Account codes are also mapped in these rows. Review possible double counting.')}: ${overlaps.join(', ')}` : ''}
        onOpenDetailSelector={(selection) => setSelector(selection)} />
      {selector && <DetailSelectorModal title={`${editor.tenant} / ${selector.title}`} subTitle={selector.subTitle}
        availableItems={selector.items} selectedItems={splitCodes(editor.row[selector.field])} masterData={master}
        onCancel={() => setSelector(null)} onSave={(ids) => { setEditor({ ...editor, row: { ...editor.row, [selector.field]: ids.join(',') } }); setSelector(null); }} />}
    </>}
  </VStack>;
}
