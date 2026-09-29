import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { LoaderCircle, Save, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';
import ReportDetailsPanel from './ReportDetailsPanel.jsx';
import ColumnsConfigurator from './ColumnsConfigurator.jsx';
import RowsConfigurator from './RowsConfigurator.jsx';
import GettingStartedTour from './GettingStartedTour.jsx';

const SETUP_TOUR_STEPS = [
  {
    target: 'setup-details',
    title: 'Define the report',
    description: 'Set the report name, period format, and remark before configuring its structure.',
  },
  {
    target: 'setup-configurator',
    title: 'Configure columns and rows',
    description: 'Add, reorder, map, or remove items here. Formula references are renumbered when rows or columns move.',
  },
  {
    target: 'setup-save',
    title: 'Save the draft',
    description: 'Changes stay as a draft until Save changes is selected. Cancel changes restores the last saved definition.',
  },
];

const ReportSetup = forwardRef(function ReportSetup(props, ref) {
  const setupTourStorageKey = `${props.guideStoragePrefix || 'carmen_bi'}:setup`;
  const [isSetupTourOpen, setIsSetupTourOpen] = useState(
    () => window.localStorage.getItem(setupTourStorageKey) !== 'done',
  );
  const [setupTourStep, setSetupTourStep] = useState(0);
  useImperativeHandle(ref, () => ({
    openGuide() {
      setSetupTourStep(0);
      setIsSetupTourOpen(true);
    },
  }), []);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <section aria-label="Report setup controls" className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm">
        <p className="flex items-center gap-2 text-sm" aria-live="polite">
          <span className={cn('size-2 rounded-full', props.isDirty ? 'bg-amber-500' : 'bg-emerald-500')} />
          <span className={props.isDirty ? 'font-medium text-foreground' : 'text-muted-foreground'}>
            {props.isDirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
        </p>
        <nav data-tour="setup-save" aria-label="Save or cancel report settings" className="flex w-full items-center gap-2 data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:rounded-lg data-[tour-active=true]:bg-background data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary lg:w-auto lg:justify-self-end">
          <Button className="flex-1 lg:flex-none" size="sm" type="button" variant="outline" onClick={props.onCancel} disabled={!props.isDirty || props.isSaving}>
            <Undo2 />
            Cancel changes
          </Button>
          <Button className="flex-1 lg:flex-none" size="sm" type="button" onClick={props.onSave} disabled={!props.isDirty || props.isSaving}>
            {props.isSaving ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Save />}
            {props.isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </nav>
      </section>

      <div className="flex flex-col gap-4 px-4 pb-6">
        <section data-tour="setup-details" className="data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:rounded-xl data-[tour-active=true]:bg-background data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary">
          <ReportDetailsPanel {...props} />
        </section>
        <section data-tour="setup-configurator" className="grid gap-5 data-[tour-active=true]:relative data-[tour-active=true]:z-50 data-[tour-active=true]:rounded-xl data-[tour-active=true]:bg-background data-[tour-active=true]:ring-4 data-[tour-active=true]:ring-primary">
          <section className="w-full min-w-0 overflow-hidden"><ColumnsConfigurator {...props} /></section>
          <section className="w-full min-w-0 overflow-hidden"><RowsConfigurator {...props} /></section>
        </section>
      </div>
      <GettingStartedTour
        canSetup
        steps={SETUP_TOUR_STEPS}
        open={isSetupTourOpen}
        stepIndex={setupTourStep}
        onStepChange={setSetupTourStep}
        onClose={() => {
          window.localStorage.setItem(setupTourStorageKey, 'done');
          setIsSetupTourOpen(false);
        }}
      />
    </div>
  );
});

export default ReportSetup;
