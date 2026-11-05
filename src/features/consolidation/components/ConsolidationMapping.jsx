import React, { useEffect, useMemo, useState } from 'react';
import { HStack, VStack, StackItem } from '@astryxdesign/core/Stack';
import { Tabs } from 'radix-ui';
import { ArrowLeft, ArrowRight, Link2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { fetchCarmenMasterData, fetchCarmenDimensions } from '@/features/report/lib/reportApi.js';
import { useTranslation } from '@/lib/i18n.js';
import { consolidationApi } from '../lib/consolidationApi.js';
import { getMappedCodes, getSourceOwners, mergeMappedMaster, updateCodeMapping, updateDimensionCategory } from '../lib/mappingModel.js';

const dimensionItems = (data) => (data?.definitions || []).map((item) => ({ ...item, id: item.id || item.key, name: item.caption }));
const subcodeItems = (dimension) => (dimension?.values || []).map((code) => ({ id: code, name: code }));
const matches = (item, query) => `${item.id} ${item.name}`.toLowerCase().includes(query.trim().toLowerCase());
const hasSubcodes = (category) => Object.values(category?.subcodes || {}).some((codes) => codes.length > 0);

function MappingSelect({ label, value, options, onChange, disabled }) {
  return <VStack gap={1}>
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <Select value={value || '__none__'} onValueChange={(next) => onChange(next === '__none__' ? '' : next)} disabled={disabled}>
      <SelectTrigger aria-label={label} className="w-full bg-background text-foreground sm:min-w-48"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">—</SelectItem>
        {options.map((item) => <SelectItem key={item.id} value={item.id}>{item.name || item.id}</SelectItem>)}
      </SelectContent>
    </Select>
  </VStack>;
}

export default function ConsolidationMapping({ profile, units = [], onDirtyChange, onBusyChange, onSaved }) {
  const t = useTranslation();
  const [selectedMember, setSelectedMember] = useState('');
  const members = profile.memberTenants || [];
  const member = members.includes(selectedMember) ? selectedMember : members[0] || '';
  const [tab, setTab] = useState('accounts');
  const [search, setSearch] = useState('');
  const [unmappedOnly, setUnmappedOnly] = useState(false);
  const [dimensionId, setDimensionId] = useState('');
  const [document, setDocument] = useState(null);
  const [headquarters, setHeadquarters] = useState(null);
  const [memberMaster, setMemberMaster] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [memberError, setMemberError] = useState('');
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState(null);
  const [availableSearch, setAvailableSearch] = useState('');
  const [mappedSearch, setMappedSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const [categoryChange, setCategoryChange] = useState(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const dirty = Boolean(editor && JSON.stringify(editor.codes) !== JSON.stringify(editor.initialCodes));

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  useEffect(() => {
    let current = true;
    setDocument(null); setHeadquarters(null); setLoadError(''); setNotice(''); setEditor(null);
    setDimensionId(''); setCategoryChange(null); setDiscardOpen(false); setSaveError('');
    Promise.all([
      consolidationApi.getMappings(profile.tenant),
      fetchCarmenMasterData({ tenant: profile.tenant, year: new Date().getFullYear() }),
      fetchCarmenDimensions({ tenant: profile.tenant }),
    ]).then(([mappings, master, dimensions]) => {
      if (!current) return;
      if (mappings.profileRevision !== profile.revision) throw new Error('Profile changed. Reload the consolidation profile before mapping.');
      setDocument(mappings); setHeadquarters({ ...master, dimensions: dimensionItems(dimensions) });
    }).catch((error) => { if (current) setLoadError(error.message || 'Unable to load headquarters mapping data.'); });
    return () => { current = false; };
  }, [profile.tenant, profile.revision, reload]);

  useEffect(() => {
    let current = true;
    setMemberMaster(null); setMemberError('');
    if (!member) return undefined;
    Promise.all([
      fetchCarmenMasterData({ tenant: member, year: new Date().getFullYear() }),
      fetchCarmenDimensions({ tenant: member }),
    ]).then(([master, dimensions]) => {
      if (current) setMemberMaster({ ...master, dimensions: dimensionItems(dimensions) });
    }).catch((error) => { if (current) setMemberError(error.message || 'Unable to load member mapping data.'); });
    return () => { current = false; };
  }, [member, profile.tenant, profile.revision, reload]);

  const knownDimensions = headquarters?.dimensions || [];
  const headquartersDimensions = [...knownDimensions, ...Object.keys(document?.dimensions?.[member] || {})
    .filter((id) => !knownDimensions.some((item) => item.id === id))
    .map((id) => ({ id, name: `${id} — Missing from current headquarters master data`, caption: `${id} — Missing from current headquarters master data`, values: [], missing: true }))];
  const activeDimension = headquartersDimensions.find((item) => item.id === dimensionId);
  const category = document?.dimensions?.[member]?.[dimensionId];
  const allRows = tab === 'accounts' ? headquarters?.accCodes || []
    : tab === 'departments' ? headquarters?.depts || [] : subcodeItems(activeDimension);
  const storedTargets = tab === 'dimensions' ? category?.subcodes || {} : document?.[tab]?.[member] || {};
  const rows = useMemo(() => {
    const known = new Set(allRows.map((row) => row.id));
    return [...allRows, ...Object.keys(storedTargets).filter((code) => !known.has(code)).map((id) => ({ id, name: 'Missing from current headquarters master data', missing: true }))]
      .filter((row) => matches(row, search) && (!unmappedOnly || !(storedTargets[row.id]?.length > 0)));
  }, [allRows, storedTargets, search, unmappedOnly]);

  const persist = async (next) => {
    if (saving || !profile.canManage) return false;
    let savedSuccessfully = false;
    setSaving(true); setSaveError(''); setNotice('');
    onBusyChange?.(true); onDirtyChange?.(true);
    try {
      const saved = await consolidationApi.saveMappings(profile.tenant, { ...next, profileRevision: profile.revision });
      savedSuccessfully = true;
      setDocument(saved); setNotice('Mapping saved.'); onSaved?.(saved); return true;
    } catch (error) {
      setSaveError(error.message || 'Unable to save mappings. Your changes are still open.'); return false;
    } finally {
      setSaving(false); onBusyChange?.(false);
      onDirtyChange?.(!savedSuccessfully && (dirty || Boolean(categoryChange)));
    }
  };

  const changeCodes = (codes) => {
    setEditor({ ...editor, codes });
    onDirtyChange?.(JSON.stringify(codes) !== JSON.stringify(editor.initialCodes));
  };

  const openEditor = (target) => {
    const codes = getMappedCodes(document, tab, member, target.id, dimensionId);
    setEditor({ kind: tab, member, target, dimensionId, codes, initialCodes: structuredClone(codes) });
    setAvailableSearch(''); setMappedSearch(''); setSaveError('');
  };
  const requestClose = () => {
    if (saving) return;
    if (dirty) { setDiscardOpen(true); return; }
    setEditor(null); setSaveError(''); onDirtyChange?.(false);
  };
  const saveEditor = async () => {
    try {
      const next = updateCodeMapping(document, { ...editor, target: editor.target.id });
      if (await persist(next)) setEditor(null);
    } catch (error) { setSaveError(error.message); }
  };
  const changeCategory = async (id, nextId) => {
    setSaveError('');
    const old = document.dimensions?.[member]?.[id];
    if ((old?.memberDimensionId || '') === nextId) return;
    if (hasSubcodes(old)) { setCategoryChange({ id, nextId }); onDirtyChange?.(true); return; }
    try { await persist(updateDimensionCategory(document, member, id, nextId)); }
    catch (error) { setSaveError(error.message); }
  };

  const editorMaster = editor?.kind === 'accounts' ? memberMaster?.accCodes || []
    : editor?.kind === 'departments' ? memberMaster?.depts || []
      : subcodeItems(memberMaster?.dimensions.find((item) => item.id === document?.dimensions?.[member]?.[editor?.dimensionId]?.memberDimensionId));
  const eligible = editor?.kind === 'accounts'
    ? editorMaster.filter((item) => item.type === editor.target.type && ['B', 'I', 'S'].includes(item.type)) : editorMaster;
  const selectedCodes = new Set(editor?.codes.map((item) => item.code));
  const owners = editor ? getSourceOwners(document, editor.kind, member, editor.dimensionId) : new Map();
  const available = eligible.filter((item) => !selectedCodes.has(item.id) && matches(item, availableSearch));
  const mapped = editor ? mergeMappedMaster(editorMaster, editor.codes).filter((item) => matches(item, mappedSearch)) : [];
  const loading = !document || !headquarters || Boolean(member && !memberMaster);
  const canEdit = Boolean(profile.canManage) && !saving;
  const error = loadError || memberError;

  return <VStack as="section" gap={0} width="100%" className="min-w-0 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-none">
    <HStack gap={3} wrap="wrap" hAlign="between" vAlign="center" className="border-b border-border bg-card p-4">
      <VStack gap={1}>
        <h2 className="text-base font-semibold text-balance text-foreground">{t('Consolidation Mapping')}</h2>
        <p className="text-sm text-pretty text-muted-foreground">{t('Map member master data to headquarters standards. Account types must match.')}</p>
      </VStack>
      <Button variant="outline" size="sm" disabled={saving || Boolean(editor)} onClick={() => setReload((value) => value + 1)}><RefreshCw />{t('Reload mappings')}</Button>
    </HStack>
    <HStack gap={6} wrap="wrap" vAlign="end" className="border-b border-border bg-muted/20 p-4">
      <VStack gap={1}><p className="text-xs font-medium text-muted-foreground">{t('Headquarters BU')}</p><p className="text-sm font-semibold text-foreground">{headquarters?.companyProfile?.name || profile.tenant}</p></VStack>
      <MappingSelect label={t('Focus member')} value={member} options={members.map((id) => ({ id, name: units.find((unit) => unit.id === id)?.name || (id === member ? memberMaster?.companyProfile?.name : '') || id }))}
        onChange={(value) => { if (value) { setSelectedMember(value); setDimensionId(''); setSaveError(''); } }} disabled={saving || Boolean(editor)} />
    </HStack>
    {error ? <VStack gap={2} className="p-4"><p className="text-sm text-destructive">{error}</p><Button size="sm" variant="outline" onClick={() => setReload((value) => value + 1)}>{t('Retry')}</Button></VStack>
      : loading ? <p className="p-4 text-sm text-muted-foreground">{t('Loading mapping data…')}</p>
        : !member ? <p className="p-4 text-sm text-muted-foreground">{t('Select at least one member in Setup Profile to begin mapping.')}</p>
          : <Tabs.Root value={tab} onValueChange={(value) => { setTab(value); setSearch(''); setSaveError(''); }} className="min-w-0">
            <Tabs.List aria-label={t('Mapping type')} className="mx-4 mt-4 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/60 p-1">
              {[['accounts', 'Account Code'], ['departments', 'Department Code'], ['dimensions', 'Dimension']].map(([value, label]) => <Tabs.Trigger key={value} value={value} asChild>
                <Button variant="ghost" className="min-h-9 flex-1 rounded-md text-sm font-medium text-muted-foreground hover:bg-background hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t(label)}</Button>
              </Tabs.Trigger>)}
            </Tabs.List>
            <Tabs.Content value={tab} className="p-4">
              <VStack gap={4}>
                {tab === 'dimensions' && <>
                  <h3 className="text-base font-semibold text-balance text-foreground">{t('Step 1: Dimension Category ID Mapping')}</h3>
                  <p className="text-sm text-muted-foreground">{t('Dimension ID changes are saved when selected.')}</p>
                  <section className="overflow-hidden rounded-lg border border-border bg-background">
                  <Table className="text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3"><TableHeader className="bg-muted/80 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-foreground [&_th]:uppercase"><TableRow><TableHead>{t('HQ dimension ID')}</TableHead><TableHead>{t('Caption')}</TableHead><TableHead>{t('Member dimension ID')}</TableHead></TableRow></TableHeader>
                    <TableBody>{headquartersDimensions.map((dimension) => {
                      const mappedId = document.dimensions?.[member]?.[dimension.id]?.memberDimensionId || '';
                      const options = memberMaster.dimensions.some((item) => item.id === mappedId) || !mappedId ? memberMaster.dimensions
                        : [...memberMaster.dimensions, { id: mappedId, name: `${mappedId} — Missing from current master data` }];
                      return <TableRow key={dimension.id} className="border-border/60 even:bg-muted/20 hover:bg-muted/40"><TableCell className="font-mono font-semibold text-primary">{dimension.id}</TableCell><TableCell>{dimension.caption}</TableCell><TableCell>
                        <MappingSelect label={`${t('Member dimension for')} ${dimension.caption}`} value={mappedId} options={options}
                          onChange={(value) => void changeCategory(dimension.id, value)} disabled={!canEdit} />
                      </TableCell></TableRow>;
                    })}</TableBody>
                  </Table>
                  </section>
                  {headquartersDimensions.length === 0 && <p className="text-sm text-muted-foreground">{t('No active headquarters dimensions.')}</p>}
                  <h3 className="text-base font-semibold text-balance text-foreground">{t('Step 2: Sub-Code Mapping')}</h3>
                  <MappingSelect label={t('Headquarters dimension')} value={dimensionId} options={headquartersDimensions} onChange={setDimensionId} disabled={saving} />
                </>}
                {(tab !== 'dimensions' || category?.memberDimensionId) ? <>
                  <HStack gap={3} wrap="wrap" vAlign="center" hAlign="between">
                    <StackItem size="fill" className="sm:max-w-sm"><Input type="search" className="bg-background" aria-label={t('Search headquarters master data')} placeholder={t('Search code or description…')} value={search} onChange={(event) => setSearch(event.target.value)} /></StackItem>
                    <HStack gap={2} vAlign="center"><Checkbox id="consolidation-unmapped" checked={unmappedOnly} onCheckedChange={(checked) => setUnmappedOnly(checked === true)} /><Label htmlFor="consolidation-unmapped">{t('Show unmapped only')}</Label></HStack>
                  </HStack>
                  {tab === 'dimensions' && <p className="text-sm text-muted-foreground">{t('Member dimension ID')}: {category.memberDimensionId}</p>}
                  <section className="overflow-hidden rounded-lg border border-border bg-background [&_[data-slot=table-container]]:max-h-96 [&_[data-slot=table-container]]:overflow-auto">
                  <Table className="text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3"><TableHeader className="sticky top-0 z-10 bg-muted [&_th]:text-xs [&_th]:font-semibold [&_th]:text-foreground [&_th]:uppercase"><TableRow><TableHead>{t('HQ code')}</TableHead><TableHead>{t('Description')}</TableHead>{tab === 'accounts' && <><TableHead>{t('Account type')}</TableHead><TableHead>{t('Nature')}</TableHead></>}<TableHead>{t('Mapping status')}</TableHead><TableHead>{t('Action')}</TableHead></TableRow></TableHeader>
                    <TableBody>{rows.map((row) => <TableRow key={row.id} className="border-border/60 even:bg-muted/20 hover:bg-muted/40">
                      <TableCell className="font-mono font-semibold text-primary tabular-nums">{row.id}</TableCell><TableCell>{row.name}</TableCell>
                      {tab === 'accounts' && <><TableCell>{row.sourceType || row.type}</TableCell><TableCell>{row.nature}</TableCell></>}
                      <TableCell><Badge variant={storedTargets[row.id]?.length ? 'secondary' : 'outline'} className="font-normal text-muted-foreground tabular-nums">{storedTargets[row.id]?.length ? `${storedTargets[row.id].length} ${t('Mapped')}` : t('Unmapped')}</Badge></TableCell>
                      <TableCell><Button size="sm" variant="outline" aria-label={`${t('Map codes for')} ${row.id}`} disabled={!canEdit || (tab === 'accounts' && !row.missing && !['B', 'I', 'S'].includes(row.type))} onClick={() => openEditor(row)}><Link2 />{t('Map Codes')}</Button></TableCell>
                    </TableRow>)}</TableBody>
                  </Table>
                  </section>
                  {rows.length === 0 && <p className="text-sm text-muted-foreground">{t('No matching headquarters codes.')}</p>}
                </> : <p className="text-sm text-muted-foreground">{t('Select a headquarters dimension and map its member dimension ID in Step 1 first.')}</p>}
              </VStack>
            </Tabs.Content>
          </Tabs.Root>}
    {!editor && saveError && <section role="alert" className="px-4 pb-4 text-sm text-destructive">{saveError}</section>}
    {notice && <section role="status" className="px-4 pb-4 text-sm text-muted-foreground">{t(notice)}</section>}

    <Dialog open={Boolean(editor)} onOpenChange={(open) => { if (!open) requestClose(); }}>
      <DialogContent className="flex max-h-dvh min-h-0 flex-col overflow-hidden border border-border bg-popover text-popover-foreground sm:max-w-5xl">
        <DialogHeader><DialogTitle className="text-base">{t('Map Codes')}: {editor?.target.id} — {editor?.target.name}</DialogTitle>
          <DialogDescription>{t('Focus member')}: {units.find((unit) => unit.id === editor?.member)?.name || memberMaster?.companyProfile?.name || editor?.member}. {t('Choose member codes to map to this headquarters code. Each member code can belong to one headquarters code.')}</DialogDescription>
        </DialogHeader>
        <section className="grid min-h-0 gap-4 overflow-y-auto md:grid-cols-2">
          <VStack as="section" gap={0} className="overflow-hidden rounded-xl border border-border bg-background">
            <h3 className="border-b border-border bg-muted/30 px-4 py-3 text-sm font-semibold text-balance text-foreground">{t('Available member codes')} · {units.find((unit) => unit.id === editor?.member)?.name || memberMaster?.companyProfile?.name || editor?.member} ({available.length})</h3>
            <section className="border-b border-border p-2"><Input type="search" aria-label={t('Search available codes')} value={availableSearch} onChange={(event) => setAvailableSearch(event.target.value)} /></section>
            <ul className="m-0 max-h-96 list-none overflow-y-auto p-0">
              {available.map((item) => <li key={item.id} className="border-b border-border p-3 last:border-0"><HStack gap={2} vAlign="center">
                <StackItem size="fill"><VStack gap={1}><p className="font-mono text-sm font-semibold text-primary">{item.id}</p><p className="text-sm text-muted-foreground">{item.name}</p>
                  {owners.has(item.id) && owners.get(item.id) !== editor.target.id && <p className="text-sm text-muted-foreground">{t('Mapped to')}: {owners.get(item.id)}</p>}
                </VStack></StackItem>
                <Button size="icon-sm" variant="outline" aria-label={`${t('Add')} ${item.id}`} disabled={saving || (owners.has(item.id) && owners.get(item.id) !== editor.target.id)}
                  onClick={() => changeCodes([...editor.codes, { code: item.id, ...(editor.kind === 'accounts' ? { reverseSign: false } : {}) }])}><ArrowRight /></Button>
              </HStack></li>)}
            </ul>
            {available.length === 0 && <p className="p-4 text-sm text-muted-foreground">{t('No available codes found.')}</p>}
          </VStack>
          <VStack as="section" gap={0} className="overflow-hidden rounded-xl border border-border bg-background">
            <h3 className="border-b border-border bg-muted/30 px-4 py-3 text-sm font-semibold text-balance text-foreground">{t('Mapped to headquarters')} ({editor?.codes.length || 0})</h3>
            <section className="border-b border-border p-2"><Input type="search" aria-label={t('Search mapped codes')} value={mappedSearch} onChange={(event) => setMappedSearch(event.target.value)} /></section>
            <ul className="m-0 max-h-96 list-none overflow-y-auto p-0">
              {mapped.map((item) => <li key={item.id} className="border-b border-border p-3 last:border-0"><HStack gap={2} vAlign="center">
                <StackItem size="fill"><VStack gap={2}><p className="font-mono text-sm font-semibold text-primary">{item.id}</p><p className="text-sm text-muted-foreground">{item.name}</p>
                  {editor.kind === 'accounts' && <><p className="text-sm text-muted-foreground">{item.sourceType || item.type} · {item.nature}</p>
                    <HStack gap={2} vAlign="center"><Checkbox aria-label={`${t('Reverse sign for')} ${item.id}`} checked={Boolean(item.reverseSign)} disabled={saving}
                      onCheckedChange={(checked) => changeCodes(editor.codes.map((code) => code.code === item.id ? { ...code, reverseSign: checked === true } : code))} /><p className="text-sm text-muted-foreground">{t('Reverse Sign')}</p></HStack>
                  </>}
                </VStack></StackItem>
                <Button size="icon-sm" variant="outline" aria-label={`${t('Remove')} ${item.id}`} disabled={saving} onClick={() => changeCodes(editor.codes.filter((code) => code.code !== item.id))}><ArrowLeft /></Button>
              </HStack></li>)}
            </ul>
            {mapped.length === 0 && <p className="p-4 text-sm text-muted-foreground">{t('No codes mapped yet.')}</p>}
          </VStack>
        </section>
        {saveError && <section role="alert" className="text-sm text-destructive">{saveError}</section>}
        <DialogFooter className="shrink-0"><Button size="sm" variant="outline" onClick={requestClose} disabled={saving}>{t('Cancel')}</Button><Button size="sm" onClick={() => void saveEditor()} disabled={saving || !dirty}>{t(saving ? 'Saving…' : 'Save Mapping')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={Boolean(categoryChange)} onOpenChange={(open) => { if (!open && !saving) { setCategoryChange(null); onDirtyChange?.(false); } }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('Change dimension category?')}</AlertDialogTitle><AlertDialogDescription>{t('Changing the member dimension ID clears its existing sub-code mappings. Other dimensions stay unchanged.')}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={saving}>{t('Cancel')}</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={(event) => {
          event.preventDefault();
          void (async () => {
            try { if (await persist(updateDimensionCategory(document, member, categoryChange.id, categoryChange.nextId))) setCategoryChange(null); }
            catch (error) { setSaveError(error.message); setCategoryChange(null); onDirtyChange?.(false); }
          })();
        }}>{t('Clear sub-code mappings and save')}</AlertDialogAction></AlertDialogFooter>
        {saveError && <section role="alert" className="text-sm text-destructive">{saveError}</section>}
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('Discard unsaved mapping changes?')}</AlertDialogTitle><AlertDialogDescription>{t('Changes since opening this mapping will be lost.')}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>{t('Keep editing')}</AlertDialogCancel><AlertDialogAction onClick={() => { setEditor(null); setSaveError(''); onDirtyChange?.(false); }}>{t('Discard changes')}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </VStack>;
}
