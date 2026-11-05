import React, { useEffect, useState } from 'react';
import { Collapsible } from 'radix-ui';
import { ChevronDown } from 'lucide-react';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Button } from '@/components/ui/button.jsx';
import { useTranslation } from '@/lib/i18n.js';
import { fetchCarmenDimensions, fetchCarmenMasterData } from '../../report/lib/reportApi.js';
import { consolidationApi } from '../lib/consolidationApi.js';
import { getSourceOwners } from '../lib/mappingModel.js';

const countUnmapped = (items, mapped) => items.filter(item => !mapped.has(item.id)).length;

export default function TemplateMappingSummary({ profile, units = [], onOpenMapping }) {
  const t = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setData(null); setError('');
    (async () => {
      const mapping = await consolidationApi.getMappings(profile.tenant);
      if (mapping.profileRevision !== profile.revision) throw new Error('Profile changed. Reload the consolidation profile.');
      const results = [];
      for (let index = 0; index < (profile.memberTenants || []).length; index += 2) {
        const batch = profile.memberTenants.slice(index, index + 2);
        results.push(...await Promise.all(batch.map(async member => {
          const [master, dimensions] = await Promise.all([
            fetchCarmenMasterData({ tenant: member, year: new Date().getFullYear() }), fetchCarmenDimensions({ tenant: member }),
          ]);
          const accounts = (master.accCodes || []).filter(item => ['B', 'I', 'S'].includes(item.type));
          const departments = master.depts || [];
          const categories = dimensions.definitions || [];
          const mappedCategories = Object.values(mapping.dimensions?.[member] || {});
          const categoryOwners = new Set(mappedCategories.map(item => item.memberDimensionId).filter(Boolean));
          const subcodes = categories.flatMap(category => (category.values || []).map(code => ({ id: `${category.id || category.key}\u0000${code}` })));
          const mappedSubcodes = new Set();
          mappedCategories.forEach(category => Object.values(category.subcodes || {}).flat().forEach(value => {
            mappedSubcodes.add(`${category.memberDimensionId}\u0000${typeof value === 'string' ? value : value.code}`);
          }));
          return { member, accounts: countUnmapped(accounts, getSourceOwners(mapping, 'accounts', member)),
            departments: countUnmapped(departments, getSourceOwners(mapping, 'departments', member)),
            categories: countUnmapped(categories.map(item => ({ id: item.id || item.key })), categoryOwners),
            subcodes: countUnmapped(subcodes, mappedSubcodes) };
        })));
      }
      if (current) setData(results);
    })().catch(failure => { if (current) setError(failure.message || 'Unable to load mapping status.'); });
    return () => { current = false; };
  }, [profile.tenant, profile.revision, profile.memberTenants, attempt]);
  const name = id => units.find(unit => unit.id === id)?.name || id;
  const pending = data?.some(item => item.accounts || item.departments || item.categories || item.subcodes);
  return <Collapsible.Root asChild><VStack as="section" gap={0} aria-label={t('Profile mapping status')} className="mx-4 mt-3 -mb-2 rounded-lg border border-border bg-card text-card-foreground">
    <HStack gap={2} wrap="wrap" className="items-center justify-between px-3 py-2">
      <Collapsible.Trigger asChild><Button variant="ghost" size="sm" className="group min-w-0 justify-start gap-2 px-2">
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-data-[state=closed]:-rotate-90" />
        <span className="truncate">{t('Profile mapping status')}</span>
        <span className="text-xs font-normal text-muted-foreground">{data ? t(pending ? 'Unmapped codes' : 'No unmapped codes') : t(error ? 'Unavailable' : 'Loading…')}</span>
      </Button></Collapsible.Trigger>
      <Button size="sm" variant="outline" onClick={onOpenMapping}>{t(profile.canManage ? 'View / Edit Mapping' : 'View Mapping')}</Button>
    </HStack>
    {error && <HStack gap={2} wrap="wrap" className="px-3 pb-2"><p role="alert" className="text-sm text-destructive">{error}</p><Button size="sm" variant="outline" onClick={() => setAttempt(value => value + 1)}>{t('Retry')}</Button></HStack>}
    <Collapsible.Content asChild><VStack gap={2} className="border-t border-border px-4 py-3">
    <p className="text-sm text-muted-foreground">{t('Headquarters')}: {name(profile.tenant)}</p>
    <p className="text-xs text-muted-foreground">{t('Mapping is shared by all templates in this profile. Changes affect every template.')}</p>
    <p className="text-xs text-muted-foreground">{t('Counts compare member master codes with saved assignments; review Mapping for missing or invalid codes.')}</p>
    {!data && !error && <p role="status" className="text-sm text-muted-foreground">{t('Loading mapping status…')}</p>}
    {data?.map(item => <VStack key={item.member} gap={1} className="border-t border-border pt-2">
      <p className="text-sm font-medium">{name(item.member)}</p>
      <p className="text-xs text-muted-foreground">{t('Unmapped')} · {t('Accounts')}: {item.accounts} · {t('Departments')}: {item.departments} · {t('Dimension categories')}: {item.categories} · {t('Dimension codes')}: {item.subcodes}</p>
    </VStack>)}
    </VStack></Collapsible.Content>
  </VStack></Collapsible.Root>;
}
