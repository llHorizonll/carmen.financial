import React, { useState } from 'react';
import { LoaderCircle, Save, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import ReportDetailsPanel from './ReportDetailsPanel.jsx';
import ColumnsConfigurator from './ColumnsConfigurator.jsx';
import RowsConfigurator from './RowsConfigurator.jsx';
import SetupSectionTabs from './SetupSectionTabs.jsx';
import { THEMES } from '../lib/reportLogic.js';

const themeBadgeClassMap = {
  blue: 'border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150',
  green: 'border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150',
  gray: 'border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150',
};

export default function ReportSetup(props) {
  const [activeSetupSection, setActiveSetupSection] = useState('columns');
  const activeColumns = props.activeReport?.columns?.filter((column) => column?.isActive !== false).length || 0;
  const activeRows = props.activeReport?.rows?.length || 0;
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
  const setupTabs = [
    {
      key: 'columns',
      label: `Columns (${activeColumns})`,
      tabId: 'report-setup-tab-columns',
      panelId: 'report-setup-panel-columns',
    },
    {
      key: 'rows',
      label: `Rows (${activeRows})`,
      tabId: 'report-setup-tab-rows',
      panelId: 'report-setup-panel-rows',
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <section
        aria-label="Report setting actions"
        className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85"
      >
        <p className="flex items-center gap-2 text-sm" aria-live="polite">
          <span className={cn('size-2 rounded-full', props.isDirty ? 'bg-amber-500' : 'bg-emerald-500')} />
          <span className={props.isDirty ? 'font-medium text-foreground' : 'text-muted-foreground'}>
            {props.isDirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
        </p>
        <nav aria-label="Save or cancel report settings" className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={props.onCancel} disabled={!props.isDirty || props.isSaving}>
            <Undo2 />
            Cancel changes
          </Button>
          <Button type="button" onClick={props.onSave} disabled={!props.isDirty || props.isSaving}>
            {props.isSaving ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Save />}
            {props.isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </nav>
      </section>
      <Card className="overflow-hidden border border-border bg-gradient-to-br from-background via-background to-muted/25 shadow-none ring-0">
        <CardContent className="grid gap-5 p-5 xl:grid-cols-[1.15fr_0.85fr] xl:items-center xl:p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                Configuration Mode
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                {props.activeReport?.reportType || 'Monthly'}
              </Badge>
              <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]', themeBadgeClass)}>
                {themeBadgeLabel} theme
              </Badge>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Shape the report before it reaches the dashboard
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Configure report metadata, column logic, access rules, and row mappings in one place.
                The canvas below mirrors the live dashboard surfaces so you can move between setup and viewing with less visual friction.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:justify-items-stretch">
            <div className="rounded-2xl border border-border bg-background/80 p-3 shadow-sm">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Columns</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{activeColumns}</div>
              <div className="mt-1 text-xs text-muted-foreground">Active column definitions</div>
            </div>
            <div className="rounded-2xl border border-border bg-background/80 p-3 shadow-sm">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Rows</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{activeRows}</div>
              <div className="mt-1 text-xs text-muted-foreground">Rows in this template</div>
            </div>
            <div className="rounded-2xl border border-border bg-background/80 p-3 shadow-sm">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Categories</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{activeCategoryCount}</div>
              <div className="mt-1 text-xs text-muted-foreground">Selected account groups</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <ReportDetailsPanel {...props} />
      <div className="grid gap-5">
        <SetupSectionTabs
          items={setupTabs}
          activeKey={activeSetupSection}
          onChange={setActiveSetupSection}
        />
        <section
          id="report-setup-panel-columns"
          role="tabpanel"
          aria-labelledby="report-setup-tab-columns"
          hidden={activeSetupSection !== 'columns'}
          className="w-full min-w-0 overflow-hidden"
        >
          <ColumnsConfigurator {...props} />
        </section>
        <section
          id="report-setup-panel-rows"
          role="tabpanel"
          aria-labelledby="report-setup-tab-rows"
          hidden={activeSetupSection !== 'rows'}
          className="w-full min-w-0 overflow-hidden"
        >
          <RowsConfigurator {...props} />
        </section>
      </div>
    </div>
  );
}
