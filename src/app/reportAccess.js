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
  return canViewFinancialReports(user) ? reports : [];
};
