import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportDetailsPanel from './ReportDetailsPanel.jsx';

describe('ReportDetailsPanel', () => {
  it('updates report settings and triggers report actions', async () => {
    const updateActiveReport = vi.fn();
    const handleCloneReport = vi.fn();
    const handleCreateBlankReport = vi.fn();
    const handleDeleteReport = vi.fn();
    const handleOCRUpload = vi.fn();
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
          assignedUsers: ['u1'],
          isActive: true,
        }}
        activeCategories={['I']}
        masterData={{ users: [{ id: 'u1', name: 'Admin User' }] }}
        updateActiveReport={updateActiveReport}
        handleCloneReport={handleCloneReport}
        handleCreateBlankReport={handleCreateBlankReport}
        handleDeleteReport={handleDeleteReport}
        handleOCRUpload={handleOCRUpload}
        setIsAccessModalOpen={setIsAccessModalOpen}
      />
    );

    fireEvent.change(screen.getByDisplayValue('Profit and Loss'), {
      target: { value: 'P&L Summary' },
    });
    expect(updateActiveReport).toHaveBeenCalledWith({ name: 'P&L Summary' });

    fireEvent.click(screen.getAllByRole('combobox')[0]);
    fireEvent.click(await screen.findByRole('option', { name: /Emerald Green/i }));
    expect(updateActiveReport).toHaveBeenCalledWith({ theme: 'green' });

    fireEvent.click(screen.getAllByRole('combobox')[1]);
    fireEvent.click(await screen.findByRole('option', { name: /Short Month \+ YYYY/i }));
    expect(updateActiveReport).toHaveBeenCalledWith({ periodFormat: 'short' });

    fireEvent.click(screen.getByRole('button', { name: /Clone/i }));
    expect(handleCloneReport).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Blank/i }));
    expect(handleCreateBlankReport).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Access' }));
    expect(setIsAccessModalOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
    expect(handleDeleteReport).toHaveBeenCalledTimes(1);

    const fileInput = screen.getByLabelText(/OCR/i);
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'scan.png', { type: 'image/png' })] } });
    expect(handleOCRUpload).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Manage access' }));
    expect(setIsAccessModalOpen).toHaveBeenCalledWith(true);
  });
});
