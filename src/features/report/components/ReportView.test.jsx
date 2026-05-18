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
});
