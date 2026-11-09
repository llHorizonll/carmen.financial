import React, { useState } from 'react';
import { Collapsible } from 'radix-ui';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { useTranslation } from '@/lib/i18n.js';

export function ReportFilterGrid({ as: Element = 'section', daily, budget, ...props }) {
  const trailingColumns = daily && budget ? '[--report-filter-tail:120px_88px_96px]'
    : daily ? '[--report-filter-tail:120px_96px]'
    : budget ? '[--report-filter-tail:88px_96px]' : '[--report-filter-tail:96px]';
  return <Element className={`grid gap-2 sm:grid-cols-2 sm:items-end md:grid-cols-3 lg:grid-cols-[minmax(0,1fr)_6rem_minmax(14rem,1.4fr)_auto] xl:grid-cols-[180px_110px_240px_var(--report-filter-tail)] ${trailingColumns}`} {...props} />;
}

export function ReportPeriodFilter({ id, value, options, onValueChange }) {
  const t = useTranslation();
  return <section className="flex min-w-0 flex-col gap-1">
    <Label htmlFor={id} className="block text-xs font-medium text-muted-foreground">{t('Period')}</Label>
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className="h-9 w-full min-w-0 border-border bg-background text-sm text-foreground transition-colors duration-150 hover:bg-muted">
        <SelectValue placeholder={t('Period')} />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map(option => <SelectItem key={option.id} value={String(option.id)}>{t(option.label)}</SelectItem>)}
      </SelectContent>
    </Select>
  </section>;
}

export default function ReportFiltersPanel({ isMobile, summary, pending, children }) {
  const t = useTranslation();
  const [expanded, setExpanded] = useState(false);
  return <section aria-label={t('Report filters')} data-tour="report-filters" className="rounded-lg border border-border bg-muted/30 py-2 data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary">
    <Collapsible.Root open={!isMobile || expanded} onOpenChange={setExpanded}>
      <section className="flex items-center justify-between gap-3 px-3 pb-2 lg:hidden">
        <p className="min-w-0 text-xs text-muted-foreground" aria-live="polite">{summary}</p>
        <Collapsible.Trigger asChild>
          <Button type="button" size="sm" variant="outline"><SlidersHorizontal />{t('Filters')}<ChevronDown /></Button>
        </Collapsible.Trigger>
      </section>
      {pending && <p role="status" className="px-3 pb-2 text-xs font-medium text-warning-content">{t('Filters changed. Select Apply to update the report.')}</p>}
      <Collapsible.Content><section className="px-3">{children}</section></Collapsible.Content>
    </Collapsible.Root>
  </section>;
}
