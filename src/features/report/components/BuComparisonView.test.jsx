import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BuComparisonView from './BuComparisonView.jsx';
import { getIndentClass, THEMES } from '../lib/reportLogic.js';

describe('comparison table layout', () => {
  it('groups existing multiline columns, pins Description, and matches rows by identity', () => {
    const report = { name: 'P&L', columns: [{ id: 'c1', label: 'TODAY\nActual', isActive: true }], rows: [
      { id: 'hidden', desc: 'Hidden', isActive: false }, { id: 'r1', desc: 'Revenue', isActive: true },
    ] };
    const groups = ['A', 'B'].map((tenant, i) => ({ tenant, name: `Hotel ${tenant}`, currency: 'THB', rows: [
      { id: 'hidden', results: { c1: 999 } }, { id: 'r1', results: { c1: (i + 1) * 100 } },
    ] }));
    render(<BuComparisonView activeReport={report} groups={groups} displayCompanyLabel="Hotels" displayDateLabel="2026" displayPeriodLabel="P2" currentTheme={THEMES.blue} getIndentClass={getIndentClass} />);
    const results = screen.getByRole('region', { name: 'Comparison results' });
    const table = within(results).getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Description' })).toHaveAttribute('rowspan', '2');
    expect(within(table).getByRole('columnheader', { name: 'Description' })).toHaveClass('sticky', 'left-0');
    expect(within(table).getByRole('columnheader', { name: 'Hotel A (THB)' })).toHaveAttribute('scope', 'colgroup');
    expect(within(table).getAllByText('TODAY\nActual', { exact: true, collapseWhitespace: false })[0]).toHaveClass('whitespace-pre-line');
    expect(within(table).getByText('100.00')).toBeInTheDocument();
    expect(within(table).getByText('200.00')).toBeInTheDocument();
    expect(within(table).queryByText('999.00')).not.toBeInTheDocument();
    expect(results).toHaveClass('min-w-0', 'overflow-auto', 'print:hidden');
    expect(table.parentElement).toHaveClass('overflow-visible');
  });
});
