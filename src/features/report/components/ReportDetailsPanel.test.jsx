import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportDetailsPanel from './ReportDetailsPanel.jsx';

describe('ReportDetailsPanel', () => {
  it('keeps Day out of setup even when a report has daily columns', () => {
    render(
      <ReportDetailsPanel
        activeReport={{ name: 'Daily values', reportType: 'Monthly', day: '15', columns: [{ id: 'C1', type: 'DAC' }] }}
        updateActiveReport={vi.fn()}
      />
    );

    expect(screen.queryByLabelText('Day')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Report Type')).toHaveTextContent('Monthly');
  });

  it('updates Report Type as metadata', async () => {
    const updateActiveReport = vi.fn();
    render(
      <ReportDetailsPanel
        activeReport={{ name: 'Mixed report', reportType: 'Monthly', columns: [{ type: 'DAC' }] }}
        updateActiveReport={updateActiveReport}
      />
    );

    fireEvent.click(screen.getByLabelText('Report Type'));
    fireEvent.click(await screen.findByRole('option', { name: 'Mixed' }));
    expect(updateActiveReport).toHaveBeenCalledWith({ reportType: 'Mixed' });
    expect(screen.queryByLabelText('Day')).not.toBeInTheDocument();
  });

  it('allows a new custom group name', () => {
    const update = vi.fn();
    render(<ReportDetailsPanel activeReport={{ name: 'Spa', reportGroup: 'P&L' }} updateActiveReport={update} />);
    fireEvent.change(screen.getByLabelText('Report Group'), { target: { value: 'Operations' } });
    expect(update).toHaveBeenCalledWith({ reportGroup: 'Operations' });
  });

});
