import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessUnitReportList, BusinessUnitTargetDialog, BusinessUnitSelector } from './BusinessUnitReports.jsx';
const catalog = { units: [{ id: 'a', name: 'Unit A' }, { id: 'b', name: 'Unit B' }], selected: ['a', 'b'], statuses: {} };
describe('business unit controls', () => {
  beforeEach(() => window.localStorage.clear());
  it('shows reports in separate groups and selects by tenant and report ID', () => {
    const select = vi.fn();
    render(<BusinessUnitReportList catalog={catalog} reports={[{ tenant: 'a', id: 'same', name: 'P&L' }, { tenant: 'b', id: 'same', name: 'P&L' }]}
      currentKey={JSON.stringify(['b', 'same'])} onSelect={select} />);
    expect(screen.getByRole('heading', { name: 'Unit A (1)', exact: true })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Unit B (1)', exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unit A (1)' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Unit B (1)' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Unit A (1)' }));
    expect(within(screen.getByRole('region', { name: 'Reports in b' })).getByRole('button', { name: 'P&L' })).toHaveAttribute('aria-current', 'page');
    expect(within(screen.getByRole('region', { name: 'Reports in a' })).getByRole('button', { name: 'P&L' })).not.toHaveAttribute('aria-current');
    fireEvent.click(within(screen.getByRole('region', { name: 'Reports in b' })).getByRole('button', { name: 'P&L' }));
    expect(select).toHaveBeenCalledWith(JSON.stringify(['b', 'same']));
  });
  it('keeps multiple groups open and restores collapsed preferences after remount', () => {
    const props = { catalog, reports: [{ tenant: 'a', id: 'one', name: 'Revenue' }, { tenant: 'b', id: 'two', name: 'Budget' }],
      currentKey: JSON.stringify(['a', 'one']), onSelect: vi.fn(), storageKey: 'navigation:user-a' };
    const { unmount } = render(<BusinessUnitReportList {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Unit B (1)' }));
    expect(screen.getByRole('button', { name: 'Revenue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Budget' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unit A (1)' }));
    expect(props.onSelect).not.toHaveBeenCalled();
    unmount();
    render(<BusinessUnitReportList {...props} />);
    expect(screen.getByRole('button', { name: 'Unit A (1)' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Unit B (1)' })).toHaveAttribute('aria-expanded', 'true');
  });
  it('searches across collapsed groups without changing the saved expansion state', () => {
    render(<BusinessUnitReportList catalog={catalog} reports={[
      { tenant: 'a', id: 'one', name: 'Revenue' }, { tenant: 'b', id: 'two', name: 'Room revenue' }, { tenant: 'b', id: 'three', name: 'Budget' },
    ]} currentKey={JSON.stringify(['a', 'one'])} onSelect={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Room revenue' })).not.toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: 'Search reports...' });
    fireEvent.change(search, { target: { value: ' REVENUE ' } });
    expect(screen.getByRole('button', { name: 'Room revenue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unit B (1/2)' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('button', { name: 'Budget' })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'no-match' } });
    expect(screen.getByText('No matching reports.')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Unit B (2)' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Revenue' })).toBeInTheDocument();
  });
  it('keeps loading and errors visible during search and tolerates invalid stored preferences', () => {
    window.localStorage.setItem('carmen_report_navigation', 'null');
    render(<BusinessUnitReportList catalog={{ ...catalog, statuses: { a: { error: 'Access denied' }, b: { loading: true } } }}
      reports={[]} onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'profit' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Access denied');
    expect(screen.getByText('Loading reports…')).toBeInTheDocument();
    expect(screen.queryByText('No matching reports.')).not.toBeInTheDocument();
  });
  it('shows only BU options without combine or view all', () => {
    const select = vi.fn();
    render(<BusinessUnitSelector catalog={catalog} onChange={select} />);
    expect(screen.getByRole('button')).toHaveTextContent('Unit A, Unit B');
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'Unit A', exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unit B', exact: true }));
    expect(select).toHaveBeenCalledWith(['a']);
    expect(screen.queryByText('b - Unit B')).not.toBeInTheDocument();
    expect(screen.queryByText('view all')).not.toBeInTheDocument();
    expect(screen.queryByText('Combine reports')).not.toBeInTheDocument();
  });
  it('requires one explicit destination for creation', () => {
    const select = vi.fn();
    render(<BusinessUnitTargetDialog open units={catalog.units} onSelect={select} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Unit B · b' }));
    expect(select).toHaveBeenCalledWith('b');
  });
});
