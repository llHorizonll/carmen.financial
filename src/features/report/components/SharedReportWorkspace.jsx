import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n.js';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import MultiSelectDropdown from './MultiSelectDropdown.jsx';
import RowsConfigurator from './RowsConfigurator.jsx';
import ColumnsConfigurator from './ColumnsConfigurator.jsx';
import EditMappingModal from './EditMappingModal.jsx';
import DetailSelectorModal from './DetailSelectorModal.jsx';
import ReportView from './ReportView.jsx';
import ReportDashboard from './ReportDashboard.jsx';
import { fetchCarmenMasterData, fetchCarmenDimensions, fetchCarmenReportOptions } from '../lib/reportApi.js';
import { sharedReportsApi, createSharedReport, calculateSharedReport } from '../lib/sharedReports.js';
import { THEMES, getIndentClass, moveRowsAndRewriteReferences, deleteRowAndRewriteReferences, deleteColAndRewriteReferences, buildExcelHtml, findBrokenReferences, formatReportCell } from '../lib/reportLogic.js';

const EMPTY_MASTER = { depts: [], accCodes: [], accountGroups: [], deptGroups: [], groups: {}, users: [] };
const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export default function SharedReportWorkspace({ units, username, onClose }) {
  const t = useTranslation();
  const [catalog, setCatalog] = useState([]);
  const [available, setAvailable] = useState(null);
  const [report, setReport] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tenant, setTenant] = useState('');
  const [master, setMaster] = useState(EMPTY_MASTER);
  const [masterTenant, setMasterTenant] = useState('');
  const [dimensions, setDimensions] = useState({});
  const [options, setOptions] = useState({});
  const [tab, setTab] = useState('setup');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [detail, setDetail] = useState(null);
  const [category, setCategory] = useState('ALL');
  const [confirm, setConfirm] = useState(null);
  const [kpiRow, setKpiRow] = useState('');
  const [kpiCol, setKpiCol] = useState('');
  const [mappingWarnings, setMappingWarnings] = useState([]);
  const [filters, setFilters] = useState({ year: new Date().getFullYear(), period: 1, revision: 0, day: '' });
  const alive = useRef(false);
  const dirty = JSON.stringify(report) !== JSON.stringify(saved);
  const permitted = (field) => report?.tenants?.every(id => units.find(unit => unit.id === id)?.permission?.[field]);
  const canEdit = report && permitted(report.version ? 'update' : 'add') && (!report.version || report.owner?.toLowerCase() === username?.toLowerCase()
    || report.access?.some(a => a.userName?.toLowerCase() === username?.toLowerCase() && a.canEdit));
  const mappingReady = masterTenant === tenant && Boolean(tenant);

  useEffect(() => {
    alive.current = true;
    sharedReportsApi.capabilities().then(async capability => {
      if (!alive.current) return;
      setAvailable(capability.available === true);
      if (capability.available) {
        const [reports, reportOptions] = await Promise.all([sharedReportsApi.list(), fetchCarmenReportOptions()]);
        if (alive.current) { setCatalog(reports); setOptions(reportOptions); }
      }
    }).catch(e => { if (alive.current) setError(e.message); });
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    setMasterTenant(''); setMaster(EMPTY_MASTER); setEditingRow(null); setDetail(null);
    Promise.all([fetchCarmenMasterData({ year: filters.year, tenant }), fetchCarmenDimensions({ tenant })])
      .then(([data, dims]) => { if (!cancelled) { setMaster(data); setDimensions(dims); setMasterTenant(tenant); } })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [tenant, filters.year]);

  useEffect(() => {
    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = (next) => {
    if (JSON.stringify(next.mappings) !== JSON.stringify(report?.mappings) || JSON.stringify(next.rows) !== JSON.stringify(report?.rows)
      || JSON.stringify(next.tenants) !== JSON.stringify(report?.tenants)) next = { ...next, overlapConfirmed: false };
    setReport(next); setResult(null); setHistory([]); setMappingWarnings([]); setError('');
  };
  const setCurrent = (next) => { setReport(next); setSaved(next); setResult(null); setHistory([]); setError(''); setTenant(next?.tenants?.[0] || ''); };
  const discardGuard = action => dirty ? setConfirm({ title: 'Discard unsaved changes?', msg: 'Your shared template changes have not been saved.', onConfirm: action }) : action();
  const run = async action => {
    setBusy(true); setError('');
    try { await action(); } catch (e) { if (alive.current) setError(e.message); }
    finally { if (alive.current) setBusy(false); }
  };
  const refresh = async () => { const reports = await sharedReportsApi.list(); if (alive.current) setCatalog(reports); };
  const save = () => run(async () => {
    if (findBrokenReferences(report).length) throw new Error('Fix broken formula references before saving.');
    const validation = await sharedReportsApi.validate(report);
    if (validation.mappingOverlaps?.length && !report.overlapConfirmed) {
      setMappingWarnings(validation.mappingOverlaps);
      throw new Error('Review the possible mapping overlaps and confirm if they are intentional.');
    }
    const next = await sharedReportsApi.save(report);
    if (alive.current) setCurrent(next);
    await refresh();
  });
  const calculate = () => run(async () => {
    setResult(null);
    const data = await sharedReportsApi.data(report, filters);
    if (alive.current) { setResult({ response: data, ...calculateSharedReport(report, data, filters), filters: { ...filters } }); setTab('table'); }
  });
  const addRow = () => update({ ...report, rows: [...report.rows, { id: crypto.randomUUID(), desc: 'New row', isActive: true, indent: 0 }] });
  const updateRow = (id, values) => update({ ...report, rows: report.rows.map(r => r.id === id ? { ...r, ...values } : r) });
  const addCol = () => update({ ...report, columns: [...report.columns, { id: crypto.randomUUID(), label: 'Actual', type: 'AC', sourceTenant: 'ALL', yearMode: 'current', periodMode: 'current', isActive: true }] });
  const mappedReport = useMemo(() => report && ({ ...report, rows: report.rows.map(row => ({ ...row, ...report.mappings?.[tenant]?.[row.id], id: row.id })) }), [report, tenant]);
  const applyMapping = () => {
    const accountGroup = master.accountGroups.find(group => group.id === editingRow.groups);
    const deptGroup = master.deptGroups.find(group => group.id === editingRow.deptGroup);
    if (accountGroup && !accountGroup.accountIds.length) { setError('The selected account group has no accounts.'); return; }
    if (deptGroup && !deptGroup.deptIds.length) { setError('The selected department group has no departments.'); return; }
    // shortcut: group members are snapshots; reapply the mapping after group membership changes.
    const mapping = { accCodes: accountGroup ? accountGroup.accountIds.join(',') : editingRow.accCodes || '',
      dept: deptGroup ? deptGroup.deptIds.join(',') : editingRow.dept || '', groups: '', deptGroup: '',
      sourceGroup: accountGroup?.id || '', sourceDeptGroup: deptGroup?.id || '',
      dimensions: editingRow.dimensions || [], sign: editingRow.sign ?? 1, notApplicable: false };
    update({ ...report, compatibilityConfirmed: false, mappings: { ...report.mappings, [tenant]: { ...report.mappings?.[tenant], [editingRow.id]: mapping } } });
    setEditingRow(null);
  };
  const exportExcel = () => {
    const safeReport = { ...report, name: escapeHtml(report.name), columns: report.columns.map(c => ({ ...c, label: escapeHtml(c.label), width: Number(c.width) || 100 })) };
    const html = buildExcelHtml({ activeReport: safeReport, activeCols: safeReport.columns.filter(c => c.isActive !== false),
      reportData: result.rows.map(r => ({ ...r, desc: escapeHtml(r.desc) })), themeColors: THEMES[report.theme] || THEMES.blue,
      displayCompanyLabel: escapeHtml(report.tenants.map(id => units.find(u => u.id === id)?.name || id).join(' + ')),
      displayDateLabel: escapeHtml(`${result.filters.year} / ${result.filters.period} · ${result.response.asOf}`),
      displayPeriodLabel: escapeHtml(`${result.response.currency} · Complete · Configuration v${report.version}`) });
    const url = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'consolidated-report.xls'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const names = report?.tenants.map(id => units.find(unit => unit.id === id)?.name || id).join(' + ');
  const viewProps = result && { activeReport: report, reportData: result.rows, activeCols: report.columns.filter(c => c.isActive !== false),
    displayCompanyLabel: names, displayDateLabel: `${result.filters.year} / ${result.filters.period}`,
    displayPeriodLabel: `${result.response.currency} · Complete · v${report.version} · ${result.response.asOf}`, remark: report.remark };

  return <VStack as="section" gap={4} aria-labelledby="shared-workspace-title" className="min-w-0 w-full p-4 print:p-0 [&_.astryx-heading]:text-foreground [&_.astryx-text]:text-foreground">
      <HStack as="header" gap={3} wrap="wrap" className="print:hidden">
        <VStack gap={1} className="min-w-0 flex-1">
          <Heading level={1} id="shared-workspace-title">{t('Shared reports')}</Heading>
          <Text>Manage central templates and consolidate mapped amounts from authorized business units.</Text>
        </VStack>
        <Button variant="outline" onClick={onClose}>{t('Back to reports')}</Button>
      </HStack>
      {error && <p role="alert">{error}</p>}
      {available === null && !error && <p role="status">Checking shared report availability…</p>}
      {available === false && <p role="status">Shared reports are not enabled on this server yet.</p>}
      {available && <VStack gap={4}>
        <fieldset disabled={busy} className="print:hidden">
          <HStack gap={3} wrap="wrap">
            <Label className="grid gap-1">Shared report<Select value={report?.version ? report.id : ''} onValueChange={id => discardGuard(() => run(async () => { const next = await sharedReportsApi.get(id); if (alive.current) setCurrent(next); }))}>
              <SelectTrigger><SelectValue placeholder="Select shared report" /></SelectTrigger><SelectContent>{catalog.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Label>
            <Button disabled={!units.some(u => u.permission?.add)} onClick={() => discardGuard(() => {
              setCurrent(createSharedReport(units.filter(u => u.permission?.add).map(u => u.id))); setTab('setup');
            })}>New shared template</Button>
            {report && <>
              <Button disabled={!canEdit} onClick={save}>Save template</Button>
              <Button variant="outline" disabled={!report.version || !permitted('add')} onClick={() => discardGuard(() => run(async () => {
                const next = await sharedReportsApi.clone(report.id); if (alive.current) setCurrent(next); await refresh();
              }))}>Clone template</Button>
              <Button variant="outline" disabled={!canEdit || !report.version || !permitted('delete')} onClick={() => setConfirm({ title: 'Delete shared template?', msg: 'This removes the template from the catalog and preserves its audit history.', onConfirm: () => run(async () => {
                await sharedReportsApi.delete(report); if (alive.current) setCurrent(null); await refresh();
              }) })}>Delete template</Button>
              <Button variant="outline" disabled={!report.version || dirty} onClick={() => run(async () => { const entries = await sharedReportsApi.history(report.id); if (alive.current) setHistory(entries); })}>History</Button>
            </>}
          </HStack>
        </fieldset>
        {busy && <p role="status">Loading shared report…</p>}
        {history.length > 0 && <VStack gap={2} className="print:hidden">{history.map(entry => <HStack key={entry.Version} gap={3} wrap="wrap">
          <Text>v{entry.Version} · {entry.ChangeType} · {entry.ChangedBy} · {entry.ChangedAt}</Text>
          <Button variant="outline" disabled={busy || !canEdit || dirty} onClick={() => setConfirm({ title: `Restore version ${entry.Version}?`, msg: 'The current access list will be preserved.', onConfirm: () => run(async () => {
            const next = await sharedReportsApi.restore(report, entry.Version); if (alive.current) setCurrent(next); await refresh();
          }) })}>Restore version</Button>
        </HStack>)}</VStack>}
        {report && <>
          <fieldset disabled={busy} className="min-w-0 print:hidden"><HStack gap={3} wrap="wrap">
            <Button variant="outline" aria-pressed={tab === 'setup'} onClick={() => setTab('setup')}>Setup</Button>
            <Label className="grid gap-1">Year<Input className="w-24" type="number" min="1" max="9999" value={filters.year} onChange={e => { setFilters({ ...filters, year: Number(e.target.value) }); setResult(null); }} /></Label>
            <Label className="grid gap-1">Period<Input className="w-20" type="number" min="1" max="12" value={filters.period} onChange={e => { setFilters({ ...filters, period: Number(e.target.value) }); setResult(null); }} /></Label>
            <Label className="grid gap-1">Budget revision<Input className="w-24" type="number" min="0" max="4" value={filters.revision} onChange={e => { setFilters({ ...filters, revision: Number(e.target.value) }); setResult(null); }} /></Label>
            <Label className="grid gap-1">Day<Input className="w-20" type="number" min="1" max="31" value={filters.day} onChange={e => { setFilters({ ...filters, day: e.target.value }); setResult(null); }} /></Label>
            <Button disabled={!report.version || dirty} onClick={calculate}>Preview report</Button>
            {result?.response.isComplete && <><Button variant="outline" onClick={() => setTab('table')}>Table</Button><Button variant="outline" onClick={() => setTab('dashboard')}>Dashboard</Button>
              <Button variant="outline" onClick={exportExcel}>Excel</Button><Button variant="outline" onClick={() => window.print()}>Print</Button></>}
          </HStack></fieldset>
          {result && <Text role="status">{result.response.isComplete ? 'Complete' : 'Incomplete'} · {names} · {result.response.currency} · Configuration v{report.version}</Text>}
          {result && !result.response.isComplete && <p role="alert">No consolidated output is shown. Missing business units: {result.response.warnings.map(w => w.tenant).join(', ')}</p>}
          {tab === 'setup' && <fieldset disabled={busy || !canEdit} className="min-w-0 print:hidden"><VStack gap={4}>
            <HStack gap={3} wrap="wrap"><Label>Template name<Input value={report.name} onChange={e => update({ ...report, name: e.target.value })} /></Label>
              <MultiSelectDropdown label="Participating BUs" showAllLabel={false} options={units.map(u => ({ id: u.id, display: u.name }))} selected={report.tenants}
                onChange={tenants => { update({ ...report, tenants, compatibilityConfirmed: false }); setTenant(tenants[0] || ''); }} />
              <Label>Mapping BU<Select value={tenant} onValueChange={setTenant}><SelectTrigger><SelectValue placeholder="Choose BU" /></SelectTrigger><SelectContent>{report.tenants.map(id => <SelectItem key={id} value={id}>{units.find(u => u.id === id)?.name || id}</SelectItem>)}</SelectContent></Select></Label>
            </HStack>
            <Label className="items-start whitespace-normal"><Checkbox checked={report.compatibilityConfirmed === true} onCheckedChange={value => update({ ...report, compatibilityConfirmed: value === true })} /> I confirm the selected BUs use equivalent budget scenarios and the configured signs.</Label>
            {mappingWarnings.length > 0 && <Text>Possible overlaps: {mappingWarnings.join('; ')}</Text>}
            <Label className="items-start whitespace-normal"><Checkbox checked={report.overlapConfirmed === true} onCheckedChange={value => update({ ...report, overlapConfirmed: value === true })} /> Reusing the same source amounts in multiple data rows is intentional.</Label>
            {!mappingReady && <p role="status">Choose a mapping BU and wait for its lookup data.</p>}
            <RowsConfigurator activeReport={mappedReport} masterData={master} handleAddRow={addRow}
              handleDuplicateRow={id => { const row = report.rows.find(r => r.id === id); const newId = crypto.randomUUID(); update({ ...report, rows: [...report.rows, { ...row, id: newId }], mappings: Object.fromEntries(Object.entries(report.mappings).map(([bu, maps]) => [bu, { ...maps, ...(maps[id] ? { [newId]: { ...maps[id] } } : {}) }])) }); }}
              handleUpdateRow={(id, key, value) => updateRow(id, { [key]: value })} handleUpdateRowMulti={updateRow}
              moveRow={(index, direction) => update(moveRowsAndRewriteReferences(report, index, direction))}
              handleDeleteRow={id => { const next = deleteRowAndRewriteReferences(report, id); next.mappings = Object.fromEntries(Object.entries(report.mappings).map(([bu, maps]) => [bu, Object.fromEntries(Object.entries(maps).filter(([key]) => key !== id))])); update(next); }}
              setEditingRow={row => { if (mappingReady) setEditingRow({ ...row, ...report.mappings?.[tenant]?.[row.id] }); else setError('Wait for the selected BU lookup data.'); }} setConfirmAction={setConfirm} />
            <Heading level={3}>Mapping status · {tenant}</Heading>
            <Text>Group selections expand to explicit codes when applied. Reapply mappings after group membership changes.</Text>
            {report.rows.filter(row => !row.isHeader && !row.isTotal).map(row => <HStack key={row.id} gap={3} wrap="wrap">
              <Text>{row.desc}: {report.mappings?.[tenant]?.[row.id]?.notApplicable ? 'Not applicable' : report.mappings?.[tenant]?.[row.id]?.accCodes ? 'Mapped' : 'Mapping required'}</Text>
              <Label><Checkbox disabled={!tenant} checked={report.mappings?.[tenant]?.[row.id]?.notApplicable === true} onCheckedChange={value => update({ ...report, compatibilityConfirmed: false,
                mappings: { ...report.mappings, [tenant]: { ...report.mappings?.[tenant], [row.id]: { ...report.mappings?.[tenant]?.[row.id], notApplicable: value === true } } } })} />Not applicable in this BU</Label>
              <Label>Sign<Select value={String(report.mappings?.[tenant]?.[row.id]?.sign ?? 1)} onValueChange={value => update({ ...report, compatibilityConfirmed: false, mappings: { ...report.mappings, [tenant]: { ...report.mappings?.[tenant], [row.id]: { ...report.mappings?.[tenant]?.[row.id], sign: Number(value) } } } })}>
                <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Keep source sign</SelectItem><SelectItem value="-1">Reverse source sign</SelectItem></SelectContent></Select></Label>
            </HStack>)}
            <ColumnsConfigurator activeReport={report} reportOptions={options} handleAddCol={addCol}
              handleDuplicateCol={id => update({ ...report, columns: [...report.columns, { ...report.columns.find(c => c.id === id), id: crypto.randomUUID() }] })}
              handleUpdateCol={(id, key, value) => update({ ...report, columns: report.columns.map(c => c.id === id ? { ...c, [key]: value } : c) })}
              updateActiveReport={update} handleDeleteCol={id => update(deleteColAndRewriteReferences(report, id))} setConfirmAction={setConfirm} />
            {report.columns.filter(col => !col.isFormula && !col.isPercent).map(col => <Label key={col.id}>{col.label} source<Select value={col.sourceTenant || 'ALL'} onValueChange={value => update({ ...report, columns: report.columns.map(c => c.id === col.id ? { ...c, sourceTenant: value } : c) })}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Combined participating BUs</SelectItem>{report.tenants.map(id => <SelectItem key={id} value={id}>{units.find(u => u.id === id)?.name || id}</SelectItem>)}</SelectContent></Select></Label>)}
            <Heading level={3}>Dashboard KPIs</Heading>
            <HStack gap={3} wrap="wrap"><Label>KPI row<Select value={kpiRow} onValueChange={setKpiRow}><SelectTrigger><SelectValue placeholder="Choose row" /></SelectTrigger><SelectContent>{report.rows.filter(r => !r.isHeader).map(r => <SelectItem key={r.id} value={r.id}>{r.desc || r.id}</SelectItem>)}</SelectContent></Select></Label>
              <Label>KPI column<Select value={kpiCol} onValueChange={setKpiCol}><SelectTrigger><SelectValue placeholder="Choose column" /></SelectTrigger><SelectContent>{report.columns.map(c => <SelectItem key={c.id} value={c.id}>{c.label || c.id}</SelectItem>)}</SelectContent></Select></Label>
              <Button disabled={!report.rows.some(r => r.id === kpiRow && !r.isHeader) || !report.columns.some(c => c.id === kpiCol)} onClick={() => update({ ...report, kpis: [...(report.kpis || []), { id: crypto.randomUUID(), rowId: kpiRow, columnId: kpiCol }] })}>Add KPI</Button>
            </HStack>
            {(report.kpis || []).map(kpi => <HStack key={kpi.id} gap={3}><Text>{report.rows.find(r => r.id === kpi.rowId)?.desc || 'Missing row'} / {report.columns.find(c => c.id === kpi.columnId)?.label || 'Missing column'}</Text>
              <Button variant="outline" onClick={() => update({ ...report, kpis: report.kpis.filter(item => item.id !== kpi.id) })}>Remove KPI</Button></HStack>)}
            {(!report.version || report.owner?.toLowerCase() === username?.toLowerCase()) && <>
              <Label>Viewers (usernames separated by commas)<Input value={report.access?.filter(a => !a.canEdit).map(a => a.userName).join(', ') || ''} onChange={e => update({ ...report, access: [...(report.access || []).filter(a => a.canEdit), ...e.target.value.split(',').map(name => name.trim()).filter(Boolean).map(userName => ({ userName, canView: true, canEdit: false }))] })} /></Label>
              <Label>Editors (usernames separated by commas)<Input value={report.access?.filter(a => a.canEdit).map(a => a.userName).join(', ') || ''} onChange={e => update({ ...report, access: [...(report.access || []).filter(a => !a.canEdit), ...e.target.value.split(',').map(name => name.trim()).filter(Boolean).map(userName => ({ userName, canView: true, canEdit: true }))] })} /></Label>
            </>}
          </VStack></fieldset>}
          {result?.response.isComplete && tab === 'table' && <ReportView {...viewProps} currentTheme={THEMES[report.theme] || THEMES.blue} tableZoom={100} getIndentClass={getIndentClass} onViewModeChange={setTab} />}
          {result?.response.isComplete && tab === 'dashboard' && <>
            <HStack gap={4} wrap="wrap">{(report.kpis || []).map(kpi => {
              const row = result.rows.find(r => r.id === kpi.rowId); const col = report.columns.find(c => c.id === kpi.columnId);
              return <VStack key={kpi.id} gap={1} padding={3} className="rounded-lg border border-border bg-card"><Text>{row?.desc} / {col?.label}</Text><Heading level={3} type="display-3">{row && col ? formatReportCell(row, col) : 'Unavailable'}</Heading></VStack>;
            })}</HStack>
            <ReportDashboard {...viewProps} departmentContext="Per-BU mappings" viewMode="dashboard" onViewModeChange={setTab} />
          </>}
          {result && <VStack gap={2} className="print:hidden"><Heading level={3}>Source breakdown</Heading>{report.tenants.map(id => <VStack key={id} gap={1}>
            <Text>{units.find(u => u.id === id)?.name || id}</Text>{result.byTenant[id] ? report.rows.filter(r => !r.isHeader && !r.isTotal).map(row => <Text key={row.id}>{row.desc}: {report.columns.filter(c => !c.isFormula && !c.isPercent && (c.sourceTenant === 'ALL' || c.sourceTenant === id)).map(c => `${c.label} ${formatReportCell({ ...row, results: result.byTenant[id][row.id] }, c)}`).join(' · ')}</Text>) : <Text>Unavailable</Text>}
          </VStack>)}</VStack>}
        </>}
      </VStack>}
      <EditMappingModal isOpen={Boolean(editingRow)} editingRow={editingRow} setEditingRow={setEditingRow} masterData={master} reportOptions={options}
        dimensionOptions={dimensions.values || dimensions.dimensionOptions || dimensions} dimensionDefinitions={dimensions.definitions || []} modalAccCategory={category} setModalAccCategory={setCategory}
        onOpenDetailSelector={setDetail} onApply={applyMapping} onClose={() => setEditingRow(null)} />
      {detail && <DetailSelectorModal title={detail.title} subTitle={detail.subTitle} availableItems={detail.items} selectedItems={String(editingRow?.[detail.field] || '').split(',').filter(Boolean)}
        masterData={master} onSave={items => { setEditingRow({ ...editingRow, [detail.field]: items.join(',') }); setDetail(null); }} onCancel={() => setDetail(null)} />}
      <AlertDialog open={Boolean(confirm)} onOpenChange={open => { if (!open) setConfirm(null); }}><AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{confirm?.title}</AlertDialogTitle><AlertDialogDescription>{confirm?.msg}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { const action = confirm?.onConfirm; setConfirm(null); action?.(); }}>Confirm</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent></AlertDialog>
  </VStack>;
}
