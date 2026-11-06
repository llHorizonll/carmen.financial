import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { useIsMobile } from '@/hooks/use-mobile.js';
import { useTranslation } from '@/lib/i18n.js';
import MultiSelectDropdown from '../../report/components/MultiSelectDropdown.jsx';
import ReportFiltersPanel, { ReportFilterGrid, ReportPeriodFilter } from '../../report/components/ReportFiltersPanel.jsx';
import ReportView from '../../report/components/ReportView.jsx';
import { fetchCarmenMasterData } from '../../report/lib/reportApi.js';
import { buildReportData, formatAutoPeriod, getIndentClass, THEMES } from '../../report/lib/reportLogic.js';
import { getReportData } from '../lib/consolidationApi.js';

const defaultPeriods = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, label: 'P' + (index + 1) }));
const normalizeTenant = value => String(value).trim().toLowerCase();

export default function ConsolidationReportView({ report, profile, units, zoom, onLoadingChange }) {
  const t = useTranslation();
  const isMobile = useIsMobile(1024);
  const options = [...new Set([profile.tenant, ...profile.memberTenants])].map(id => ({
    id, display: units.find(unit => unit.id === id)?.name || id,
  }));
  const [draft, setDraft] = useState(() => {
    const now = new Date();
    return { year: String(now.getFullYear()), period: String(now.getMonth() + 1), day: String(now.getDate()), tenants: options.map(option => option.id) };
  });
  const [applied, setApplied] = useState(draft);
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState('');
  const daily = report.columns.some(column => !column.isFormula && !column.isPercent && ['DAC', 'PTD', 'YTD'].includes(String(column.type).trim().toUpperCase()));
  const selected = applied.tenants;
  const requestKey = JSON.stringify([report.id, report.version, profile.tenant, profile.revision, applied, daily]);
  const result = loaded?.key === requestKey ? loaded.data : null;
  const isLoading = !result && !error;
  useLayoutEffect(() => { onLoadingChange?.(isLoading); }, [isLoading, onLoadingChange]);
  useEffect(() => {
    let current = true;
    setLoaded(null);
    setError('');
    Promise.all([
      fetchCarmenMasterData({ year: Number(applied.year), tenant: profile.tenant }),
      getReportData(report.id, { version: report.version, year: Number(applied.year), period: Number(applied.period), day: daily ? applied.day : '', tenants: applied.tenants }),
    ]).then(([masterData, data]) => {
      if (current) setLoaded({ key: requestKey, data: { ...data, masterData } });
    }).catch(failure => {
      if (current) setError(failure.message || 'Unable to load consolidated amounts.');
    });
    return () => { current = false; };
  }, [report.id, report.version, profile.tenant, applied, daily, requestKey]);

  const engineInputs = useMemo(() => result && ({
    activeReport: report, engineData: result.actualRows, budgetData: result.budgetRows,
    appliedDepts: [], appliedYear: applied.year, appliedPeriod: applied.period,
    appliedDay: daily ? applied.day : '', appliedRevision: '0',
    periodOptions: result.masterData.periods || [], masterData: result.masterData,
  }), [report, result, applied, daily]);
  const reportData = useMemo(() => engineInputs ? buildReportData(engineInputs) : [], [engineInputs]);
  const periods = result?.masterData.periods?.length && draft.year === applied.year
    ? defaultPeriods.map(period => result.masterData.periods.find(option => Number(option.id) === period.id) || period)
    : defaultPeriods;
  const validYear = /^\d{4}$/.test(draft.year) && Number(draft.year) >= 1900 && Number(draft.year) <= 9998;
  const validDay = !daily || /^\d{1,2}$/.test(draft.day) && Number(draft.day) >= 1 && Number(draft.day) <= 31;
  const canApply = validYear && validDay && draft.tenants.length > 0;
  const selectedPeriod = result?.masterData.periods?.find(option => String(option.id) === applied.period);
  const reportDate = daily ? new Date(selectedPeriod?.date || applied.year + '-' + applied.period.padStart(2, '0') + '-01') : null;
  if (reportDate) reportDate.setDate(Number(applied.day));
  const dateLabel = reportDate && !Number.isNaN(reportDate.getTime())
    ? reportDate.toLocaleDateString()
    : selectedPeriod?.dateLabel || formatAutoPeriod(applied.year, applied.period, 'end_of_month');
  const update = (key, value) => setDraft(previous => ({ ...previous, [key]: value }));

  return <section className="flex min-h-0 flex-1 flex-col gap-3 p-4" aria-label={t('Consolidation report')}>
    <ReportFiltersPanel isMobile={isMobile}
      summary={`${applied.year} · P${applied.period}${daily ? ` · ${t('Day')} ${applied.day}` : ''} · ${selected.length === options.length ? t('All business units') : selected.length + ' BU'}`}
      pending={JSON.stringify(draft) !== JSON.stringify(applied)}>
      <ReportFilterGrid as="form" daily={daily} onSubmit={event => {
        event.preventDefault();
        if (canApply) setApplied({ ...draft });
      }}>
        <section className="min-w-0">
          <MultiSelectDropdown label={t('BU')} options={options} selected={draft.tenants}
            onChange={value => update('tenants', value)} normalizeValue={normalizeTenant}
            emptyLabel="Select business units" searchPlaceholder="Search business units..." testIdPrefix="consolidation-bu" />
        </section>
        <section className="space-y-1">
          <Label htmlFor="consolidation-year" className="block text-xs font-medium text-muted-foreground">{t('Year')}</Label>
          <Input id="consolidation-year" type="number" min="1900" max="9998" required value={draft.year} onChange={event => update('year', event.target.value)} className="h-9 text-sm" />
        </section>
        <ReportPeriodFilter id="consolidation-period" value={draft.period} options={periods} onValueChange={value => update('period', value)} />
        {daily && <section className="space-y-1">
          <Label htmlFor="consolidation-day" className="block text-xs font-medium text-muted-foreground">{t('Day')}</Label>
          <Input id="consolidation-day" type="number" min="1" max="31" required value={draft.day} onChange={event => update('day', event.target.value)} className="h-9 text-sm" />
        </section>}
        <Button type="submit" size="sm" className="h-9 w-full self-end px-3 text-sm sm:w-auto sm:min-w-24 sm:justify-self-start" disabled={!canApply || isLoading}>
          {isLoading && <LoaderCircle className="animate-spin motion-reduce:animate-none" />}
          {t(isLoading ? 'Loading...' : 'Apply')}
        </Button>
      </ReportFilterGrid>
    </ReportFiltersPanel>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {result && <>
      {selected.some(tenant => tenant !== profile.tenant) && <p className="text-xs text-muted-foreground">
        {t('Member balances include mapped accounts only.')}
        {result.unmappedTenants?.length > 0 && ' ' + t('No account mappings for') + ' ' + result.unmappedTenants.map(id => options.find(option => option.id === id)?.display || id).join(', ') + '.'}
      </p>}
      <section className="min-h-0 flex-1">
        <ReportView {...engineInputs} reportData={reportData} activeCols={report.columns.filter(column => column.isActive !== false)}
          currentTheme={THEMES[report.theme] || THEMES.blue} tableZoom={zoom} getIndentClass={getIndentClass}
          displayCompanyLabel={report.companyName?.trim()}
          displayDateLabel={report.overrideDateDisplay || report.customDateLabel || t('As of') + ' ' + dateLabel}
          displayPeriodLabel={(report.overridePeriodDisplay || report.customPeriodLabel || formatAutoPeriod(applied.year, applied.period, report.periodFormat || 'standard')) + (result.currency ? ' · ' + result.currency : '')}
          remark={report.remark} />
      </section>
    </>}
  </section>;
}
