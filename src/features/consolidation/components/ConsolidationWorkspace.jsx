import React, { Suspense, useCallback, useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { CircleHelp, FilePlus, History, Network, Settings2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select.jsx';
import { useTranslation } from '@/lib/i18n.js';
import BackButton from '../../report/components/BackButton.jsx';
import ReportLoadingDialog from '../../report/components/ReportLoadingDialog.jsx';
import GettingStartedTour from '../../report/components/GettingStartedTour.jsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog.jsx';
import ConsolidationActivity from './ConsolidationActivity.jsx';

const Mapping = React.lazy(() => import('./ConsolidationMapping.jsx'));
const TemplateEditor = React.lazy(() => import('./ConsolidationTemplateEditor.jsx'));

export default function ConsolidationWorkspace({ state, units, zoom = 100 }) {
  const t = useTranslation();
  const [previewContainer, setPreviewContainer] = useState(null);
  const [hasTemplateDraft, setHasTemplateDraft] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [activityOpen, setActivityOpen] = useState(false);
  const [balanceLoad, setBalanceLoad] = useState(null);
  const reportsLanding = state.mode === 'reports';
  const mappingMode = state.mode === 'mapping';
  const reportView = reportsLanding || (state.mode === 'template' && state.templateView);
  const openingReport = state.openingTemplate || (reportView && (state.loading || (reportsLanding && state.templatesLoading)));
  const showingSavedReport = state.mode === 'template' && state.templateView && state.template && state.profile && !state.dirty && !state.error;
  const reportLoadKey = showingSavedReport
    ? JSON.stringify([state.generation, state.template.id, state.template.version, state.profile.revision])
    : null;
  const handleReportLoading = useCallback((loading) => {
    setBalanceLoad({ key: reportLoadKey, loading });
  }, [reportLoadKey]);
  const loadingBalances = reportLoadKey !== null && (balanceLoad?.key !== reportLoadKey || balanceLoad.loading);
  const canCreate = state.profile?.canManage ?? units.some(unit => unit.permission?.setup);
  const showProfileSetup = mappingMode && canCreate && !state.loading && !state.error;
  const profileSetupButton = showProfileSetup && (
    <Button size="sm" variant="outline" data-tour="consolidation-profile" onClick={state.openProfile} disabled={state.busy}>
      <Settings2 aria-hidden="true" data-icon="inline-start" />{t('Setup Profile')}
    </Button>
  );
  const steps = mappingMode ? [
    showProfileSetup && { target: 'consolidation-profile', title: 'Consolidation profile', description: 'Set up the headquarters and member business units for this profile.' },
    state.profile && { target: 'consolidation-content', title: 'Map member codes', description: 'Choose a member, then map accounts, departments and dimensions to headquarters codes.' },
  ].filter(Boolean) : [
    { target: 'consolidation-content', title: 'Create a template', description: 'Start blank or copy a headquarters report, then configure and save its structure.' },
  ];
  return <VStack gap={0} className="h-full min-h-0 overflow-y-auto bg-background text-foreground" as="section" aria-label={t('Consolidation workspace')}>
    <HStack gap={3} justify="between" wrap="wrap" vAlign="center" className="border-b border-border bg-background px-4 py-3">
      <HStack gap={2} wrap="wrap" vAlign="center">{!reportView && <BackButton onClick={() => {
        if (mappingMode || (!state.template && !hasTemplateDraft)) state.backToReports();
        else if (state.template) state.viewTemplate();
        else state.previewTemplate();
      }} disabled={state.busy} />}<Network className="size-4 text-muted-foreground" /><h1 className="text-base font-semibold text-balance text-foreground">{t('Consolidation')}</h1>{steps.length > 0 && <Button size="icon-sm" variant="ghost" aria-label={t('Open consolidation guide')} title={t('Consolidation guide')} onClick={() => { setGuideStep(0); setGuideOpen(true); }}><CircleHelp /></Button>}</HStack>
      <HStack gap={2} wrap="wrap" vAlign="center">
        {reportView && canCreate && <Button size="sm" onClick={state.openNewTemplate} disabled={state.busy || state.loading}>
          <FilePlus />{t('New Report')}
        </Button>}
        <HStack ref={setPreviewContainer} />
        {state.profile?.canManage && state.mode === 'template' && state.template && <Button size="sm" variant="outline" className="text-destructive" disabled={state.busy} onClick={() => { setDeleteError(''); setDeleteOpen(true); }}><Trash2 />{t('Delete')}</Button>}
        {state.profile && <Button size="sm" variant="outline" disabled={state.busy} onClick={() => setActivityOpen(true)}><History />{t('Activity')}</Button>}
        {state.profile && profileSetupButton}
        {state.profiles?.length > 1 && <Select value={state.profile?.tenant || ''} onValueChange={(tenant) => state.selectProfile(state.profiles.find((item) => item.tenant === tenant))} disabled={state.busy}>
          <SelectTrigger aria-label={t('Headquarter profile')} size="sm" className="w-48 bg-background"><SelectValue placeholder={t('Select profile')} /></SelectTrigger>
          <SelectContent>{state.profiles.map((profile) => <SelectItem key={profile.tenant} value={profile.tenant}>{profile.groupName || profile.tenant}</SelectItem>)}</SelectContent>
        </Select>}
      </HStack>
    </HStack>
    <ReportLoadingDialog open={openingReport || loadingBalances} />
    {state.loading && !openingReport && <p role="status" className="p-4 text-sm text-muted-foreground">{t('Loading consolidation profile…')}</p>}
    {state.error && <VStack gap={3} className="p-4"><p role="alert" className="text-sm text-destructive">{state.error}</p><Button size="sm" variant="outline" onClick={state.retry}>{t('Retry')}</Button></VStack>}
    {!reportsLanding && !state.loading && !state.error && !state.profile && <VStack gap={3} data-tour="consolidation-content" className="p-4">
      <p className="text-sm text-pretty text-muted-foreground">{state.profiles?.length ? t('Select a headquarter profile to continue.') : t('Set up a headquarter and member business units to start consolidation.')}</p>
      {profileSetupButton}
    </VStack>}
    {reportsLanding && !openingReport && !state.error && (
      !state.profile || !state.templateError
          ? <Card data-tour="consolidation-content" className="m-4 flex flex-1 items-center justify-center border border-border shadow-none ring-0">
            <CardContent className="space-y-2 py-16 text-center">
              <h2 className="text-lg font-semibold text-foreground">{t(state.profile && state.templates.length ? 'Select a report' : 'No reports yet')}</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                {state.profile && state.templates.length ? t('Select a report from the sidebar to view it.')
                  : canCreate ? t('Click New Report to create a consolidation report.')
                    : t('No financial reports are available.')}
              </p>
            </CardContent>
          </Card>
          : <p className="p-4 text-sm text-destructive">{state.templateError}</p>
    )}
    {!reportsLanding && !state.loading && !state.openingTemplate && !state.error && state.profile && <Suspense fallback={loadingBalances ? null : <p role="status" className="p-4 text-sm text-muted-foreground">{t('Loading workspace…')}</p>}>
      {mappingMode
        ? <section data-tour="consolidation-content" className="min-h-0 px-4 pt-4 pb-6" style={{ zoom: zoom / 100 }}><Mapping key={`mapping:${state.profile.tenant}:${state.generation}`} profile={state.profile} units={units} onDirtyChange={state.setDirty} onBusyChange={state.setBusy} onSaved={state.mappingSaved} /></section>
        : <section data-tour="consolidation-content" className={state.templateView && state.template && !state.dirty ? 'flex min-h-0 flex-1 flex-col' : undefined} style={state.templateView && state.template && !state.dirty ? undefined : { zoom: zoom / 100 }}><TemplateEditor key={`template:${state.template?.id || 'new'}:${state.profile.tenant}:${state.generation}`} profile={state.profile} units={units} previewContainer={previewContainer} zoom={zoom}
          template={state.template} preview={state.templateView} onReportLoading={handleReportLoading} onPreviewChange={(view) => view ? state.previewTemplate() : state.editTemplate()} onDraftChange={setHasTemplateDraft} onSaved={state.templateSaved} onDirtyChange={state.setDirty} onBusyChange={state.setBusy} onClose={state.openMapping} /></section>}
    </Suspense>}
    <GettingStartedTour canSetup steps={steps} open={guideOpen} stepIndex={guideStep} onStepChange={setGuideStep} onClose={() => setGuideOpen(false)} />
    <AlertDialog open={deleteOpen} onOpenChange={open => { if (!state.busy) setDeleteOpen(open); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('Delete consolidation report?')}</AlertDialogTitle>
        <AlertDialogDescription>{t('Delete')} “{state.template?.name}”? {t('The report can be restored from Activity. Profile, mappings and other reports will not be changed.')}{state.dirty && ` ${t('Unsaved changes will be lost.')}`}</AlertDialogDescription>
      </AlertDialogHeader>{deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={state.busy}>{t('Cancel')}</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={state.busy} onClick={event => {
          event.preventDefault(); void state.deleteTemplate().then(() => setDeleteOpen(false)).catch(error => setDeleteError(error.message || t('Unable to delete the report.')));
        }}>{t(state.busy ? 'Deleting…' : 'Delete report')}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    {activityOpen && state.profile && <ConsolidationActivity profile={state.profile} onClose={() => setActivityOpen(false)} onRestored={state.templateRestored} />}
  </VStack>;
}
