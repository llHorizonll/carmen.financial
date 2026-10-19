import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReportFiltersPanel from './ReportFiltersPanel.jsx';

describe('ReportFiltersPanel', () => {
  it('keeps applied filters visible while collapsing mobile controls', () => {
    render(<ReportFiltersPanel isMobile summary="2026 · P2" pending><button>Apply</button></ReportFiltersPanel>);
    expect(screen.getByText('2026 · P2')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Filters changed');
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('button', { name: 'Apply' })).toBeVisible();
  });
  it('shows desktop controls without requiring expansion', () => {
    render(<ReportFiltersPanel isMobile={false} summary="2026 · P2"><button>Apply</button></ReportFiltersPanel>);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
