import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportDashboard from './ReportDashboard.jsx';

const defaultProps = {
  activeReport: { name: 'Cash Flow Statement' },
  displayCompanyLabel: 'Carmen Hotel',
  displayDateLabel: 'As of 2026-01-31',
  displayPeriodLabel: 'Period 1',
  activeCols: [{ id: 'C1', label: 'Actual', logicType: 'DATA' }],
  viewMode: 'dashboard',
};

describe('ReportDashboard', () => {
  it('uses configured cash flow rows and exposes an icon-only view switcher', () => {
    const onViewModeChange = vi.fn();
    render(
      <ReportDashboard
        {...defaultProps}
        onViewModeChange={onViewModeChange}
        reportData={[
          { id: 'r1', desc: 'Total cash inflow', isTotal: true, results: { C1: 500 } },
          { id: 'r2', desc: 'Total cash outflow', isTotal: true, results: { C1: -200 } },
          { id: 'r3', desc: 'Net cash flow', isTotal: true, results: { C1: 300 } },
        ]}
      />,
    );

    expect(screen.getByText('Uses configured cash flow rows from this report.')).toBeInTheDocument();
    expect(screen.getAllByText('500.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('(200.00)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('300.00').length).toBeGreaterThan(0);

    const tableButton = screen.getByRole('button', { name: 'Show table view' });
    const dashboardButton = screen.getByRole('button', { name: 'Show dashboard view' });
    expect(tableButton).toHaveTextContent('');
    expect(dashboardButton).toHaveTextContent('');
    expect(dashboardButton).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(tableButton);
    expect(onViewModeChange).toHaveBeenCalledWith('table');
  });

  it('derives cash flow from positive and negative detail rows when cash rows are absent', () => {
    render(
      <ReportDashboard
        {...defaultProps}
        onViewModeChange={vi.fn()}
        reportData={[
          { id: 'h1', desc: 'STATISTICS', isHeader: true, results: { C1: 0 } },
          { id: 'r1', desc: 'Room receipts', results: { C1: 750 } },
          { id: 'r2', desc: 'Supplier payment', results: { C1: -250 } },
          { id: 'r3', desc: 'Operating total', isTotal: true, results: { C1: 500 } },
          { id: 'h2', desc: 'REVENUE', isHeader: true, results: { C1: 0 } },
          { id: 'r4', desc: 'Food revenue', results: { C1: 300 } },
          { id: 'r5', desc: 'Other revenue', results: { C1: 200 } },
        ]}
      />,
    );

    expect(screen.getByText('Derived from positive and negative detail rows.')).toBeInTheDocument();
    expect(screen.getAllByText('1,250.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('(250.00)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1,000.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Section totals')).toBeInTheDocument();
    expect(screen.getByText('STATISTICS')).toBeInTheDocument();
    expect(screen.getByText('REVENUE')).toBeInTheDocument();
    expect(screen.getAllByText('500.00').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('2 data rows')).toHaveLength(2);
  });

  it('switches every dashboard summary to the selected numeric column', () => {
    render(
      <ReportDashboard
        {...defaultProps}
        activeCols={[
          { id: 'C1', label: 'Actual', logicType: 'DATA' },
          { id: 'C2', label: 'Budget', logicType: 'DATA' },
        ]}
        onViewModeChange={vi.fn()}
        reportData={[
          { id: 'h1', desc: 'REVENUE', isHeader: true, results: { C1: 0, C2: 0 } },
          { id: 'r1', desc: 'Room revenue', results: { C1: 100, C2: 400 } },
          { id: 'r2', desc: 'Other revenue', results: { C1: -25, C2: -100 } },
        ]}
      />,
    );

    const columnSelect = screen.getByRole('combobox', { name: 'Dashboard value column' });
    expect(columnSelect).toHaveTextContent('Actual');
    expect(screen.getAllByText('75.00').length).toBeGreaterThan(0);

    fireEvent.click(columnSelect);
    fireEvent.click(screen.getByRole('option', { name: 'Budget' }));

    expect(columnSelect).toHaveTextContent('Budget');
    expect(screen.getAllByText('300.00').length).toBeGreaterThan(0);
    expect(screen.queryByText('75.00')).not.toBeInTheDocument();
  });

  it('shows an actionable empty state when there is no numeric column', () => {
    render(
      <ReportDashboard
        {...defaultProps}
        activeCols={[]}
        reportData={[]}
        onViewModeChange={vi.fn()}
      />,
    );

    expect(screen.getByText('No dashboard values available')).toBeInTheDocument();
    expect(screen.getByText(/Apply report filters/i)).toBeInTheDocument();
  });
});
