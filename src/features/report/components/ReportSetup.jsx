import React from 'react';
import { cn } from '@/lib/utils.js';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import ReportDetailsPanel from './ReportDetailsPanel.jsx';
import ColumnsConfigurator from './ColumnsConfigurator.jsx';
import RowsConfigurator from './RowsConfigurator.jsx';
import { THEMES } from '../lib/reportLogic.js';

export default function ReportSetup(props) {
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
  const themeBadgeClassMap = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/45 dark:text-blue-100',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/45 dark:text-emerald-100',
    gray: 'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100',
  };
  const themeBadgeClass = themeBadgeClassMap[activeThemeId] || themeBadgeClassMap.blue;
  const themeBadgeLabel = activeTheme?.label || THEMES[activeThemeId]?.name || activeThemeId;

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto pb-8 pr-2">
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
        <ColumnsConfigurator {...props} />
        <RowsConfigurator {...props} />
      </div>
    </div>
  );
}
