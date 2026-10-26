import React, { useId, useRef, useState, useEffect, useMemo } from 'react';
import { Collapsible } from 'radix-ui';
import {
  AlertCircle,
  Check,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Loader2,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { reportKey } from '../hooks/useBusinessUnitReports.js';
import { useTranslation } from '@/lib/i18n.js';

export const DEFAULT_REPORT_GROUPS = ['P&L Report', 'BL Report', 'Daily Report'];

// Earlier builds saved default folders with the word "Group"; fold them into the current names.
const LEGACY_GROUP_NAMES = {
  'p&l group report': 'P&L Report',
  'bl group report': 'BL Report',
  'daily group report': 'Daily Report',
};

const normalizeGroupName = (value) => {
  const trimmed = String(value || '').trim();
  return LEGACY_GROUP_NAMES[trimmed.toLowerCase()] || trimmed;
};

export const getReportGroup = (report) =>
  normalizeGroupName(report?.reportGroup) ||
  (report?.reportType === 'Daily'
    ? 'Daily Report'
    : report?.category?.length === 1 && report?.category[0] === 'B'
    ? 'BL Report'
    : 'P&L Report');

const loadCustomGroups = (key) => {
  if (!key || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${key}:custom_groups`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeGroupName).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const saveCustomGroups = (key, list) => {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${key}:custom_groups`, JSON.stringify(list));
  } catch {}
};

function ReportFolder({
  name,
  items,
  currentKey,
  onSelect,
  onMove,
  busy,
  isCustom,
  onDeleteGroup,
  startReportDrag,
  endReportDrag,
  acceptReportDrag,
  dropReport,
  overGroup,
  draggedKey,
  isOpen,
  onToggleOpen,
}) {
  const t = useTranslation();
  const contentId = useId();
  const isDropTarget = overGroup === name;
  const FolderIcon = isOpen ? FolderOpen : Folder;

  return (
    <div
      onDragOver={(e) => acceptReportDrag(e, name)}
      onDrop={(e) => dropReport(e, name)}
      data-report-drop={isDropTarget || undefined}
      className={`min-w-0 rounded-md transition-colors ${
        isDropTarget ? 'bg-primary/10 ring-1 ring-inset ring-primary/40' : ''
      }`}
    >
      <Collapsible.Root open={isOpen} onOpenChange={onToggleOpen}>
        <div className="group/folder flex items-center">
          <Collapsible.Trigger asChild>
            <Button
              variant="ghost"
              aria-label={name}
              aria-controls={contentId}
              onDragOver={(e) => acceptReportDrag(e, name)}
              onDrop={(e) => dropReport(e, name)}
              className={`h-8 min-w-0 flex-1 justify-start gap-1.5 rounded-md px-1.5 text-xs font-semibold hover:bg-sidebar-accent ${
                isDropTarget ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ChevronRight
                aria-hidden="true"
                className={`size-3.5 shrink-0 opacity-70 motion-safe:transition-transform motion-safe:duration-150 ${
                  isOpen ? 'rotate-90' : ''
                }`}
              />
              <FolderIcon aria-hidden="true" className={`size-4 shrink-0 ${isDropTarget ? 'text-primary' : ''}`} />
              <span className="min-w-0 flex-1 truncate text-left">{name}</span>
              <span aria-hidden="true" className="shrink-0 text-[11px] font-medium tabular-nums opacity-70">
                {items.length}
              </span>
            </Button>
          </Collapsible.Trigger>

          {isCustom && items.length === 0 && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${t('Delete folder')} ${name}`}
              title={t('Delete folder')}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteGroup(name);
              }}
              className="size-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>

        <Collapsible.Content id={contentId} asChild>
          <div className="ml-3.5 flex flex-col gap-0.5 border-l border-border py-0.5 pl-1.5">
            {items.length === 0 ? (
              <div
                onDragOver={(e) => acceptReportDrag(e, name)}
                onDrop={(e) => dropReport(e, name)}
                className={`my-0.5 rounded-md border border-dashed px-2 py-2 text-[11px] leading-tight ${
                  isDropTarget
                    ? 'border-primary/60 text-primary'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {t('Drag reports here')}
              </div>
            ) : (
              items.map((report) => {
                const key = reportKey(report);
                const isCurrent = currentKey === key;
                const isDragged = draggedKey === key;
                return (
                  <Button
                    key={key}
                    variant="ghost"
                    draggable={Boolean(onMove) && !busy}
                    onDragStart={(event) => startReportDrag(event, report)}
                    onDragEnd={endReportDrag}
                    aria-current={isCurrent ? 'page' : undefined}
                    aria-label={report.name}
                    title={report.name}
                    onClick={() => onSelect(key)}
                    className={`group/report h-8 w-full min-w-0 justify-start gap-2 overflow-hidden rounded-md px-2 text-left text-sm font-normal ${
                      isCurrent
                        ? 'bg-primary font-medium text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                        : 'text-foreground/85 hover:bg-sidebar-accent hover:text-foreground'
                    } ${isDragged ? 'opacity-40' : ''}`}
                  >
                    <FileText
                      aria-hidden="true"
                      className={`size-4 shrink-0 ${isCurrent ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                    />
                    <span className="min-w-0 flex-1 truncate">{report.name}</span>
                    {onMove && (
                      <GripVertical
                        aria-hidden="true"
                        className={`size-3.5 shrink-0 cursor-grab opacity-0 group-hover/report:opacity-100 group-focus-visible/report:opacity-100 active:cursor-grabbing ${
                          isCurrent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}
                      />
                    )}
                  </Button>
                );
              })
            )}
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  );
}

export default function ReportGroupNavigation({
  reports,
  currentKey,
  onSelect,
  storageKey,
  onMoveReport,
  moveDisabledReason,
}) {
  const t = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [overGroup, setOverGroup] = useState(null);
  const [draggedKey, setDraggedKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [customGroups, setCustomGroups] = useState(() => loadCustomGroups(storageKey));
  const [folderOpenMap, setFolderOpenMap] = useState({});

  const draggedReport = useRef(null);
  const moving = useRef(false);
  const autoExpandTimer = useRef(null);

  useEffect(() => {
    setCustomGroups(loadCustomGroups(storageKey));
  }, [storageKey]);

  useEffect(() => () => {
    if (autoExpandTimer.current) clearTimeout(autoExpandTimer.current);
  }, []);

  const groups = useMemo(() => {
    const map = new Map();
    customGroups.forEach((name) => {
      if (name && !map.has(name)) map.set(name, []);
    });
    reports.forEach((report) => {
      const name = getReportGroup(report);
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(report);
    });
    return map;
  }, [reports, customGroups]);

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return groups;
    const filtered = new Map();
    groups.forEach((items, name) => {
      const nameMatches = name.toLowerCase().includes(query);
      const matchingReports = items.filter((r) => (r.name || '').toLowerCase().includes(query));
      if (nameMatches || matchingReports.length > 0) {
        filtered.set(name, nameMatches ? items : matchingReports);
      }
    });
    return filtered;
  }, [groups, searchQuery]);

  const filteredNames = useMemo(() => [...filteredGroups.keys()], [filteredGroups]);

  const allOpen = useMemo(
    () => filteredNames.every((name) => folderOpenMap[name] !== false),
    [filteredNames, folderOpenMap],
  );

  const toggleAllOpen = () => {
    const nextState = !allOpen;
    const updated = {};
    filteredNames.forEach((name) => {
      updated[name] = nextState;
    });
    setFolderOpenMap(updated);
  };

  const handleToggleGroup = (groupName, open) => {
    setFolderOpenMap((prev) => ({ ...prev, [groupName]: open }));
  };

  const cancelCreateGroup = () => {
    setIsCreatingGroup(false);
    setNewGroupName('');
  };

  const handleCreateGroup = () => {
    const trimmed = normalizeGroupName(newGroupName);
    if (!trimmed) return;
    if (!customGroups.includes(trimmed)) {
      const updated = [...customGroups, trimmed];
      setCustomGroups(updated);
      saveCustomGroups(storageKey, updated);
      setFolderOpenMap((prev) => ({ ...prev, [trimmed]: true }));
    }
    cancelCreateGroup();
  };

  const handleDeleteGroup = (groupName) => {
    const updated = customGroups.filter((g) => g !== groupName);
    setCustomGroups(updated);
    saveCustomGroups(storageKey, updated);
  };

  const move = async (report, target) => {
    if (!onMoveReport || moving.current || getReportGroup(report) === target) return;
    moving.current = true;
    setBusy(true);
    setError('');
    try {
      await onMoveReport(report, target);
    } catch (failure) {
      setError(failure.message || t('Unable to move report. Please try again.'));
    } finally {
      moving.current = false;
      setBusy(false);
    }
  };

  const startReportDrag = (event, report) => {
    if (!onMoveReport || busy) {
      event.preventDefault();
      return;
    }
    event.stopPropagation();
    draggedReport.current = report;
    setDraggedKey(reportKey(report));
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', reportKey(report));
  };

  const endReportDrag = () => {
    draggedReport.current = null;
    setDraggedKey(null);
    setOverGroup(null);
    if (autoExpandTimer.current) {
      clearTimeout(autoExpandTimer.current);
      autoExpandTimer.current = null;
    }
  };

  const acceptReportDrag = (event, targetGroupName) => {
    if (!draggedReport.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    if (targetGroupName && overGroup !== targetGroupName) {
      setOverGroup(targetGroupName);
      clearTimeout(autoExpandTimer.current);
      autoExpandTimer.current = null;
      if (folderOpenMap[targetGroupName] === false) {
        autoExpandTimer.current = setTimeout(() => {
          setFolderOpenMap((prev) => ({ ...prev, [targetGroupName]: true }));
          autoExpandTimer.current = null;
        }, 500);
      }
    }
  };

  const dropReport = (event, targetGroupName) => {
    if (!draggedReport.current) return;
    event.preventDefault();
    event.stopPropagation();
    const report = draggedReport.current;
    const target = targetGroupName || overGroup;
    endReportDrag();
    if (target) void move(report, target);
  };

  const showSearch = reports.length > 3;
  const expandLabel = allOpen ? t('Collapse all') : t('Expand all');

  return (
    <nav aria-label="Report groups" className="flex min-w-0 flex-col gap-1">
      {(showSearch || filteredNames.length > 1 || onMoveReport) && (
        <div className="flex items-center gap-1 pb-1">
          {showSearch ? (
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('Search reports...')}
                aria-label={t('Search reports...')}
                className="h-8 bg-background pr-7 pl-8 text-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery('')}
                  aria-label={t('Clear search')}
                  className="absolute top-1/2 right-1 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
          ) : (
            <span className="flex-1" />
          )}
          {filteredNames.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAllOpen}
              title={expandLabel}
              aria-label={expandLabel}
              className="size-8 shrink-0 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              {allOpen ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
            </Button>
          )}
          {onMoveReport && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCreatingGroup(true)}
              title={t('New folder')}
              aria-label={t('New folder')}
              className="size-8 shrink-0 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <FolderPlus className="size-4" />
            </Button>
          )}
        </div>
      )}

      {isCreatingGroup && (
        <div className="flex items-center gap-1 rounded-md border border-input bg-background p-1 focus-within:ring-2 focus-within:ring-ring/40">
          <FolderPlus aria-hidden="true" className="ml-1 size-4 shrink-0 text-muted-foreground" />
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateGroup();
              if (e.key === 'Escape') cancelCreateGroup();
            }}
            maxLength={100}
            placeholder={t('Folder name')}
            aria-label={t('Folder name')}
            className="h-7 min-w-0 flex-1 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
            autoFocus
          />
          <Button
            size="icon"
            className="size-7 shrink-0"
            onClick={handleCreateGroup}
            disabled={!newGroupName.trim()}
            aria-label={t('Add')}
            title={t('Add')}
          >
            <Check className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={cancelCreateGroup}
            aria-label={t('Cancel')}
            title={t('Cancel')}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {moveDisabledReason && (
        <p className="px-1.5 text-[11px] leading-snug text-muted-foreground" role="status">
          {moveDisabledReason}
        </p>
      )}

      {busy && (
        <p className="flex items-center gap-1.5 px-1.5 text-[11px] text-muted-foreground" role="status">
          <Loader2 className="size-3 motion-safe:animate-spin" />
          {t('Moving report…')}
        </p>
      )}

      {error && (
        <p className="flex items-start gap-1.5 px-1.5 text-[11px] leading-snug text-destructive" role="alert">
          <AlertCircle className="mt-px size-3 shrink-0" />
          {error}
        </p>
      )}

      {filteredNames.length === 0 ? (
        searchQuery && (
          <p className="px-1.5 py-4 text-center text-xs text-muted-foreground">{t('No matching reports.')}</p>
        )
      ) : (
        <div className="flex min-w-0 flex-col gap-0.5">
          {filteredNames.map((name) => (
            <ReportFolder
              key={name}
              name={name}
              items={filteredGroups.get(name) || []}
              currentKey={currentKey}
              onSelect={onSelect}
              busy={busy}
              onMove={onMoveReport ? move : null}
              isCustom={customGroups.includes(name)}
              onDeleteGroup={handleDeleteGroup}
              overGroup={overGroup}
              draggedKey={draggedKey}
              isOpen={folderOpenMap[name] !== false}
              onToggleOpen={(open) => handleToggleGroup(name, open)}
              startReportDrag={startReportDrag}
              endReportDrag={endReportDrag}
              acceptReportDrag={acceptReportDrag}
              dropReport={dropReport}
            />
          ))}
        </div>
      )}

      {onMoveReport && !moveDisabledReason && filteredNames.length > 0 && (
        <p className="px-1.5 pt-1 text-[11px] leading-snug text-muted-foreground/80">
          {t('Drag a report onto a folder to move it.')}
        </p>
      )}
    </nav>
  );
}
