import React, { useEffect, useState } from 'react';
import { History, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog.jsx';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog.jsx';
import {
  fetchCarmenReportHistory, fetchCarmenReportHistoryVersion,
  restoreCarmenReportHistoryVersion,
} from '../lib/reportApi.js';

export default function ReportHistory({ report, isDirty, onRestored }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !report?.id) return undefined;
    let cancelled = false;
    setBusy(true);
    setError('');
    setEntries([]);
    fetchCarmenReportHistory(report.id)
      .then((items) => { if (!cancelled) setEntries(Array.isArray(items) ? items : []); })
      .catch((reason) => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [open, report?.id]);

  const inspect = async (entry) => {
    setBusy(true);
    setError('');
    try {
      const definition = await fetchCarmenReportHistoryVersion(report.id, entry.id);
      setSelected({ ...entry, definition });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!selected || isDirty) return;
    setBusy(true);
    setError('');
    try {
      const restored = await restoreCarmenReportHistoryVersion(report.id, selected.id, report.lastModified);
      onRestored(restored);
      setConfirming(false);
      setOpen(false);
    } catch (reason) {
      setConfirming(false);
      setError(reason.status === 409
        ? 'The report changed since you opened history. Reload it before restoring.'
        : reason.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} disabled={isDirty}>
        <History className="size-4" /> History
      </Button>
      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setSelected(null); }}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report history</DialogTitle>
            <DialogDescription>Review saved versions of {report.name} and restore one if needed.</DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> Loading history...</p>}
          {!busy && !error && entries.length === 0 && <p className="text-sm text-muted-foreground">No saved versions yet.</p>}
          {entries.length > 0 && <ul className="divide-y border-y" aria-label="Saved versions">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                <p className="text-sm"><strong>{entry.changeType}</strong> · {new Date(entry.changedAt).toLocaleString()} · {entry.changedBy}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => inspect(entry)}>Inspect</Button>
              </li>
            ))}
          </ul>}
          {selected && <section aria-label="Selected version" className="grid gap-2 rounded-lg border p-4 text-sm">
            <h3 className="font-semibold">Version #{selected.id}</h3>
            <p>Name: {selected.definition.name}</p>
            <p>Rows: {selected.definition.rows?.length || 0} · Columns: {selected.definition.columns?.length || 0} · Access entries: {selected.definition.access?.length || 0}</p>
            <p className="text-muted-foreground">Restoring this version replaces the current report setup and creates a new history entry.</p>
            <Button type="button" className="justify-self-start" disabled={busy || isDirty} onClick={() => setConfirming(true)}>Restore this version</Button>
          </section>}
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore version #{selected?.id}?</AlertDialogTitle>
            <AlertDialogDescription>The current report setup will be replaced. It remains available in history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); restore(); }}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
