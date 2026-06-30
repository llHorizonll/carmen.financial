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
        'inline-flex w-full flex-wrap items-center gap-1 rounded-2xl border border-border bg-stone-100/80 p-1 dark:bg-muted/40',
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
                ? 'bg-stone-100 text-stone-900 shadow-sm ring-1 ring-stone-300 dark:bg-stone-900 dark:text-stone-100 dark:ring-stone-700'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-muted-foreground dark:hover:bg-background/70 dark:hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
