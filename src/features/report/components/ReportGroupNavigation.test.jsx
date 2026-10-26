import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportGroupNavigation, { getReportGroup } from './ReportGroupNavigation.jsx';

describe('report group navigation', () => {
  it('uses explicit groups and sensible defaults for existing reports', () => {
    expect(getReportGroup({ reportGroup: ' Operations ' })).toBe('Operations');
    expect(getReportGroup({ reportType: 'Daily' })).toBe('Daily Group Report');
    expect(getReportGroup({ category: ['B'] })).toBe('BL Group Report');
    expect(getReportGroup({ category: ['I'] })).toBe('P&L Group Report');
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
});
