import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsolidationReportTree } from './ConsolidationNavigation.jsx';
import { fetchCarmenReports } from '../../report/lib/reportApi.js';

vi.mock('../../report/lib/reportApi.js', () => ({ fetchCarmenReports: vi.fn() }));
const profile = { tenant: 'hq', memberTenants: ['member'], revision: 'r1' };
const units = ['hq', 'member'].map(id => ({ id, name: id === 'hq' ? 'Headquarters' : 'Member BU', permission: { view: true, setup: true } }));
const reports = tenant => [
  { id: 'same', name: `${tenant} Spa`, reportGroup: 'Operations', rows: [{ id: 'r1', accCodes: '4001' }] },
  { id: 'daily', name: `${tenant} Daily`, reportGroup: 'Daily Report', rows: [] },
];
const controlledBy = button => document.getElementById(button.getAttribute('aria-controls'));
const unitNavigation = async name => {
  const button = screen.getByRole('button', { name, exact: true });
  if (button.getAttribute('aria-expanded') === 'false') fireEvent.click(button);
  return within(controlledBy(button)).findByRole('navigation', { name: 'Report groups' });
};
const transfer = () => {
  const data = new Map();
  return { setData: vi.fn((type, value) => data.set(type, value)), getData: vi.fn(type => data.get(type)), effectAllowed: '', dropEffect: '' };
};
const drop = (source, destination) => {
  const dataTransfer = transfer();
  fireEvent.dragStart(source, { dataTransfer });
  fireEvent.dragOver(destination, { dataTransfer });
  fireEvent.drop(destination, { dataTransfer });
  fireEvent.dragEnd(source, { dataTransfer });
};
beforeEach(() => {
  vi.clearAllMocks(); window.localStorage.clear();
  fetchCarmenReports.mockImplementation(async ({ tenant }) => reports(tenant));
});

describe('configured business unit report navigation', () => {
  it('expands and collapses every BU and report group from the search toolbar', async () => {
    render(<ConsolidationReportTree profile={profile} units={units} onSelect={vi.fn()} onMoveReport={vi.fn()} />);
    await screen.findByRole('button', { name: 'hq Spa', exact: true });
    expect(screen.queryByText('Folders')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(await screen.findByRole('button', { name: 'member Spa', exact: true })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(screen.getByRole('button', { name: 'Member BU', exact: true })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Headquarters · HQ', exact: true }));
    const hq = await unitNavigation('Headquarters · HQ');
    expect(within(hq).getByRole('button', { name: 'Operations', exact: true })).toHaveAttribute('aria-expanded', 'false');
  });
  it('uses one report search to reveal matching reports in a collapsed member BU', async () => {
    render(<ConsolidationReportTree profile={profile} units={units} onSelect={vi.fn()} />);
    await screen.findByRole('button', { name: 'hq Spa', exact: true });
    expect(screen.getByRole('button', { name: 'Member BU', exact: true })).toHaveAttribute('aria-expanded', 'false');
    const searches = screen.getAllByRole('textbox', { name: 'Search reports...' });
    expect(searches).toHaveLength(1);
    fireEvent.change(searches[0], { target: { value: 'member Spa' } });
    expect(await screen.findByRole('button', { name: 'member Spa', exact: true })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'hq Spa', exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'member Daily', exact: true })).not.toBeInTheDocument();
    fireEvent.change(searches[0], { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'hq Spa', exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Member BU', exact: true })).toHaveAttribute('aria-expanded', 'false');
  });

  it('matches report groups across BUs while restoring prior folder expansion after clearing search', async () => {
    render(<ConsolidationReportTree profile={profile} units={units} onSelect={vi.fn()} />);
    const hq = await unitNavigation('Headquarters · HQ');
    await within(hq).findByRole('button', { name: 'hq Spa', exact: true });
    fireEvent.click(within(hq).getByRole('button', { name: 'Operations', exact: true }));
    const search = screen.getByRole('textbox', { name: 'Search reports...' });
    fireEvent.change(search, { target: { value: 'Operations' } });
    expect(await screen.findByRole('button', { name: 'hq Spa', exact: true })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'member Spa', exact: true })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'hq Daily', exact: true })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: '' } });
    expect(within(hq).getByRole('button', { name: 'Operations', exact: true })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Member BU', exact: true })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.change(search, { target: { value: 'member Spa' } });
    expect(screen.queryByRole('button', { name: 'Headquarters · HQ', exact: true })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: '' } });
    const restoredHq = await unitNavigation('Headquarters · HQ');
    expect(within(restoredHq).getByRole('button', { name: 'Operations', exact: true })).toHaveAttribute('aria-expanded', 'false');
  });

  it('retains ordinary-navigation custom groups for the same owner BU', async () => {
    window.localStorage.setItem('carmen_report_navigation:admin:hq:groups:custom_groups', JSON.stringify(['Management']));
    render(<ConsolidationReportTree profile={profile} units={units} storageKey="carmen_report_navigation:admin" onSelect={vi.fn()} onMoveReport={vi.fn()} />);
    const hq = await unitNavigation('Headquarters · HQ');
    await within(hq).findByRole('button', { name: 'hq Spa', exact: true });
    expect(within(hq).getByRole('button', { name: 'Management', exact: true })).toBeInTheDocument();
  });

  it('keeps failed BU loads visible during search', async () => {
    fetchCarmenReports.mockImplementation(async ({ tenant }) => {
      if (tenant === 'member') throw new Error('Member catalog denied');
      return reports(tenant);
    });
    render(<ConsolidationReportTree profile={profile} units={units} onSelect={vi.fn()} />);
    await screen.findByRole('button', { name: 'hq Spa', exact: true });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search reports...' }), { target: { value: 'no such report' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Member catalog denied');
  });

  it('shows one empty-search message across successfully loaded BUs', async () => {
    render(<ConsolidationReportTree profile={profile} units={units} onSelect={vi.fn()} />);
    await screen.findByRole('button', { name: 'hq Spa', exact: true });
    await waitFor(() => expect(fetchCarmenReports).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search reports...' }), { target: { value: 'no such report' } });
    expect(screen.getAllByText(/No matching reports/).filter(element => !element.closest('[hidden]'))).toHaveLength(1);
  });

  it('moves in the owner BU and refreshes its local group without changing the member catalog', async () => {
    const onMoveReport = vi.fn(async (report, reportGroup) => ({ ...report, reportGroup, lastModified: 'saved-version' }));
    render(<ConsolidationReportTree profile={profile} units={units} currentKey={JSON.stringify(['member', 'same'])} onSelect={vi.fn()} onMoveReport={onMoveReport} />);
    const hq = await unitNavigation('Headquarters · HQ');
    const source = await within(hq).findByRole('button', { name: 'hq Spa', exact: true });
    const member = await unitNavigation('Member BU');
    await within(member).findByRole('button', { name: 'member Spa', exact: true });
    expect(source).toHaveAttribute('draggable', 'true');
    drop(source, within(hq).getByRole('button', { name: 'Daily Report', exact: true }));
    await waitFor(() => expect(onMoveReport).toHaveBeenCalledWith(expect.objectContaining({ id: 'same', tenant: 'hq', rows: reports('hq')[0].rows }), 'Daily Report'));
    await waitFor(() => expect(within(controlledBy(within(hq).getByRole('button', { name: 'Daily Report', exact: true }))).getByRole('button', { name: 'hq Spa', exact: true })).toBeInTheDocument());
    expect(within(controlledBy(within(member).getByRole('button', { name: 'Operations', exact: true }))).getByRole('button', { name: 'member Spa', exact: true })).toBeInTheDocument();
  });

  it('rejects cross-BU drops even when report IDs and destination group names match', async () => {
    const onMoveReport = vi.fn();
    render(<ConsolidationReportTree profile={profile} units={units} onSelect={vi.fn()} onMoveReport={onMoveReport} />);
    const hq = await unitNavigation('Headquarters · HQ');
    const source = await within(hq).findByRole('button', { name: 'hq Spa', exact: true });
    const member = await unitNavigation('Member BU');
    await within(member).findByRole('button', { name: 'member Daily', exact: true });
    expect(source).toHaveAttribute('draggable', 'true');
    drop(source, within(member).getByRole('button', { name: 'Daily Report', exact: true }));
    expect(onMoveReport).not.toHaveBeenCalled();
    expect(within(controlledBy(within(hq).getByRole('button', { name: 'Operations', exact: true }))).getByRole('button', { name: 'hq Spa', exact: true })).toBeInTheDocument();
  });

  it('uses each owner BU permission rather than the currently selected BU', async () => {
    const permissionUnits = units.map(unit => unit.id === 'member' ? { ...unit, permission: { view: true, setup: false } } : unit);
    render(<ConsolidationReportTree profile={profile} units={permissionUnits} currentKey={JSON.stringify(['member', 'same'])} onSelect={vi.fn()} onMoveReport={vi.fn()} />);
    const hq = await unitNavigation('Headquarters · HQ');
    expect(await within(hq).findByRole('button', { name: 'hq Spa', exact: true })).toHaveAttribute('draggable', 'true');
    const member = await unitNavigation('Member BU');
    expect(await within(member).findByRole('button', { name: 'member Spa', exact: true })).toHaveAttribute('draggable', 'false');
  });

  it.each(['Save or cancel your edits to move reports.', 'Saving report…'])('disables report moves while blocked: %s', async moveDisabledReason => {
    const onMoveReport = vi.fn();
    render(<ConsolidationReportTree profile={profile} units={units} onSelect={vi.fn()} onMoveReport={onMoveReport} moveDisabledReason={moveDisabledReason} />);
    const hq = await unitNavigation('Headquarters · HQ');
    const source = await within(hq).findByRole('button', { name: 'hq Spa', exact: true });
    expect(source).toHaveAttribute('draggable', 'false');
    expect(within(hq).getByText(moveDisabledReason)).toBeInTheDocument();
    drop(source, within(hq).getByRole('button', { name: 'Daily Report', exact: true }));
    expect(onMoveReport).not.toHaveBeenCalled();
  });

  it('preserves the original group and surfaces a failed save', async () => {
    const onMoveReport = vi.fn().mockRejectedValue(new Error('Save failed'));
    render(<ConsolidationReportTree profile={profile} units={units} onSelect={vi.fn()} onMoveReport={onMoveReport} />);
    const hq = await unitNavigation('Headquarters · HQ');
    const source = await within(hq).findByRole('button', { name: 'hq Spa', exact: true });
    expect(source).toHaveAttribute('draggable', 'true');
    drop(source, within(hq).getByRole('button', { name: 'Daily Report', exact: true }));
    expect(await within(hq).findByRole('alert')).toHaveTextContent('Save failed');
    expect(within(controlledBy(within(hq).getByRole('button', { name: 'Operations', exact: true }))).getByRole('button', { name: 'hq Spa', exact: true })).toBeInTheDocument();
  });
});
