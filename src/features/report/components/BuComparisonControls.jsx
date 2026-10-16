import React from 'react';
import { HStack } from '@astryxdesign/core/HStack';
import { Button } from '@/components/ui/button.jsx';
import MultiSelectDropdown from './MultiSelectDropdown.jsx';
import { getBuReadiness, normalizeTenant } from '../lib/buComparison.js';
import { useTranslation } from '@/lib/i18n.js';

export default function BuComparisonControls({ comparison, report, departments, onDepartmentsChange }) {
  const t = useTranslation();
  const selectedTenants = new Set(comparison.selected.map(normalizeTenant));
  return <HStack gap={3} wrap="wrap" className="mb-3 border-b border-border pb-3 print:hidden">
    <section className="w-full min-w-0 sm:w-64">
      <MultiSelectDropdown label="BU" ariaLabel="Business units to compare" testIdPrefix="comparison-bu" normalizeValue={normalizeTenant} showAllLabel={false}
        emptyLabel="Select business units" searchPlaceholder="Search business units..."
        options={comparison.available.map((unit) => ({ id: unit.id, display: `${unit.name} · ${getBuReadiness(report, unit.id, comparison.masters[unit.id]?.master) ? t('Ready') : t('Mapping review required')}` }))}
        selected={comparison.selected} onChange={(selected) => { comparison.setSelected(selected); onDepartmentsChange([]); }} />
    </section>
    {(comparison.selected.length > 1 || (comparison.selected.length === 1 && normalizeTenant(comparison.selected[0]) !== normalizeTenant(report.tenant))) && <section className="w-full min-w-0 sm:w-64">
      <MultiSelectDropdown label="DEPT" testIdPrefix="comparison-dept" normalizeValue={(value) => value} selected={departments} onChange={onDepartmentsChange}
        options={comparison.available.filter((unit) => selectedTenants.has(normalizeTenant(unit.id))).flatMap((unit) => (comparison.masters[unit.id]?.master?.depts || []).map((dept) => ({ id: JSON.stringify([unit.id, dept.id]), display: `${unit.name} / ${dept.id} — ${dept.name}` })))} />
    </section>}
    {comparison.selected.length > 1 && <Button type="button" size="sm" variant="outline" aria-pressed={comparison.includeTotal} onClick={() => comparison.setIncludeTotal(!comparison.includeTotal)}>
      {comparison.includeTotal ? t('Hide Total') : t('Show Total')}
    </Button>}
    <p className="text-xs text-muted-foreground">{t('Compare business units using the same report columns.')}</p>
    {comparison.error && <p role="alert" className="w-full text-sm text-destructive">{comparison.error}</p>}
  </HStack>;
}
