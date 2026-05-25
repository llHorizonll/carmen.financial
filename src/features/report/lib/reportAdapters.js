import { normalizeAccLookupCode, normalizeDeptLookupCode } from './normalizeCode.js';

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.Data)) return value.Data;
  return [];
};

const toBooleanFlag = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  return false;
};

const getFlag = (source, names) =>
  names.some((name) => toBooleanFlag(source?.[name]));

export const adaptCarmenCompany = (company) => ({
  name: company?.HotelName || company?.RegName || 'Carmen Hotel & Resorts',
});

export const getCarmenFinancialReportPermission = (permissions) => {
  const targetName = 'gl.financialreport';
  return toArray(permissions).find((permission) =>
    String(permission?.Name || permission?.name || '').trim().toLowerCase() === targetName
  ) || null;
};

export const deriveCarmenFinancialReportAccess = (permissions) => {
  const permission = getCarmenFinancialReportPermission(permissions);
  const add = getFlag(permission, ['Add', 'add']);
  const update = getFlag(permission, ['Update', 'update']);
  const deleteAccess = getFlag(permission, ['Delete', 'delete']);
  const setup = add || update || deleteAccess;

  return {
    view: getFlag(permission, ['View', 'view']),
    add,
    update,
    delete: deleteAccess,
    setup,
  };
};

export const adaptCarmenLoginUser = (loginResponse) => {
  const financialReport = deriveCarmenFinancialReportAccess(
    loginResponse?.Permissions || loginResponse?.permissions
  );
  const userName = loginResponse?.UserName || loginResponse?.userName || '';
  const displayName = loginResponse?.Name || loginResponse?.FullName || userName || 'Carmen User';

  return {
    id: String(loginResponse?.UserId || loginResponse?.userId || userName || 'carmen-user'),
    name: displayName,
    role: financialReport.setup ? 'Admin' : 'User',
    source: 'carmen-api',
    userName,
    tenant: loginResponse?.Tenant || loginResponse?.tenant || '',
    permissions: {
      financialReport,
    },
  };
};

const toAccountCategory = (type) => {
  const normalized = String(type || '').trim().toUpperCase();
  if (['INCOME', 'I', 'REVENUE', 'EXPENSE', 'E'].includes(normalized)) return 'I';
  if (['BALANCESHEET', 'BALANCE_SHEET', 'BALANCE SHEET', 'B'].includes(normalized)) return 'B';
  if (['STATISTIC', 'S'].includes(normalized)) return 'S';
  if (['HEADER', 'H'].includes(normalized)) return 'H';
  if (['TOTAL', 'T'].includes(normalized)) return 'T';
  return normalized || 'I';
};

export const adaptCarmenDepartments = (departments) =>
  toArray(departments)
    .filter((dept) => dept?.DeptCode)
    .map((dept) => ({
      id: normalizeDeptLookupCode(dept.DeptCode),
      name: dept.Description || `Dept ${dept.DeptCode}`,
    }))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

export const adaptCarmenAccountCodes = (accounts) =>
  toArray(accounts)
    .filter((account) => account?.AccCode && account.Active !== false)
    .map((account) => ({
      id: normalizeAccLookupCode(account.AccCode),
      name: account.Description || account.Description2 || account.AccCode,
      type: toAccountCategory(account.Type),
      sourceType: account.Type || '',
      nature: account.Nature || '',
    }))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

const formatDateLabel = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const adaptCarmenGlPeriods = (periods) =>
  toArray(periods)
    .filter((period) => period?.GlpNo)
    .map((period) => {
      const id = String(period.GlpNo);
      const dateLabel = formatDateLabel(period.GlpDate);
      const statusLabel = period.GlpStatus ? ` (${period.GlpStatus})` : '';
      return {
        id,
        label: dateLabel ? `P${id} - ${dateLabel}${statusLabel}` : `P${id}${statusLabel}`,
        periodNo: Number(period.GlpNo),
        date: period.GlpDate || '',
        dateLabel,
        status: period.GlpStatus || '',
        sourceYear: period.GlpYear,
      };
    })
    .sort((a, b) => a.periodNo - b.periodNo);

export const adaptCarmenBudgetRevisions = (budgets) => {
  const revisions = new Map();
  toArray(budgets).forEach((budget) => {
    toArray(budget?.Revisions).forEach((revision) => {
      const id = String(revision.Revision ?? '').trim();
      if (!id || revisions.has(id)) return;
      revisions.set(id, {
        id,
        label: revision.Caption || `Revision ${id}`,
      });
    });
  });

  return Array.from(revisions.values()).sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
  );
};
