import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RowsConfigurator from './RowsConfigurator.jsx';

describe('RowsConfigurator', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

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

    expect(screen.getByRole('table').className).toMatch(/\[&_td\]:px-1/);
    expect(screen.getByRole('columnheader', { name: 'Type' }).className).toMatch(/w-32/);
    expect(screen.getByRole('columnheader', { name: 'Description' }).className).toMatch(/w-48/);

    fireEvent.click(screen.getByRole('button', { name: '+ Add Data Row' }));
    expect(handleAddRow).toHaveBeenCalledWith('data');
    expect(screen.getByRole('button', { name: '+ Add Data Row' }).className).toMatch(/blue/);

    fireEvent.click(screen.getByRole('button', { name: '+ Add Header Row' }));
    expect(handleAddRow).toHaveBeenCalledWith('header');
    expect(screen.getByRole('button', { name: '+ Add Header Row' }).className).toMatch(/emerald/);

    fireEvent.click(screen.getByRole('button', { name: '+ Add Formula Row' }));
    expect(handleAddRow).toHaveBeenCalledWith('formula');
    expect(screen.getByRole('button', { name: '+ Add Formula Row' }).className).toMatch(/purple/);

    const revenueInput = screen.getByDisplayValue('Revenue');
    fireEvent.change(revenueInput, { target: { value: 'Room Revenue' } });
    expect(handleUpdateRow).toHaveBeenCalledWith('r1', 'desc', 'Room Revenue');

    const revenueRow = revenueInput.closest('tr');
    const rowButtons = within(revenueRow).getAllByRole('button');

    fireEvent.click(rowButtons[0]);
    expect(setConfirmAction).toHaveBeenCalledWith(
      expect.objectContaining({ msg: 'Delete Row?' })
    );

    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };
    fireEvent.dragStart(within(revenueRow).getByRole('button', { name: /Reorder row r1/i }), { dataTransfer });
    const targetRow = screen.getByDisplayValue('Total Revenue').closest('tr');
    fireEvent.dragOver(targetRow, { dataTransfer });
    fireEvent.drop(targetRow, { dataTransfer });
    expect(moveRow).toHaveBeenCalledWith(0, 1);

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

    fireEvent.click(rowButtons[2]);
    expect(setEditingRow).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));

    const formulaRow = screen.getByDisplayValue('Total Revenue').closest('tr');
    fireEvent.click(within(formulaRow).getAllByRole('combobox')[0]);
    fireEvent.click(await screen.findByRole('option', { name: 'Data (D)' }));
    expect(handleUpdateRowMulti).toHaveBeenCalledWith(
      'r2',
      expect.objectContaining({ isTotal: false, isHeader: false })
    );
  });

  it('keeps the edit action visible when a mapping warning is long', () => {
    render(
      <RowsConfigurator
        activeReport={{
          rows: [
            {
              id: 'r-long-warning',
              desc: 'Imported revenue mapping',
              indent: 0,
              isHeader: false,
              isTotal: false,
              percentBase: '',
              formula: '',
              dept: '',
              deptGroup: '',
              groups: '',
              accCodes: 'UNKNOWN-001, UNKNOWN-002, UNKNOWN-003, UNKNOWN-004, UNKNOWN-005',
              groupLevel: 'L4',
            },
          ],
        }}
        masterData={{
          depts: [],
          deptGroups: [],
          accCodes: [{ id: 'KNOWN-001', name: 'Known account' }],
          groups: { L4: [] },
        }}
        handleAddRow={vi.fn()}
        handleUpdateRow={vi.fn()}
        handleUpdateRowMulti={vi.fn()}
        handleBulkUpdateRows={vi.fn()}
        moveRow={vi.fn()}
        handleDeleteRow={vi.fn()}
        setEditingRow={vi.fn()}
        setConfirmAction={vi.fn()}
      />,
    );

    const warning = screen.getByText(/unknown account code\(s\)/i);
    const editButton = screen.getByRole('button', {
      name: 'Edit mapping for row r-long-warning',
    });

    expect(warning.className).toMatch(/break-words/);
    expect(editButton.closest('td')?.className).toMatch(/sticky right-0/);
    expect(screen.getByRole('columnheader', { name: 'Action' }).className).toMatch(/sticky right-0/);
  });

  it('bulk maps selected data rows, saves a preset, and supports undo', async () => {
    const handleBulkUpdateRows = vi.fn();

    render(
      <RowsConfigurator
        activeReport={{
          rows: [
            {
              id: 'r1',
              desc: 'Revenue',
              indent: 0,
              isHeader: false,
              isTotal: false,
              percentBase: '',
              formula: '',
              dept: '101',
              deptGroup: '',
              groups: '',
              accCodes: '4001',
              groupLevel: 'L4',
            },
            {
              id: 'r2',
              desc: 'Expense',
              indent: 0,
              isHeader: false,
              isTotal: false,
              percentBase: '',
              formula: '',
              dept: '',
              deptGroup: '',
              groups: '',
              accCodes: '',
              groupLevel: 'L4',
            },
          ],
        }}
        masterData={{
          depts: [{ id: '101', name: 'Rooms' }, { id: '202', name: 'Restaurant' }],
          accCodes: [{ id: '4001', name: 'Room revenue' }, { id: '4101', name: 'Food revenue' }],
          groups: { L4: [] },
        }}
        handleAddRow={vi.fn()}
        handleUpdateRow={vi.fn()}
        handleUpdateRowMulti={vi.fn()}
        handleBulkUpdateRows={handleBulkUpdateRows}
        moveRow={vi.fn()}
        handleDeleteRow={vi.fn()}
        setEditingRow={vi.fn()}
        setConfirmAction={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Bulk Mapping/i }));
    fireEvent.click(screen.getByLabelText('Select row 1: Revenue'));
    fireEvent.click(screen.getByLabelText('Select row 2: Expense'));
    expect(screen.getByText(/2 selected/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Map selected/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('dropdown-bulk-departments'));
    fireEvent.click(screen.getByTestId('check-bulk-departments-202'));
    fireEvent.click(screen.getByTestId('dropdown-bulk-accounts'));
    fireEvent.click(screen.getByTestId('check-bulk-accounts-4101'));

    fireEvent.change(screen.getByLabelText('Save current selections'), { target: { value: 'F&B mapping' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(window.localStorage.getItem('carmen.mapping-presets.v1')).toContain('F&B mapping'));

    fireEvent.click(screen.getByRole('button', { name: 'Apply to 2 rows' }));
    expect(handleBulkUpdateRows).toHaveBeenCalledWith([
      { id: 'r1', updates: { dept: '202', accCodes: '4101' } },
      { id: 'r2', updates: { dept: '202', accCodes: '4101' } },
    ]);

    fireEvent.click(screen.getByRole('button', { name: /Undo bulk mapping/i }));
    expect(handleBulkUpdateRows).toHaveBeenLastCalledWith([
      { id: 'r1', updates: { dept: '101', accCodes: '4001' } },
      { id: 'r2', updates: { dept: '', accCodes: '' } },
    ]);
  });
});
