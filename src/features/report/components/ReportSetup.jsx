import React from 'react';
import { LoaderCircle, Save, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import usePersistentState from '@/hooks/usePersistentState.js';
import { Button } from '@/components/ui/button.jsx';
import ReportDetailsPanel from './ReportDetailsPanel.jsx';
import ColumnsConfigurator from './ColumnsConfigurator.jsx';
import RowsConfigurator from './RowsConfigurator.jsx';
import SetupSectionTabs from './SetupSectionTabs.jsx';

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
      <section aria-label="Report setup controls" className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm">
        <p className="flex items-center gap-2 text-sm" aria-live="polite">
          <span className={cn('size-2 rounded-full', props.isDirty ? 'bg-amber-500' : 'bg-emerald-500')} />
          <span className={props.isDirty ? 'font-medium text-foreground' : 'text-muted-foreground'}>
            {props.isDirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
        </p>
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

      <div className="flex flex-col gap-4 px-4 pb-6">
        <ReportDetailsPanel {...props} />
        <section className="grid gap-1">
          <SetupSectionTabs items={setupTabs} activeKey={activeSetupSection} onChange={setStoredSetupSection} />
          <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">{activeSetupSummary}</p>
        </section>
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
    </div>
  );
}
