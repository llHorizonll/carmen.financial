import { useTranslation, useLanguage } from '@/lib/i18n.js';
import { Check, ChevronRight, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { setCarmenSessionLanguage } from '../features/report/lib/carmenSession.js';

export default function LanguagePreference({ compact = false }) {
  const language = useLanguage();
  const t = useTranslation();
  if (compact) return (
    <section className="inline-flex gap-1 rounded-lg bg-muted p-1" aria-label={t("Language")}>
      {['en', 'th'].map((value) => (
        <Button key={value} type="button" variant="ghost" size="sm"
          className="text-xs text-muted-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
          aria-pressed={language === value}
          onClick={() => setCarmenSessionLanguage(value)}>
          {value === 'en' ? 'EN' : 'ไทย'}
        </Button>
      ))}
    </section>
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" className="w-full justify-start text-xs font-normal">
          <Languages className="size-4" />
          {t("Language")}
          <ChevronRight className="ml-auto size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-44 gap-1 p-2" aria-label={t("Language")}>
        {[
          ['en', 'English'],
          ['th', 'ไทย'],
        ].map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant="ghost"
            className="w-full justify-start text-xs"
            aria-pressed={language === value}
            onClick={() => setCarmenSessionLanguage(value)}
          >
            {label}
            {language === value && <Check className="ml-auto size-4" />}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
