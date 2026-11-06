import React, { useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Building2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select.jsx';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog.jsx';
import { useTranslation } from '@/lib/i18n.js';
import { cn } from '@/lib/utils.js';
import { consolidationApi } from '../lib/consolidationApi.js';

export default function ConsolidationProfileDialog({ open, profile, profiles = [], units, onSaved, onClose, lockHeadquarter = false }) {
  const t = useTranslation();
  const [original, setOriginal] = useState(profile);
  const [tenant, setTenant] = useState(profile?.tenant || '');
  const [members, setMembers] = useState(profile?.memberTenants || []);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const unitName = (id) => unitById.get(id)?.name || id;
  const canManage = unitById.get(tenant)?.permission?.setup
    && members.every((id) => unitById.get(id)?.permission?.view);
  const selectTenant = (next) => {
    setTenant(next); setError('');
    const existing = !original && profiles.find((item) => item.tenant === next);
    if (existing) { setOriginal(existing); setMembers(existing.memberTenants); }
    else setMembers((previous) => previous.filter((id) => id !== next));
  };
  const save = async () => {
    if (saving || !tenant || !members.length || !canManage) return;
    setSaving(true); setError('');
    try { onSaved(await consolidationApi.saveProfile(original, { tenant, memberTenants: members })); }
    catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  };
  const submit = () => {
    const changed = original && (tenant !== original.tenant
      || JSON.stringify(members) !== JSON.stringify(original.memberTenants));
    if (changed) setConfirm(true);
    else void save();
  };
  return <>
    <Dialog open={open} onOpenChange={(value) => { if (!value && !saving) onClose(); }}>
      <DialogContent className="flex max-h-dvh min-h-0 flex-col overflow-hidden border border-border bg-popover text-popover-foreground sm:max-w-xl" onInteractOutside={(event) => { if (saving) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base"><Settings2 className="size-4 text-muted-foreground" />{t('Setup Profile')}</DialogTitle>
          <DialogDescription className="text-sm text-pretty text-muted-foreground">{t('This headquarter and member list is shared with Centralize. Existing synchronization settings are preserved.')}</DialogDescription>
        </DialogHeader>
        <VStack gap={4} className="min-h-0 overflow-y-auto">
          <ol aria-label={t('Profile setup steps')} className="m-0 grid list-none grid-cols-2 gap-1 rounded-lg border border-border bg-muted/60 p-1">
            {[t('Step 1: Headquarter BU'), t('Step 2: Member BUs')].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined}
              className={cn('rounded-md px-3 py-2 text-center text-sm font-medium', step === index + 1 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{label}</li>)}
          </ol>
          <VStack gap={3} className="rounded-xl border border-border bg-background p-4">
          {step === 1 ? <>
            <p className="text-sm font-medium text-foreground">{t('Headquarter BU')}</p>
            <Select value={tenant} onValueChange={selectTenant} disabled={saving || Boolean(original?.headquarterLocked) || lockHeadquarter}>
              <SelectTrigger aria-label={t('Headquarter BU')} className="bg-background"><SelectValue placeholder={t('Select headquarter BU')} /></SelectTrigger>
              <SelectContent>{units.filter((unit) => unit.permission?.view).map((unit) =>
                <SelectItem key={unit.id} value={unit.id}>{unit.name || unit.id}</SelectItem>)}</SelectContent>
            </Select>
            {original?.headquarterLocked && <p className="text-sm text-muted-foreground">{t('Headquarter is locked because mappings or templates already exist.')}</p>}
            {!original?.headquarterLocked && lockHeadquarter && <p className="text-sm text-muted-foreground">{t('Save or discard the current draft before changing headquarters.')}</p>}
          </> : <>
            <HStack gap={2} vAlign="center" className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm font-medium text-foreground"><Building2 className="size-4 text-muted-foreground" />{t('Headquarter')}: {unitName(tenant)}</HStack>
            <VStack gap={0} className="max-h-80 overflow-y-auto rounded-lg border border-border bg-card">
              {[...new Set([...units.filter((unit) => unit.permission?.view).map((unit) => unit.id), ...members])]
                .filter((id) => id !== tenant).map((id) => <HStack as="label" key={id} gap={3} vAlign="center" className={cn('cursor-pointer border-b border-border px-3 py-2.5 text-sm text-foreground last:border-0 hover:bg-muted/40', members.includes(id) && 'bg-primary/5')}>
                  <Checkbox checked={members.includes(id)} disabled={saving}
                    onCheckedChange={(checked) => setMembers((previous) => checked ? [...previous, id] : previous.filter((item) => item !== id))} />
                  {unitName(id)}
                </HStack>)}
            </VStack>
            {!members.length && <p className="text-sm text-muted-foreground">{t('Select at least one member BU.')}</p>}
            {!canManage && members.length > 0 && <p role="alert" className="text-sm text-destructive">{t('Financial Report Setup at HQ and View in every member BU are required.')}</p>}
          </>}
          </VStack>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </VStack>
        <DialogFooter className="shrink-0">
          <Button size="sm" variant="outline" onClick={onClose} disabled={saving}>{t('Cancel')}</Button>
          {step === 2 && <Button size="sm" variant="outline" onClick={() => setStep(1)} disabled={saving}>{t('Back')}</Button>}
          {step === 1 ? <Button size="sm" onClick={() => setStep(2)} disabled={!tenant || saving}>{t('Next')}</Button>
            : <Button size="sm" onClick={submit} disabled={!members.length || !canManage || saving}>{saving ? t('Saving...') : t('Save profile')}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirm} onOpenChange={setConfirm}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('Update shared profile?')}</AlertDialogTitle>
        <AlertDialogDescription>{t('Changing headquarters or members also changes Centralize membership. Existing member sync settings are preserved; newly added members start with sync disabled. Removed member mappings are retained but inactive.')}</AlertDialogDescription>
      </AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
        <AlertDialogAction onClick={() => void save()}>{t('Update profile')}</AlertDialogAction>
      </AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </>;
}
