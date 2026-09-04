import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ColumnsConfigurator, { buildColumnLogicTypeUpdates } from './ColumnsConfigurator.jsx';

describe('ColumnsConfigurator', () => {
  it('does not flag stale source types on formula and mix columns as monthly incompatibilities', () => {
    render(
      <ColumnsConfigurator
        activeReport={{
          reportType: 'Monthly',
          columns: [
            { id: 'C1', label: 'Actual', isFormula: false, isPercent: false, type: 'AC' },
            { id: 'C2', label: 'Mix', isFormula: false, isPercent: true, type: 'MIX', targetCol: 'C1' },
            { id: 'C3', label: 'Variance', isFormula: true, isPercent: false, type: 'FORMULA', formula: 'C1' },
          ],
        }}
        handleAddCol={vi.fn()}
        handleUpdateCol={vi.fn()}
        updateActiveReport={vi.fn()}
        handleDeleteCol={vi.fn()}
      />
    );

    expect(screen.queryByText(/reports should only use compatible column types/i)).not.toBeInTheDocument();
  });

  it('normalizes fields when changing between every column logic type', () => {
    const columns = [
      { id: 'C1', isFormula: true, formula: 'C2*2' },
      { id: 'C2', isFormula: false, isPercent: false, type: 'BC' },
    ];

    expect(buildColumnLogicTypeUpdates(columns[0], 'MIX', columns, 'AC')).toEqual(expect.objectContaining({
      isFormula: false,
      isPercent: true,
      formula: '',
      targetCol: 'C2',
      type: undefined,
    }));
    expect(buildColumnLogicTypeUpdates(columns[0], 'DATA', columns, 'AC')).toEqual(expect.objectContaining({
      isFormula: false,
      isPercent: false,
      formula: '',
      targetCol: '',
      type: 'AC',
      yearMode: 'current',
      periodMode: 'current',
    }));
  });

  it('adds, updates, moves, and deletes columns', async () => {
    const handleAddCol = vi.fn();
    const handleUpdateCol = vi.fn();
    const handleDeleteCol = vi.fn();

    render(
      <ColumnsConfigurator
        activeReport={{
          descriptionPosition: 2,
          columns: [
            { id: 'C1', label: 'Actual', isActive: true, type: 'AC', yearMode: 'current', periodMode: 'current', width: '' },
            { id: 'C2', label: 'Budget', isActive: false, type: 'BUD', yearMode: 'current', periodMode: 'current', width: '120' },
          ],
        }}
        handleAddCol={handleAddCol}
        handleUpdateCol={handleUpdateCol}
        updateActiveReport={vi.fn()}
        handleDeleteCol={handleDeleteCol}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Data' }));
    expect(handleAddCol).toHaveBeenCalledWith('data');

    fireEvent.click(screen.getByRole('button', { name: '+ Formula' }));
    expect(handleAddCol).toHaveBeenCalledWith('formula');
    expect(screen.getByRole('button', { name: '+ Data' }).className).toMatch(/bg-stone|border-stone|text-stone|bg-muted|border-border|text-muted|bg-blue|border-blue|text-blue/);
    expect(screen.getByRole('button', { name: '+ Formula' }).className).toMatch(/bg-stone|border-stone|text-stone|bg-muted|border-border|text-muted|bg-purple|border-purple|text-purple/);

    fireEvent.click(screen.getByRole('button', { name: /Mix %/i }));
    expect(handleAddCol).toHaveBeenCalledWith('percent');

    const labelInput = screen.getByDisplayValue('Actual');
    const row = labelInput.closest('[data-testid="column-card"]');

    fireEvent.change(labelInput, {
      target: { value: 'Operating Revenue' },
    });
    expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'label', 'Operating Revenue');

    fireEvent.click(within(row).getByRole('button', { name: /Hide column C1/i }));
    expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'isActive', false);
    expect(within(row).queryByTestId('column-actions')).not.toBeInTheDocument();

    fireEvent.click(within(row).getByRole('button', { name: /Delete column C1/i }));
    expect(handleDeleteCol).toHaveBeenCalledWith('C1');

    fireEvent.click(within(row).getAllByRole('combobox')[1]);
    fireEvent.click(await screen.findByText('BCC'));
    expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'type', 'BCC');

    fireEvent.click(within(row).getAllByRole('combobox')[3]);
    fireEvent.click(await screen.findByText('Prev'));
    expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'yearMode', '-1');

    fireEvent.click(within(row).getAllByRole('combobox')[4]);
    fireEvent.click(await screen.findByText('Period -1'));
    expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'periodMode', '-1');
  });

  it('changes an existing column logic type immediately', async () => {
    const updateActiveReport = vi.fn();

    render(
      <ColumnsConfigurator
        activeReport={{
          reportType: 'Monthly',
          columns: [
            { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, type: 'AC', yearMode: 'current', periodMode: 'current' },
            { id: 'C2', label: 'Budget', isActive: true, isFormula: false, isPercent: false, type: 'BC', yearMode: 'current', periodMode: 'current' },
          ],
        }}
        handleAddCol={vi.fn()}
        handleUpdateCol={vi.fn()}
        updateActiveReport={updateActiveReport}
        handleDeleteCol={vi.fn()}
      />
    );

    const actualCard = screen.getByDisplayValue('Actual').closest('[data-testid="column-card"]');
    fireEvent.click(within(actualCard).getByLabelText('Logic type'));
    fireEvent.click(await screen.findByRole('option', { name: 'Formula' }));

    expect(updateActiveReport).toHaveBeenCalledWith({
      columns: [
        expect.objectContaining({
          id: 'C1',
          isFormula: true,
          isPercent: false,
          formula: 'C1-C2',
          type: undefined,
          yearMode: undefined,
          periodMode: undefined,
        }),
        expect.objectContaining({ id: 'C2', type: 'BC' }),
      ],
    });
  });

  it('toggles column visibility from the eye action', () => {
    const handleUpdateCol = vi.fn();

    render(
      <ColumnsConfigurator
        activeReport={{
          descriptionPosition: 2,
          columns: [
            { id: 'C1', label: 'Actual', isActive: true, type: 'AC', yearMode: 'current', periodMode: 'current', width: '' },
          ],
        }}
        handleAddCol={vi.fn()}
        handleUpdateCol={handleUpdateCol}
        updateActiveReport={vi.fn()}
        moveCol={vi.fn()}
        handleDeleteCol={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Hide column C1/i }));
    expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'isActive', false);
  });

  it('moves Description by drag and drop without reordering calculation columns', () => {
    const updateActiveReport = vi.fn();
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };

    render(
      <ColumnsConfigurator
        activeReport={{
          descriptionPosition: 1,
          columns: [
            { id: 'C1', label: 'Actual', isActive: true, type: 'AC', yearMode: 'current', periodMode: 'current', width: '' },
          ],
        }}
        handleAddCol={vi.fn()}
        handleUpdateCol={vi.fn()}
        updateActiveReport={updateActiveReport}
        handleDeleteCol={vi.fn()}
      />
    );

    fireEvent.dragStart(screen.getByRole('button', { name: /Reorder Description column/i }), { dataTransfer });
    const target = screen.getByTestId('column-card');
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(updateActiveReport).toHaveBeenCalledWith(expect.objectContaining({
      descriptionPosition: 0,
      columns: [expect.objectContaining({ id: 'C1' })],
    }));
  });

  it('moves a column directly to an exact position', () => {
    const updateActiveReport = vi.fn();

    render(
      <ColumnsConfigurator
        activeReport={{
          descriptionPosition: 2,
          columns: [
            { id: 'C1', label: 'Actual', type: 'AC', formula: '' },
            { id: 'C2', label: 'Budget', type: 'BC', formula: '' },
          ],
        }}
        handleAddCol={vi.fn()}
        handleUpdateCol={vi.fn()}
        updateActiveReport={updateActiveReport}
        handleDeleteCol={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move column C1 to position' }));
    fireEvent.change(screen.getByLabelText('New position'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move to position' }));

    expect(updateActiveReport).toHaveBeenCalledWith(expect.objectContaining({
      descriptionPosition: 1,
      columns: [expect.objectContaining({ id: 'C2' }), expect.objectContaining({ id: 'C1' })],
    }));
  });
});
