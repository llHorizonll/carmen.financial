import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AccessModal from './AccessModal.jsx';

describe('AccessModal', () => {
  it('renders assigned users and toggles access', () => {
    const onClose = vi.fn();
    const onUpdateUsers = vi.fn();

    render(
      <AccessModal
        isOpen={true}
        masterData={{
          users: [
            { id: 'u1', name: 'Admin User', role: 'Admin' },
            { id: 'u2', name: 'General Manager', role: 'User' },
          ],
        }}
        activeReport={{ assignedUsers: ['u1'] }}
        onClose={onClose}
        onUpdateUsers={onUpdateUsers}
      />
    );

    expect(screen.getByText('Manage Report Access')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('General Manager')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /general manager/i }));
    expect(onUpdateUsers).toHaveBeenCalledWith(['u1', 'u2']);

    fireEvent.click(screen.getByText('Done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when closed', () => {
    const { container } = render(
      <AccessModal
        isOpen={false}
        masterData={{ users: [] }}
        activeReport={{ assignedUsers: [] }}
        onClose={() => {}}
        onUpdateUsers={() => {}}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('derives admin label from financial report permissions', () => {
    render(
      <AccessModal
        isOpen={true}
        masterData={{
          users: [
            {
              id: 'u3',
              name: 'Permission Admin',
              permissions: { financialReport: { setup: true } },
            },
          ],
        }}
        activeReport={{ assignedUsers: ['u3'] }}
        onClose={() => {}}
        onUpdateUsers={() => {}}
      />
    );

    expect(screen.getByText('Permission Admin')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
