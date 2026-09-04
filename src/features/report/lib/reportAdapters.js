import { normalizeAccLookupCode, normalizeDeptLookupCode } from './normalizeCode.js';

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
const takeApiArray = (previous, loaded, key) => (
  hasOwn(loaded, key) && Array.isArray(loaded[key])
    ? loaded[key]
    : previous?.[key] || []
);

export const mergeCarmenMasterData = (previous = {}, loaded = {}) => ({
  ...previous,
  companyProfile: hasOwn(loaded, 'companyProfile') && loaded.companyProfile
    ? loaded.companyProfile
    : previous.companyProfile,
  users: Array.isArray(loaded.users)
    ? loaded.users
    : loaded.currentUser
      ? [loaded.currentUser]
      : previous.users || [],
  depts: takeApiArray(previous, loaded, 'depts'),
  accCodes: takeApiArray(previous, loaded, 'accCodes'),
  accountGroups: takeApiArray(previous, loaded, 'accountGroups'),
  deptGroups: takeApiArray(previous, loaded, 'deptGroups'),
  groups: {
    L1: takeApiArray(previous.groups, loaded.groups, 'L1'),
    L2: takeApiArray(previous.groups, loaded.groups, 'L2'),
    L3: takeApiArray(previous.groups, loaded.groups, 'L3'),
    L4: takeApiArray(previous.groups, loaded.groups, 'L4'),
  },
});

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.Data)) return value.Data;
  return [];
};

const toObjectArray = (value, keys) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key];
  }
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
  name: company?.name || company?.HotelName || company?.RegName || 'Carmen Hotel & Resorts',
});

const getCarmenFinancialReportPermission = (permissions) => {
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
    .filter((dept) => dept?.DeptCode || dept?.id)
    .map((dept) => ({
      id: normalizeDeptLookupCode(dept.DeptCode || dept.id),
      name: dept.Description || dept.label || dept.name || `Dept ${dept.DeptCode || dept.id}`,
    }))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

export const adaptCarmenAccountCodes = (accounts) =>
  toArray(accounts)
    .filter((account) => (account?.AccCode || account?.id) && account.Active !== false)
    .map((account) => ({
      id: normalizeAccLookupCode(account.AccCode || account.id),
      name: account.Description || account.Description2 || account.name || account.AccCode || account.id,
      type: toAccountCategory(account.Type || account.type),
      sourceType: account.Type || account.type || '',
      nature: account.Nature || account.nature || '',
    }))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

const normalizeAccountGroupLevel = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  const match = normalized.match(/[1-4]/);
  return match ? `L${match[0]}` : 'L4';
};

export const adaptCarmenAccountGroups = (groups) =>
  toArray(groups)
    .filter((group) => group?.AccGroupCode || group?.accGroupCode || group?.id)
    .map((group) => {
      const accounts = toArray(group?.Account || group?.account || group?.accounts)
        .map((account) => ({
          id: normalizeAccLookupCode(account?.AccCode || account?.accCode || account?.id),
          name: account?.Description || account?.description || account?.Description2 || account?.name || '',
        }))
        .filter((account) => account.id);
      const id = String(group.AccGroupCode || group.accGroupCode || group.id).trim();
      return {
        id,
        name: group.AccGroupName || group.accGroupName || group.name || id,
        level: normalizeAccountGroupLevel(group.Level || group.level),
        accountIds: [...new Set(accounts.map((account) => account.id))],
        accounts,
      };
    })
    .sort((left, right) => (
      left.level.localeCompare(right.level)
      || left.id.localeCompare(right.id, undefined, { numeric: true, sensitivity: 'base' })
    ));

export const adaptCarmenDepartmentGroups = (groups) =>
  toArray(groups)
    .filter((group) => group?.DeptCateCode || group?.deptCateCode || group?.id)
    .filter((group) => group?.Active !== false && group?.active !== false)
    .map((group) => {
      const departments = toArray(group?.Departments || group?.departments)
        .map((department) => ({
          id: normalizeDeptLookupCode(department?.DeptCode || department?.deptCode || department?.id),
          name: department?.Description || department?.description || department?.name || '',
        }))
        .filter((department) => department.id);
      const id = String(group.DeptCateCode || group.deptCateCode || group.id).trim();
      return {
        id,
        name: group.Description || group.description || group.name || id,
        deptIds: [...new Set(departments.map((department) => department.id))],
        departments,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true, sensitivity: 'base' }));

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
    .filter((period) => period?.GlpNo || period?.month || period?.id)
    .map((period) => {
      const id = String(period.GlpNo || period.month || period.id);
      const rawDate = period.GlpDate || period.date;
      const dateLabel = formatDateLabel(rawDate);
      const statusLabel = period.GlpStatus || period.status ? ` (${period.GlpStatus || period.status})` : '';
      return {
        id,
        label: period.label || (dateLabel ? `P${id} - ${dateLabel}${statusLabel}` : `P${id}${statusLabel}`),
        periodNo: Number(period.GlpNo || period.month || period.id),
        date: rawDate || '',
        dateLabel,
        status: period.GlpStatus || period.status || '',
        sourceYear: period.GlpYear || period.sourceYear,
      };
    })
    .sort((a, b) => a.periodNo - b.periodNo);

export const adaptCarmenBudgetRevisions = (budgets) => {
  const revisions = new Map();
  toArray(budgets).forEach((budget) => {
    if (budget?.id && budget?.label) {
      const id = String(budget.id).trim();
      if (!id || revisions.has(id)) return;
      revisions.set(id, { id, label: budget.label || `Revision ${id}` });
      return;
    }

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

const toStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
};

const toCategoryArray = (value) => {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item ?? '').trim()).filter(Boolean);
    return items.length > 0 ? items : ['ALL'];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return ['ALL'];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
        }
      } catch {
        // fall through to comma split
      }
    }

    const items = trimmed.split(',').map((item) => String(item).trim()).filter(Boolean);
    return items.length > 0 ? items : ['ALL'];
  }

  return ['ALL'];
};

const normalizeReportRowDimensions = (row) => {
  const dimensions = [];
  const seen = new Set();

  const pushDimension = (key, value) => {
    const normalizedKey = String(key || '').trim().toLowerCase();
    const normalizedValue = String(value ?? '').trim();
    if (!normalizedKey || !normalizedValue) return;
    const signature = `${normalizedKey}:${normalizedValue}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    dimensions.push({ key: normalizedKey, value: normalizedValue });
  };

  toArray(row?.dimensions || row?.Dimensions).forEach((dimension) => {
    if (!dimension) return;
    pushDimension(dimension.key || dimension.name || dimension.field || dimension.Key || dimension.Field, dimension.value || dimension.id || dimension.code || dimension.Value || dimension.Code);
  });

  Array.from({ length: 10 }, (_, index) => `dim${index + 1}`).forEach((field) => {
    pushDimension(field, row?.[field] ?? row?.[field.toUpperCase()]);
  });

  return dimensions;
};

const normalizeRowStringList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean).join(',');
  }
  return String(value ?? '').trim();
};

const normalizeRowTypeFlags = (value, currentRow = {}) => {
  const normalizedType = String(value ?? '').trim().toUpperCase();
  if (!normalizedType) {
    return {
      isHeader: Boolean(currentRow.isHeader),
      isTotal: Boolean(currentRow.isTotal),
    };
  }

  if (['H', 'HEADER'].includes(normalizedType)) {
    return { isHeader: true, isTotal: false };
  }

  if (['F', 'FORMULA', 'TOTAL'].includes(normalizedType)) {
    return { isHeader: false, isTotal: true };
  }

  if (['D', 'DATA', 'DETAIL'].includes(normalizedType)) {
    return { isHeader: false, isTotal: false };
  }

  return {
    isHeader: Boolean(currentRow.isHeader),
    isTotal: Boolean(currentRow.isTotal),
  };
};

const normalizeReportRow = (row) => {
  if (!row || typeof row !== 'object') return row;

  const dimensions = normalizeReportRowDimensions(row);
  const rowTypeValue = row.Type ?? row.type ?? '';
  const rowTypeFlags = normalizeRowTypeFlags(rowTypeValue, row);
  const normalizedRow = {
    ...row,
    desc: row.desc || row.Description || row.Desc || row.description || row.name || '',
    dept: normalizeRowStringList(row.dept || row.DeptCode || row.Department || row.department),
    deptGroup: String(row.deptGroup || row.DeptGroup || '').trim(),
    accCodes: normalizeRowStringList(row.accCodes || row.AccCode || row.AccCodes || row.AccountCode || row.AccountCodes),
    groupLevel: String(row.groupLevel || row.GroupLevel || 'L4').trim().toUpperCase() || 'L4',
    groups: normalizeRowStringList(row.groups || row.Groups || row.Group || row.group),
    percentBase: String(row.percentBase || row.PercentBase || '').trim().toUpperCase(),
    formula: String(row.formula || row.Formula || '').trim().toUpperCase(),
    indent: Number.isFinite(Number(row.indent ?? row.Indent)) ? Number(row.indent ?? row.Indent) : 0,
    isActive: row.isActive !== false && row.IsActive !== false,
    type: String(row.type || row.Type || '').trim().toUpperCase(),
    ...rowTypeFlags,
    dimensions,
  };

  dimensions.forEach(({ key, value }) => {
    if (/^dim(?:[1-9]|10)$/.test(key)) {
      normalizedRow[key] = value;
    }
  });

  return normalizedRow;
};

const normalizeReportColumn = (column) => {
  if (!column || typeof column !== 'object') return column;
  const isFormula = Boolean(column.isFormula ?? column.IsFormula);
  const isPercent = Boolean(column.isPercent ?? column.IsPercent);
  const rawType = String(column.type || column.Type || '').trim().toUpperCase();
  const type = rawType === 'BUD' ? 'BC' : rawType === 'BUDACC' ? 'BCC' : rawType;
  return {
    ...column,
    isFormula,
    isPercent,
    type: isFormula || isPercent ? undefined : type,
  };
};

export const adaptCarmenReportDefinition = (report) => {
  if (!report) return null;

  const access = toArray(report.access || report.Access);
  const assignedUsers = toStringArray(report.assignedUsers || report.AssignedUsers);

  return {
    id: String(report.id || report.Id || '').trim(),
    name: report.name || report.Name || '',
    companyName: report.companyName || report.CompanyName || '',
    category: toCategoryArray(report.category || report.Category || report.CategoryJson),
    assignedUsers: assignedUsers.length > 0
      ? assignedUsers
      : access
          .map((item) => String(item?.userId || item?.UserId || '').trim())
          .filter(Boolean),
    isActive: report.isActive !== false && report.IsActive !== false,
    periodFormat: report.periodFormat || report.PeriodFormat || 'standard',
    customDateLabel: report.customDateLabel || report.CustomDateLabel || '',
    customPeriodLabel: report.customPeriodLabel || report.CustomPeriodLabel || '',
    overrideDateDisplay: report.overrideDateDisplay || report.OverrideDateDisplay || '',
    overridePeriodDisplay: report.overridePeriodDisplay || report.OverridePeriodDisplay || '',
    owner: report.owner || report.Owner || report.createdBy || report.CreatedBy || '',
    reportType: report.reportType || report.ReportType || 'Monthly',
    day: report.day || report.Day || '',
    theme: report.theme || report.Theme || 'blue',
    descriptionPosition: Number.isInteger(Number(report.descriptionPosition ?? report.DescriptionPosition))
      ? Number(report.descriptionPosition ?? report.DescriptionPosition)
      : 0,
    columns: toArray(report.columns || report.Columns).map(normalizeReportColumn),
    rows: toArray(report.rows || report.Rows).map(normalizeReportRow),
    access,
  };
};

export const adaptCarmenReportDefinitions = (reports) =>
  toObjectArray(reports, ['reports', 'Reports', 'Data', 'value', 'Value'])
    .map(adaptCarmenReportDefinition)
    .filter(Boolean);
