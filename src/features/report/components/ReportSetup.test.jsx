import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
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

  it('shows columns and rows together with save and cancel actions', () => {
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
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('keeps both configurators visible for a draft report', () => {
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

    render(<ReportSetup {...commonProps} />);

    expect(screen.getByText('Columns Configurator Content')).toBeInTheDocument();
    expect(screen.getByText('Rows Configurator Content')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByLabelText('Report setup controls')).toHaveClass('sticky', 'top-0');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('opens its guide from the single shell help request', () => {
    window.localStorage.setItem('test-guide:setup', 'done');
    const guideRef = React.createRef();

    render(
      <ReportSetup
        ref={guideRef}
        guideStoragePrefix="test-guide"
        activeReport={{ columns: [], rows: [] }}
        savedReport={{ columns: [], rows: [] }}
        isDirty={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    act(() => guideRef.current.openGuide());
    expect(screen.getByRole('dialog', { name: 'Define the report' })).toBeInTheDocument();
    expect(document.querySelector('[data-tour="setup-details"]')).toHaveAttribute('data-tour-active', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Configure columns and rows' })).toBeInTheDocument();
    expect(document.querySelector('[data-tour="setup-configurator"]')).toHaveAttribute('data-tour-active', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Save the draft' })).toBeInTheDocument();
    expect(document.querySelector('[data-tour="setup-save"]')).toHaveAttribute('data-tour-active', 'true');
    expect(screen.queryByRole('button', { name: 'Open setup guide' })).not.toBeInTheDocument();
  });
});
