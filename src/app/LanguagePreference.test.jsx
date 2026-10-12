import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import LanguagePreference from './LanguagePreference.jsx';
import { getStoredCarmenSession } from '../features/report/lib/carmenSession.js';

describe('LanguagePreference', () => {
  beforeEach(() => window.localStorage.clear());

  it('selects API language and restores it after remount', () => {
    const { unmount } = render(<LanguagePreference />);
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'ไทย' }));
    expect(getStoredCarmenSession().language).toBe('th');
    expect(screen.getByRole('button', { name: 'ไทย' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Vietnamese' }));
    unmount();
    render(<LanguagePreference />);
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    expect(screen.getByRole('button', { name: 'Vietnamese' })).toHaveAttribute('aria-pressed', 'true');
  });
});
