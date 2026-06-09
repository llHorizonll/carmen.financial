import React from 'react';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils.js';

export default function ShellTemplateSwitcher({
  value,
  options = [],
  onChange,
}) {
  return (
    <div className="w-full rounded-2xl border bg-background p-2.5 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full border-0 bg-muted/60 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Template
          </Badge>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Compare</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{options.length} presets</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {options.map((option) => {
          const preview = Array.isArray(option.preview) && option.preview.length > 0
            ? option.preview
            : [];
          return (
            <Button
              key={option.id}
              type="button"
              variant="outline"
              aria-pressed={value === option.id}
              className={cn(
                'h-auto min-h-[4.75rem] w-full justify-start rounded-2xl border px-3 py-2 text-left shadow-none transition-all',
                'hover:-translate-y-px hover:border-primary/40 hover:bg-muted/40',
                value === option.id
                  ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20'
                  : 'border-border bg-background',
              )}
              onClick={() => onChange(option.id)}
              title={option.description}
            >
              <div className="flex w-full items-start gap-3">
                <div className="mt-0.5 flex shrink-0 overflow-hidden rounded-lg border border-border">
                  {preview.slice(0, 4).map((color, index) => (
                    <span
                      key={`${option.id}-swatch-${index}`}
                      className="h-8 w-3"
                      style={{ background: color }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{option.shortLabel || option.label}</span>
                    {value === option.id && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-primary-foreground">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="max-h-10 overflow-hidden text-xs leading-5 text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
