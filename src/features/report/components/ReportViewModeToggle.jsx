import React from 'react';
import { LayoutDashboard, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx';
import { cn } from '@/lib/utils.js';

const VIEW_MODES = [
  { id: 'table', label: 'Table view', icon: Table2 },
  { id: 'dashboard', label: 'Dashboard view', icon: LayoutDashboard },
];

export default function ReportViewModeToggle({ value, onChange, className }) {
  return (
    <TooltipProvider>
      <section
        className={cn('flex items-center gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5 print:hidden', className)}
        role="group"
        aria-label="Report view mode"
      >
        {VIEW_MODES.map(({ id, label, icon: Icon }) => {
          const isActive = value === id;
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className={cn(isActive && 'bg-background text-foreground shadow-sm hover:bg-background')}
                  aria-label={`Show ${label.toLowerCase()}`}
                  aria-pressed={isActive}
                  onClick={() => onChange(id)}
                >
                  <Icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </section>
    </TooltipProvider>
  );
}
