import React, { useState } from 'react';
import { Collapsible } from 'radix-ui';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { useTranslation } from '@/lib/i18n.js';

export default function ReportFiltersPanel({ isMobile, summary, pending, children }) {
  const t = useTranslation();
  const [expanded, setExpanded] = useState(false);
  return <Card data-tour="report-filters" className="border border-border bg-card/95 shadow-none ring-0 data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary">
    <Collapsible.Root open={!isMobile || expanded} onOpenChange={setExpanded}>
      <section className="flex items-center justify-between gap-3 px-3 pb-2 lg:hidden">
        <p className="min-w-0 text-xs text-muted-foreground" aria-live="polite">{summary}</p>
        <Collapsible.Trigger asChild>
          <Button type="button" size="sm" variant="outline"><SlidersHorizontal />{t('Filters')}<ChevronDown /></Button>
        </Collapsible.Trigger>
      </section>
      {pending && <p role="status" className="px-3 pb-2 text-xs font-medium text-amber-700 dark:text-amber-400">{t('Filters changed. Select Apply to update the report.')}</p>}
      <Collapsible.Content><CardContent className="p-3">{children}</CardContent></Collapsible.Content>
    </Collapsible.Root>
  </Card>;
}
