import React from 'react';
import { useTranslation } from '@/lib/i18n.js';

export default function MappingConflictPreview({ rows, targetName }) {
  const t = useTranslation();
  return <section aria-label={t('Mapping changes preview')} className="max-h-72 overflow-y-auto rounded-lg border border-border text-sm">
    <p className="border-b border-border bg-muted px-3 py-2 font-medium">{t('Move accounts to {name}', { name: targetName })}</p>
    <ul className="divide-y divide-border">
      {rows.map(({ row, reference, codes }) => <li key={row.id} className="space-y-1 px-3 py-3">
        <p className="font-medium">{reference} · {row.desc}</p>
        <p className="text-xs text-muted-foreground">{t('Department')}: {row.dept || row.deptGroup || t('All')} · {t('Dimensions')}: {row.dimensions?.length ? row.dimensions.map(d => `${d.key}: ${d.value}`).join(', ') : Array.from({ length: 10 }, (_, i) => row[`dim${i + 1}`] ? `DIM ${i + 1}: ${row[`dim${i + 1}`]}` : '').filter(Boolean).join(', ') || t('All')}</p>
        <p className="text-xs text-destructive">{t('Remove accounts')}: {codes.join(', ')}</p>
      </li>)}
    </ul>
    <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">{t('Other mappings stay unchanged. Changes remain a draft until saved.')}</p>
  </section>;
}
