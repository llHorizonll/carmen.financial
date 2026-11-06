import React from 'react';
import { Button } from '@/components/ui/button.jsx';
import { useTranslation } from '@/lib/i18n.js';

export default function WorkspaceSwitcher({ consolidation, onReports, onConsolidation, disabled }) {
  const t = useTranslation();
  return <nav aria-label={t('Workspace')} className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
    <Button size="sm" variant="ghost" aria-pressed={!consolidation} disabled={disabled} className="min-w-0 flex-1 text-xs text-muted-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm" onClick={onReports}>{t('Reports')}</Button>
    <Button size="sm" variant="ghost" aria-pressed={consolidation} disabled={disabled} className="min-w-0 flex-1 text-xs text-muted-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm" onClick={onConsolidation}>{t('Consolidation')}</Button>
  </nav>;
}
