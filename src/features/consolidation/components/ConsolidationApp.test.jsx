import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import App from '@/app/App.jsx';
import { createBlankReport } from '../../report/data/reportTemplates.js';
import { INITIAL_MASTER_DATA } from '../../report/lib/reportLogic.js';

const api = vi.hoisted(() => ({
  isCarmenApiConfigured: vi.fn(), getStoredCarmenSession: vi.fn(), fetchCarmenBusinessUnits: vi.fn(),
  fetchCarmenDimensions: vi.fn(), fetchCarmenMasterData: vi.fn(), fetchCarmenReportOptions: vi.fn(),
  fetchCarmenReports: vi.fn(), fetchCarmenReportData: vi.fn(), fetchCarmenReport: vi.fn(), saveCarmenReport: vi.fn(),
}));
const consolidation = vi.hoisted(() => ({ listProfiles: vi.fn(), listReports: vi.fn(), getReport: vi.fn(), getReportData: vi.fn(), getMappings: vi.fn(), saveProfile: vi.fn(), listDeletedReports: vi.fn(), setReportDeleted: vi.fn(), listActivity: vi.fn() }));
vi.mock('../../report/lib/reportApi.js', async importOriginal => ({ ...await importOriginal(), ...api }));
vi.mock('../lib/consolidationApi.js', () => ({ consolidationApi: consolidation, getReportData: consolidation.getReportData, saveReport: vi.fn() }));

const openConsolidation = async () => {
  const switcher = await screen.findByRole('navigation', { name: 'Workspace' });
  fireEvent.click(within(switcher).getByRole('button', { name: 'Consolidation' }));
  return screen.findByRole('region', { name: 'Consolidation workspace' });
};
const expectReportsBeforeConsolidation = () => {
  expect(screen.getByRole('navigation', { name: 'Configured business unit reports' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Consolidation Reports' })).toBeInTheDocument();
};

it('keeps the same loading dialog open through the template and balance requests', async () => {
  const template = { ...createBlankReport('', [], 'loading-report', 'admin'), profileTenant: 'hq', version: 1 };
  consolidation.listReports.mockResolvedValue([template]);
  let finishTemplate;
  consolidation.getReport.mockImplementationOnce(() => new Promise(resolve => { finishTemplate = resolve; }));
  let finishBalances;
  consolidation.getReportData.mockImplementationOnce(() => new Promise(resolve => { finishBalances = resolve; }));
  render(<App />);
  await screen.findByText('100.00');
  const switcher = screen.getByRole('navigation', { name: 'Workspace' });
  fireEvent.click(within(switcher).getByRole('button', { name: 'Consolidation' }));
  const loadingDialog = await screen.findByRole('dialog', { name: 'Loading report data' });
  await waitFor(() => expect(finishTemplate).toBeTypeOf('function'));
  finishTemplate(template);
  await waitFor(() => expect(finishBalances).toBeTypeOf('function'));
  expect(screen.getByRole('dialog', { name: 'Loading report data' })).toBe(loadingDialog);
  expect(loadingDialog).toHaveAttribute('data-state', 'open');
  finishBalances({ actualRows: [], budgetRows: [] });
  await screen.findByRole('region', { name: 'Consolidation report' });
  expect(screen.queryByRole('dialog', { name: 'Loading report data' })).not.toBeInTheDocument();
});

beforeEach(() => {
  vi.clearAllMocks();
  const user = { id: 'admin', role: 'Admin', permissions: { financialReport: { view: true, setup: true } } };
  const session = { accessToken: 'test-token', username: 'admin', businessUnit: { tenant: 'hq' }, user };
  window.localStorage.setItem('carmen_bi_getting_started_v1:admin', 'done');
  window.localStorage.setItem('carmen_bi_getting_started_v1:admin:setup', 'done');
  api.isCarmenApiConfigured.mockReturnValue(true);
  api.getStoredCarmenSession.mockReturnValue(session);
  api.fetchCarmenBusinessUnits.mockResolvedValue([
    { Tenant: 'hq', Description: 'Headquarters', financialReport: { view: true, setup: true } },
    { Tenant: 'member', Description: 'Member BU', financialReport: { view: true, setup: true } },
    { Tenant: 'outside', Description: 'Outside BU', financialReport: { view: true, setup: true } },
  ]);
  api.fetchCarmenMasterData.mockImplementation(async ({ tenant }) => ({ ...INITIAL_MASTER_DATA, currentUser: user,
    companyProfile: { name: tenant === 'hq' ? 'Headquarters' : 'Member BU' },
    depts: [], accCodes: [{ id: '4001', name: 'Room revenue', type: 'I', nature: 'C' }],
    accountGroups: [], deptGroups: [], periods: [], budgetRevisions: [], groups: {},
  }));
  api.fetchCarmenDimensions.mockResolvedValue({ definitions: [] });
  api.fetchCarmenReportOptions.mockResolvedValue({});
  api.fetchCarmenReports.mockImplementation(async ({ tenant }) => [{ ...createBlankReport('', [], 'same-id', 'admin'),
    name: tenant === 'hq' ? 'HQ Operating' : 'Member Profit',
    rows: [{ id: 'revenue', desc: 'Revenue', accCodes: '4001', isActive: true }],
  }]);
  api.fetchCarmenReportData.mockImplementation(async ({ tenant, year, period }) => ({
    actualRows: [{ year, acccode: '4001', [`amt${period}`]: tenant === 'hq' ? 100 : 200 }], budgetRows: [],
  }));
  consolidation.listProfiles.mockResolvedValue([{ tenant: 'hq', groupName: 'Hotel group', memberTenants: ['member'], revision: 'profile-1', canManage: true }]);
  consolidation.listReports.mockResolvedValue([]);
  consolidation.getReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
  consolidation.getMappings.mockResolvedValue({ version: 0, profileRevision: 'profile-1', accounts: {}, departments: {}, dimensions: {} });
});

it('opens and highlights the first consolidation template instead of the previous BU report', async () => {
  const template = { ...createBlankReport('', [], 'same-id', 'admin'), name: 'Consolidated report', profileTenant: 'hq', version: 1 };
  const second = { ...template, id: 'second', name: 'Another consolidation report' };
  consolidation.listReports.mockResolvedValue([template, second]);
  consolidation.getReport.mockResolvedValue(template);
  render(<App />);
  await openConsolidation();
  const nav = await screen.findByRole('region', { name: 'Consolidation Reports' });
  await waitFor(() => expect(within(nav).getByRole('button', { name: 'Consolidated report' })).toHaveAttribute('aria-current', 'page'));
  expect(consolidation.getReport).toHaveBeenCalledExactlyOnceWith(template.id);
  expect(within(nav).getByRole('button', { name: second.name })).not.toHaveAttribute('aria-current');
  const tree = screen.getByRole('navigation', { name: 'Configured business unit reports' });
  expect(await within(tree).findByRole('button', { name: 'HQ Operating' })).not.toHaveAttribute('aria-current');
  fireEvent.click(within(nav).getByRole('button', { name: 'Mapping', exact: true }));
  await waitFor(() => expect(within(nav).getByRole('button', { name: 'Mapping', exact: true })).toHaveAttribute('aria-current', 'page'));
  expect(await within(nav).findByRole('button', { name: 'Consolidated report' })).not.toHaveAttribute('aria-current');
  expect(within(tree).getByRole('button', { name: 'HQ Operating' })).not.toHaveAttribute('aria-current');
  fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true }));
  expect(await screen.findByTestId('report-print-header')).toBeInTheDocument();
  expect(within(nav).getByRole('button', { name: 'Consolidated report' })).toHaveAttribute('aria-current', 'page');
  fireEvent.click(within(tree).getByRole('button', { name: 'HQ Operating' }));
  await waitFor(() => expect(within(tree).getByRole('button', { name: 'HQ Operating' })).toHaveAttribute('aria-current', 'page'));
  expect(within(nav).getByRole('button', { name: 'Mapping', exact: true })).not.toHaveAttribute('aria-current');
  expect(within(nav).getByRole('button', { name: 'Consolidated report' })).not.toHaveAttribute('aria-current');
});

it('renders consolidated balances and applies year, period and BU filters together', async () => {
  const blank = createBlankReport('', [], 'totals', 'admin');
  const template = { ...blank, name: 'Combined balances', profileTenant: 'hq', version: 2,
    rows: [
      { ...blank.rows[1], desc: 'Room revenue', accCodes: '4001' },
      { id: 'total', desc: 'Formula total', isTotal: true, isActive: true, formula: 'R1*2' },
    ],
  };
  consolidation.listReports.mockResolvedValue([template]);
  consolidation.getReport.mockResolvedValue(template);
  consolidation.getReportData.mockImplementation(async (_, { year, period, tenants }) => ({
    actualRows: tenants.map(tenant => ({ year, acccode: '4001', [`amt${period}`]: tenant === 'hq' ? 100 : 200 })),
    budgetRows: [],
  }));
  render(<App />);
  const workspace = await openConsolidation();
  const view = await within(workspace).findByRole('region', { name: 'Consolidation report' });
  expect(await within(view).findByText(/^300(?:\.00)?$/)).toBeInTheDocument();
  expect(within(view).getByText(/^600(?:\.00)?$/)).toBeInTheDocument();
  fireEvent.change(within(view).getByLabelText('Year'), { target: { value: '2025' } });
  fireEvent.keyDown(within(view).getByRole('combobox', { name: 'Period' }), { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name: 'P3' }));
  fireEvent.click(within(view).getByTestId('dropdown-consolidation-bu'));
  expect(screen.queryByTestId('check-consolidation-bu-outside')).not.toBeInTheDocument();
  fireEvent.click(await screen.findByTestId('check-consolidation-bu-member'));
  expect(consolidation.getReportData).toHaveBeenCalledTimes(1);
  fireEvent.click(within(view).getByRole('button', { name: 'Apply' }));
  expect(await within(view).findByText(/^100(?:\.00)?$/)).toBeInTheDocument();
  expect(within(view).getByText(/^200(?:\.00)?$/)).toBeInTheDocument();
  expect(consolidation.getReportData).toHaveBeenLastCalledWith('totals', { version: 2, year: 2025, period: 3, day: '', tenants: ['hq'] });
});

it('hides Setup Profile in report view and setup and returns to the same report', async () => {
  const template = { ...createBlankReport('', [], 'template-id', 'admin'), name: 'Consolidated report', profileTenant: 'hq', version: 1 };
  consolidation.listReports.mockResolvedValue([template]);
  consolidation.getReport.mockResolvedValue(template);
  render(<App />);
  const workspace = await openConsolidation();
  fireEvent.click(await within(screen.getByRole('region', { name: 'Consolidation Reports' })).findByRole('button', { name: 'Consolidated report' }));
  expect(await within(workspace).findByTestId('report-print-header')).toBeInTheDocument();
  expect(within(workspace).queryByRole('region', { name: 'Profile mapping status' })).not.toBeInTheDocument();
  expect(within(workspace).queryByRole('button', { name: 'Setup Profile' })).not.toBeInTheDocument();
  expect(within(workspace).queryByRole('button', { name: 'Back', exact: true })).not.toBeInTheDocument();
  fireEvent.click(within(workspace).getByRole('button', { name: 'Edit', exact: true }));
  expect(within(workspace).getByRole('region', { name: 'Profile mapping status' })).toBeInTheDocument();
  expect(within(workspace).queryByRole('button', { name: 'Setup Profile' })).not.toBeInTheDocument();
  expect(within(workspace).getByRole('button', { name: 'Back', exact: true })).toBeInTheDocument();
  const reportName = await within(workspace).findByDisplayValue('Consolidated report');
  expect(within(workspace).queryByLabelText('Report Group')).not.toBeInTheDocument();
  fireEvent.change(reportName, { target: { value: 'Unsaved draft' } });
  fireEvent.click(within(workspace).getByRole('button', { name: 'Back', exact: true }));
  let confirmation = screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' });
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
  expect(within(workspace).getByDisplayValue('Unsaved draft')).toBeInTheDocument();
  fireEvent.click(within(workspace).getByRole('button', { name: 'Back', exact: true }));
  confirmation = screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' });
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Discard changes' }));
  expect(await within(workspace).findByTestId('report-print-header')).toBeInTheDocument();
  expect(within(workspace).getByText('Consolidated report')).toBeInTheDocument();
  expect(within(workspace).queryByRole('button', { name: 'Back', exact: true })).not.toBeInTheDocument();
  expect(within(workspace).queryByRole('heading', { name: 'Consolidation Mapping' })).not.toBeInTheDocument();
});

it('deletes a selected template and restores it without modifying the profile or mapping', async () => {
  const template = { ...createBlankReport('', [], 'template-id', 'admin'), name: 'Consolidated report', profileTenant: 'hq', version: 1 };
  consolidation.listReports.mockResolvedValue([template]);
  consolidation.getReport.mockResolvedValue(template);
  consolidation.listDeletedReports.mockResolvedValueOnce([{ ...template, version: 2, isDeleted: true, deletedBy: 'admin' }]).mockResolvedValue([]);
  consolidation.listActivity.mockResolvedValue([{ reportId: 'template-id', reportName: 'Consolidated report', version: 2, changeType: 'delete', changedBy: 'admin', changedAt: '2026-11-06T00:00:00Z' }]);
  consolidation.setReportDeleted.mockImplementation(async (report, profile, deleted) => ({ ...report, version: report.version + 1, isDeleted: deleted }));
  render(<App />);
  const workspace = await openConsolidation();
  const nav = screen.getByRole('region', { name: 'Consolidation Reports' });
  fireEvent.click(await within(nav).findByRole('button', { name: 'Consolidated report' }));
  await within(workspace).findByTestId('report-print-header');
  fireEvent.click(within(workspace).getByRole('button', { name: 'Delete', exact: true }));
  let dialog = screen.getByRole('alertdialog', { name: 'Delete consolidation report?' });
  expect(within(dialog).getByText(/Consolidated report/)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(consolidation.setReportDeleted).not.toHaveBeenCalled();
  fireEvent.click(within(workspace).getByRole('button', { name: 'Delete', exact: true }));
  dialog = screen.getByRole('alertdialog', { name: 'Delete consolidation report?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete report' }));
  await waitFor(() => expect(within(nav).queryByRole('button', { name: 'Consolidated report' })).not.toBeInTheDocument());
  expect(consolidation.setReportDeleted).toHaveBeenCalledWith(expect.objectContaining({ id: 'template-id', version: 1 }), expect.objectContaining({ tenant: 'hq', revision: 'profile-1' }), true);
  expect(consolidation.saveProfile).not.toHaveBeenCalled();
  fireEvent.click(within(workspace).getByRole('button', { name: 'Activity' }));
  const trash = await screen.findByRole('dialog', { name: 'Consolidation activity' });
  expect(await within(trash).findByText(/Report deleted/)).toBeInTheDocument();
  fireEvent.click(await within(trash).findByRole('button', { name: 'Restore' }));
  await waitFor(() => expect(consolidation.listDeletedReports).toHaveBeenCalledTimes(2));
  fireEvent.click(within(trash).getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(within(nav).getByRole('button', { name: 'Consolidated report' })).toBeInTheDocument());
  expect(consolidation.setReportDeleted).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'template-id', version: 2 }), expect.objectContaining({ tenant: 'hq' }), false);
  expect(consolidation.saveProfile).not.toHaveBeenCalled();
});

it('keeps the report open when delete conflicts', async () => {
  const template = { ...createBlankReport('', [], 'template-id', 'admin'), name: 'Consolidated report', profileTenant: 'hq', version: 1 };
  consolidation.listReports.mockResolvedValue([template]); consolidation.getReport.mockResolvedValue(template);
  consolidation.setReportDeleted.mockRejectedValue(new Error('Version conflict. Reload before continuing.'));
  render(<App />);
  const workspace = await openConsolidation();
  const nav = screen.getByRole('region', { name: 'Consolidation Reports' });
  fireEvent.click(await within(nav).findByRole('button', { name: 'Consolidated report' }));
  await within(workspace).findByTestId('report-print-header');
  fireEvent.click(within(workspace).getByRole('button', { name: 'Delete', exact: true }));
  const dialog = screen.getByRole('alertdialog', { name: 'Delete consolidation report?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete report' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Version conflict');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(within(nav).getByRole('button', { name: 'Consolidated report' })).toBeInTheDocument();
});

it('lands on the empty report view, offers New Report in the toolbar, and returns from Mapping', async () => {
  render(<App />);
  await screen.findByText('100.00');
  const workspace = await openConsolidation();
  const navigation = screen.getByLabelText('Consolidation Reports', { selector: 'section' });
  expect(await within(workspace).findByRole('heading', { name: 'No reports yet' })).toBeInTheDocument();
  expect(within(workspace).queryByRole('button', { name: 'Setup Profile' })).not.toBeInTheDocument();
  fireEvent.click(within(workspace).getByRole('button', { name: 'Open consolidation guide' }));
  expect(screen.getByText('Create a template')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(within(navigation).queryByRole('button', { name: /new.*report/i })).not.toBeInTheDocument();
  expect(consolidation.getMappings).not.toHaveBeenCalled();
  fireEvent.click(within(workspace).getByRole('button', { name: 'New Report', exact: true }));
  expect(await within(workspace).findByRole('button', { name: 'Blank template' })).toBeInTheDocument();
  expect(within(workspace).getByRole('button', { name: 'Copy from HQ' })).toBeInTheDocument();
  expect(within(workspace).queryByRole('heading', { name: 'Consolidation Mapping' })).not.toBeInTheDocument();
  fireEvent.click(within(navigation).getByRole('button', { name: 'Mapping' }));
  expect(await within(workspace).findByRole('heading', { name: 'Consolidation Mapping' })).toBeInTheDocument();
  fireEvent.click(within(workspace).getByRole('button', { name: 'Back', exact: true }));
  expect(await within(workspace).findByRole('heading', { name: 'No reports yet' })).toBeInTheDocument();
});

it('offers one Setup Profile action in empty Mapping and still opens the wizard from New Report', async () => {
  consolidation.listProfiles.mockResolvedValue([]);
  render(<App />);
  const workspace = await openConsolidation();
  const navigation = screen.getByRole('region', { name: 'Consolidation Reports' });
  await within(workspace).findByRole('heading', { name: 'No reports yet' });
  fireEvent.click(within(navigation).getByRole('button', { name: 'Mapping' }));
  let dialog = await screen.findByRole('dialog', { name: 'Setup Profile' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(within(workspace).getByRole('button', { name: 'Setup Profile' })).toBeInTheDocument();
  fireEvent.click(within(workspace).getByRole('button', { name: 'Back', exact: true }));
  fireEvent.click(within(workspace).getByRole('button', { name: 'New Report' }));
  dialog = await screen.findByRole('dialog', { name: 'Setup Profile' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(within(workspace).queryByRole('button', { name: 'Setup Profile' })).not.toBeInTheDocument();
});

it('hides Setup Profile in Mapping when the profile is view-only', async () => {
  consolidation.listProfiles.mockResolvedValue([{ tenant: 'hq', memberTenants: ['member'], revision: 'profile-1', canManage: false }]);
  render(<App />);
  const workspace = await openConsolidation();
  await within(workspace).findByRole('heading', { name: 'No reports yet' });
  fireEvent.click(within(screen.getByRole('region', { name: 'Consolidation Reports' })).getByRole('button', { name: 'Mapping' }));
  await within(workspace).findByRole('heading', { name: 'Consolidation Mapping' });
  expect(within(workspace).queryByRole('button', { name: 'Setup Profile' })).not.toBeInTheDocument();
});

it('loads the ordinary report once when returning from Consolidation for the same BU and year', async () => {
  render(<App />);
  await screen.findByText('100.00');
  const workspace = await openConsolidation();
  await within(workspace).findByRole('heading', { name: 'No reports yet' });
  api.fetchCarmenReportData.mockClear();
  api.fetchCarmenMasterData.mockClear();
  let finishBalances;
  api.fetchCarmenReportData.mockImplementationOnce(() => new Promise(resolve => { finishBalances = resolve; }));

  const switcher = screen.getByRole('navigation', { name: 'Workspace' });
  fireEvent.click(within(switcher).getByRole('button', { name: 'Reports' }));
  expect(await screen.findByRole('dialog', { name: 'Loading report data' })).toBeInTheDocument();
  finishBalances({ actualRows: [], budgetRows: [] });
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Loading report data' })).not.toBeInTheDocument());
  expect(api.fetchCarmenReportData).toHaveBeenCalledOnce();
  expect(api.fetchCarmenMasterData).not.toHaveBeenCalled();
});

it('keeps an unsaved consolidation template when workspace switching is cancelled', async () => {
  render(<App />);
  await screen.findByText('100.00');
  const workspace = await openConsolidation();
  await within(workspace).findByRole('heading', { name: 'No reports yet' });
  fireEvent.click(within(workspace).getByRole('button', { name: 'New Report', exact: true }));
  fireEvent.click(await within(workspace).findByRole('button', { name: 'Blank template' }));
  await screen.findByDisplayValue('New Consolidation Report');
  fireEvent.click(within(workspace).getByRole('button', { name: 'Back', exact: true }));
  expect(await within(workspace).findByRole('table', { name: 'Consolidation template structure' })).toBeInTheDocument();
  fireEvent.click(within(workspace).getByRole('button', { name: 'Edit', exact: true }));
  expect(await screen.findByDisplayValue('New Consolidation Report')).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Workspace' })).getByRole('button', { name: 'Reports' }));
  fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' })).getByRole('button', { name: 'Cancel' }));
  expect(screen.getByDisplayValue('New Consolidation Report')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Consolidation workspace' })).toBeInTheDocument();
});

it('keeps the configured BU tree available when switching between member and HQ reports', async () => {
  render(<App />);
  await screen.findByText('100.00');
  await openConsolidation();
  expectReportsBeforeConsolidation();
  fireEvent.click(within(screen.getByLabelText('Consolidation Reports', { selector: 'section' })).getByRole('button', { name: 'Mapping' }));
  const workspace = await screen.findByRole('region', { name: 'Consolidation workspace' });
  const setupProfile = await within(workspace).findByRole('button', { name: 'Setup Profile', exact: true });
  fireEvent.click(within(workspace).getByRole('button', { name: 'Open consolidation guide' }));
  expect(setupProfile).toHaveAttribute('data-tour-active', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
  fireEvent.click(setupProfile);
  const profileDialog = await screen.findByRole('dialog', { name: 'Setup Profile' });
  fireEvent.click(within(profileDialog).getByRole('button', { name: 'Cancel', exact: true }));
  expect(consolidation.saveProfile).not.toHaveBeenCalled();
  expect(await within(workspace).findByRole('heading', { name: 'Consolidation Mapping' })).toBeInTheDocument();
  expect(await within(workspace).findByRole('tab', { name: 'Account Code' })).toBeInTheDocument();
  expectReportsBeforeConsolidation();
  await waitFor(() => expect(consolidation.getMappings).toHaveBeenCalledWith('hq'));
  const tree = screen.getByRole('navigation', { name: 'Configured business unit reports' });
  expect(within(tree).queryByText('Outside BU')).not.toBeInTheDocument();
  fireEvent.click(within(tree).getByRole('button', { name: 'Member BU', exact: true }));
  fireEvent.click(await within(tree).findByRole('button', { name: 'Member Profit', exact: true }));
  await waitFor(() => expect(within(screen.getByRole('region', { name: 'Report title and actions' })).getByRole('button', { name: 'Member Profit', exact: true })).toBeInTheDocument());
  expect(screen.queryByRole('region', { name: 'Reports in member' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Consolidation workspace' })).not.toBeInTheDocument();
  await screen.findByText('200.00');
  expectReportsBeforeConsolidation();
  expect(api.fetchCarmenMasterData).toHaveBeenCalledWith(expect.objectContaining({ tenant: 'member' }));
  expect(api.fetchCarmenReportData).toHaveBeenLastCalledWith(expect.objectContaining({ tenant: 'member', reportId: 'same-id' }));
  const persistentTree = screen.getByRole('navigation', { name: 'Configured business unit reports' });
  expect(within(persistentTree).getByRole('button', { name: 'Headquarters · HQ' })).toBeInTheDocument();
  expect(within(persistentTree).getByRole('button', { name: 'Member BU', exact: true })).toBeInTheDocument();
  expect(within(persistentTree).queryByText('Outside BU')).not.toBeInTheDocument();
  const dataCalls = api.fetchCarmenReportData.mock.calls.length;
  fireEvent.click(within(persistentTree).getByRole('button', { name: 'Member Profit', exact: true }));
  expect(screen.getByText('200.00')).toBeInTheDocument();
  expect(api.fetchCarmenReportData).toHaveBeenCalledTimes(dataCalls);
  fireEvent.click(await within(persistentTree).findByRole('button', { name: 'HQ Operating', exact: true }));
  await waitFor(() => expect(within(screen.getByRole('region', { name: 'Report title and actions' })).getByRole('button', { name: 'HQ Operating', exact: true })).toBeInTheDocument());
  await screen.findByText('100.00');
  expectReportsBeforeConsolidation();
  expect(api.fetchCarmenMasterData).toHaveBeenLastCalledWith(expect.objectContaining({ tenant: 'hq' }));
  expect(api.fetchCarmenReportData).toHaveBeenLastCalledWith(expect.objectContaining({ tenant: 'hq', reportId: 'same-id' }));
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Workspace' })).getByRole('button', { name: 'Reports' }));
  expect(await screen.findByRole('region', { name: 'Reports in hq' })).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Configured business unit reports' })).not.toBeInTheDocument();
});

it('keeps an unsaved member draft on cancelled HQ navigation and switches both tenant and report after confirmation', async () => {
  render(<App />);
  await screen.findByText('100.00');
  await openConsolidation();
  await screen.findByRole('heading', { name: 'No reports yet' });
  fireEvent.click(screen.getByRole('button', { name: 'New Report', exact: true }));
  const tree = await screen.findByRole('navigation', { name: 'Configured business unit reports' });
  fireEvent.click(within(tree).getByRole('button', { name: 'Member BU', exact: true }));
  fireEvent.click(await within(tree).findByRole('button', { name: 'Member Profit', exact: true }));
  await screen.findByText('200.00');
  fireEvent.click(screen.getByRole('button', { name: 'Edit', exact: true }));
  fireEvent.change(await screen.findByDisplayValue('Member Profit'), { target: { value: 'Member draft' } });
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Workspace' })).getByRole('button', { name: 'Reports' }));
  fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' })).getByRole('button', { name: 'Cancel', exact: true }));
  expect(screen.getByDisplayValue('Member draft')).toBeInTheDocument();
  expect(within(screen.getByRole('navigation', { name: 'Workspace' })).getByRole('button', { name: 'Consolidation' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(within(tree).getByRole('button', { name: 'HQ Operating', exact: true }));
  let confirmation = screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' });
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel', exact: true }));
  expect(screen.getByDisplayValue('Member draft')).toBeInTheDocument();
  expect(api.fetchCarmenReportData).toHaveBeenLastCalledWith(expect.objectContaining({ tenant: 'member', reportId: 'same-id' }));
  fireEvent.click(within(tree).getByRole('button', { name: 'HQ Operating', exact: true }));
  confirmation = screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' });
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Discard changes', exact: true }));
  await screen.findByText('100.00');
  expect(within(screen.getByRole('region', { name: 'Report title and actions' })).getByRole('button', { name: 'HQ Operating', exact: true })).toBeInTheDocument();
  expect(api.fetchCarmenMasterData).toHaveBeenLastCalledWith(expect.objectContaining({ tenant: 'hq' }));
  expect(api.fetchCarmenReportData).toHaveBeenLastCalledWith(expect.objectContaining({ tenant: 'hq', reportId: 'same-id' }));
  expect(screen.getByRole('navigation', { name: 'Configured business unit reports' })).toBeInTheDocument();
});

it('moves an HQ report using its latest owner definition while the selected member has view-only permission', async () => {
  api.fetchCarmenBusinessUnits.mockResolvedValue([
    { Tenant: 'hq', Description: 'Headquarters', financialReport: { view: true, setup: true } },
    { Tenant: 'member', Description: 'Member BU', financialReport: { view: true, setup: false } },
  ]);
  const definition = { ...createBlankReport('', [], 'same-id', 'admin'), reportGroup: 'Operations',
    rows: [{ id: 'revenue', desc: 'Revenue', accCodes: '4001', isActive: true }] };
  api.fetchCarmenReports.mockImplementation(async ({ tenant }) => [
    { ...definition, name: tenant === 'hq' ? 'HQ Operating' : 'Member Profit' },
    { ...definition, id: 'daily-id', name: tenant === 'hq' ? 'HQ Daily' : 'Member Daily', reportGroup: 'Daily Report' },
  ]);
  const latestOwnerDefinition = { ...definition, name: 'HQ Operating', remark: 'Fresh server definition', lastModified: 'fresh-version',
    rows: [{ id: 'revenue', desc: 'Latest revenue mapping', accCodes: '4999', isActive: true }] };
  api.fetchCarmenReport.mockResolvedValue(latestOwnerDefinition);
  api.saveCarmenReport.mockImplementation(async report => ({ ...report, lastModified: 'saved-version' }));
  render(<App />);
  await screen.findByText('100.00');
  await openConsolidation();
  await screen.findByRole('heading', { name: 'No reports yet' });
  fireEvent.click(screen.getByRole('button', { name: 'New Report', exact: true }));
  const tree = await screen.findByRole('navigation', { name: 'Configured business unit reports' });
  fireEvent.click(within(tree).getByRole('button', { name: 'Member BU', exact: true }));
  fireEvent.click(await within(tree).findByRole('button', { name: 'Member Profit', exact: true }));
  await screen.findByText('200.00');
  expect(screen.queryByRole('button', { name: 'Edit', exact: true })).not.toBeInTheDocument();
  const hqTrigger = within(tree).getByRole('button', { name: 'Headquarters · HQ', exact: true });
  const hq = document.getElementById(hqTrigger.getAttribute('aria-controls'));
  const source = within(hq).getByRole('button', { name: 'HQ Operating', exact: true });
  expect(source).toHaveAttribute('draggable', 'true');
  const destination = within(hq).getByRole('button', { name: 'Daily Report', exact: true });
  const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
  const dataCalls = api.fetchCarmenReportData.mock.calls.length;
  fireEvent.dragStart(source, { dataTransfer });
  fireEvent.dragOver(destination, { dataTransfer });
  fireEvent.drop(destination, { dataTransfer });
  await waitFor(() => expect(api.fetchCarmenReport).toHaveBeenCalledWith('same-id', { tenant: 'hq' }));
  await waitFor(() => expect(api.saveCarmenReport).toHaveBeenCalledWith(
    expect.objectContaining({ ...latestOwnerDefinition, tenant: 'hq', reportGroup: 'Daily Report' }), { tenant: 'hq' },
  ));
  await waitFor(() => expect(within(document.getElementById(destination.getAttribute('aria-controls'))).getByRole('button', { name: 'HQ Operating', exact: true })).toBeInTheDocument());
  expect(within(screen.getByRole('region', { name: 'Report title and actions' })).getByRole('button', { name: 'Member Profit', exact: true })).toBeInTheDocument();
  expect(screen.getByText('200.00')).toBeInTheDocument();
  expect(api.fetchCarmenReportData).toHaveBeenCalledTimes(dataCalls);
  expect(api.fetchCarmenReportData).toHaveBeenLastCalledWith(expect.objectContaining({ tenant: 'member', reportId: 'same-id' }));
});
