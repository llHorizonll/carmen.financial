import React from 'react';
import { LoaderCircle, Save, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import usePersistentState from '@/hooks/usePersistentState.js';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import ReportDetailsPanel from './ReportDetailsPanel.jsx';
import ColumnsConfigurator from './ColumnsConfigurator.jsx';
import RowsConfigurator from './RowsConfigurator.jsx';
import SetupSectionTabs from './SetupSectionTabs.jsx';
import { THEMES } from '../lib/reportLogic.js';

const themeBadgeClassMap = {
  blue: 'border-border bg-muted/60 text-muted-foreground',
  green: 'border-border bg-muted/60 text-muted-foreground',
  gray: 'border-border bg-muted/60 text-muted-foreground',
};

const SETUP_SECTION_STORAGE_KEY = 'carmen.report-setup.active-section.v1';

const hasConfigurationChanged = (draftItems, savedItems) => (
  JSON.stringify(draftItems || []) !== JSON.stringify(savedItems || [])
);

export default function ReportSetup(props) {
  const [storedSetupSection, setStoredSetupSection] = usePersistentState(
    SETUP_SECTION_STORAGE_KEY,
    'columns',
  );
  const activeSetupSection = storedSetupSection === 'rows' ? 'rows' : 'columns';
  const configuredColumns = props.activeReport?.columns?.length || 0;
  const configuredRows = props.activeReport?.rows?.length || 0;
  const activeColumns = props.activeReport?.columns?.filter((column) => column?.isActive !== false).length || 0;
  const activeRows = props.activeReport?.rows?.filter((row) => row?.isActive !== false).length || 0;
  const activeCategoryCount = props.activeCategories?.length || 0;
  const themeOptions = props.reportOptions?.themes?.length > 0
    ? props.reportOptions.themes
    : [
        { id: 'blue', label: 'Classic Blue' },
        { id: 'green', label: 'Emerald Green' },
        { id: 'gray', label: 'Slate Gray' },
      ];
  const activeThemeId = props.activeReport?.theme || 'blue';
  const activeTheme = themeOptions.find((option) => option.id === activeThemeId) || null;
  const themeBadgeClass = themeBadgeClassMap[activeThemeId] || themeBadgeClassMap.blue;
  const themeBadgeLabel = activeTheme?.label || THEMES[activeThemeId]?.name || activeThemeId;
  const savedReport = props.savedReport || props.activeReport;
  const sectionDirtyState = {
    columns: hasConfigurationChanged(props.activeReport?.columns, savedReport?.columns),
    rows: hasConfigurationChanged(props.activeReport?.rows, savedReport?.rows),
  };
  const setupTabs = [
    {
      key: 'columns',
      label: 'Columns',
      count: configuredColumns,
      isDirty: sectionDirtyState.columns,
      tabId: 'report-setup-tab-columns',
      panelId: 'report-setup-panel-columns',
    },
    {
      key: 'rows',
      label: 'Rows',
      count: configuredRows,
      isDirty: sectionDirtyState.rows,
      tabId: 'report-setup-tab-rows',
      panelId: 'report-setup-panel-rows',
    },
  ];
  const activeSetupSummary = activeSetupSection === 'columns'
    ? `${configuredColumns} Columns configured`
    : `${configuredRows} Rows configured`;

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <section
        aria-label="Report setup controls"
        className="sticky top-0 z-30 grid gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-sm lg:grid-cols-[auto_minmax(20rem,36rem)_auto] lg:items-center"
      >
        <p className="flex items-center gap-2 text-sm" aria-live="polite">
          <span className={cn('size-2 rounded-full', props.isDirty ? 'bg-amber-500' : 'bg-emerald-500')} />
          <span className={props.isDirty ? 'font-medium text-foreground' : 'text-muted-foreground'}>
            {props.isDirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
        </p>
        <section className="grid min-w-0 gap-1">
          <SetupSectionTabs
            items={setupTabs}
            activeKey={activeSetupSection}
            onChange={setStoredSetupSection}
          />
          <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {activeSetupSummary}
          </p>
        </section>
        <nav aria-label="Save or cancel report settings" className="flex w-full items-center gap-2 lg:w-auto lg:justify-self-end">
          <Button className="flex-1 lg:flex-none" type="button" variant="outline" onClick={props.onCancel} disabled={!props.isDirty || props.isSaving}>
            <Undo2 />
            Cancel changes
          </Button>
          <Button className="flex-1 lg:flex-none" type="button" onClick={props.onSave} disabled={!props.isDirty || props.isSaving}>
            {props.isSaving ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Save />}
            {props.isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </nav>
      </section>
      <Card className="overflow-hidden border border-border bg-card shadow-none ring-0">
        <CardContent className="grid gap-5 p-5 xl:grid-cols-[1.15fr_0.85fr] xl:items-center xl:p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                Configuration Mode
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                {props.activeReport?.reportType || 'Monthly'}
              </Badge>
              <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs', themeBadgeClass)}>
                {themeBadgeLabel} theme
              </Badge>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-balance text-foreground">
                Shape the report before it reaches the dashboard
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-pretty text-muted-foreground">
                Configure report metadata, column logic, access rules, and row mappings in one place.
                The canvas below mirrors the live dashboard surfaces so you can move between setup and viewing with less visual friction.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:justify-items-stretch">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-xs font-medium text-muted-foreground">Columns</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{configuredColumns}</div>
              <div className="mt-1 text-sm text-muted-foreground">{activeColumns} active definitions</div>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-xs font-medium text-muted-foreground">Rows</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{configuredRows}</div>
              <div className="mt-1 text-sm text-muted-foreground">{activeRows} active template rows</div>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-xs font-medium text-muted-foreground">Categories</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{activeCategoryCount}</div>
              <div className="mt-1 text-sm text-muted-foreground">Account groups</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <ReportDetailsPanel {...props} />
      <section className="grid gap-5">
        {activeSetupSection === 'columns' ? (
          <section
            id="report-setup-panel-columns"
            role="tabpanel"
            aria-labelledby="report-setup-tab-columns"
            className="w-full min-w-0 overflow-hidden"
          >
            <ColumnsConfigurator {...props} />
          </section>
        ) : (
          <section
            id="report-setup-panel-rows"
            role="tabpanel"
            aria-labelledby="report-setup-tab-rows"
            className="w-full min-w-0 overflow-hidden"
          >
            <RowsConfigurator {...props} />
          </section>
        )}
      </section>
    </div>
  );
}
