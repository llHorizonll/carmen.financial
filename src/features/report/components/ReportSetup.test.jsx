import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportSetup from './ReportSetup.jsx';

vi.mock('./ReportDetailsPanel.jsx', () => ({
  default: () => <div>Report Details Panel</div>,
}));

vi.mock('./ColumnsConfigurator.jsx', () => ({
  default: () => <div>Columns Configurator Content</div>,
}));

vi.mock('./RowsConfigurator.jsx', () => ({
  default: () => <div>Rows Configurator Content</div>,
}));

describe('ReportSetup', () => {
  it('shows columns by default and switches to rows on tab click', () => {
    render(
      <ReportSetup
        activeReport={{
          theme: 'blue',
          columns: [{ id: 'C1', isActive: true }],
          rows: [{ id: 'R1' }],
        }}
        activeCategories={['I']}
        reportOptions={{ themes: [{ id: 'blue', label: 'Classic Blue' }] }}
      />
    );

    expect(screen.getByText('Columns Configurator Content')).toBeInTheDocument();
    expect(screen.getByText('Rows Configurator Content')).toBeInTheDocument();
    expect(screen.getByText('Columns Configurator Content').closest('section')).not.toHaveAttribute('hidden');
    expect(screen.getByText('Rows Configurator Content').closest('section')).toHaveAttribute('hidden');

    fireEvent.click(screen.getByRole('tab', { name: /Rows/i }));

    expect(screen.getByText('Rows Configurator Content')).toBeInTheDocument();
    expect(screen.getByText('Rows Configurator Content').closest('section')).not.toHaveAttribute('hidden');
    expect(screen.getByText('Columns Configurator Content').closest('section')).toHaveAttribute('hidden');
  });
});
