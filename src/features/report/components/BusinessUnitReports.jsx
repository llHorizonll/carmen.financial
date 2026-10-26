import { useTranslation } from "@/lib/i18n.js";
import React from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog.jsx';
import ReportGroupNavigation from './ReportGroupNavigation.jsx';

export function BusinessUnitSelector({ catalog, onChange }) {
  const t = useTranslation();
  return <Select value={catalog.selected[0] || ''} onValueChange={(tenant) => onChange([tenant])} disabled={catalog.loading || !catalog.units.length}>
    <SelectTrigger aria-label="BU" className="w-32 min-w-0 shrink sm:w-48 [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:truncate" title={catalog.units.find((unit) => unit.id === catalog.selected[0])?.name}><SelectValue placeholder={t("BU")} /></SelectTrigger>
    <SelectContent>
      {catalog.units.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name || unit.id}</SelectItem>)}
    </SelectContent>
  </Select>;
}

export function BusinessUnitReportList({ catalog, reports, currentKey, onSelect, storageKey = "carmen_report_navigation", onMoveReport, moveDisabledReason }) {
  const t = useTranslation();
  const tenant = catalog.selected[0];
  const status = catalog.statuses[tenant];
  const items = reports.filter((report) => report.tenant === tenant);
  return <>
    {catalog.error && <p role="alert" className="px-2 py-3 text-sm text-destructive">{catalog.error}</p>}
    {catalog.loading && <p role="status" className="px-2 py-3 text-sm text-muted-foreground">{t("Loading business units…")}</p>}
    {tenant && <section aria-label={`Reports in ${tenant}`} className="space-y-1 pt-1">
      {status?.loading && <p role="status" className="px-2 text-xs text-muted-foreground">{t("Loading reports…")}</p>}
      {status?.error && <p role="alert" className="px-2 text-xs text-destructive">{status.error}</p>}
      {!catalog.loading && !catalog.error && !status?.loading && !status?.error && !items.length && <p className="px-2 text-xs text-muted-foreground">{t("No reports available.")}</p>}
      <ReportGroupNavigation key={`${storageKey}:${tenant}`} storageKey={`${storageKey}:${tenant}:groups`} reports={items} currentKey={currentKey} onSelect={onSelect} onMoveReport={onMoveReport} moveDisabledReason={moveDisabledReason} />
    </section>}
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
