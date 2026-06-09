import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RowsConfigurator from './RowsConfigurator.jsx';

describe('RowsConfigurator', () => {
  it('adds and edits rows, and queues row deletion confirmation', async () => {
    const handleAddRow = vi.fn();
    const handleUpdateRow = vi.fn();
    const handleUpdateRowMulti = vi.fn();
    const moveRow = vi.fn();
    const handleDeleteRow = vi.fn();
    const setEditingRow = vi.fn();
    const setConfirmAction = vi.fn();

    render(
      <RowsConfigurator
        activeReport={{
          rows: [
            {
              id: 'r1',
              desc: 'Revenue',
              indent: 1,
              isHeader: false,
              isTotal: false,
              percentBase: 'R2',
              formula: '',
              dept: '101',
              groups: 'FOOD',
              accCodes: '4001',
              groupLevel: 'L4',
            },
            {
              id: 'r2',
              desc: 'Total Revenue',
              indent: 0,
              isHeader: false,
              isTotal: true,
              percentBase: '',
              formula: 'R1',
              dept: '',
              groups: '',
              accCodes: '',
              groupLevel: 'L4',
            },
          ],
        }}
        handleAddRow={handleAddRow}
        handleUpdateRow={handleUpdateRow}
        handleUpdateRowMulti={handleUpdateRowMulti}
        moveRow={moveRow}
        handleDeleteRow={handleDeleteRow}
        setEditingRow={setEditingRow}
        setConfirmAction={setConfirmAction}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add Data Row' }));
    expect(handleAddRow).toHaveBeenCalledWith('data');

    fireEvent.click(screen.getByRole('button', { name: '+ Add Header Row' }));
    expect(handleAddRow).toHaveBeenCalledWith('header');

    fireEvent.click(screen.getByRole('button', { name: '+ Add Formula Row' }));
    expect(handleAddRow).toHaveBeenCalledWith('formula');

    const revenueInput = screen.getByDisplayValue('Revenue');
    fireEvent.change(revenueInput, { target: { value: 'Room Revenue' } });
    expect(handleUpdateRow).toHaveBeenCalledWith('r1', 'desc', 'Room Revenue');

    const revenueRow = revenueInput.closest('tr');
    const rowButtons = within(revenueRow).getAllByRole('button');

    fireEvent.click(rowButtons[0]);
    expect(setConfirmAction).toHaveBeenCalledWith(
      expect.objectContaining({ msg: 'Delete Row?' })
    );

    fireEvent.click(rowButtons[1]);
    expect(moveRow).toHaveBeenCalledWith(0, 'up');

    fireEvent.click(rowButtons[2]);
    expect(moveRow).toHaveBeenCalledWith(0, 'down');

    fireEvent.click(within(revenueRow).getAllByRole('combobox')[0]);
    fireEvent.click(await screen.findByText('Header (H)'));
    expect(handleUpdateRowMulti).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ isTotal: false, isHeader: true })
    );

    fireEvent.click(within(revenueRow).getAllByRole('combobox')[1]);
    fireEvent.click(await screen.findByText('Lvl 2'));
    expect(handleUpdateRow).toHaveBeenCalledWith('r1', 'indent', 2);

    fireEvent.change(screen.getByDisplayValue('R2'), { target: { value: 'R3' } });
    expect(handleUpdateRow).toHaveBeenCalledWith('r1', 'percentBase', 'R3');

    fireEvent.click(rowButtons[3]);
    expect(setEditingRow).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));

    const formulaRow = screen.getByDisplayValue('Total Revenue').closest('tr');
    fireEvent.click(within(formulaRow).getAllByRole('combobox')[0]);
    fireEvent.click(await screen.findByRole('option', { name: 'Data (D)' }));
    expect(handleUpdateRowMulti).toHaveBeenCalledWith(
      'r2',
      expect.objectContaining({ isTotal: false, isHeader: false })
    );
  });
});
