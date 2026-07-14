import React from 'react';
import { cn } from '@/lib/utils.js';

export default function SetupSectionTabs({
  items,
  activeKey,
  onChange,
  className = '',
}) {
  return (
    <div
      className={cn(
        'inline-flex w-full flex-wrap items-center gap-1 rounded-2xl border border-border bg-muted/60 p-1 backdrop-blur-xs',
        className,
      )}
      role="tablist"
      aria-label="Setup section tabs"
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={item.panelId}
            id={item.tabId}
            onClick={() => onChange(item.key)}
            className={cn(
              'inline-flex min-h-9 flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20'
                : 'text-muted-foreground hover:bg-background hover:text-foreground transition-all duration-150',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
