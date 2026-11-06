import React from 'react';
import { LoaderCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { useTranslation } from '@/lib/i18n.js';

export default function ReportLoadingDialog({ open }) {
  const t = useTranslation();
  return <Dialog open={open}>
    <DialogContent showCloseButton={false} onEscapeKeyDown={event => event.preventDefault()}
      onPointerDownOutside={event => event.preventDefault()} className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" />
          {t('Loading report data')}
        </DialogTitle>
        <DialogDescription>{t('Please wait while Carmen prepares the report. Other actions are temporarily unavailable.')}</DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>;
}
