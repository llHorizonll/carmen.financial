const hasFinancialReportPermission = (user) =>
  Boolean(user?.permissions?.financialReport);

export const canSetupFinancialReports = (user) => {
  const permission = user?.permissions?.financialReport;
  if (permission) {
    return Boolean(
      permission.setup ||
      permission.add ||
      permission.update ||
      permission.delete,
    );
  }
  return user?.role === "Admin";
};

export const canViewFinancialReports = (user) => {
  const permission = user?.permissions?.financialReport;
  if (permission) {
    return Boolean(
      permission.view ||
      permission.setup ||
      permission.add ||
      permission.update ||
      permission.delete,
    );
  }
  return Boolean(user);
};

export const getAccessibleReports = (reports, user) => {
  if (!canViewFinancialReports(user)) return [];
  if (canSetupFinancialReports(user)) return reports;
  const userId = String(user?.id || "").trim();
  return reports.filter((report) => {
    if (String(report?.owner || "").trim() === userId) return true;
    if (report?.isActive === false) return false;
    if (
      Array.isArray(report?.assignedUsers) &&
      report.assignedUsers.includes(userId)
    )
      return true;
    return (
      Array.isArray(report?.access) &&
      report.access.some(
        (item) =>
          String(item?.userId || "").trim() === userId &&
          item?.canView !== false,
      )
    );
  });
};

export { hasFinancialReportPermission };
