import React from 'react';
import { FileText, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Separator } from '@/components/ui/separator.jsx';

const featureRows = [
  { icon: FileText, title: 'Report viewing', description: 'Open monthly and daily reports with the current business unit context.' },
  { icon: SlidersHorizontal, title: 'Setup tools', description: 'Edit rows, columns, access, and templates in a single workspace.' },
  { icon: ShieldCheck, title: 'Controlled access', description: 'Load the right tenant and keep report access tied to the signed-in user.' },
];

export default function LoginFeatures() {
  return (
    <section aria-label="Carmen Financial BI capabilities" className="grid max-w-2xl gap-0 overflow-hidden rounded-xl border bg-card">
      {featureRows.map((item, index) => {
        const Icon = item.icon;
        return (
          <React.Fragment key={item.title}>
            {index > 0 && <Separator />}
            <article className="login-enter-rise flex items-start gap-4 px-4 py-4 sm:px-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40"><Icon className="size-4 text-foreground" /></span>
              <div className="space-y-1"><h2 className="text-sm font-semibold text-foreground">{item.title}</h2><p className="text-sm leading-6 text-pretty text-muted-foreground">{item.description}</p></div>
            </article>
          </React.Fragment>
        );
      })}
    </section>
  );
}
