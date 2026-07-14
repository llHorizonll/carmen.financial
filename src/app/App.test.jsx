import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import App from './App.jsx';
import { INITIAL_MASTER_DATA } from '../features/report/lib/reportLogic.js';

const reportApiMocks = vi.hoisted(() => ({
  isCarmenApiConfigured: vi.fn(() => false),
  getStoredCarmenSession: vi.fn(() => null),
  fetchCarmenMasterData: vi.fn(),
  fetchCarmenReportOptions: vi.fn(),
  fetchCarmenReports: vi.fn(),
  fetchCarmenReportData: vi.fn(),
  saveCarmenReport: vi.fn(() => Promise.resolve()),
  cloneCarmenReport: vi.fn(),
  deleteCarmenReport: vi.fn(),
}));

vi.mock('../features/report/lib/reportApi.js', () => reportApiMocks);

describe('App shell', () => {
  let localStorageStore = {};
  beforeEach(() => {
    localStorageStore = {};
    const mockLocalStorage = {
      getItem: vi.fn((key) => localStorageStore[key] || null),
      setItem: vi.fn((key, value) => {
        localStorageStore[key] = String(value);
      }),
      removeItem: vi.fn((key) => {
        delete localStorageStore[key];
      }),
      clear: vi.fn(() => {
        localStorageStore = {};
      }),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
    vi.stubGlobal('localStorage', mockLocalStorage);
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(false);
    reportApiMocks.getStoredCarmenSession.mockReturnValue(null);
    
    reportApiMocks.fetchCarmenMasterData.mockReset();
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: { id: 'admin', role: 'Admin' },
      companyProfile: {},
      depts: [],
      accCodes: [],
      periods: [],
      budgetRevisions: [],
      groups: {},
    });

    reportApiMocks.fetchCarmenReportOptions.mockReset();
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});

    reportApiMocks.fetchCarmenReports.mockReset();
    reportApiMocks.fetchCarmenReports.mockResolvedValue([]);

    reportApiMocks.fetchCarmenReportData.mockReset();
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });

    reportApiMocks.saveCarmenReport.mockClear();
    reportApiMocks.cloneCarmenReport.mockClear();
    reportApiMocks.deleteCarmenReport.mockClear();
    delete document.documentElement.dataset.shellTemplate;
  });

  it('keeps the default shell template applied without showing template compare controls', async () => {
    render(<App />);

    expect(document.documentElement.dataset.shellTemplate).toBe('classic-calm');
    expect(screen.queryByText('Compare')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'SETUP' }));
    expect(screen.queryByText('Compare')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Report Details')).toBeInTheDocument(), { timeout: 5000 });
  });

  it('switches from VIEW to SETUP for the admin user', async () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'VIEW' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SETUP' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'SETUP' }));

    await waitFor(() => expect(screen.getByText(/Configuration Mode/i)).toBeInTheDocument(), { timeout: 5000 });
    await waitFor(() => expect(screen.getByText('Report Details')).toBeInTheDocument(), { timeout: 5000 });
  });

  it('updates the setup theme badge when the report theme changes', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'SETUP' }));

    const themeLabel = await screen.findByText('Report Theme', {}, { timeout: 5000 });
    const themeSelect = themeLabel.closest('div')?.querySelector('[role="combobox"]');
    expect(themeSelect).toBeTruthy();

    fireEvent.click(themeSelect);
    fireEvent.click(await screen.findByRole('option', { name: 'Emerald Green' }));

    await waitFor(() => expect(screen.getByText(/Emerald Green theme/i)).toBeInTheDocument());
  });

  it('hides the setup tab when the role changes to a non-admin user', () => {
    const originalUsers = [...INITIAL_MASTER_DATA.users];
    INITIAL_MASTER_DATA.users = [
      { id: 'admin', name: 'admin', role: 'Admin' },
      { id: 'u2', name: 'General Manager', role: 'User' },
    ];
    try {
      const { container } = render(<App />);

      const roleSelector = screen.getAllByRole('combobox')[0];
      fireEvent.click(roleSelector);
      fireEvent.click(screen.getByRole('option', { name: /General Manager \(User\)/i }));

      expect(screen.getByRole('button', { name: 'VIEW' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'SETUP' })).not.toBeInTheDocument();
    } finally {
      INITIAL_MASTER_DATA.users = originalUsers;
    }
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

      const notice = await screen.findByText('Notice', {}, { timeout: 5000 });
      const noticeCard = notice.closest('[data-slot="card"]');
      expect(within(noticeCard).getByText(/Budget/)).toBeInTheDocument();
      fireEvent.click(screen.getAllByRole('button', { name: 'OK' })[0]);
      await waitFor(() => expect(screen.queryByText('Notice')).not.toBeInTheDocument());
      expect(screen.getByText('Budget')).toBeInTheDocument();
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });

  it('ignores CSV file uploads when Carmen API sync is configured', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.getStoredCarmenSession.mockReturnValue({
      user: {
        id: 'finance-owner',
        name: 'Finance Owner',
        role: 'Admin',
      },
    });
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'finance-owner',
        name: 'Finance Owner',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'finance-owner',
          name: 'Finance Owner',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [],
      accCodes: [],
      periods: [
        { id: '2', label: 'P2 - February 28, 2025', date: '2025-02-28', dateLabel: 'February 28, 2025', status: '' },
      ],
      budgetRevisions: [{ id: '0', label: 'Rev 0' }],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({
      actualRows: [{ deptcode: '101', acccode: '4001', amt1: 123 }],
      budgetRows: [{ deptcode: '101', acccode: '4001', amt1: 456 }],
    });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-sync',
        name: 'API Sync Report',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['finance-owner'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'finance-owner',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
          { id: 'C2', label: 'Budget', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'BUD', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Revenue', isActive: true, isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: '', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
        ],
      },
    ]);

    class MockFileReader {
      readAsText() {
        throw new Error('CSV parsing should not run when Carmen API sync is configured.');
      }
    }

    const originalFileReader = globalThis.FileReader;
    globalThis.FileReader = MockFileReader;

    try {
      const { container } = render(<App />);
      await waitFor(() => expect(screen.getAllByText('API Sync Report').length).toBeGreaterThan(0));

      fireEvent.click(screen.getByRole('button', { name: /GL/i }));
      await waitFor(() => expect(screen.getByText('GL data synced from Carmen API.')).toBeInTheDocument());

      const glInput = container.querySelectorAll('input[type="file"]')[0];
      fireEvent.change(glInput, { target: { files: [new File(['ignored'], 'gl.csv', { type: 'text/csv' })] } });

      await waitFor(() => expect(screen.queryByText(/Transaction \(GL\)/)).not.toBeInTheDocument());
      await waitFor(() => expect(screen.getByText('Revenue')).toBeInTheDocument());
      expect(reportApiMocks.fetchCarmenReportData).toHaveBeenCalled();
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });

  it('clears the report catalog error after fixing broken references', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.getStoredCarmenSession.mockReturnValue({
      user: {
        id: 'finance-owner',
        name: 'Finance Owner',
        role: 'Admin',
      },
    });
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'admin',
        name: 'Admin User',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'admin',
          name: 'Admin User',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [],
      accCodes: [],
      periods: [
        { id: '2', label: 'P2 - February 28, 2025', date: '2025-02-28', dateLabel: 'February 28, 2025', status: '' },
      ],
      budgetRevisions: [{ id: '0', label: 'Rev 0' }],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-broken',
        name: 'Broken Report',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['admin'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'admin',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Revenue', isActive: true, isHeader: false, isTotal: true, dept: '', groupLevel: 'L4', groups: '', accCodes: '', percentBase: '', formula: 'R99', indent: 0 },
        ],
      },
    ]);

    const { container } = render(<App />);

    await waitFor(() => expect(screen.getByText('Report catalog error')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'SETUP' }));

    await waitFor(() => expect(screen.getByText(/Broken row references found/i)).toBeInTheDocument());
    const formulaInput = await screen.findByDisplayValue('R99');
    fireEvent.change(formulaInput, { target: { value: 'R1' } });

    await waitFor(() => expect(screen.queryByText('Report catalog error')).not.toBeInTheDocument());
  });

  it('falls back to localStorage report definitions when the API catalog load fails', async () => {
    const storedReports = [
      {
        id: 'rep-local-storage',
        name: 'Local Storage Report',
        companyName: 'Old Company',
        category: ['ALL'],
        assignedUsers: ['admin'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'admin',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '',
        theme: 'blue',
        columns: [],
        rows: [],
      },
    ];

    window.localStorage.setItem('carmen_bi_reports_config_v5_23', JSON.stringify(storedReports));

    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.getStoredCarmenSession.mockReturnValue({
      user: {
        id: 'finance-owner',
        name: 'Finance Owner',
        role: 'Admin',
      },
    });
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'admin',
        name: 'Admin User',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'admin',
          name: 'Admin User',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [],
      accCodes: [],
      periods: [],
      budgetRevisions: [],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
    reportApiMocks.fetchCarmenReports.mockRejectedValue(new Error('catalog unavailable'));

    const { container } = render(<App />);

    const elements = await screen.findAllByText('Local Storage Report');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('ignores the revision selector for reports without budget columns', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'admin',
        name: 'Admin User',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'admin',
          name: 'Admin User',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [],
      accCodes: [],
      periods: [
        { id: '2', label: 'P2 - February 28, 2025', date: '2025-02-28', dateLabel: 'February 28, 2025', status: '' },
      ],
      budgetRevisions: [{ id: '0', label: 'Rev 0' }, { id: '9', label: 'Rev 9' }],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-actual-only',
        name: 'Actual Only',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['admin'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'admin',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Revenue', isActive: true, isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: '', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
        ],
      },
    ]);

    const { container } = render(<App />);

    await waitFor(() => expect(screen.getAllByText('Actual Only').length).toBeGreaterThan(0));
    const revisionSelect = screen.getAllByRole('combobox').find((select) =>
      select.textContent?.includes('Rev 0')
    );
    fireEvent.click(revisionSelect);
    fireEvent.click(screen.getByRole('option', { name: 'Rev 9' }));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => {
      expect(reportApiMocks.fetchCarmenReportData).toHaveBeenLastCalledWith(
        expect.objectContaining({ revision: '0' })
      );
    });
  });

  it('blocks saving incompatible column types for daily reports', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'admin',
        name: 'Admin User',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'admin',
          name: 'Admin User',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [],
      accCodes: [],
      periods: [],
      budgetRevisions: [],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-daily-invalid',
        name: 'Daily Invalid',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['admin'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Daily',
        owner: 'admin',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '1',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Revenue', isActive: true, isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: 'FOO', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
        ],
      },
    ]);

    const { container } = render(<App />);

    await waitFor(() => expect(screen.getAllByText('Daily Invalid').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'SETUP' }));

    await waitFor(() => expect(screen.getByText('Columns Configurator')).toBeInTheDocument());
    expect(screen.getByText(/reports should only use compatible column types/i)).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(reportApiMocks.saveCarmenReport).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'rep-daily-invalid' }));
  });

  it('blocks saving duplicate row mappings before persist', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'admin',
        name: 'Admin User',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'admin',
          name: 'Admin User',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [],
      accCodes: [],
      periods: [],
      budgetRevisions: [],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-duplicate-mapping',
        name: 'Duplicate Mapping',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['admin'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'admin',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Revenue', isActive: true, isHeader: false, isTotal: false, dept: '101', groupLevel: 'L4', groups: 'FOOD', accCodes: '', dim1: 'A', dim2: 'X', percentBase: '', formula: '', indent: 0 },
          { id: 'r2', desc: 'Revenue Copy', isActive: true, isHeader: false, isTotal: false, dept: '101', groupLevel: 'L4', groups: 'FOOD', accCodes: '', dim1: 'A', dim2: 'X', percentBase: '', formula: '', indent: 0 },
        ],
      },
    ]);

    const { container } = render(<App />);

    await waitFor(() => expect(screen.getAllByText('Duplicate Mapping').length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByTitle(/conflicting row mapping/i)).toBeInTheDocument());
    expect(reportApiMocks.saveCarmenReport).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'rep-duplicate-mapping' }));
  });

  it('warns when manual row codes do not exist in API master data', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'admin',
        name: 'Admin User',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'admin',
          name: 'Admin User',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [{ id: '101', name: 'Front Office' }],
      accCodes: [{ id: '4001', name: 'Rooms', type: 'I' }],
      periods: [],
      budgetRevisions: [],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-invalid-master-data',
        name: 'Invalid Master Data Mapping',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['admin'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'admin',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Revenue', isActive: true, isHeader: false, isTotal: false, dept: '999', groupLevel: 'L4', groups: '', accCodes: '', percentBase: '', formula: '', indent: 0 },
        ],
      },
    ]);

    const { container } = render(<App />);

    await waitFor(() => expect(screen.getAllByText('Invalid Master Data Mapping').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'SETUP' }));

    await waitFor(() => expect(screen.getByText(/Unknown department code\(s\): 999/i)).toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(reportApiMocks.saveCarmenReport).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'rep-invalid-master-data' }));
  });

  it('saves the report after master data is refreshed with a valid account code', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.getStoredCarmenSession.mockReturnValue({
      user: {
        id: 'admin',
        name: 'Admin User',
        role: 'Admin',
      },
    });
    reportApiMocks.fetchCarmenMasterData
      .mockResolvedValueOnce({
        currentUser: {
          id: 'admin',
          name: 'Admin User',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
        users: [
          {
            id: 'admin',
            name: 'Admin User',
            role: 'Admin',
            permissions: {
              financialReport: {
                view: true,
                setup: true,
                add: true,
                update: true,
                delete: true,
              },
            },
          },
        ],
        companyProfile: { name: 'Carmen Hotel & Resorts' },
        depts: [{ id: '101', name: 'Front Office' }],
        accCodes: [],
        periods: [],
        budgetRevisions: [],
        groups: { L1: [], L2: [], L3: [], L4: [] },
      })
      .mockResolvedValueOnce({
        currentUser: {
          id: 'admin',
          name: 'Admin User',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
        users: [
          {
            id: 'admin',
            name: 'Admin User',
            role: 'Admin',
            permissions: {
              financialReport: {
                view: true,
                setup: true,
                add: true,
                update: true,
                delete: true,
              },
            },
          },
        ],
        companyProfile: { name: 'Carmen Hotel & Resorts' },
        depts: [{ id: '101', name: 'Front Office' }],
        accCodes: [{ id: '4001', name: 'Rooms', type: 'I' }],
        periods: [],
        budgetRevisions: [],
        groups: { L1: [], L2: [], L3: [], L4: [] },
      });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-validating',
        name: 'Validating Report',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['admin'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'admin',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Rooms', isActive: true, isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: '', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
        ],
      },
    ]);

    render(<App />);

    const yearInput = screen.getByDisplayValue(String(new Date().getFullYear()));
    fireEvent.change(yearInput, { target: { value: String(new Date().getFullYear() + 1) } });

    await waitFor(() => expect(reportApiMocks.fetchCarmenMasterData).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(reportApiMocks.saveCarmenReport).toHaveBeenCalledWith(expect.objectContaining({
      id: 'rep-validating',
      rows: [expect.objectContaining({ accCodes: '4001' })],
    })));
  });

  it('persists edited account codes from the mapping modal to the API', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.getStoredCarmenSession.mockReturnValue({
      user: {
        id: 'admin',
        name: 'Admin User',
        role: 'Admin',
      },
    });
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'admin',
        name: 'Admin User',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'admin',
          name: 'Admin User',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [{ id: '101', name: 'Front Office' }],
      accCodes: [{ id: '4001', name: 'Rooms', type: 'I' }],
      periods: [],
      budgetRevisions: [],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-edit-modal',
        name: 'Edit Modal Report',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['admin'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'admin',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Rooms', isActive: true, isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: '', accCodes: '', percentBase: '', formula: '', indent: 0 },
        ],
      },
    ]);

    const { container } = render(<App />);

    await waitFor(() => expect(reportApiMocks.saveCarmenReport).toHaveBeenCalled());
    reportApiMocks.saveCarmenReport.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'SETUP' }));
    await waitFor(() => expect(screen.getByText('Report Details')).toBeInTheDocument());

    const rowInput = screen.getByDisplayValue('Rooms');
    const row = rowInput.closest('tr');
    fireEvent.click(within(row).getByTitle('Edit mapping for row r1'));

    const accTextarea = screen.getByPlaceholderText('e.g. 4001, 4002');
    fireEvent.change(accTextarea, { target: { value: '4001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Mapping' }));

    await waitFor(() => expect(reportApiMocks.saveCarmenReport).toHaveBeenCalledWith(expect.objectContaining({
      id: 'rep-edit-modal',
      rows: [expect.objectContaining({ accCodes: '4001' })],
    })));
  });

  it('saves setup category and access edits through the API payload', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'admin',
        name: 'Admin User',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'admin',
          name: 'Admin User',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
        {
          id: 'u2',
          name: 'General Manager',
          role: 'User',
          permissions: {
            financialReport: {
              view: true,
              setup: false,
              add: false,
              update: false,
              delete: false,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [],
      accCodes: [],
      periods: [],
      budgetRevisions: [],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-setup-edits',
        name: 'Setup Edits',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['admin'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'admin',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Revenue', isActive: true, isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: 'FOO', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
        ],
      },
    ]);

    const { container } = render(<App />);

    await waitFor(() => expect(screen.getAllByText('Setup Edits').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'SETUP' }));
    await waitFor(() => expect(screen.getByText('Report Details')).toBeInTheDocument());

    const categorySelect = screen.getAllByRole('combobox').find((select) =>
      select.textContent?.includes('+ Add Category')
    );
    expect(categorySelect).toBeTruthy();
    fireEvent.click(categorySelect);
    fireEvent.click(screen.getByRole('option', { name: /Balance Sheet/i }));

    fireEvent.click(screen.getByRole('button', { name: 'Access' }));
    const generalManagerLabel = screen.getByRole('button', {
      name: /general manager/i,
    });
    expect(generalManagerLabel).toBeTruthy();
    fireEvent.click(generalManagerLabel);

    await waitFor(() => expect(screen.getByText('Balance Sheet')).toBeInTheDocument());
    expect(screen.getByText(/Admin User, General Manager/i)).toBeInTheDocument();
  });

  it('renders API-backed users in the role selector and access modal', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'finance-owner',
        name: 'Finance Owner',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'finance-owner',
          name: 'Finance Owner',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
        {
          id: 'regional-viewer',
          name: 'Regional Viewer',
          role: 'User',
          permissions: {
            financialReport: {
              view: true,
              setup: false,
              add: false,
              update: false,
              delete: false,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [],
      accCodes: [],
      periods: [],
      budgetRevisions: [],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-api-users',
        name: 'API Users',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['finance-owner'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'finance-owner',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Revenue', isActive: true, isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: '', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
        ],
      },
    ]);

    const { container } = render(<App />);

    await waitFor(() => expect(screen.getAllByRole('combobox')[0]).toHaveTextContent('Finance Owner (Admin)'));
    const roleSelector = screen.getAllByRole('combobox')[0];
    fireEvent.click(roleSelector);
    expect(await screen.findByRole('option', { name: 'Finance Owner (Admin)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Regional Viewer (User)' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: 'SETUP' }));
    fireEvent.click(screen.getByRole('button', { name: 'Access' }));

    await waitFor(() => expect(screen.getByText('Regional Viewer')).toBeInTheDocument());
    expect(screen.getAllByText('Finance Owner').length).toBeGreaterThan(1);
  });

  it('syncs GL and BUD data from the Carmen API buttons', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.getStoredCarmenSession.mockReturnValue({
      user: {
        id: 'finance-owner',
        name: 'Finance Owner',
        role: 'Admin',
      },
    });
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'finance-owner',
        name: 'Finance Owner',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'finance-owner',
          name: 'Finance Owner',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [],
      accCodes: [],
      periods: [
        { id: '2', label: 'P2 - February 28, 2025', date: '2025-02-28', dateLabel: 'February 28, 2025', status: '' },
      ],
      budgetRevisions: [{ id: '0', label: 'Rev 0' }],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({
      actualRows: [{ deptcode: '101', acccode: '4001', amt1: 123 }],
      budgetRows: [{ deptcode: '101', acccode: '4001', amt1: 456 }],
    });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-sync',
        name: 'API Sync Report',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['finance-owner'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'finance-owner',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
          { id: 'C2', label: 'Budget', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'BUD', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Revenue', isActive: true, isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: '', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
        ],
      },
    ]);

    render(<App />);

    await waitFor(() => expect(screen.getAllByText('API Sync Report').length).toBeGreaterThan(0));
    const initialFetchCount = reportApiMocks.fetchCarmenReportData.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: /GL/i }));
    await waitFor(() => expect(screen.getByText('GL data synced from Carmen API.')).toBeInTheDocument());
    expect(reportApiMocks.fetchCarmenReportData.mock.calls.length).toBe(initialFetchCount + 1);

    fireEvent.click(screen.getByRole('button', { name: /BUD/i }));
    await waitFor(() => expect(screen.getByText('BUD data synced from Carmen API.')).toBeInTheDocument());
    expect(reportApiMocks.fetchCarmenReportData.mock.calls.length).toBe(initialFetchCount + 2);
  });

  it('renders API-loaded constant dropdown options in setup mode', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.getStoredCarmenSession.mockReturnValue({
      user: {
        id: 'finance-owner',
        name: 'Finance Owner',
        role: 'Admin',
      },
    });
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'finance-owner',
        name: 'Finance Owner',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'finance-owner',
          name: 'Finance Owner',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [],
      accCodes: [],
      periods: [
        { id: '2', label: 'P2 - February 28, 2025', date: '2025-02-28', dateLabel: 'February 28, 2025', status: '' },
      ],
      budgetRevisions: [{ id: '0', label: 'Rev 0' }],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({
      themes: [{ id: 'amber', label: 'Amber Theme' }],
      periodFormats: [{ id: 'fiscal', label: 'Fiscal Format' }],
      accountCategories: [{ id: 'S', label: 'Statistic' }],
      columnTypes: [{ id: 'AC', label: 'Actual Current' }, { id: 'FORMULA', label: 'Formula' }],
      yearModes: [{ id: 'current', label: 'Current Year' }],
      periodModes: [{ id: 'current', label: 'Period (Parameter)' }],
      rowTypes: [{ id: 'header', label: 'Header' }],
      indentLevels: [{ id: '0', label: 'Level 0' }],
    });
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-options',
        name: 'Options Report',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['finance-owner'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'finance-owner',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Revenue', isActive: true, isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: '', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
        ],
      },
    ]);

    render(<App />);

    await waitFor(() => expect(screen.getAllByText('Options Report').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'SETUP' }));
    await waitFor(() => expect(screen.getByText('Report Details')).toBeInTheDocument());

    const themeSelect = screen.getAllByRole('combobox').find((select) =>
      select.textContent?.includes('Classic Blue')
    );
    expect(themeSelect).toBeTruthy();
    fireEvent.click(themeSelect);
    expect(await screen.findByRole('option', { name: 'Amber Theme' })).toBeInTheDocument();

    expect(screen.getByText('Columns Configurator')).toBeInTheDocument();
  });

  it('renders API-loaded period and revision selector options in the report header', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.getStoredCarmenSession.mockReturnValue({
      user: {
        id: 'finance-owner',
        name: 'Finance Owner',
        role: 'Admin',
      },
    });
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'finance-owner',
        name: 'Finance Owner',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'finance-owner',
          name: 'Finance Owner',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [],
      accCodes: [],
      periods: [
        { id: '1', label: 'P1 - January 31, 2025', date: '2025-01-31', dateLabel: 'January 31, 2025', status: '' },
        { id: '2', label: 'P2 - February 28, 2025', date: '2025-02-28', dateLabel: 'February 28, 2025', status: '' },
      ],
      budgetRevisions: [{ id: '0', label: 'Rev 0' }, { id: '9', label: 'Rev 9' }],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-periods',
        name: 'Period Selector Report',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['finance-owner'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'finance-owner',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'AC', width: '' },
          { id: 'C2', label: 'Budget', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'BUD', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Revenue', isActive: true, isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: '', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
        ],
      },
    ]);

    render(<App />);

    await waitFor(() => expect(screen.getAllByText('Period Selector Report').length).toBeGreaterThan(0));

    const periodSelect = screen.getAllByRole('combobox').find((select) =>
      select.textContent?.includes('P2 - February 28, 2025')
    );
    expect(periodSelect).toBeTruthy();
    fireEvent.click(periodSelect);
    expect(await screen.findByRole('option', { name: 'P1 - January 31, 2025' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'P2 - February 28, 2025' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    const revisionSelect = screen.getAllByRole('combobox').find((select) =>
      select.textContent?.includes('Rev 0')
    );
    expect(revisionSelect).toBeTruthy();
    fireEvent.click(revisionSelect);
    expect(await screen.findByRole('option', { name: 'Rev 0' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Rev 9' })).toBeInTheDocument();
  });

  it('includes day in the report data API call when the report uses PTD columns', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'admin',
        name: 'Admin User',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'admin',
          name: 'Admin User',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [],
      accCodes: [],
      periods: [
        { id: '2', label: 'P2 - February 28, 2025', date: '2025-02-28', dateLabel: 'February 28, 2025', status: '' },
      ],
      budgetRevisions: [{ id: '0', label: 'Rev 0' }],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-ptd',
        name: 'PTD Report',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['admin'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'admin',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '28',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'PTD Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'PTD', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Revenue', isActive: true, isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: 'FOO', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
        ],
      },
    ]);

    render(<App />);

    await waitFor(() => expect(reportApiMocks.fetchCarmenReportData).toHaveBeenCalled());
    expect(reportApiMocks.fetchCarmenReportData).toHaveBeenLastCalledWith(
      expect.objectContaining({ day: '28' })
    );
  });

  it('keeps the browser print action wired from the report toolbar', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const { container } = render(<App />);

    await waitFor(() => expect(screen.getByText('Carmen Hotel & Resorts')).toBeInTheDocument());
    const exportButton = container.querySelector('button[title="Export to Excel"]');
    expect(exportButton).toBeTruthy();
    const printButton = exportButton?.nextElementSibling;
    expect(printButton).toBeTruthy();
    fireEvent.click(printButton);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it('uses the neutral filter/action button palette in the report toolbar', async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByText('Carmen Hotel & Resorts')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'VIEW' }).className).toMatch(/bg-stone|border-stone|text-stone|ring-stone|bg-primary|ring-primary/);
    expect(screen.getByRole('button', { name: /DEPT/i }).className).toMatch(/bg-stone|border-stone|text-stone|bg-muted|border-border|text-muted/);
    expect(screen.getByRole('button', { name: 'Apply' }).className).toMatch(/bg-stone|border-stone|text-stone|bg-muted|border-border|text-muted/);
    expect(screen.getByRole('button', { name: /GL/i }).className).toMatch(/bg-stone|border-stone|text-stone|bg-muted|border-border|text-muted/);
  });

  it('rejects an out-of-range day for PTD reports before loading report data', async () => {
    reportApiMocks.isCarmenApiConfigured.mockReturnValue(true);
    reportApiMocks.fetchCarmenMasterData.mockResolvedValue({
      currentUser: {
        id: 'admin',
        name: 'Admin User',
        role: 'Admin',
        permissions: {
          financialReport: {
            view: true,
            setup: true,
            add: true,
            update: true,
            delete: true,
          },
        },
      },
      users: [
        {
          id: 'admin',
          name: 'Admin User',
          role: 'Admin',
          permissions: {
            financialReport: {
              view: true,
              setup: true,
              add: true,
              update: true,
              delete: true,
            },
          },
        },
      ],
      companyProfile: { name: 'Carmen Hotel & Resorts' },
      depts: [],
      accCodes: [],
      periods: [
        { id: '1', label: 'P1 - January 31, 2025', date: '2025-01-31', dateLabel: 'January 31, 2025', status: '' },
      ],
      budgetRevisions: [{ id: '0', label: 'Rev 0' }],
      groups: { L1: [], L2: [], L3: [], L4: [] },
    });
    reportApiMocks.fetchCarmenReportOptions.mockResolvedValue({});
    reportApiMocks.fetchCarmenReportData.mockResolvedValue({ actualRows: [], budgetRows: [] });
    reportApiMocks.fetchCarmenReports.mockResolvedValue([
      {
        id: 'rep-ptd-invalid-day',
        name: 'PTD Invalid Day',
        companyName: 'Carmen Hotel & Resorts',
        category: ['ALL'],
        assignedUsers: ['admin'],
        isActive: true,
        periodFormat: 'standard',
        reportType: 'Monthly',
        owner: 'admin',
        overrideDateDisplay: '',
        overridePeriodDisplay: '',
        day: '31',
        theme: 'blue',
        columns: [
          { id: 'C1', label: 'PTD Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: 'current', type: 'PTD', width: '' },
        ],
        rows: [
          { id: 'r1', desc: 'Revenue', isActive: true, isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: 'FOO', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
        ],
      },
    ]);

    render(<App />);

    await waitFor(() => expect(screen.getAllByText('PTD Invalid Day').length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByText(/Day must be between 1 and 28/i)).toBeInTheDocument());
    expect(reportApiMocks.fetchCarmenReportData).not.toHaveBeenCalled();
  });
});

