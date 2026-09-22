import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

    fireEvent.click(screen.getByRole('combobox', { name: 'Add row' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Data' }));
    expect(handleAddRow).toHaveBeenCalledWith('data');

    fireEvent.click(screen.getByRole('combobox', { name: 'Add row' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Header' }));
    expect(handleAddRow).toHaveBeenCalledWith('header');

    fireEvent.click(screen.getByRole('combobox', { name: 'Add row' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Formula' }));
    expect(handleAddRow).toHaveBeenCalledWith('formula');

    const revenueInput = screen.getByDisplayValue('Revenue');
    fireEvent.change(revenueInput, { target: { value: 'Room Revenue' } });
    expect(handleUpdateRow).toHaveBeenCalledWith('r1', 'desc', 'Room Revenue');

    const revenueRow = revenueInput.closest('tr');

    fireEvent.click(within(revenueRow).getByRole('button', { name: 'Move row R1 to position' }));
    fireEvent.change(screen.getByLabelText('New position'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move to position' }));
    expect(moveRow).toHaveBeenCalledWith(0, 1);

    fireEvent.click(within(revenueRow).getByRole('button', { name: 'Delete row r1' }));
    expect(setConfirmAction).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete row r1?',
        actionLabel: 'Delete row',
      })
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
    fireEvent.click(await screen.findByText('Indent 2'));
    expect(handleUpdateRow).toHaveBeenCalledWith('r1', 'indent', 2);

    fireEvent.change(screen.getByDisplayValue('R2'), { target: { value: 'R3' } });
    expect(handleUpdateRow).toHaveBeenCalledWith('r1', 'percentBase', 'R3');
    expect(screen.getAllByPlaceholderText('R#')).toHaveLength(2);

    fireEvent.click(within(revenueRow).getByRole('button', { name: 'Hide row r1' }));
    expect(handleUpdateRow).toHaveBeenCalledWith('r1', 'isActive', false);

    fireEvent.click(within(revenueRow).getByRole('button', { name: 'Edit mapping for row r1' }));
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
    const actions = screen.getByTestId('row-actions');

    expect(warning.className).toMatch(/break-words/);
    expect(actions).toHaveClass('whitespace-nowrap');
    expect(actions).toContainElement(editButton);
    expect(actions.querySelectorAll('button')).toHaveLength(3);
    expect(editButton).toHaveClass('size-8');
    expect(editButton).not.toHaveTextContent('Edit');
    expect(editButton.closest('td')).toHaveClass('sticky', 'right-0', 'w-32', 'min-w-32', 'max-w-32');
    expect(screen.getByRole('columnheader', { name: 'Action' })).toHaveClass('sticky', 'right-0', 'w-32', 'min-w-32', 'max-w-32');
  });

  it('summarizes and visually distinguishes hidden rows', () => {
    render(
      <RowsConfigurator
        activeReport={{
          rows: [{
            id: 'r-hidden',
            desc: 'Hidden row',
            isActive: false,
            isHeader: true,
            isTotal: false,
            indent: 0,
            percentBase: '',
            formula: '',
          }],
        }}
        handleAddRow={vi.fn()}
        handleUpdateRow={vi.fn()}
        handleUpdateRowMulti={vi.fn()}
        moveRow={vi.fn()}
        handleDeleteRow={vi.fn()}
        setEditingRow={vi.fn()}
        setConfirmAction={vi.fn()}
      />,
    );

    expect(screen.getByText('1 rows')).toBeInTheDocument();
    expect(screen.getByText('1 hidden')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hidden row').closest('tr')).toHaveClass('opacity-60');
    expect(screen.getByRole('button', { name: 'Show row r-hidden' })).toHaveAttribute('aria-pressed', 'true');
  });

});
