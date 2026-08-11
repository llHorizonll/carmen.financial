import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoginShell from './LoginShell.jsx';

describe('LoginShell', () => {
  it('renders the login hero and form content', async () => {
    render(<LoginShell />);

    expect(screen.getByText('Carmen Financial BI')).toBeInTheDocument();
    expect(await screen.findByText('Carmen BI Login')).toBeInTheDocument();
    expect(await screen.findByText('Report viewing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});
