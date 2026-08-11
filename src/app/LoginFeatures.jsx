import React from 'react';
import { FileText, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Separator } from '@/components/ui/separator.jsx';

const featureRows = [
  { icon: FileText, title: 'Report viewing', description: 'Open monthly and daily reports with the current business unit context.' },
  { icon: SlidersHorizontal, title: 'Setup tools', description: 'Edit rows, columns, access, and templates in a single workspace.' },
  { icon: ShieldCheck, title: 'Controlled access', description: 'Load the right tenant and keep report access tied to the signed-in user.' },
];
const getLoginDelayStyle = (delayMs) => ({ animationDelay: `${delayMs}ms` });

export default function LoginFeatures() {
  return (
    <div className="grid max-w-2xl gap-0 overflow-hidden rounded-2xl border bg-background/90 shadow-sm">
      {featureRows.map((item, index) => {
        const Icon = item.icon;
        return (
          <React.Fragment key={item.title}>
            {index > 0 && <Separator />}
            <div className="login-enter-rise flex items-start gap-4 px-4 py-4 sm:px-5" style={getLoginDelayStyle(220 + (index * 120))}>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/30"><Icon className="size-4 text-foreground" /></div>
              <div className="space-y-1"><div className="text-sm font-medium text-foreground">{item.title}</div><div className="text-sm leading-6 text-muted-foreground">{item.description}</div></div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
