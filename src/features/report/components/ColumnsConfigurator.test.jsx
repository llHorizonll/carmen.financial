import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ColumnsConfigurator from './ColumnsConfigurator.jsx';

describe('ColumnsConfigurator', () => {
  it('adds, updates, moves, and deletes columns', async () => {
    const handleAddCol = vi.fn();
    const handleUpdateCol = vi.fn();
    const moveCol = vi.fn();
    const handleDeleteCol = vi.fn();

    render(
      <ColumnsConfigurator
        activeReport={{
          columns: [
            { id: 'C1', label: 'Actual', isActive: true, type: 'AC', yearMode: 'current', periodMode: 'current', width: '' },
            { id: 'C2', label: 'Budget', isActive: false, type: 'BUD', yearMode: 'current', periodMode: 'current', width: '120' },
          ],
        }}
        handleAddCol={handleAddCol}
        handleUpdateCol={handleUpdateCol}
        moveCol={moveCol}
        handleDeleteCol={handleDeleteCol}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Data' }));
    expect(handleAddCol).toHaveBeenCalledWith('data');

    fireEvent.click(screen.getByRole('button', { name: '+ Formula' }));
    expect(handleAddCol).toHaveBeenCalledWith('formula');

    fireEvent.click(screen.getByRole('button', { name: /Mix %/i }));
    expect(handleAddCol).toHaveBeenCalledWith('percent');

    const labelInput = screen.getByDisplayValue('Actual');
    const row = labelInput.closest('tr');

    fireEvent.change(labelInput, {
      target: { value: 'Operating Revenue' },
    });
    expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'label', 'Operating Revenue');

    const rowButtons = within(row).getAllByRole('button');

    fireEvent.click(rowButtons[0]);
    expect(handleDeleteCol).toHaveBeenCalledWith('C1');

    fireEvent.click(rowButtons[1]);
    expect(moveCol).toHaveBeenCalledWith(0, 'left');

    fireEvent.click(rowButtons[2]);
    expect(moveCol).toHaveBeenCalledWith(0, 'right');

    fireEvent.click(within(row).getAllByRole('combobox')[0]);
    fireEvent.click(await screen.findByText('BUDACC'));
    expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'type', 'BUDACC');

    fireEvent.click(within(row).getAllByRole('combobox')[2]);
    fireEvent.click(await screen.findByText('Prev'));
    expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'yearMode', '-1');

    fireEvent.click(within(row).getAllByRole('combobox')[3]);
    fireEvent.click(await screen.findByText('FY'));
    expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'periodMode', 'FY');

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'isActive', false);
  });
});
