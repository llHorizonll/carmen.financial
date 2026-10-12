import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import useBusinessUnitReports, { reportKey } from './useBusinessUnitReports.js';
import { fetchCarmenBusinessUnits, fetchCarmenReports } from '../lib/reportApi.js';
import { saveCarmenSession, clearCarmenSession } from '../lib/carmenSession.js';

vi.mock('../lib/reportApi.js', () => ({ fetchCarmenBusinessUnits: vi.fn(), fetchCarmenReports: vi.fn() }));
const session = { accessToken: 'token', businessUnit: { tenant: 'a' } };
function Harness() {
  const [reports, setReports] = React.useState([]);
  const catalog = useBusinessUnitReports({ enabled: true, session, setReports });
  return <><button onClick={() => catalog.setSelected(['a', 'b'])}>Both</button><button onClick={() => catalog.setSelected(['b'])}>B only</button>
    <p>{catalog.error}</p><p data-testid="inventory">{catalog.loading ? 'Loading BUs' : 'Ready BUs'}</p><p data-testid="selection">{catalog.selected.join(',')}</p>
    {Object.entries(catalog.statuses).map(([tenant, status]) => <p key={tenant}>{tenant}: {status.error || (status.loading ? 'loading' : 'ready')}</p>)}
    {reports.map((report) => <p key={reportKey(report)}>{report.tenant}/{report.id}</p>)}
  </>;
}
beforeEach(() => {
  window.localStorage.clear();
  vi.resetAllMocks();
  fetchCarmenBusinessUnits.mockResolvedValue([{ Tenant: 'a', financialReport: { view: true } }, { Tenant: 'b', financialReport: { view: true } }]);
  fetchCarmenReports.mockImplementation(async () => [{ id: 'same', name: 'Report' }]);
});
describe('business unit report catalog', () => {
  it('restores multiple BUs after reload and uses the default again after login', async () => {
    const first = render(<Harness />);
    await screen.findByText('a/same');
    fireEvent.click(screen.getByText('Both'));
    await screen.findByText('b/same');
    first.unmount();
    const reloaded = render(<Harness />);
    await screen.findByText('b/same');
    expect(screen.getByTestId('selection')).toHaveTextContent('a,b');
    reloaded.unmount();
    clearCarmenSession();
    saveCarmenSession(session);
    render(<Harness />);
    await screen.findByText('a/same');
    expect(screen.getByTestId('selection')).toHaveTextContent('a');
    expect(screen.queryByText('b/same')).not.toBeInTheDocument();
  });
  it('removes restored BUs that no longer have permission', async () => {
    window.localStorage.setItem('carmen_selected_business_units', JSON.stringify(['a', 'b']));
    fetchCarmenBusinessUnits.mockResolvedValue([{ Tenant: 'b', financialReport: { view: true } }]);
    render(<Harness />);
    await screen.findByText('b/same');
    expect(screen.getByTestId('selection')).toHaveTextContent('b');
    expect(fetchCarmenReports).not.toHaveBeenCalledWith({ tenant: 'a' });
  });
  it.each(['[]', '{bad'])('handles empty or corrupt stored selection (%s)', async (stored) => {
    window.localStorage.setItem('carmen_selected_business_units', stored);
    render(<Harness />);
    await waitFor(() => expect(fetchCarmenBusinessUnits).toHaveBeenCalled());
    await screen.findByText('Ready BUs');
    await waitFor(() => expect(window.localStorage.getItem('carmen_selected_business_units')).toBe(stored === '[]' ? '[]' : '["a"]'));
    expect(screen.getByTestId('selection').textContent).toBe(stored === '[]' ? '' : 'a');
  });
  it('keeps identical report IDs separate and loads only selected tenants', async () => {
    render(<Harness />);
    await screen.findByText('a/same');
    expect(fetchCarmenReports).toHaveBeenCalledWith({ tenant: 'a' });
    fireEvent.click(screen.getByText('Both'));
    await screen.findByText('b/same');
    expect(screen.getByText('a/same')).toBeInTheDocument();
    expect(reportKey({ tenant: 'a', id: 'same' })).not.toBe(reportKey({ tenant: 'b', id: 'same' }));
  });
  it('discards stale catalog responses after selection changes', async () => {
    let finish;
    fetchCarmenReports.mockImplementation(({ tenant }) => tenant === 'a' ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve([{ id: 'new' }]));
    render(<Harness />);
    await waitFor(() => expect(fetchCarmenReports).toHaveBeenCalled());
    fireEvent.click(screen.getByText('B only'));
    await screen.findByText('b/new');
    await act(async () => { finish([{ id: 'stale' }]); });
    expect(screen.queryByText('a/stale')).not.toBeInTheDocument();
  });
  it('keeps another BU usable and shows a per-BU error after a denied catalog', async () => {
    fetchCarmenReports.mockImplementation(async ({ tenant }) => {
      if (tenant === 'b') throw new Error('Access denied');
      return [{ id: 'one' }];
    });
    render(<Harness />);
    await screen.findByText('a/one');
    fireEvent.click(screen.getByText('Both'));
    await screen.findByText('b: Access denied');
    expect(screen.getByText('a/one')).toBeInTheDocument();
  });
});
