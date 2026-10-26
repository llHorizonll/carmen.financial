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
  it('shows and focuses inspected details before a long version list', async () => {
    api.fetchCarmenReportHistory.mockResolvedValue(Array.from({ length: 25 }, (_, index) => ({
      id: 25 - index, changeType: 'save', changedAt: '2025-01-01T12:00:00', changedBy: 'admin',
    })));
    api.fetchCarmenReportHistoryVersion.mockResolvedValue({ name: 'Inspected report', rows: [], columns: [] });
    render(<ReportHistory report={{ id: 'r1', name: 'Current report' }} isDirty={false} onRestored={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Activity' }));
    const inspectButtons = await screen.findAllByRole('button', { name: 'Inspect' });
    expect(inspectButtons).toHaveLength(25);
    fireEvent.click(inspectButtons[0]);
    await waitFor(() => expect(screen.getByRole('region', { name: 'Selected version' })).toHaveFocus());
    expect(screen.getByRole('region', { name: 'Selected version' })).toHaveTextContent('Version #25');
    expect(screen.getByRole('region', { name: 'Selected version' }).compareDocumentPosition(
      screen.getByRole('list', { name: 'Saved versions' }),
    ) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the history error without claiming there are no saved versions', async () => {
    api.fetchCarmenReportHistory.mockRejectedValue(new Error('Report history is unavailable on this Carmen API server.'));
    render(<ReportHistory report={{ id: 'r1', name: 'Current report' }} isDirty={false} onRestored={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Activity' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Report history is unavailable');
    expect(screen.queryByText('No saved versions yet.')).not.toBeInTheDocument();
  });

  it.each([undefined, 'b'])('inspects and restores a version in its report BU (%s)', async (tenant) => {
    api.fetchCarmenReportHistory.mockResolvedValue([{ id: 7, changeType: 'save', changedAt: '2025-01-01T12:00:00', changedBy: 'admin' }]);
    api.fetchCarmenReportHistoryVersion.mockResolvedValue({ name: 'Old report', rows: [{}], columns: [{}], access: [] });
    api.restoreCarmenReportHistoryVersion.mockResolvedValue({ id: 'r1', name: 'Old report', lastModified: '2025-01-02T00:00:00' });
    const onRestored = vi.fn();
    render(<ReportHistory report={{ id: 'r1', tenant, name: 'Current report', lastModified: '2025-01-01T00:00:00' }} isDirty={false} onRestored={onRestored} />);

    fireEvent.click(screen.getByRole('button', { name: 'Activity' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Inspect' }));
    expect(await screen.findByText('Version #7')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restore this version' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore', exact: true }));

    const context = tenant ? [{ tenant }] : [];
    expect(api.fetchCarmenReportHistory).toHaveBeenCalledWith('r1', ...context);
    expect(api.fetchCarmenReportHistoryVersion).toHaveBeenCalledWith('r1', 7, ...context);
    await waitFor(() => expect(api.restoreCarmenReportHistoryVersion).toHaveBeenCalledWith('r1', 7, '2025-01-01T00:00:00', ...context));
    await waitFor(() => expect(onRestored).toHaveBeenCalledWith(expect.objectContaining({ name: 'Old report' })));
  });
});
