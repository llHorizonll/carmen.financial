import { useTranslation, getLocale } from "@/lib/i18n.js";
import React, { useEffect, useRef, useState } from 'react';
import { History, LoaderCircle, Save, RotateCcw, FileClock, UserRound, ArrowRight } from 'lucide-react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
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
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null);
  const selectedVersionRef = useRef(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selected) selectedVersionRef.current?.focus();
  }, [selected]);

  useEffect(() => {
    if (!open || !report?.id) return undefined;
    let cancelled = false;
    setBusy(true);
    setError('');
    setEntries([]);
    setSelected(null);
    (report.tenant ? fetchCarmenReportHistory(report.id, { tenant: report.tenant }) : fetchCarmenReportHistory(report.id))
      .then((items) => { if (!cancelled) setEntries(Array.isArray(items) ? items : []); })
      .catch((reason) => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [open, report?.id, report?.tenant]);

  const inspect = async (entry) => {
    setBusy(true);
    setError('');
    try {
      const definition = await (report.tenant ? fetchCarmenReportHistoryVersion(report.id, entry.id, { tenant: report.tenant }) : fetchCarmenReportHistoryVersion(report.id, entry.id));
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
      const restored = await (report.tenant ? restoreCarmenReportHistoryVersion(report.id, selected.id, report.lastModified, { tenant: report.tenant }) : restoreCarmenReportHistoryVersion(report.id, selected.id, report.lastModified));
      onRestored(restored);
      setConfirming(false);
      setOpen(false);
    } catch (reason) {
      setConfirming(false);
      setError(reason.status === 409
        ? 'The report changed since you opened activity. Reload it before restoring.'
        : reason.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)} disabled={isDirty}>
        <History className="size-4" />{t("Activity")}</Button>
      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setSelected(null); }}>
        <DialogContent className="max-h-screen max-w-2xl overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("Report activity")}</DialogTitle>
            <DialogDescription>{report.name} {t("· Review changes and revisit a saved version.")}</DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> {t("Loading activity...")}</p>}
          {!busy && !error && entries.length === 0 && <p className="text-sm text-muted-foreground">{t("No saved versions yet.")}</p>}
          {selected && <VStack as="section" ref={selectedVersionRef} tabIndex={-1} gap={2} aria-label={t("Selected version")} className="gap-2! rounded-lg border border-border bg-muted/50 p-3! text-sm">
            <h3 className="font-semibold">{t("Version #")}{selected.id}</h3>
            <p>{t("Name:")} {selected.definition.name}</p>
            <p>{t("Rows:")} {selected.definition.rows?.length || 0} {t("· Columns:")} {selected.definition.columns?.length || 0}</p>
            <p className="text-muted-foreground">{t("Restoring this version replaces the current report setup and creates a new history entry.")}</p>
            <Button type="button" className="self-start" disabled={busy || isDirty} onClick={() => setConfirming(true)}>{t("Restore this version")}</Button>
          </VStack>}
          {entries.length > 0 && <VStack gap={3}>
            <HStack justify="between" wrap="wrap" gap={2}>
              <p className="text-sm font-semibold">{t("Version history")}</p>
              <p className="text-xs text-muted-foreground">{entries.length} {t("saved versions · Newest first")}</p>
            </HStack>
            <ol className="m-0 list-none p-0" aria-label={t("Saved versions")}>
              {entries.map((entry, index) => {
                const active = selected?.id === entry.id;
                const EventIcon = entry.changeType === 'restore' ? RotateCcw : entry.changeType === 'baseline' ? FileClock : Save;
                const title = { save: t("Report saved"), restore: t("Version restored"), baseline: t("Original version"), create: t("Report created") }[entry.changeType] || entry.changeType || t("Report updated");
                const date = new Date(entry.changedAt);
                return <li key={entry.id} className="relative pb-1 pl-10 last:pb-0 sm:pl-12 before:absolute before:bottom-0 before:left-4 before:top-11 before:border-l before:border-border last:before:hidden">
                  <HStack justify="center" align="center" className={`absolute left-0 top-3 size-8 rounded-full border ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-muted-foreground'}`} aria-hidden="true">
                    <EventIcon className="size-4" />
                  </HStack>
                  {/* Match the project's compact surface spacing: 12px inset,
                      8px between groups and 4px between a title and its metadata. */}
                  <VStack gap={2} className={`gap-2! rounded-lg p-3! ${active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50'}`}>
                    <HStack justify="between" align="center" wrap="wrap" gap={2}>
                      <p className="text-sm font-semibold">{title}{index === 0 && <small className="ml-2 font-normal text-muted-foreground">{t("Latest saved")}</small>}</p>
                      <time dateTime={Number.isNaN(date.getTime()) ? undefined : entry.changedAt} className="ml-auto text-right text-xs leading-relaxed tabular-nums text-muted-foreground">{Number.isNaN(date.getTime()) ? t("Time unavailable") : date.toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' })}</time>
                    </HStack>
                    <HStack justify="between" align="center" wrap="wrap" gap={3}>
                      <HStack align="center" wrap="wrap" gap={3}>
                        <p className="flex min-w-0 items-center gap-2 break-all text-xs leading-relaxed text-muted-foreground"><UserRound aria-hidden="true" className="size-3 shrink-0" />{entry.changedBy || t("Unknown user")}</p>
                        <p className="border-l border-border pl-3 text-xs leading-relaxed tabular-nums text-muted-foreground">{t("Version #")}{entry.id}</p>
                      </HStack>
                      <Button type="button" variant="ghost" size="sm" disabled={busy} aria-pressed={active} onClick={() => inspect(entry)}>{t("Inspect")} <ArrowRight aria-hidden="true" className="size-3" /></Button>
                    </HStack>
                  </VStack>
                </li>;
              })}
            </ol>
          </VStack>}
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Restore version #")}{selected?.id}?</AlertDialogTitle>
            <AlertDialogDescription>{t("The current report setup will be replaced. It remains available in history.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); restore(); }}>{t("Restore")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
