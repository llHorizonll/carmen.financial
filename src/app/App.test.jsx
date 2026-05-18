import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('App shell', () => {
  it('switches from VIEW to SETUP for the admin user', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'VIEW' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SETUP' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'SETUP' }));

    expect(screen.getByText('Configuration Mode')).toBeInTheDocument();
    expect(screen.getByText('Report Details')).toBeInTheDocument();
  });

  it('hides the setup tab when the role changes to a non-admin user', () => {
    render(<App />);

    const roleSelector = screen.getAllByRole('combobox')[0];
    fireEvent.change(roleSelector, { target: { value: 'u2' } });

    expect(screen.getByRole('button', { name: 'VIEW' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'SETUP' })).not.toBeInTheDocument();
  });

  it('handles GL CSV uploads through the file input flow', async () => {
    const csv = [
      'year,deptcode,acccode,accname,accnature,group1,group2,group3,group4,amt1,bfamt1',
      '2025,101,4001,Rooms,I,FOOD,BEV,MAIN,DETAIL,100,25',
    ].join('\n');

    class MockFileReader {
      readAsText() {
        this.onload({ target: { result: csv } });
      }
    }

    const originalFileReader = globalThis.FileReader;
    globalThis.FileReader = MockFileReader;

    try {
      const { container } = render(<App />);
      const glInput = container.querySelectorAll('input[type="file"]')[0];

      fireEvent.change(glInput, { target: { files: [new File(['ignored'], 'gl.csv', { type: 'text/csv' })] } });

      await waitFor(() => expect(screen.getByText(/Transaction \(GL\)/)).toBeInTheDocument());
      fireEvent.click(screen.getAllByRole('button', { name: 'OK' })[0]);
      await waitFor(() => expect(screen.queryByText(/Transaction \(GL\)/)).not.toBeInTheDocument());
      expect(screen.getByDisplayValue('2025')).toBeInTheDocument();
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });

  it('handles Budget CSV uploads through the file input flow', async () => {
    const csv = [
      'deptcode,acccode,caption,amt1,amt2',
      '102,5002,Budget Rooms,10,20',
    ].join('\n');

    class MockFileReader {
      readAsText() {
        this.onload({ target: { result: csv } });
      }
    }

    const originalFileReader = globalThis.FileReader;
    globalThis.FileReader = MockFileReader;

    try {
      const { container } = render(<App />);
      const budgetInput = container.querySelectorAll('input[type="file"]')[1];

      fireEvent.change(budgetInput, { target: { files: [new File(['ignored'], 'budget.csv', { type: 'text/csv' })] } });

      await waitFor(() => expect(screen.getByText(/Budget สำเร็จ/)).toBeInTheDocument());
      fireEvent.click(screen.getAllByRole('button', { name: 'OK' })[0]);
      await waitFor(() => expect(screen.queryByText(/Budget สำเร็จ/)).not.toBeInTheDocument());
      expect(screen.getByText('Budget')).toBeInTheDocument();
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });
});
