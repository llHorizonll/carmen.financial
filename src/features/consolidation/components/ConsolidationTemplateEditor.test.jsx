import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConsolidationTemplateEditor from './ConsolidationTemplateEditor.jsx';
import { createConsolidationTemplate } from '../lib/templateModel.js';
import { saveReport } from '../lib/consolidationApi.js';
import { fetchCarmenDimensions, fetchCarmenMasterData, fetchCarmenReport, fetchCarmenReportOptions, fetchCarmenReports } from '../../report/lib/reportApi.js';

vi.mock('../lib/consolidationApi.js', () => ({ saveReport: vi.fn() }));
vi.mock('./TemplateMappingSummary.jsx', () => ({ default: () => null }));
vi.mock('../../report/lib/reportApi.js', async importOriginal => ({ ...await importOriginal(),
  fetchCarmenDimensions: vi.fn(), fetchCarmenMasterData: vi.fn(), fetchCarmenReport: vi.fn(),
  fetchCarmenReportOptions: vi.fn(), fetchCarmenReports: vi.fn(), getStoredCarmenSession: () => ({ username: 'owner' }),
}));
vi.mock('../../report/components/ReportSetup.jsx', () => ({ default: props => <>
  <input aria-label="Report name" value={props.activeReport.name} onChange={event => props.updateActiveReport({ name: event.target.value })} />
  <button disabled={props.isSaving || !props.isDirty} onClick={props.onSave}>Save changes</button>
  <button disabled={!props.canUndo} onClick={props.onUndo}>Undo</button>
  <button onClick={props.onCancel}>Cancel changes</button>
  <button onClick={() => props.handleAddRow('formula-percent')}>Add total</button>
</> }));

const profile = { tenant: 'hq', revision: 'profile-1', memberTenants: ['member'], canManage: true };
const saved = () => ({ ...createConsolidationTemplate(profile), id: 'central-report', name: 'Saved template', version: 2 });
beforeEach(() => {
  vi.clearAllMocks();
  fetchCarmenMasterData.mockResolvedValue({ depts: [], accCodes: [], accountGroups: [], deptGroups: [], groups: {} });
  fetchCarmenDimensions.mockResolvedValue({ definitions: [] });
  fetchCarmenReportOptions.mockResolvedValue({});
  fetchCarmenReports.mockResolvedValue([{ id: 'source', name: 'HQ report' }]);
});

describe('consolidation template editor', () => {
  it('starts with an explicit Blank/Copy choice and scopes HQ setup lookups', async () => {
    render(<ConsolidationTemplateEditor profile={profile} template={null} />);
    expect(screen.getByRole('button', { name: 'Blank template' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy from HQ' })).toBeInTheDocument();
    expect(fetchCarmenReports).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Blank template' }));
    expect(await screen.findByDisplayValue('New Consolidation Report')).toBeInTheDocument();
    expect(fetchCarmenMasterData).toHaveBeenCalledWith({ tenant: 'hq', year: expect.any(Number) });
    expect(fetchCarmenDimensions).toHaveBeenCalledWith({ tenant: 'hq' });
    expect(fetchCarmenReportOptions).toHaveBeenCalledWith({ tenant: 'hq' });
  });

  it('copies an HQ definition into a new central draft and saves its profile/version', async () => {
    const source = saved();
    source.id = 'source'; source.columns[0].label = 'TODAY\nActual';
    fetchCarmenReport.mockResolvedValue(source);
    saveReport.mockImplementation(async report => ({ ...report, version: 1 }));
    const onSaved = vi.fn();
    render(<ConsolidationTemplateEditor profile={profile} template={null} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy from HQ' }));
    await waitFor(() => expect(fetchCarmenReports).toHaveBeenCalledWith({ tenant: 'hq' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'HQ report' }));
    fireEvent.click(await screen.findByRole('option', { name: 'HQ report' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use this report' }));
    expect(await screen.findByDisplayValue('Copy of Saved template')).toBeInTheDocument();
    expect(fetchCarmenReport).toHaveBeenCalledWith('source', { tenant: 'hq' });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ version: 1, profileTenant: 'hq' })));
    expect(saveReport).toHaveBeenCalledWith(expect.objectContaining({ kind: 'consolidation', version: 0, profileRevision: 'profile-1', owner: 'owner',
      columns: expect.arrayContaining([expect.objectContaining({ label: 'TODAY\nActual' })]) }));
    expect(saveReport.mock.calls[0][0].id).not.toBe('source');
  });

  it('keeps edits on a save conflict, reports busy state, and supports undo', async () => {
    let rejectSave;
    saveReport.mockImplementation(() => new Promise((resolve, reject) => { rejectSave = reject; }));
    const onDirtyChange = vi.fn(); const onBusyChange = vi.fn();
    render(<ConsolidationTemplateEditor profile={profile} template={saved()} onDirtyChange={onDirtyChange} onBusyChange={onBusyChange} />);
    fireEvent.change(await screen.findByRole('textbox', { name: 'Report name' }), { target: { value: 'Unsaved edit' } });
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(true));
    await act(async () => { rejectSave(new Error('Version conflict. Reload before saving.')); });
    expect(await screen.findByRole('alert')).toHaveTextContent('Version conflict');
    expect(screen.getByDisplayValue('Unsaved edit')).toBeInTheDocument();
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByDisplayValue('Saved template')).toBeInTheDocument();
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
  });

  it('previews structure using placeholders, and read-only users cannot save', async () => {
    render(<ConsolidationTemplateEditor profile={{ ...profile, canManage: false }} template={saved()} />);
    expect(screen.getByRole('table', { name: 'Consolidation template structure' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Consolidated amounts are not calculated');
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(saveReport).not.toHaveBeenCalled();
    await waitFor(() => expect(fetchCarmenMasterData).toHaveBeenCalled());
  });
});
