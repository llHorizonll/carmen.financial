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
const consolidation = vi.hoisted(() => ({ listProfiles: vi.fn(), listReports: vi.fn(), getReport: vi.fn(), getMappings: vi.fn(), saveProfile: vi.fn() }));
vi.mock('../../report/lib/reportApi.js', async importOriginal => ({ ...await importOriginal(), ...api }));
vi.mock('../lib/consolidationApi.js', () => ({ consolidationApi: consolidation, saveReport: vi.fn() }));

const expectReportsBeforeConsolidation = () => {
  const reports = screen.queryByLabelText('Configured business unit reports', { selector: 'nav' })
    || screen.getByLabelText('Reports in hq', { selector: 'section' });
  const actions = screen.getByLabelText('Consolidation Reports', { selector: 'section' });
  expect(actions).not.toContainElement(reports);
  expect(reports.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const heading = screen.getByText('Reports', { exact: true });
  expect(heading.compareDocumentPosition(reports) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
};

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
  consolidation.getMappings.mockResolvedValue({ version: 0, profileRevision: 'profile-1', accounts: {}, departments: {}, dimensions: {} });
});

it('highlights the selected consolidation template instead of the previous BU report', async () => {
  const template = { ...createBlankReport('', [], 'same-id', 'admin'), name: 'Consolidated report', profileTenant: 'hq', version: 1 };
  consolidation.listReports.mockResolvedValue([template]);
  consolidation.getReport.mockResolvedValue(template);
  render(<App />);
  const nav = await screen.findByRole('region', { name: 'Consolidation Reports' });
  fireEvent.click(await within(nav).findByRole('button', { name: 'Consolidated report' }));
  await waitFor(() => expect(within(nav).getByRole('button', { name: 'Consolidated report' })).toHaveAttribute('aria-current', 'page'));
  const tree = screen.getByRole('navigation', { name: 'Configured business unit reports' });
  expect(await within(tree).findByRole('button', { name: 'HQ Operating' })).not.toHaveAttribute('aria-current');
  fireEvent.click(within(nav).getByRole('button', { name: 'Mapping', exact: true }));
  await waitFor(() => expect(within(nav).getByRole('button', { name: 'Mapping', exact: true })).toHaveAttribute('aria-current', 'page'));
  expect(within(nav).getByRole('button', { name: 'Consolidated report' })).not.toHaveAttribute('aria-current');
  expect(within(tree).getByRole('button', { name: 'HQ Operating' })).not.toHaveAttribute('aria-current');
  fireEvent.click(within(tree).getByRole('button', { name: 'HQ Operating' }));
  await waitFor(() => expect(within(tree).getByRole('button', { name: 'HQ Operating' })).toHaveAttribute('aria-current', 'page'));
  expect(within(nav).getByRole('button', { name: 'Mapping', exact: true })).not.toHaveAttribute('aria-current');
  expect(within(nav).getByRole('button', { name: 'Consolidated report' })).not.toHaveAttribute('aria-current');
});

it('starts a new template directly while Mapping opens its own workspace', async () => {
  render(<App />);
  await screen.findByText('100.00');
  const navigation = screen.getByLabelText('Consolidation Reports', { selector: 'section' });
  fireEvent.click(within(navigation).getByRole('button', { name: 'New Consolidate Report' }));
  const workspace = await screen.findByRole('region', { name: 'Consolidation workspace' });
  expect(await within(workspace).findByRole('button', { name: 'Blank template' })).toBeInTheDocument();
  expect(within(workspace).getByRole('button', { name: 'Copy from HQ' })).toBeInTheDocument();
  expect(within(workspace).queryByRole('heading', { name: 'Consolidation Mapping' })).not.toBeInTheDocument();
  fireEvent.click(within(navigation).getByRole('button', { name: 'Mapping' }));
  expect(await within(workspace).findByRole('heading', { name: 'Consolidation Mapping' })).toBeInTheDocument();
});

it('keeps the configured BU tree available when switching between member and HQ reports', async () => {
  render(<App />);
  await screen.findByText('100.00');
  expectReportsBeforeConsolidation();
  fireEvent.click(screen.getByRole('button', { name: 'Setup Profile', exact: true }));
  const profileDialog = await screen.findByRole('dialog', { name: 'Setup Profile' });
  expectReportsBeforeConsolidation();
  fireEvent.click(within(profileDialog).getByRole('button', { name: 'Cancel', exact: true }));
  expect(consolidation.saveProfile).not.toHaveBeenCalled();
  expectReportsBeforeConsolidation();
  fireEvent.click(within(screen.getByLabelText('Consolidation Reports', { selector: 'section' })).getByRole('button', { name: 'Mapping' }));
  const workspace = await screen.findByRole('region', { name: 'Consolidation workspace' });
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
  fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true }));
  expect(await screen.findByRole('region', { name: 'Reports in hq' })).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Configured business unit reports' })).not.toBeInTheDocument();
});

it('keeps an unsaved member draft on cancelled HQ navigation and switches both tenant and report after confirmation', async () => {
  render(<App />);
  await screen.findByText('100.00');
  fireEvent.click(screen.getByRole('button', { name: 'New Consolidate Report' }));
  const tree = await screen.findByRole('navigation', { name: 'Configured business unit reports' });
  fireEvent.click(within(tree).getByRole('button', { name: 'Member BU', exact: true }));
  fireEvent.click(await within(tree).findByRole('button', { name: 'Member Profit', exact: true }));
  await screen.findByText('200.00');
  fireEvent.click(screen.getByRole('button', { name: 'Edit', exact: true }));
  fireEvent.change(await screen.findByDisplayValue('Member Profit'), { target: { value: 'Member draft' } });
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
  fireEvent.click(screen.getByRole('button', { name: 'New Consolidate Report' }));
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
