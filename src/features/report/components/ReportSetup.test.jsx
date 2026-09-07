import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows columns by default and switches to rows on tab click', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <ReportSetup
        activeReport={{
          theme: 'blue',
          columns: [{ id: 'C1', isActive: true }],
          rows: [{ id: 'R1' }],
        }}
        activeCategories={['I']}
        reportOptions={{ themes: [{ id: 'blue', label: 'Classic Blue' }] }}
        isDirty
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel changes' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();

    expect(screen.getByText('Columns Configurator Content')).toBeInTheDocument();
    expect(screen.queryByText('Rows Configurator Content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Rows/i }));

    expect(screen.getByText('Rows Configurator Content')).toBeInTheDocument();
    expect(screen.queryByText('Columns Configurator Content')).not.toBeInTheDocument();
  });

  it('shows configured totals, marks dirty sections, and restores the last setup tab', () => {
    const savedReport = {
      id: 'room',
      theme: 'blue',
      columns: [
        { id: 'C1', label: 'Actual', isActive: true },
        { id: 'C2', label: 'Hidden', isActive: false },
      ],
      rows: [
        { id: 'R1', desc: 'Revenue', isActive: true },
        { id: 'R2', desc: 'Hidden row', isActive: false },
      ],
    };
    const draftReport = {
      ...savedReport,
      columns: savedReport.columns.map((column) => (
        column.id === 'C1' ? { ...column, label: 'MTD Actual' } : column
      )),
    };
    const commonProps = {
      activeReport: draftReport,
      savedReport,
      activeCategories: ['I'],
      reportOptions: { themes: [{ id: 'blue', label: 'Classic Blue' }] },
      isDirty: true,
      onSave: vi.fn(),
      onCancel: vi.fn(),
    };

    const firstRender = render(<ReportSetup {...commonProps} />);

    expect(screen.getByText('2 Columns configured')).toBeInTheDocument();
    expect(screen.getByLabelText('Unsaved changes in Columns')).toBeInTheDocument();
    expect(screen.getByLabelText('Report setup controls')).toHaveClass('sticky', 'top-0');

    fireEvent.click(screen.getByRole('tab', { name: /Rows/i }));

    expect(screen.getByText('2 Rows configured')).toBeInTheDocument();
    expect(window.localStorage.getItem('carmen.report-setup.active-section.v1')).toBe('"rows"');
    firstRender.unmount();

    render(<ReportSetup {...commonProps} />);

    expect(screen.getByText('Rows Configurator Content')).toBeInTheDocument();
    expect(screen.queryByText('Columns Configurator Content')).not.toBeInTheDocument();
  });
});
