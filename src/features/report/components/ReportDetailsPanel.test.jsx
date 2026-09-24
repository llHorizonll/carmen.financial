import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportDetailsPanel from './ReportDetailsPanel.jsx';

describe('ReportDetailsPanel', () => {
  it('shows Day when a Monthly report has a Daily data column', () => {
    render(
      <ReportDetailsPanel
        activeReport={{ name: 'Daily values', reportType: 'Monthly', day: '15', columns: [{ id: 'C1', type: 'DAC' }] }}
        activeCategories={[]}
        masterData={{ users: [{ id: 'admin' }] }}
        updateActiveReport={vi.fn()}
        handleCloneReport={vi.fn()}
        handleDeleteReport={vi.fn()}
        setIsAccessModalOpen={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Day')).toHaveValue('15');
  });

  it('updates report settings and triggers report actions', async () => {
    const updateActiveReport = vi.fn();
    const handleCloneReport = vi.fn();
    const handleCreateBlankReport = vi.fn();
    const handleDeleteReport = vi.fn();
    const setIsAccessModalOpen = vi.fn();

    render(
      <ReportDetailsPanel
        activeReport={{
          name: 'Profit and Loss',
          companyName: 'Carmen Hotel & Resorts',
          theme: 'blue',
          periodFormat: 'standard',
          customDateLabel: '',
          customPeriodLabel: '',
          category: ['I'],
          isActive: true,
        }}
        activeCategories={['I']}
        masterData={{ users: [{ id: 'admin', name: 'Admin User' }] }}
        updateActiveReport={updateActiveReport}
        handleCloneReport={handleCloneReport}
        handleCreateBlankReport={handleCreateBlankReport}
        handleDeleteReport={handleDeleteReport}
        setIsAccessModalOpen={setIsAccessModalOpen}
      />
    );

    fireEvent.change(screen.getByDisplayValue('Profit and Loss'), {
      target: { value: 'P&L Summary' },
    });
    expect(updateActiveReport).toHaveBeenCalledWith({ name: 'P&L Summary' });

    fireEvent.click(screen.getAllByRole('combobox')[0]);
    fireEvent.click(await screen.findByRole('option', { name: /Short Month \+ YYYY/i }));
    expect(updateActiveReport).toHaveBeenCalledWith({ periodFormat: 'short' });
    expect(screen.getByPlaceholderText('admin')).toHaveAttribute('readonly');

    fireEvent.click(screen.getByRole('button', { name: /Clone/i }));
    expect(handleCloneReport).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Clone/i }).className).toMatch(/bg-stone|border-stone|text-stone|bg-muted|border-border|text-muted/);

    fireEvent.click(screen.getByRole('button', { name: 'Access' }));
    expect(setIsAccessModalOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
    expect(handleDeleteReport).toHaveBeenCalledTimes(1);

  });
});
