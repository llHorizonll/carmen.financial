import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportHistory from './ReportHistory.jsx';

const api = vi.hoisted(() => ({
  fetchCarmenReportHistory: vi.fn(),
  fetchCarmenReportHistoryVersion: vi.fn(),
  restoreCarmenReportHistoryVersion: vi.fn(),
}));
vi.mock('../lib/reportApi.js', () => api);

describe('ReportHistory', () => {
  it('shows the history error without claiming there are no saved versions', async () => {
    api.fetchCarmenReportHistory.mockRejectedValue(new Error('Report history is unavailable on this Carmen API server.'));
    render(<ReportHistory report={{ id: 'r1', name: 'Current report' }} isDirty={false} onRestored={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Report history is unavailable');
    expect(screen.queryByText('No saved versions yet.')).not.toBeInTheDocument();
  });

  it('inspects a saved version and restores it against the current version', async () => {
    api.fetchCarmenReportHistory.mockResolvedValue([{ id: 7, changeType: 'save', changedAt: '2025-01-01T12:00:00', changedBy: 'admin' }]);
    api.fetchCarmenReportHistoryVersion.mockResolvedValue({ name: 'Old report', rows: [{}], columns: [{}], access: [] });
    api.restoreCarmenReportHistoryVersion.mockResolvedValue({ id: 'r1', name: 'Old report', lastModified: '2025-01-02T00:00:00' });
    const onRestored = vi.fn();
    render(<ReportHistory report={{ id: 'r1', name: 'Current report', lastModified: '2025-01-01T00:00:00' }} isDirty={false} onRestored={onRestored} />);

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Inspect' }));
    expect(await screen.findByText('Version #7')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restore this version' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore', exact: true }));

    await waitFor(() => expect(api.restoreCarmenReportHistoryVersion).toHaveBeenCalledWith('r1', 7, '2025-01-01T00:00:00'));
    await waitFor(() => expect(onRestored).toHaveBeenCalledWith(expect.objectContaining({ name: 'Old report' })));
  });
});
