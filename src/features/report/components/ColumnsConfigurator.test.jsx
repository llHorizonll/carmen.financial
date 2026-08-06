import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ColumnsConfigurator from './ColumnsConfigurator.jsx';

describe('ColumnsConfigurator', () => {
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

    fireEvent.click(within(row).getByRole('button', { name: /Delete column C1/i }));
    expect(handleDeleteCol).toHaveBeenCalledWith('C1');

    fireEvent.click(within(row).getAllByRole('combobox')[0]);
    fireEvent.click(await screen.findByText('BCC'));
    expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'type', 'BCC');

    fireEvent.click(within(row).getAllByRole('combobox')[2]);
    fireEvent.click(await screen.findByText('Prev'));
    expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'yearMode', '-1');

    fireEvent.click(within(row).getAllByRole('combobox')[3]);
    fireEvent.click(await screen.findByText('Period -1'));
    expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'periodMode', '-1');
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
});
