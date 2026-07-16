import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditMappingModal from './EditMappingModal.jsx';

describe('EditMappingModal', () => {
  it('updates fields and invokes detail selector and apply handlers', async () => {
    const setEditingRow = vi.fn();
    const setModalAccCategory = vi.fn();
    const onOpenDetailSelector = vi.fn();
    const onApply = vi.fn();
    const onClose = vi.fn();

    render(
      <EditMappingModal
        isOpen={true}
        editingRow={{
          desc: 'Revenue',
          dept: '101',
          groupLevel: 'L4',
          groups: 'FOO',
          accCodes: '4001',
        }}
        setEditingRow={setEditingRow}
        masterData={{
          depts: [{ id: '101', name: 'Dept 101' }],
          groups: { L4: [{ id: 'FOO', name: 'Food' }] },
          accCodes: [{ id: '4001', type: 'I' }],
        }}
        modalAccCategory="ALL"
        setModalAccCategory={setModalAccCategory}
        onOpenDetailSelector={onOpenDetailSelector}
        onApply={onApply}
        onClose={onClose}
      />
    );

    fireEvent.change(screen.getByDisplayValue('Revenue'), { target: { value: 'New Revenue' } });
    expect(setEditingRow).toHaveBeenCalledWith(expect.objectContaining({ desc: 'New Revenue' }));

    fireEvent.click(screen.getByRole('button', { name: /Select departments/i }));
    expect(onOpenDetailSelector).toHaveBeenCalledWith(expect.objectContaining({ field: 'dept' }));
    expect(screen.getByRole('button', { name: /Select departments/i }).className).toMatch(/bg-stone|border-stone|text-stone|bg-muted|border-border|text-muted/);

    fireEvent.click(screen.getAllByRole('combobox')[2]);
    fireEvent.click(await screen.findByText('Balance Sheet'));
    expect(setModalAccCategory).toHaveBeenCalledWith('B');

    fireEvent.click(screen.getByText('Apply Mapping'));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Apply Mapping')).toHaveAttribute('data-variant', 'default');
    expect(screen.getByText('Cancel')).toHaveAttribute('data-variant', 'outline');

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when closed', () => {
    const { container } = render(
      <EditMappingModal
        isOpen={false}
        editingRow={null}
        setEditingRow={() => {}}
        masterData={{ depts: [], groups: {}, accCodes: [] }}
        modalAccCategory="ALL"
        setModalAccCategory={() => {}}
        onOpenDetailSelector={() => {}}
        onApply={() => {}}
        onClose={() => {}}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('uses API-backed group master data for the group selector', () => {
    const onOpenDetailSelector = vi.fn();

    render(
      <EditMappingModal
        isOpen={true}
        editingRow={{
          desc: 'Revenue',
          dept: '',
          groupLevel: 'L2',
          groups: '',
          accCodes: '',
        }}
        setEditingRow={() => {}}
        masterData={{
          depts: [],
          groups: {
            L1: [],
            L2: [
              { id: 'ROOMS', name: 'Rooms' },
              { id: 'FOOD', name: 'Food' },
            ],
            L3: [],
            L4: [],
          },
          accCodes: [],
        }}
        modalAccCategory="ALL"
        setModalAccCategory={() => {}}
        onOpenDetailSelector={onOpenDetailSelector}
        onApply={() => {}}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Select groups/i }));

    expect(onOpenDetailSelector).toHaveBeenCalledWith(expect.objectContaining({
      field: 'groups',
      items: [
        { id: 'ROOMS', name: 'Rooms' },
        { id: 'FOOD', name: 'Food' },
      ],
    }));
  });
});
