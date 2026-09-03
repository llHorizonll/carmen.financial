import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReportView from './ReportView.jsx';
import { THEMES, getIndentClass } from '../lib/reportLogic.js';

describe('ReportView', () => {
  it('renders report headers and values', () => {
    render(
      <ReportView
        activeReport={{ name: 'P&L' }}
        displayCompanyLabel="Carmen Hotel"
        displayDateLabel="As of 2025-02-28"
        displayPeriodLabel="P2"
        reportData={[
          { id: 'r1', desc: 'Revenue', indent: 0, results: { C1: 123.45 }, isHeader: false, isTotal: false },
        ]}
        activeCols={[{ id: 'C1', label: 'Actual', width: '' }]}
        currentTheme={THEMES.blue}
        tableZoom={100}
        getIndentClass={getIndentClass}
      />
    );

    expect(screen.getByText('Carmen Hotel')).toBeInTheDocument();
    expect(screen.getByText('P&L')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('123.45')).toBeInTheDocument();
  });

  it('renders Description at the configured position', () => {
    render(
      <ReportView
        activeReport={{ name: 'P&L', descriptionPosition: 1, columns: [{ id: 'C1' }] }}
        displayCompanyLabel="Carmen Hotel"
        displayDateLabel="As of 2025-02-28"
        displayPeriodLabel="P2"
        reportData={[{ id: 'r1', desc: 'Revenue', results: { C1: 123.45 } }]}
        activeCols={[{ id: 'C1', label: 'Actual', width: '' }]}
        currentTheme={THEMES.blue}
        tableZoom={100}
        getIndentClass={getIndentClass}
      />
    );

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Actual', 'Description']);
  });

  it('preserves description indentation without conflicting horizontal padding', () => {
    render(
      <ReportView
        activeReport={{ name: 'P&L' }}
        displayCompanyLabel="Carmen Hotel"
        displayDateLabel="As of 2025-02-28"
        displayPeriodLabel="P2"
        reportData={[
          { id: 'r1', desc: 'Revenue', indent: 0, results: { C1: 0 } },
          { id: 'r2', desc: 'Room Revenue', indent: 2, results: { C1: 0 } },
        ]}
        activeCols={[{ id: 'C1', label: 'Actual', width: '' }]}
        currentTheme={THEMES.blue}
        tableZoom={100}
        getIndentClass={getIndentClass}
      />
    );

    const detailDescription = screen.getByText('Room Revenue');
    expect(detailDescription).toHaveClass('block', 'pl-8');
    expect(detailDescription.closest('td')).toHaveClass('px-3', 'sm:px-4');
  });

  it('hides inactive rows without removing them from report calculations', () => {
    render(
      <ReportView
        activeReport={{ name: 'P&L' }}
        displayCompanyLabel="Carmen Hotel"
        displayDateLabel="As of 2025-02-28"
        displayPeriodLabel="P2"
        reportData={[
          { id: 'r1', desc: 'Visible revenue', isActive: true, results: { C1: 100 } },
          { id: 'r2', desc: 'Hidden revenue', isActive: false, results: { C1: 50 } },
        ]}
        activeCols={[{ id: 'C1', label: 'Actual', width: '' }]}
        currentTheme={THEMES.blue}
        tableZoom={100}
        getIndentClass={getIndentClass}
      />
    );

    expect(screen.getByText('Visible revenue')).toBeInTheDocument();
    expect(screen.queryByText('Hidden revenue')).not.toBeInTheDocument();
  });
});
