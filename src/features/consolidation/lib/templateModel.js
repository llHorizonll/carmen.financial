import { createBlankReport } from '../../report/data/reportTemplates.js';
import { buildReportDefinitionPayload } from '../../report/lib/reportApi.js';

export function createConsolidationTemplate(profile, source = null, owner = '') {
  const definition = source
    ? buildReportDefinitionPayload(structuredClone(source))
    : createBlankReport('', [], crypto.randomUUID(), owner);
  const { lastModified, access, assignedUsers, ...content } = definition;
  return {
    ...content,
    id: crypto.randomUUID(),
    name: source ? `Copy of ${source.name}` : 'New Consolidation Report',
    kind: 'consolidation',
    profileTenant: profile.tenant,
    profileRevision: profile.revision,
    version: 0,
    owner,
    access: [],
    assignedUsers: [],
  };
}

export function appendTemplateRow(report, type) {
  const isTotal = type === 'formula' || type === 'formula-percent';
  const last = report.rows.at(-1);
  return { ...report, rows: [...report.rows, {
    id: crypto.randomUUID(), desc: type === 'header' ? 'HEADER' : isTotal ? 'Total' : 'New Line',
    isActive: true, isHeader: type === 'header', isTotal,
    numberFormat: type === 'formula-percent' ? 'percent' : 'column',
    dept: '', deptGroup: '', accCodes: '', groupLevel: 'L4', groups: '',
    formula: isTotal ? 'R1+R2' : '', percentBase: last?.percentBase || '', indent: last?.indent || 0,
  }] };
}

export function appendTemplateColumn(report, type, source = null) {
  const dataType = report.columns.some(column => ['DAC', 'PTD'].includes(column.type)) ? 'DAC' : 'AC';
  const column = source ? { ...source, id: crypto.randomUUID(), label: `Copy of ${source.label}`, isActive: true } : {
    id: crypto.randomUUID(), label: type === 'data' ? 'New Column' : type === 'percent' ? '% Mix' : 'Variance',
    isActive: true, isFormula: type === 'formula', isPercent: type === 'percent', formatAsPercent: false,
    formula: type === 'formula' ? 'C1-C2' : '', targetCol: type === 'percent' ? 'C1' : undefined,
    yearMode: type === 'data' ? 'current' : undefined, periodMode: type === 'data' ? 'current' : undefined,
    type: type === 'data' ? dataType : undefined, width: '',
  };
  return { ...report, columns: [...report.columns, column],
    ...(Number(report.descriptionPosition) === report.columns.length ? { descriptionPosition: report.columns.length + 1 } : {}) };
}
