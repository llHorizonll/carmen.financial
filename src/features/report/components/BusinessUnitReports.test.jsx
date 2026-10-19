import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessUnitReportList, BusinessUnitTargetDialog, BusinessUnitSelector } from './BusinessUnitReports.jsx';
const catalog = { units: [{ id: 'a', name: 'Unit A' }, { id: 'b', name: 'Unit B' }], selected: ['a', 'b'], statuses: {} };
describe('business unit controls', () => {
  beforeEach(() => window.localStorage.clear());
  it('shows only the selected BU reports without search or accordion', () => {
    const select = vi.fn();
    render(<BusinessUnitReportList catalog={{ ...catalog, selected: ['b'] }} reports={[{ tenant: 'a', id: 'same', name: 'A report' }, { tenant: 'b', id: 'same', name: 'P&L' }]}
      currentKey={JSON.stringify(['b', 'same'])} onSelect={select} />);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByText('A report')).not.toBeInTheDocument();
    const report = screen.getByRole('button', { name: 'P&L' });
    expect(report).toHaveAttribute('aria-current', 'page');
    fireEvent.click(report);
    expect(select).toHaveBeenCalledWith(JSON.stringify(['b', 'same']));
  });
  it.each([{ loading: true }, { error: 'Access denied' }])('shows selected BU status %j', (status) => {
    render(<BusinessUnitReportList catalog={{ ...catalog, selected: ['a'], statuses: { a: status } }} reports={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(status.error || 'Loading reports…')).toBeInTheDocument();
    expect(screen.queryByText('No reports available.')).not.toBeInTheDocument();
  });
  it('selects exactly one BU without search', async () => {
    const select = vi.fn();
    render(<BusinessUnitSelector catalog={{ ...catalog, selected: ['a'] }} onChange={select} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'BU' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Unit B' }));
    expect(select).toHaveBeenCalledWith(['b']);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
  it('requires one explicit destination for creation', () => {
    const select = vi.fn();
    render(<BusinessUnitTargetDialog open units={catalog.units} onSelect={select} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Unit B · b' }));
    expect(select).toHaveBeenCalledWith('b');
  });
});
