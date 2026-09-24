import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginForm from './LoginForm.jsx';

const api = vi.hoisted(() => ({ fetchBusinessUnitsByUsername: vi.fn() }));
vi.mock('../features/report/lib/reportApi.js', () => api);

describe('LoginForm', () => {
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
