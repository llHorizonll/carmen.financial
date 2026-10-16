import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BuMappingReview from './BuMappingReview.jsx';

const report = { tenant: 'A', rows: [
  { id: 'r1', desc: 'Room Revenue', accCodes: '4100' },
  { id: 'r2', desc: 'Other Revenue', accCodes: '4900' },
] };
const source = { accCodes: [{ id: '4100', name: 'Rooms', type: 'I' }, { id: '4900', name: 'Other', type: 'I' }], depts: [] };
const target = { ...source, accCodes: [{ id: '4100', name: 'Rooms', type: 'I' }, { id: '4900', name: 'Food', type: 'I' }] };
const comparison = { available: [{ id: 'A', name: 'Hotel A' }, { id: 'B', name: 'Hotel B' }], masters: { A: { master: source }, B: { master: target } } };

describe('BU mapping review', () => {
  it('confirms exact suggestions in one batch while leaving semantic mismatches pending', () => {
    const update = vi.fn();
    render(<BuMappingReview report={report} comparison={comparison} updateActiveReport={update} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm matching mappings' }));
    const rows = update.mock.calls[0][0].rows;
    expect(rows[0].buMappings[0]).toEqual(expect.objectContaining({ tenant: 'B', status: 'confirmed', accCodes: '4100' }));
    expect(rows[1].buMappings).toBeUndefined();
    expect(report.rows[0].buMappings).toBeUndefined();
  });
  it('shows the source BU in the editor and supports explicit exclusion', () => {
    const update = vi.fn();
    render(<BuMappingReview report={report} comparison={comparison} updateActiveReport={update} />);
    fireEvent.click(screen.getByRole('button', { name: 'Match found — review 4100' }));
    expect(screen.getByText('B / Room Revenue')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Room Revenue')).toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('button', { name: 'Mark not applicable' }));
    expect(update.mock.calls[0][0].rows[0].buMappings[0].status).toBe('notApplicable');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
