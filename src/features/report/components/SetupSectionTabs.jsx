import React from 'react';
import { Tabs } from 'radix-ui';
import { cn } from '@/lib/utils.js';

export default function SetupSectionTabs({
  items,
  activeKey,
  onChange,
  className = '',
}) {
  return (
    <Tabs.Root asChild value={activeKey} onValueChange={onChange}>
      <section className={cn('w-full', className)}>
        <Tabs.List asChild aria-label="Setup section tabs">
          <nav className="flex w-full items-center gap-1 rounded-lg border border-border bg-muted/60 p-1">
            {items.map((item) => (
              <Tabs.Trigger
                key={item.key}
                value={item.key}
                onClick={() => onChange(item.key)}
                aria-controls={item.panelId}
                id={item.tabId}
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span>{item.label} <span className="tabular-nums">({item.count})</span></span>
                {item.isDirty ? (
                  <span
                    className="size-2 shrink-0 rounded-full bg-amber-500"
                    aria-label={`Unsaved changes in ${item.label}`}
                    title={`Unsaved changes in ${item.label}`}
                  />
                ) : null}
              </Tabs.Trigger>
            ))}
          </nav>
        </Tabs.List>
      </section>
    </Tabs.Root>
  );
}
