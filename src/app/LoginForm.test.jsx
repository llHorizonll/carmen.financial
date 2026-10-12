import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginForm from './LoginForm.jsx';

const api = vi.hoisted(() => ({ fetchBusinessUnitsByUsername: vi.fn(), loginWithCarmenCredentials: vi.fn() }));
vi.mock('../features/report/lib/reportApi.js', () => api);

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    api.loginWithCarmenCredentials.mockResolvedValue({ accessToken: 'token', user: { id: 'user' } });
  });

  const fillCredentials = (username = 'user') => {
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: username } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
  };

  it.each([
    [[{ Tenant: 'a' }, { Tenant: 'b', IsDefault: 1 }], 'b'],
    [[{ Tenant: 'a' }, { Tenant: 'b', isDefault: '1' }], 'b'],
    [[{ Tenant: 'a' }, { Tenant: 'b' }], 'a'],
  ])('resolves the default or first BU on submit without blur', async (items, tenant) => {
    api.fetchBusinessUnitsByUsername.mockResolvedValue(items);
    const authenticated = vi.fn();
    render(<LoginForm onAuthenticated={authenticated} />);
    fillCredentials(' user ');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form'));
    await waitFor(() => expect(authenticated).toHaveBeenCalledOnce());
    expect(api.loginWithCarmenCredentials).toHaveBeenCalledWith({
      userName: 'user', password: 'test-password', tenant, language: 'EN',
    });
    expect(JSON.parse(window.localStorage.getItem('carmen_business_unit')).tenant).toBe(tenant);
    expect(window.localStorage.getItem('carmen_language')).toBe('en');
  });

  it('logs in using the selected UI language', async () => {
    window.localStorage.setItem('carmen_language', 'th');
    api.fetchBusinessUnitsByUsername.mockResolvedValue([{ Tenant: 'a' }]);
    const authenticated = vi.fn();
    render(<LoginForm onAuthenticated={authenticated} />);
    fireEvent.change(screen.getByLabelText('ชื่อผู้ใช้'), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'test-password' } });
    fireEvent.submit(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }).closest('form'));
    await waitFor(() => expect(authenticated).toHaveBeenCalledOnce());
    expect(api.loginWithCarmenCredentials).toHaveBeenCalledWith({ userName: 'user', password: 'test-password', tenant: 'a', language: 'TH' });
    expect(window.localStorage.getItem('carmen_language')).toBe('th');
  });

  it('reuses a pending blur lookup and prevents duplicate login submits', async () => {
    let resolveLookup;
    api.fetchBusinessUnitsByUsername.mockReturnValue(new Promise((resolve) => { resolveLookup = resolve; }));
    render(<LoginForm onAuthenticated={vi.fn()} />);
    fillCredentials();
    fireEvent.blur(screen.getByLabelText('Username'));
    await waitFor(() => expect(api.fetchBusinessUnitsByUsername).toHaveBeenCalledOnce());
    const form = screen.getByRole('button', { name: 'Sign in' }).closest('form');
    fireEvent.submit(form);
    fireEvent.submit(form);
    resolveLookup([{ Tenant: 'a' }]);
    await waitFor(() => expect(api.loginWithCarmenCredentials).toHaveBeenCalledOnce());
    expect(api.fetchBusinessUnitsByUsername).toHaveBeenCalledOnce();
  });

  it('ignores an old username lookup while logging in the current username', async () => {
    let resolveOld;
    api.fetchBusinessUnitsByUsername.mockImplementation((name) => name === 'old'
      ? new Promise((resolve) => { resolveOld = resolve; })
      : Promise.resolve([{ Tenant: 'new-bu' }]));
    render(<LoginForm onAuthenticated={vi.fn()} />);
    fillCredentials('old');
    fireEvent.blur(screen.getByLabelText('Username'));
    await waitFor(() => expect(api.fetchBusinessUnitsByUsername).toHaveBeenCalledWith('old'));
    fillCredentials('new');
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form'));
    resolveOld([{ Tenant: 'old-bu', IsDefault: 1 }]);
    await waitFor(() => expect(api.loginWithCarmenCredentials).toHaveBeenCalledWith({
      userName: 'new', password: 'test-password', tenant: 'new-bu', language: 'EN',
    }));
  });

  it.each(['empty', 'invalid', 'network'])('blocks login for %s lookup and permits retry', async (failure) => {
    if (failure === 'network') api.fetchBusinessUnitsByUsername.mockRejectedValueOnce(new Error('Lookup unavailable'));
    else api.fetchBusinessUnitsByUsername.mockResolvedValueOnce(failure === 'empty' ? [] : [{ Tenant: '' }]);
    api.fetchBusinessUnitsByUsername.mockResolvedValueOnce([{ Tenant: 'a' }]);
    render(<LoginForm onAuthenticated={vi.fn()} />);
    fillCredentials();
    const form = screen.getByRole('button', { name: 'Sign in' }).closest('form');
    fireEvent.submit(form);
    await screen.findByRole('alert');
    expect(api.loginWithCarmenCredentials).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled());
    fireEvent.submit(form);
    await waitFor(() => expect(api.loginWithCarmenCredentials).toHaveBeenCalledOnce());
  });
  it('shows a helpful no-business-unit error above Sign in when lookup is empty', async () => {
    api.fetchBusinessUnitsByUsername.mockResolvedValue([]);
    render(<LoginForm onAuthenticated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'wrong-user' } });
    fireEvent.blur(screen.getByLabelText('Username'));

    const error = await screen.findByRole('alert');
    const submit = screen.getByRole('button', { name: 'Sign in' });
    expect(error).toHaveTextContent('No business unit was found for this username. Check the username and try again.');
    expect(error.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
