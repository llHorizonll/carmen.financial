import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SharedReportWorkspace from './SharedReportWorkspace.jsx';
import { sharedReportsApi } from '../lib/sharedReports.js';
import { fetchCarmenMasterData, fetchCarmenDimensions } from '../lib/reportApi.js';

vi.mock('../lib/sharedReports.js', async importOriginal => ({ ...await importOriginal(), sharedReportsApi: {
  capabilities: vi.fn(), list: vi.fn(), get: vi.fn(), validate: vi.fn(), save: vi.fn(), data: vi.fn(), clone: vi.fn(), delete: vi.fn(), history: vi.fn(), restore: vi.fn(),
} }));
vi.mock('../lib/reportApi.js', () => ({ requestCarmenJson: vi.fn(), fetchCarmenMasterData: vi.fn(), fetchCarmenDimensions: vi.fn(), fetchCarmenReportOptions: vi.fn(async () => ({})) }));

const units = ['cloud', 'paresa'].map(id => ({ id, name: id, permission: { add: true, update: true, delete: true } }));
const template = { id: 'shared1', version: 1, kind: 'shared', owner: 'admin', name: 'Room revenue combined', tenants: ['cloud', 'paresa'],
  theme: 'blue', category: ['ALL'], access: [], kpis: [{ id: 'kpi', rowId: 'room', columnId: 'C1' }],
  rows: [{ id: 'room', desc: 'Room revenue', isActive: true }],
  columns: [{ id: 'C1', label: 'Combined actual', type: 'AC', sourceTenant: 'ALL', isActive: true }],
  mappings: { cloud: { room: { accCodes: '400' } }, paresa: { room: { accCodes: '401' } } }, compatibilityConfirmed: true };
const source = (code, amount) => ({ actualRows: [{ acccode: code, year: new Date().getFullYear(), amt1: amount }], budgetRows: [], accountCodes: [] });
const complete = { configVersion: 1, mappingVersion: 1, requestedTenants: template.tenants, includedTenants: template.tenants,
  isComplete: true, currency: 'THB', asOf: '2026-10-12T08:00:00Z', warnings: [], byTenant: { cloud: source('400', 100000), paresa: source('401', 80000) } };

async function openTemplate() {
  render(<SharedReportWorkspace units={units} username="admin" onClose={vi.fn()} />);
  fireEvent.click(await screen.findByRole('combobox', { name: 'Shared report' }));
  fireEvent.click(screen.getByRole('option', { name: template.name }));
  await screen.findByDisplayValue(template.name);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Preview report' })).toBeEnabled());
}

describe('SharedReportWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharedReportsApi.capabilities.mockResolvedValue({ available: true });
    sharedReportsApi.list.mockResolvedValue([template]);
    sharedReportsApi.get.mockResolvedValue(structuredClone(template));
    sharedReportsApi.validate.mockResolvedValue({ mappingOverlaps: [] });
    sharedReportsApi.data.mockResolvedValue(structuredClone(complete));
    fetchCarmenMasterData.mockResolvedValue({ depts: [], accCodes: [], accountGroups: [], deptGroups: [], groups: {} });
    fetchCarmenDimensions.mockResolvedValue({ definitions: [] });
  });
  it('shows a capability gate without creating an offline shared template', async () => {
    sharedReportsApi.capabilities.mockResolvedValue({ available: false });
    render(<SharedReportWorkspace units={units} username="admin" onClose={vi.fn()} />);
    expect(await screen.findByText('Shared reports are not enabled on this server yet.')).toBeInTheDocument();
    expect(sharedReportsApi.list).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'New shared template' })).not.toBeInTheDocument();
  });
  it('previews 180,000 and uses the same value for the configured dashboard KPI', async () => {
    await openTemplate();
    fireEvent.click(screen.getByRole('button', { name: 'Preview report' }));
    expect(await screen.findByText('180,000.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard', exact: true }));
    expect(await screen.findByRole('heading', { name: '180,000.00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excel' })).toBeEnabled();
  });
  it('blocks consolidated output and export when a BU is missing', async () => {
    sharedReportsApi.data.mockResolvedValue({ ...complete, isComplete: false, warnings: [{ tenant: 'paresa' }], byTenant: { cloud: complete.byTenant.cloud } });
    await openTemplate();
    fireEvent.click(screen.getByRole('button', { name: 'Preview report' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Missing business units: paresa');
    expect(screen.queryByText('180,000.00')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excel' })).not.toBeInTheDocument();
  });
  it('keeps unsaved edits on a version conflict and prevents preview of dirty data', async () => {
    sharedReportsApi.save.mockRejectedValue(new Error('Shared report changed. Reload before saving.'));
    await openTemplate();
    fireEvent.change(screen.getByLabelText('Template name'), { target: { value: 'Edited template' } });
    expect(screen.getByRole('button', { name: 'Preview report' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reload before saving');
    expect(screen.getByDisplayValue('Edited template')).toBeInTheDocument();
  });
  it('clears the old complete result when a new preview is denied', async () => {
    await openTemplate();
    fireEvent.click(screen.getByRole('button', { name: 'Preview report' }));
    await screen.findByText('180,000.00');
    sharedReportsApi.data.mockRejectedValue(new Error('Business unit access denied.'));
    fireEvent.click(screen.getByRole('button', { name: 'Preview report' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Business unit access denied');
    expect(screen.queryByRole('button', { name: 'Excel' })).not.toBeInTheDocument();
    expect(screen.queryByText('180,000.00')).not.toBeInTheDocument();
  });
});
