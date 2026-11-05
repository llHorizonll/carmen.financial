import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useTranslation } from '@/lib/i18n.js';

export default function BackButton({ onClick, disabled }) {
  const t = useTranslation();
  return <Button size="sm" type="button" variant="outline" onClick={onClick} disabled={disabled}><ArrowLeft />{t('Back')}</Button>;
}
