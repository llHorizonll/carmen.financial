import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog.jsx';
import { useTranslation } from '@/lib/i18n.js';
import { consolidationApi } from '../lib/consolidationApi.js';

export default function ConsolidationActivity({ profile, onClose, onRestored }) {
  const t = useTranslation();
  const [reports, setReports] = useState(null);
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setReports(null); setEntries(null); setError('');
    Promise.all([consolidationApi.listActivity(profile.tenant), profile.canManage ? consolidationApi.listDeletedReports(profile.tenant) : Promise.resolve([])])
      .then(([activity, deleted]) => { if (active) { setEntries(activity); setReports(deleted); } })
      .catch(failure => { if (active) setError(failure.message || 'Unable to load activity.'); });
    return () => { active = false; };
  }, [profile.tenant, profile.canManage, attempt]);
  const restore = async (report) => {
    setBusy(true); setError('');
    try {
      const restored = await consolidationApi.setReportDeleted(report, profile, false);
      onRestored(restored); setAttempt(value => value + 1);
    } catch (failure) { setError(failure.message || 'Unable to restore the report.'); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent onInteractOutside={event => { if (busy) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>{t('Consolidation activity')}</DialogTitle><DialogDescription>{t('Review report changes and restore deleted reports for this profile.')}</DialogDescription></DialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error} <Button size="sm" variant="outline" disabled={busy} onClick={() => setAttempt(value => value + 1)}>{t('Reload')}</Button></p>}
      {!reports && !error && <p role="status" className="text-sm text-muted-foreground">{t('Loading…')}</p>}
      {profile.canManage && reports?.length > 0 && <><h3 className="text-sm font-semibold">{t('Deleted reports')}</h3><ul className="max-h-48 list-none overflow-y-auto p-0">
        {reports.map(report => <li key={report.id} className="flex items-center justify-between gap-3 border-b border-border py-3">
          <section className="min-w-0 text-sm"><p className="truncate font-medium">{report.name}</p><p className="text-muted-foreground">{report.deletedBy}{report.deletedAt ? ` · ${new Date(report.deletedAt).toLocaleString()}` : ''}</p></section>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void restore(report)}>{t('Restore')}</Button>
        </li>)}
      </ul></>}
      {entries?.length === 0 && <p className="text-sm text-muted-foreground">{t('No activity yet.')}</p>}
      {entries?.length > 0 && <section className="min-h-0"><h3 className="text-sm font-semibold">{t('Recent activity')}</h3><ol className="max-h-80 list-none overflow-y-auto p-0" aria-label={t('Recent activity')}>
        {entries.map(entry => <li key={`${entry.reportId}:${entry.version}`} className="border-b border-border py-3 text-sm">
          <p className="font-medium">{entry.reportName}</p>
          <p className="text-muted-foreground">{t(({ create: 'Report created', save: 'Report saved', delete: 'Report deleted', restore: 'Report restored' })[entry.changeType] || 'Report updated')} · {entry.changedBy || t('Unknown user')} · {entry.changedAt ? new Date(entry.changedAt).toLocaleString() : t('Time unavailable')} · {t('Version #')}{entry.version}</p>
        </li>)}
      </ol></section>}
    </DialogContent>
  </Dialog>;
}
