import React, { useEffect, useState } from 'react';
import { Collapsible } from 'radix-ui';
import { Building2, ChevronRight, FilePlus, FolderTree, Layers, Search, X } from 'lucide-react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { useTranslation } from '@/lib/i18n.js';
import { cn } from '@/lib/utils.js';
import ReportGroupNavigation, { getReportGroup } from '../../report/components/ReportGroupNavigation.jsx';
import { fetchCarmenReports } from '../../report/lib/reportApi.js';

export function ConsolidationReportTree({ profile, units, currentKey, onSelect, onMoveReport, moveDisabledReason, storageKey = 'carmen_report_navigation' }) {
  const t = useTranslation();
  const [catalog, setCatalog] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [openUnits, setOpenUnits] = useState({});
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const tenants = [profile.tenant, ...profile.memberTenants].filter((id) => unitById.get(id)?.permission?.view);
  const tenantKey = JSON.stringify(tenants);
  const query = searchQuery.trim().toLowerCase();
  const hasMatches = (tenant) => catalog[tenant]?.reports?.some((report) =>
    `${report.name || ''}`.toLowerCase().includes(query) || getReportGroup(report).toLowerCase().includes(query));
  const visibleTenants = tenants.filter((tenant) => !query || catalog[tenant]?.loading || catalog[tenant]?.error || hasMatches(tenant));
  const noMatches = query && !tenants.some((tenant) => catalog[tenant]?.loading || catalog[tenant]?.error || hasMatches(tenant));
  useEffect(() => {
    let cancelled = false;
    const requested = JSON.parse(tenantKey);
    setCatalog(Object.fromEntries(requested.map((tenant) => [tenant, { loading: true }])));
    void (async () => {
      for (let start = 0; start < requested.length; start += 2) {
        const batch = requested.slice(start, start + 2);
        const results = await Promise.allSettled(batch.map((tenant) => fetchCarmenReports({ tenant })));
        if (cancelled) return;
        setCatalog((previous) => ({ ...previous, ...Object.fromEntries(results.map((result, index) => [batch[index],
          result.status === 'fulfilled' ? { reports: result.value.map((report) => ({ ...report, tenant: batch[index] })) }
            : { error: result.reason?.message || 'Unable to load reports.' }])) }));
      }
    })();
    return () => { cancelled = true; };
  }, [tenantKey, profile.revision]);
  const moveReport = async (report, reportGroup) => {
    const saved = await onMoveReport(report, reportGroup);
    const next = saved || { ...report, reportGroup };
    setCatalog((previous) => ({ ...previous, [report.tenant]: { ...previous[report.tenant],
      reports: previous[report.tenant]?.reports?.map((item) => item.id === report.id ? next : item) } }));
  };
  return <VStack gap={1} as="nav" aria-label={t('Configured business unit reports')}>
    <HStack className="relative mb-2 items-center">
      <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
      <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)}
        aria-label={t('Search reports...')} placeholder={t('Search reports...')} className="h-9 bg-background pr-8 pl-8 text-sm" />
      {searchQuery && <Button variant="ghost" size="icon" onClick={() => setSearchQuery('')}
        aria-label={t('Clear search')} className="absolute right-1 size-7 text-muted-foreground"><X className="size-4" /></Button>}
    </HStack>
    {tenants.map((tenant) => <Collapsible.Root key={tenant} hidden={!visibleTenants.includes(tenant)}
      open={Boolean(query) || (openUnits[tenant] ?? tenant === profile.tenant)}
      onOpenChange={(open) => setOpenUnits((previous) => ({ ...previous, [tenant]: open }))}>
      <Collapsible.Trigger asChild><Button variant="ghost" className="group w-full justify-start gap-2 bg-sidebar-accent/50 px-2 text-xs font-semibold hover:bg-sidebar-accent">
        <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground group-data-[state=open]:rotate-90" /><Building2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <p className="min-w-0 truncate">{unitById.get(tenant)?.name || tenant}{tenant === profile.tenant ? ' · HQ' : ''}</p>
      </Button></Collapsible.Trigger>
      <Collapsible.Content forceMount className="ml-3 border-l border-border pl-2 data-[state=closed]:hidden">
        {catalog[tenant]?.loading && <p role="status" className="px-3 text-xs text-muted-foreground">{t('Loading reports…')}</p>}
        {catalog[tenant]?.error && <p role="alert" className="px-3 text-xs text-destructive">{catalog[tenant].error}</p>}
        {catalog[tenant]?.reports?.length === 0 && <p className="px-3 text-xs text-muted-foreground">{t('No reports available.')}</p>}
        {catalog[tenant]?.reports && <ReportGroupNavigation storageKey={`${storageKey}:${tenant}:groups`} reports={catalog[tenant].reports}
          searchQuery={searchQuery} moveDisabledReason={moveDisabledReason}
          onMoveReport={onMoveReport && !moveDisabledReason && unitById.get(tenant)?.permission?.setup ? moveReport : undefined}
          currentKey={currentKey} onSelect={(key) => {
            const report = catalog[tenant]?.reports?.find((item) => JSON.stringify([tenant, item.id]) === key);
            if (report) onSelect(report);
          }} />}
      </Collapsible.Content>
    </Collapsible.Root>)}
    {noMatches && <p className="px-2 py-3 text-xs text-muted-foreground">{t('No matching reports.')}</p>}
  </VStack>;
}

export default function ConsolidationNavigation({ state, onEnter }) {
  const t = useTranslation();
  return <VStack gap={1} as="section" aria-label={t('Consolidation Reports')} className="mt-4 border-t border-border pt-3">
    <p className="px-2 text-xs font-medium text-muted-foreground">{t('Consolidation Reports')}</p>
    <Button size="sm" variant="ghost" className="justify-start" onClick={() => onEnter(state.openNewTemplate)} disabled={state.busy}>
      <FilePlus className="size-4" />{t('New Consolidate Report')}
    </Button>
    <Button size="sm" variant="ghost" aria-current={state.active && !state.openingTemplate && !state.profileOpen && state.mode === 'mapping' ? 'page' : undefined}
      className={cn('justify-start', state.active && !state.openingTemplate && !state.profileOpen && state.mode === 'mapping' && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground')}
      onClick={() => onEnter(state.openMapping)} disabled={state.busy}>
      <FolderTree className="size-4" />{t('Mapping')}
    </Button>
    {state.templates.map((report) => <Button key={report.id} variant="ghost" size="sm"
      aria-current={state.active && !state.openingTemplate && state.mode === 'template' && state.template?.id === report.id ? 'page' : undefined}
      className={cn('justify-start', state.active && !state.openingTemplate && state.mode === 'template' && state.template?.id === report.id && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground')}
      disabled={state.busy} onClick={() => onEnter(() => state.openTemplate(report))}>
      <Layers className="size-4 shrink-0" /><p className="truncate">{report.name}</p>
    </Button>)}
    {state.templateError && <p role="alert" className="px-2 text-xs text-destructive">{state.templateError}</p>}
    {state.navigationActive && !state.active && <Button size="sm" variant="ghost" className="justify-start"
      onClick={() => state.leave()} disabled={state.busy}>{t('Back')}</Button>}
  </VStack>;
}
