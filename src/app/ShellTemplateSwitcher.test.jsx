import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ShellTemplateSwitcher from './ShellTemplateSwitcher.jsx';
import { SHELL_TEMPLATE_OPTIONS } from '../lib/theme.js';

describe('ShellTemplateSwitcher', () => {
  it('renders comparison cards and calls onChange when a preset is selected', () => {
    const onChange = vi.fn();

    render(
      <ShellTemplateSwitcher
        value="classic-calm"
        options={SHELL_TEMPLATE_OPTIONS}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Compare')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Linen/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ink/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Slate/i }));

    expect(onChange).toHaveBeenCalledWith('executive-slate');
  });
});
