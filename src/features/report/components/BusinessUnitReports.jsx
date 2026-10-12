import { useTranslation } from "@/lib/i18n.js";
import React, { useState } from 'react';
import { Accordion } from 'radix-ui';
import { ChevronDown, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input.jsx';
import usePersistentState from '@/hooks/usePersistentState.js';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog.jsx';
import MultiSelectDropdown from './MultiSelectDropdown.jsx';
import { reportKey } from '../hooks/useBusinessUnitReports.js';

const normalizeTenant = (value) => String(value).trim().toLowerCase();
export function BusinessUnitSelector({ catalog, onChange }) {
  const t = useTranslation();
  return <fieldset disabled={catalog.loading}>
    <MultiSelectDropdown options={catalog.units.map((unit) => ({ ...unit, display: unit.name || unit.id }))} selected={catalog.selected} onChange={onChange} label="BU" showAllLabel={false}
      normalizeValue={normalizeTenant} searchPlaceholder={t("Search business units...")} emptyLabel={t("Select BUs")} noDataLabel={t("No authorized business units")} />
  </fieldset>;
}

export function BusinessUnitReportList({ catalog, reports, currentKey, onSelect, storageKey = 'carmen_report_navigation' }) {
  const t = useTranslation();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = usePersistentState(storageKey, {});
  const preferences = expanded && typeof expanded === 'object' && !Array.isArray(expanded) ? expanded : {};
  const query = search.trim().toLocaleLowerCase();
  const activeTenant = reports.find((report) => reportKey(report) === currentKey)?.tenant || catalog.selected[0];
  const groups = catalog.selected.map((tenant) => {
    const unit = catalog.units.find((item) => item.id === tenant);
    const allItems = reports.filter((report) => report.tenant === tenant);
    const items = query ? allItems.filter((report) => String(report.name || '').toLocaleLowerCase().includes(query)) : allItems;
    return { tenant, name: unit?.name || tenant, allItems, items, status: catalog.statuses[tenant] };
  }).filter((group) => !query || group.items.length || group.status?.loading || group.status?.error);
  const open = groups.filter(({ tenant }) => query || (preferences[tenant] ?? tenant === activeTenant)).map(({ tenant }) => tenant);
  return <>
    <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
      placeholder={t('Search reports...')} aria-label={t('Search reports...')} className="h-8 text-xs" />
    {catalog.error && <p role="alert" className="px-2 py-3 text-sm text-destructive">{catalog.error}</p>}
    {catalog.loading && <p role="status" className="px-2 py-3 text-sm text-muted-foreground">{t("Loading business units…")}</p>}
    {!catalog.loading && !catalog.error && !catalog.selected.length && <p className="px-2 py-3 text-sm text-muted-foreground">{t("Select business units to browse reports.")}</p>}
    {query && catalog.selected.length > 0 && !catalog.loading && !catalog.error && !groups.length &&
      <p role="status" className="px-2 py-3 text-xs text-muted-foreground">{t('No matching reports.')}</p>}
    <Accordion.Root type="multiple" value={open} onValueChange={(values) => {
      if (query) return;
      setExpanded({ ...preferences, ...Object.fromEntries(catalog.selected.map((tenant) => [tenant, values.includes(tenant)])) });
    }}>
    {groups.map(({ tenant, name, allItems, items, status }) => (
      <Accordion.Item key={tenant} value={tenant} className="py-1">
        <Accordion.Header>
          <Accordion.Trigger asChild>
            <Button variant="ghost" disabled={Boolean(query)} aria-label={`${name} (${query ? items.length + '/' : ''}${allItems.length})`} className="group w-full justify-start gap-2 border border-border bg-muted px-2 text-xs font-semibold text-foreground hover:bg-accent">
              <ChevronDown className="size-3.5 shrink-0 -rotate-90 group-data-[state=open]:rotate-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-left">{name}</span>{' '}
              <span className="shrink-0 tabular-nums">{query ? `(${items.length}/${allItems.length})` : `(${allItems.length})`}</span>
            </Button>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content asChild aria-labelledby={undefined}>
        <section aria-label={`Reports in ${tenant}`} className="space-y-1 pt-1">
        {status?.loading && <p role="status" className="px-2 text-xs text-muted-foreground">{t("Loading reports…")}</p>}
        {status?.error && <p role="alert" className="px-2 text-xs text-destructive">{status.error}</p>}
        {!status?.loading && !status?.error && !items.length && <p className="px-2 text-xs text-muted-foreground">{t("No reports available.")}</p>}
        {items.map((report) => <Button key={reportKey(report)} variant="ghost"
          className="w-full justify-start overflow-hidden aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground aria-[current=page]:hover:bg-primary aria-[current=page]:hover:text-primary-foreground" aria-current={currentKey === reportKey(report) ? 'page' : undefined}
          onClick={() => onSelect(reportKey(report))}><FileText className="size-4 shrink-0" /><span className="min-w-0 truncate">{report.name}</span></Button>)}
        </section>
        </Accordion.Content>
      </Accordion.Item>
    ))}
    </Accordion.Root>
  </>;
}

export function BusinessUnitTargetDialog({ open, units, onSelect, onClose }) {
  const t = useTranslation();
  return <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
    <DialogContent><DialogHeader><DialogTitle>{t("Create report in business unit")}</DialogTitle>
      <DialogDescription>{t("Choose one destination. This report will be stored only in that business unit.")}</DialogDescription></DialogHeader>
      {units.map((unit) => <Button key={unit.id} variant="outline" onClick={() => onSelect(unit.id)}>{unit.name} · {unit.id}</Button>)}
      {!units.length && <p>{t("No selected business unit allows report creation.")}</p>}
    </DialogContent>
  </Dialog>;
}
