import React, { useState } from 'react';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { FileText, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { reportKey } from '../hooks/useBusinessUnitReports.js';

export const getReportGroup = (report) => String(report.reportGroup || '').trim()
  || (report.reportType === 'Daily' ? 'Daily Group Report'
    : report.category?.length === 1 && report.category[0] === 'B' ? 'BL Group Report' : 'P&L Group Report');

function ReportFolder({ name, items, currentKey, onSelect }) {
  const [open, setOpen] = useState(true);
  return <Collapsible isOpen={open} onOpenChange={setOpen}
    trigger={<HStack gap={2}><Folder className="size-4 shrink-0" /><Text type="label" color="inherit">{name}</Text></HStack>}>
    {open && <VStack gap={1} paddingInline={2}>
      {items.map((report) => <Button key={reportKey(report)} variant="ghost"
        className="w-full min-w-0 justify-start overflow-hidden text-foreground aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
        aria-current={currentKey === reportKey(report) ? 'page' : undefined}
        onClick={() => onSelect(reportKey(report))} title={report.name}>
        <FileText className="size-4 shrink-0" /><Text type="inherit" color="inherit" maxLines={1}>{report.name}</Text>
      </Button>)}
    </VStack>}
  </Collapsible>;
}

export default function ReportGroupNavigation({ reports, currentKey, onSelect }) {
  const groups = new Map();
  reports.forEach((report) => {
    const name = getReportGroup(report);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(report);
  });
  return <VStack gap={1} as="nav" aria-label="Report groups">
    {[...groups].map(([name, items]) => <ReportFolder key={name} name={name} items={items}
      currentKey={currentKey} onSelect={onSelect} />)}
  </VStack>;
}
