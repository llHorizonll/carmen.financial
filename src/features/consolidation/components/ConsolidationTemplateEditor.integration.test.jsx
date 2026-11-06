import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import ConsolidationTemplateEditor from './ConsolidationTemplateEditor.jsx';
import { createConsolidationTemplate } from '../lib/templateModel.js';
import { fetchCarmenDimensions, fetchCarmenMasterData, fetchCarmenReportOptions } from '../../report/lib/reportApi.js';

vi.mock('../lib/consolidationApi.js', () => ({ saveReport: vi.fn() }));
vi.mock('./TemplateMappingSummary.jsx', () => ({ default: () => null }));
vi.mock('../../report/lib/reportApi.js', async importOriginal => ({ ...await importOriginal(),
  fetchCarmenDimensions: vi.fn(), fetchCarmenMasterData: vi.fn(), fetchCarmenReportOptions: vi.fn(),
}));

beforeEach(() => {
  window.localStorage.setItem('carmen_consolidation:setup', 'done');
  fetchCarmenMasterData.mockResolvedValue({ depts: [], accCodes: [], accountGroups: [], deptGroups: [], groups: {} });
  fetchCarmenDimensions.mockResolvedValue({ definitions: [] });
  fetchCarmenReportOptions.mockResolvedValue({});
});

it('renders the existing report configurators and previews copied totals without calculating amounts', async () => {
  const profile = { tenant: 'hq', revision: 'r1', canManage: true };
  const report = createConsolidationTemplate(profile);
  report.rows.push({ id: 'total', desc: 'Total Room Revenue', isTotal: true, isHeader: false, formula: 'R1+R2', numberFormat: 'percent' });
  report.columns[0].label = 'TODAY\nActual';
  render(<ConsolidationTemplateEditor profile={profile} template={{ ...report, version: 1 }} />);
  expect(await screen.findByRole('navigation', { name: 'Save or cancel report settings' })).toBeInTheDocument();
  expect(screen.getByDisplayValue('R1+R2')).toBeInTheDocument();
  expect(screen.getByDisplayValue('TODAY Actual')).toHaveValue('TODAY\nActual');
  fireEvent.click(screen.getByRole('button', { name: 'Structure preview' }));
  expect(screen.getByRole('table', { name: 'Consolidation template structure' })).toHaveTextContent('Total Room Revenue');
  expect(screen.getByRole('status')).toHaveTextContent('Save the report to view consolidated balances');
  expect(screen.getAllByText('—')).toHaveLength(2);
});

it('reports pending row mapping edits immediately and restores dirty state on cancel or apply', async () => {
  const profile = { tenant: 'hq', revision: 'r1', canManage: true };
  const onDirtyChange = vi.fn();
  render(<ConsolidationTemplateEditor profile={profile} template={{ ...createConsolidationTemplate(profile), version: 1 }} onDirtyChange={onDirtyChange} />);
  const edit = await screen.findByRole('button', { name: 'Edit mapping for row r-2' });
  fireEvent.click(edit);
  let dialog = screen.getByRole('dialog', { name: 'Edit Mapping' });
  expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  fireEvent.change(within(dialog).getByDisplayValue('Room Revenue'), { target: { value: 'Pending row edit' } });
  expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel', exact: true }));
  expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  fireEvent.click(edit);
  dialog = screen.getByRole('dialog', { name: 'Edit Mapping' });
  fireEvent.change(within(dialog).getByDisplayValue('Room Revenue'), { target: { value: 'Mapped revenue' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Apply Mapping' }));
  expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  expect(screen.getByDisplayValue('Mapped revenue')).toBeInTheDocument();
});
