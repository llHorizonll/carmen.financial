import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MultiSelectDropdown from './MultiSelectDropdown.jsx';

describe('MultiSelectDropdown', () => {
  it('opens the dropdown and toggles options', () => {
    const onChange = vi.fn();

    render(
      <MultiSelectDropdown
        options={[
          { id: '101', name: 'Front Office' },
          { id: '102', name: 'Food & Beverage' },
        ]}
        selected={['101']}
        onChange={onChange}
        label="DEPT"
        testIdPrefix="dept"
      />
    );

    expect(screen.getByTestId('selected-value-dept')).toHaveTextContent('101');
    fireEvent.click(screen.getByText('DEPT:'));
    fireEvent.click(screen.getByLabelText('102 - Food & Beverage'));
    expect(onChange).toHaveBeenCalledWith(['101', '102']);
  });

  it('shows ALL when nothing is selected', () => {
    const { container } = render(
      <MultiSelectDropdown
        options={[]}
        selected={[]}
        onChange={() => {}}
        label="DEPT"
        testIdPrefix="dept"
      />
    );

    expect(within(container).getByTestId('selected-value-dept')).toHaveTextContent('ALL');
  });

  it('matches department codes even when the selected value is not zero-padded', () => {
    const onChange = vi.fn();

    render(
      <MultiSelectDropdown
        options={[
          { id: '0101', name: 'Front Office' },
        ]}
        selected={['101']}
        onChange={onChange}
        label="DEPT"
        testIdPrefix="dept"
      />
    );

    fireEvent.click(screen.getByText('DEPT:'));
    expect(screen.getByLabelText('0101 - Front Office')).toBeChecked();
    fireEvent.click(screen.getByLabelText('0101 - Front Office'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
