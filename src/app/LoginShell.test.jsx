import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginShell from './LoginShell.jsx';
import { clearCarmenApiFailure, reportCarmenApiFailure } from '../lib/carmenApiFailure.js';
import { clearCarmenSession } from '../features/report/lib/carmenSession.js';
import { fetchBusinessUnitsByUsername } from '../features/report/lib/reportApi.js';

vi.mock('./App.jsx', () => ({
  default: () => <main>Report workspace</main>,
}));

vi.mock('../features/report/lib/reportApi.js', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchBusinessUnitsByUsername: vi.fn(),
}));

describe('LoginShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearCarmenApiFailure();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the login hero and form content', async () => {
    render(<LoginShell />);

    expect(screen.getByText('Carmen Financial BI')).toBeInTheDocument();
    expect(await screen.findByText('Carmen BI Login')).toBeInTheDocument();
    expect(await screen.findByText('Report viewing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('hydrates prerendered login markup without mismatch when a session is stored', async () => {
    const preload = render(<LoginShell />);
    await screen.findByRole('button', { name: 'Sign in' });
    preload.unmount();

    window.localStorage.setItem('carmen_access_token', 'token');
    const browserWindow = window;
    vi.stubGlobal('window', undefined);
    const serverMarkup = renderToString(<LoginShell />);
    vi.stubGlobal('window', browserWindow);

    const container = document.createElement('div');
    container.innerHTML = serverMarkup;
    document.body.appendChild(container);
    const recoverableErrors = [];
    let root;

    await act(async () => {
      root = hydrateRoot(container, <LoginShell />, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });

    await waitFor(() => expect(screen.getByText('Report workspace')).toBeInTheDocument());
    expect(recoverableErrors).toEqual([]);

    await act(async () => root.unmount());
    container.remove();
  });

  it('selects the business unit marked as default after loading tenants', async () => {
    fetchBusinessUnitsByUsername.mockResolvedValue([
      { Tenant: 'tenant-a', Description: 'Business Unit A', IsDefault: false },
      { Tenant: 'tenant-b', Description: 'Business Unit B', IsDefault: true },
    ]);
    render(<LoginShell />);

    const usernameInput = await screen.findByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    await waitFor(() => expect(usernameInput).toHaveValue('admin'));
    fireEvent.blur(usernameInput);

    await waitFor(() => expect(fetchBusinessUnitsByUsername).toHaveBeenCalledWith('admin'));
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Business Unit' })).toHaveTextContent('Business Unit B');
    });
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

  it('shows the popup even when the API fails before LoginShell mounts', async () => {
    window.localStorage.setItem('carmen_access_token', 'token');
    reportCarmenApiFailure({ kind: 'network', message: 'Unable to reach Carmen API.' });
    clearCarmenSession();

    render(<LoginShell />);

    expect(await screen.findByRole('alertdialog', { name: 'Session expired' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});
