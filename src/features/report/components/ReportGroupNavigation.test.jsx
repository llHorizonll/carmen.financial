import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportGroupNavigation, { getReportGroup } from './ReportGroupNavigation.jsx';

describe('report group navigation', () => {
  beforeEach(() => window.localStorage.clear());
  it('uses explicit groups and sensible defaults for existing reports', () => {
    expect(getReportGroup({ reportGroup: ' Operations ' })).toBe('Operations');
    expect(getReportGroup({ reportType: 'Daily' })).toBe('Daily Report');
    expect(getReportGroup({ category: ['B'] })).toBe('BL Report');
    expect(getReportGroup({ category: ['I'] })).toBe('P&L Report');
    expect(getReportGroup({ reportGroup: 'Daily Group Report' })).toBe('Daily Report');
  });

  it('collapses folders and selects the correct tenant report', () => {
    const onSelect = vi.fn();
    const currentKey = JSON.stringify(['a', '1']);
    render(<ReportGroupNavigation reports={[
      { tenant: 'a', id: '1', name: 'Spa', reportGroup: 'Operations' },
      { tenant: 'b', id: '1', name: 'OOD', reportGroup: 'Operations' },
    ]} currentKey={currentKey} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'Spa' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'OOD' }));
    expect(onSelect).toHaveBeenCalledWith(JSON.stringify(['b', '1']));
    fireEvent.click(screen.getByRole('button', { name: 'Operations' }));
    expect(screen.getByRole('button', { name: 'Operations' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Spa' })).not.toBeInTheDocument();
  });
  const reports = [
    { tenant: 'a', id: '1', name: 'Spa', reportGroup: 'Operations' },
    { tenant: 'a', id: '2', name: 'Daily', reportGroup: 'Daily Group Report' },
  ];
  it('moves a report by drop, retaining its original tenant identity', async () => {
    const onMove = vi.fn().mockResolvedValue(undefined);
    render(<ReportGroupNavigation reports={reports} onSelect={vi.fn()} onMoveReport={onMove} />);
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(screen.getByRole('button', { name: 'Spa', exact: true }), { dataTransfer });
    fireEvent.dragOver(screen.getByRole('button', { name: 'Daily Report', exact: true }), { dataTransfer });
    fireEvent.drop(screen.getByRole('button', { name: 'Daily Report', exact: true }), { dataTransfer });
    await waitFor(() => expect(onMove).toHaveBeenCalledWith(reports[0], 'Daily Report'));
  });
  it('keeps the report in place and shows failed saves', async () => {
    render(<ReportGroupNavigation reports={reports} onSelect={vi.fn()} onMoveReport={vi.fn().mockRejectedValue(new Error('Save failed'))} />);
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(screen.getByRole('button', { name: 'Spa', exact: true }), { dataTransfer });
    fireEvent.dragOver(screen.getByRole('button', { name: 'Daily Report', exact: true }), { dataTransfer });
    fireEvent.drop(screen.getByRole('button', { name: 'Daily Report', exact: true }), { dataTransfer });
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(screen.getByRole('button', { name: 'Spa', exact: true })).toBeInTheDocument();
  });
  it('does not allow moving reports without edit permission', () => {
    render(<ReportGroupNavigation reports={reports} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Spa', exact: true })).toHaveAttribute('draggable', 'false');
  });

  it('keeps group headers fixed and draggable handles on reports only', () => {
    render(<ReportGroupNavigation reports={reports} onSelect={vi.fn()} onMoveReport={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Reorder group/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Operations', exact: true })).not.toHaveAttribute('draggable', 'true');
    expect(screen.getByRole('button', { name: 'Spa', exact: true })).toHaveAttribute('draggable', 'true');
  });

  it('allows creating a new group and dropping a report into it', async () => {
    const onMove = vi.fn().mockResolvedValue(undefined);
    render(<ReportGroupNavigation reports={reports} onSelect={vi.fn()} onMoveReport={onMove} storageKey="test_groups" />);

    fireEvent.click(screen.getByRole('button', { name: 'New folder' }));
    const input = screen.getByPlaceholderText('Folder name');
    fireEvent.change(input, { target: { value: 'Management' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));

    // Verify Management group folder appears
    expect(screen.getByRole('button', { name: 'Management', exact: true })).toBeInTheDocument();

    // Drag Spa into Management group
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(screen.getByRole('button', { name: 'Spa', exact: true }), { dataTransfer });
    fireEvent.dragOver(screen.getByRole('button', { name: 'Management', exact: true }), { dataTransfer });
    fireEvent.drop(screen.getByRole('button', { name: 'Management', exact: true }), { dataTransfer });

    await waitFor(() => expect(onMove).toHaveBeenCalledWith(reports[0], 'Management'));
  });

  it('auto-expands the collapsed folder under the dragged report, not one it passed over', () => {
    vi.useFakeTimers();
    try {
      render(<ReportGroupNavigation reports={[...reports, { tenant: 'a', id: '3', name: 'Budget', reportGroup: 'Finance' }]}
        onSelect={vi.fn()} onMoveReport={vi.fn()} />);
      const button = (name) => screen.getByRole('button', { name, exact: true });
      fireEvent.click(button('Operations'));
      fireEvent.click(button('Finance'));
      const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
      fireEvent.dragStart(button('Daily'), { dataTransfer });
      fireEvent.dragOver(button('Operations'), { dataTransfer });
      act(() => vi.advanceTimersByTime(200));
      fireEvent.dragOver(button('Finance'), { dataTransfer });
      act(() => vi.advanceTimersByTime(500));
      expect(button('Finance')).toHaveAttribute('aria-expanded', 'true');
      expect(button('Operations')).toHaveAttribute('aria-expanded', 'false');
    } finally {
      vi.useRealTimers();
    }
  });

  it('supports expanding and collapsing all groups', () => {
    render(<ReportGroupNavigation reports={reports} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Spa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Daily' })).toBeInTheDocument();

    // Collapse all
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(screen.queryByRole('button', { name: 'Spa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Daily' })).not.toBeInTheDocument();

    // Expand all
    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(screen.getByRole('button', { name: 'Spa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Daily' })).toBeInTheDocument();
  });

  it('allows filtering reports with search input', () => {
    const manyReports = [
      { tenant: 'a', id: '1', name: 'Spa Revenue', reportGroup: 'Operations' },
      { tenant: 'a', id: '2', name: 'Room Daily', reportGroup: 'Daily Group Report' },
      { tenant: 'a', id: '3', name: 'F&B Daily', reportGroup: 'Daily Group Report' },
      { tenant: 'a', id: '4', name: 'Spa Expenses', reportGroup: 'Operations' },
    ];
    render(<ReportGroupNavigation reports={manyReports} onSelect={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText(/Search reports/i);
    fireEvent.change(searchInput, { target: { value: 'Room' } });

    expect(screen.getByRole('button', { name: 'Room Daily' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Spa Revenue' })).not.toBeInTheDocument();
  });
});

describe('report group navigation labels', () => {
  it('never shows the word Group in the sidebar', () => {
    const { container } = render(<ReportGroupNavigation reports={[
      { tenant: 'a', id: '1', name: 'Spa', reportGroup: 'Daily Group Report' },
      { tenant: 'a', id: '2', name: 'Balance', category: ['B'] },
    ]} onSelect={vi.fn()} onMoveReport={vi.fn()} />);
    expect(container.textContent).not.toMatch(/group/i);
    expect(screen.getByRole('button', { name: 'Daily Report', exact: true })).toBeInTheDocument();
  });
});
