import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginShell from './LoginShell.jsx';

vi.mock('./App.jsx', () => ({
  default: () => <main>Report workspace</main>,
}));

describe('LoginShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the login hero and form content', async () => {
    render(<LoginShell />);

    expect(screen.getByText('Carmen Financial BI')).toBeInTheDocument();
    expect(await screen.findByText('Carmen BI Login')).toBeInTheDocument();
    expect(await screen.findByText('Report viewing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows a session-expired popup and returns to login when an authenticated API request fails', async () => {
    window.localStorage.setItem('carmen_access_token', 'token');
    render(<LoginShell />);

    expect(await screen.findByText('Report workspace')).toBeInTheDocument();
    window.dispatchEvent(new CustomEvent('carmen-api-error', {
      detail: { kind: 'network', message: 'Unable to reach Carmen API.' },
    }));

    expect(await screen.findByRole('alertdialog', { name: 'Session expired' })).toBeInTheDocument();
    expect(window.localStorage.getItem('carmen_access_token')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Back to sign in' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog', { name: 'Session expired' })).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});
