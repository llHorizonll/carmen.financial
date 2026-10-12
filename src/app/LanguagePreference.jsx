import { useTranslation, useLanguage } from '@/lib/i18n.js';
import { Check, ChevronRight, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { setCarmenSessionLanguage } from '../features/report/lib/carmenSession.js';

export default function LanguagePreference() {
  const language = useLanguage();
  const t = useTranslation();
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
          ['vi', 'Vietnamese'],
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
