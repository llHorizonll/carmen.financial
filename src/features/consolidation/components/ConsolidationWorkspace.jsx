import React, { Suspense, useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { FilePlus2, Network } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select.jsx';
import { useTranslation } from '@/lib/i18n.js';
import BackButton from '../../report/components/BackButton.jsx';

const Mapping = React.lazy(() => import('./ConsolidationMapping.jsx'));
const TemplateEditor = React.lazy(() => import('./ConsolidationTemplateEditor.jsx'));

export default function ConsolidationWorkspace({ state, units }) {
  const t = useTranslation();
  const [previewContainer, setPreviewContainer] = useState(null);
  return <VStack gap={0} className="h-full min-h-0 overflow-y-auto bg-background text-foreground" as="section" aria-label={t('Consolidation workspace')}>
    <HStack gap={3} justify="between" wrap="wrap" vAlign="center" className="border-b border-border bg-background px-4 py-3">
      <HStack gap={2} wrap="wrap" vAlign="center"><BackButton onClick={() => state.leave()} disabled={state.busy} /><Network className="size-4 text-muted-foreground" /><h1 className="text-base font-semibold text-balance text-foreground">{t('Consolidation')}</h1></HStack>
      <HStack gap={2} wrap="wrap" vAlign="center">
        {state.profiles?.length > 1 && <Select value={state.profile?.tenant || ''} onValueChange={(tenant) => state.selectProfile(state.profiles.find((item) => item.tenant === tenant))} disabled={state.busy}>
          <SelectTrigger aria-label={t('Headquarter profile')} size="sm" className="w-48 bg-background"><SelectValue placeholder={t('Select profile')} /></SelectTrigger>
          <SelectContent>{state.profiles.map((profile) => <SelectItem key={profile.tenant} value={profile.tenant}>{profile.groupName || profile.tenant}</SelectItem>)}</SelectContent>
        </Select>}
        <Button size="sm" variant="outline" onClick={state.openMapping} disabled={state.busy}>{t('Mapping')}</Button>
        {state.profile?.canManage && <Button size="sm" onClick={() => state.openTemplate()} disabled={state.busy}><FilePlus2 />{t('Create Report Template')}</Button>}
        <HStack ref={setPreviewContainer} />
      </HStack>
    </HStack>
    {state.loading && <p role="status" className="p-4 text-sm text-muted-foreground">{t('Loading consolidation profile…')}</p>}
    {state.error && <VStack gap={3} className="p-4"><p role="alert" className="text-sm text-destructive">{state.error}</p><Button size="sm" variant="outline" onClick={() => state.reloadProfiles()}>{t('Retry')}</Button></VStack>}
    {!state.loading && !state.error && !state.profile && <VStack gap={3} className="p-4">
      <p className="text-sm text-pretty text-muted-foreground">{state.profiles?.length ? t('Select a headquarter profile to continue.') : t('Set up a headquarter and member business units to start consolidation.')}</p>
      <Button size="sm" variant="outline" onClick={state.openProfile}>{t('Setup Profile')}</Button>
    </VStack>}
    {state.openingTemplate && <p role="status" className="p-4 text-sm text-muted-foreground">{t('Loading template…')}</p>}
    {!state.loading && !state.openingTemplate && !state.error && state.profile && <Suspense fallback={<p role="status" className="p-4 text-sm text-muted-foreground">{t('Loading workspace…')}</p>}>
      {state.mode === 'mapping'
        ? <section className="min-h-0 px-4 pt-4 pb-6"><Mapping key={`mapping:${state.profile.tenant}:${state.generation}`} profile={state.profile} units={units} onDirtyChange={state.setDirty} onBusyChange={state.setBusy} onSaved={state.mappingSaved} /></section>
        : <TemplateEditor key={`template:${state.template?.id || 'new'}:${state.profile.tenant}:${state.generation}`} profile={state.profile} units={units} previewContainer={previewContainer}
          template={state.template} onSaved={state.templateSaved} onDirtyChange={state.setDirty} onBusyChange={state.setBusy} onClose={state.openMapping} />}
    </Suspense>}
  </VStack>;
}
