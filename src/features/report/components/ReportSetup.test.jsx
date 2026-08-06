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
    expect(screen.getByText('Rows Configurator Content')).toBeInTheDocument();
    expect(screen.getByText('Columns Configurator Content').closest('section')).not.toHaveAttribute('hidden');
    expect(screen.getByText('Rows Configurator Content').closest('section')).toHaveAttribute('hidden');

    fireEvent.click(screen.getByRole('tab', { name: /Rows/i }));

    expect(screen.getByText('Rows Configurator Content')).toBeInTheDocument();
    expect(screen.getByText('Rows Configurator Content').closest('section')).not.toHaveAttribute('hidden');
    expect(screen.getByText('Columns Configurator Content').closest('section')).toHaveAttribute('hidden');
  });
});
