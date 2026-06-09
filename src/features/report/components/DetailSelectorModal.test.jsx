import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DetailSelectorModal from './DetailSelectorModal.jsx';

describe('DetailSelectorModal', () => {
  it('matches department ids with or without zero padding', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <DetailSelectorModal
        title="Select Departments"
        subTitle="Revenue"
        availableItems={[
          { id: '0101', name: 'Dept 0101' },
        ]}
        selectedItems={['101']}
        onSave={onSave}
        onCancel={onCancel}
        masterData={{ accCodes: [], depts: [] }}
      />
    );

    expect(screen.getByText('1 Items selected')).toBeInTheDocument();
    expect(screen.getByText('Dept 0101')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Save selection'));
    expect(onSave).toHaveBeenCalledWith(['101']);
  });
});
