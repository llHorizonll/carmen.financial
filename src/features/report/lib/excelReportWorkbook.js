import { getReportDisplayColumns, THEMES } from './reportLogic.js';

const TEMPLATE_SHEET = '_Carmen Report Template';
const MAPPING_SHEET = 'Mapping';
const TEMPLATE_VERSION = 1;
const AMOUNT_FORMAT = '#,##0.00;[Red](#,##0.00)';
const PERCENT_FORMAT = '0.00%;[Red](0.00%)';
const HEADER_ROW = 6;

const color = (hex) => ({ argb: `FF${hex.slice(1).toUpperCase()}` });
const fill = (hex) => ({ type: 'pattern', pattern: 'solid', fgColor: color(hex) });
const font = (hex, size = 11, bold = false) => ({ name: 'Aptos', size, bold, color: color(hex) });
const lineCount = (text, width) => String(text ?? '').split(/\r?\n/)
  .reduce((lines, line) => lines + Math.max(1, Math.ceil(line.length / width)), 0);

const pickFields = (record, fields, type = 'string') => Object.fromEntries(
  fields.split(' ').filter((field) => typeof record?.[field] === type)
    .map((field) => [field, record[field]]),
);

const getTemplateTheme = ({ theme }) => Object.hasOwn(THEMES, theme) ? theme : 'blue';

const getTemplate = (report) => ({
  ...pickFields(report, 'name periodFormat customDateLabel customPeriodLabel overrideDateDisplay overridePeriodDisplay remark reportType day'),
  theme: getTemplateTheme(report),
  descriptionPosition: Number.isInteger(report.descriptionPosition) ? report.descriptionPosition : 0,
  category: Array.isArray(report.category) ? report.category.filter((value) => typeof value === 'string') : ['ALL'],
  columns: report.columns.map((column) => ({
    ...pickFields(column, 'id label formula targetCol yearMode specificYear periodMode dayMode budRev type width'),
    ...pickFields(column, 'isActive isFormula isPercent formatAsPercent', 'boolean'),
  })),
  rows: report.rows.map((row) => ({
    ...pickFields(row, 'id desc type dept deptGroup groupLevel groups accCodes percentBase numberFormat formula dim1 dim2 dim3 dim4 dim5 dim6 dim7 dim8 dim9 dim10'),
    ...pickFields(row, 'isActive isHeader isTotal', 'boolean'),
    ...pickFields(row, 'indent', 'number'),
    ...(Array.isArray(row?.dimensions) && {
      dimensions: row.dimensions.map((dimension) => pickFields(dimension, 'key value'))
        .filter(({ key, value }) => key && value),
    }),
  })),
});

const addMappingWorksheet = (workbook, rows, headerColor) => {
  const sheet = workbook.addWorksheet(MAPPING_SHEET, {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 1, showGridLines: false }],
  });
  sheet.columns = [
    { header: 'Row', width: 10 },
    { header: 'Description', width: 40 },
    { header: 'Status', width: 14 },
    { header: 'Dept Code (Linked)', width: 24 },
    { header: 'Department Group', width: 24 },
    { header: 'Account Code (Linked)', width: 34 },
    { header: 'Group Level', width: 17 },
    { header: 'Account Groups', width: 27 },
    { header: 'Dimensions', width: 32 },
  ];
  const header = sheet.getRow(1);
  header.fill = fill(headerColor);
  header.font = font('#FFFFFF', 11, true);
  header.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  header.height = 28;

  rows.forEach((row, index) => {
    if (row.isHeader || row.isTotal) return;
    const dimensions = row.dimensions ?? Object.entries(row)
      .filter(([field, value]) => /^dim(?:[1-9]|10)$/.test(field) && value)
      .map(([key, value]) => ({ key, value }));
    const values = [
      `R${index + 1}`, row.desc, row.isActive === false ? 'Inactive' : 'Active',
      row.dept, row.deptGroup, row.accCodes, row.groupLevel, row.groups,
      dimensions.map(({ key, value }) => `${key.toUpperCase()} = ${value}`).join('\n'),
    ].map((value) => value ?? '');
    const mappingRow = sheet.addRow(values);
    mappingRow.font = font('#0F172A');
    mappingRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    mappingRow.height = Math.min(409, 5 + 15 * Math.max(...values.map((value, columnIndex) =>
      lineCount(value, sheet.getColumn(columnIndex + 1).width - 4),
    )));
    if (mappingRow.number % 2 === 0) mappingRow.fill = fill('#F8FAFC');
  });
  sheet.autoFilter = `A1:I${sheet.rowCount}`;
};

export const buildExcelWorkbook = async ({ activeReport, activeCols, displayCompanyLabel, displayDateLabel, displayPeriodLabel, reportData }) => {
  const { default: ExcelJS } = await import('exceljs');
  const displayColumns = getReportDisplayColumns(activeReport, activeCols);
  const descriptionWidth = 46;
  const columnCount = displayColumns.length;
  const { hexHeader, hexSubHeader, hexTotal, hexCellBorder } = THEMES[getTemplateTheme(activeReport)];
  const title = activeReport.name.replace(/[\\/?*\[\]:]/g, '-').trim().slice(0, 31).trim().replace(/^'+|'+$/g, '');
  const sheetName = !title || [TEMPLATE_SHEET, MAPPING_SHEET, 'History'].some((name) => name.toLowerCase() === title.toLowerCase()) ? 'Report' : title;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', xSplit: displayColumns[0].isDescription && columnCount > 1 ? 1 : 0, ySplit: HEADER_ROW, showGridLines: false }],
  });
  worksheet.columns = displayColumns.map((column) => ({
    width: column.isDescription ? descriptionWidth : Math.min(255, Math.max(16, Number(column.width) / 7 || 0)),
  }));

  const titleRows = [
    [displayCompanyLabel, font(hexHeader, 12, true), 23],
    [activeReport.name, font('#0F172A', 22, true), 34],
    [displayDateLabel, font('#475569', 10), 17],
    [displayPeriodLabel, font('#475569', 10), 17],
  ];
  titleRows.forEach(([label, titleFont, height], index) => {
    const rowNumber = index + 1;
    if (columnCount > 1) worksheet.mergeCells(rowNumber, 1, rowNumber, columnCount);
    const cell = worksheet.getCell(rowNumber, 1);
    cell.value = label ?? '';
    cell.font = titleFont;
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(rowNumber).height = height;
  });
  worksheet.getRow(HEADER_ROW - 1).height = 8;

  const header = worksheet.getRow(HEADER_ROW);
  header.values = displayColumns.map((column) => column.label ?? '');
  header.fill = fill(hexHeader);
  header.font = font('#FFFFFF', 11, true);
  header.height = Math.min(409, Math.max(28, ...displayColumns.map((column, index) =>
    lineCount(column.label, worksheet.getColumn(index + 1).width - 2) * 15 + 8,
  )));
  displayColumns.forEach((column, index) => {
    header.getCell(index + 1).alignment = column.isDescription
      ? { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }
      : { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  reportData.filter((row) => row.isActive !== false).forEach((row, index) => {
    const sheetRow = worksheet.addRow([]);
    const indent = Math.max(1, Math.min(8, Math.trunc(Number(row.indent) || 0) + 1));
    sheetRow.height = Math.min(409, 5 + 15 * lineCount(row.desc, descriptionWidth - indent * 3));
    sheetRow.font = font('#0F172A', 11, Boolean(row.isHeader || row.isTotal));
    if (row.isTotal) {
      sheetRow.fill = fill(hexTotal);
      sheetRow.border = { top: { style: 'thin', color: color(hexCellBorder) } };
    } else if (row.isHeader) {
      sheetRow.fill = fill(hexSubHeader);
    } else if (index % 2 === 1) {
      sheetRow.fill = fill('#F8FAFC');
    }

    displayColumns.forEach((column, columnIndex) => {
      const cell = sheetRow.getCell(columnIndex + 1);
      if (column.isDescription) {
        cell.value = row.desc ?? '';
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent, wrapText: true };
        return;
      }
      cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
      if (row.isHeader) return;
      const raw = row.results?.[column.id];
      const value = Number.isFinite(Number(raw)) ? Number(raw) : 0;
      const columnPercent = column.isPercent || column.formatAsPercent;
      cell.value = raw === null ? '—' : columnPercent ? value / 100 : value;
      cell.numFmt = columnPercent || row.numberFormat === 'percent' ? PERCENT_FORMAT : AMOUNT_FORMAT;
    });
  });

  const template = getTemplate(activeReport);
  addMappingWorksheet(workbook, template.rows, hexHeader);
  // Chunk on Unicode boundaries and keep each cell below Excel's text limit.
  const definitionRows = JSON.stringify(template).match(/[\s\S]{1,16000}/gu).map((part) => [part]);
  workbook.addWorksheet(TEMPLATE_SHEET, { state: 'hidden' }).addRows([
    [TEMPLATE_SHEET, TEMPLATE_VERSION, sheetName, MAPPING_SHEET],
    ...definitionRows,
  ]);
  return workbook.xlsx.writeBuffer();
};

const hasValidIds = (items) => Array.isArray(items) && items.every((item) =>
  typeof item?.id === 'string' && item.id.trim() && !Object.hasOwn(Object.prototype, item.id),
) && new Set(items.map(({ id }) => id)).size === items.length;

export const readExcelReportTemplate = (XLSX, workbook) => {
  const templateSheet = workbook.Sheets[TEMPLATE_SHEET];
  if (!templateSheet) return null;
  const [[marker, version, sheetName, mappingSheetName] = [], ...parts] = XLSX.utils.sheet_to_json(templateSheet, { header: 1, raw: true });
  if (marker !== TEMPLATE_SHEET) return null;

  try {
    const worksheet = Object.hasOwn(workbook.Sheets, sheetName) && workbook.Sheets[sheetName];
    if (version !== TEMPLATE_VERSION || sheetName === TEMPLATE_SHEET || !worksheet?.['!ref']) throw new Error();
    if (!parts.length || parts.some(([part]) => typeof part !== 'string')) throw new Error();
    const definition = JSON.parse(parts.map(([part]) => part).join(''));
    if (typeof definition?.name !== 'string' || !definition.name.trim() ||
        !hasValidIds(definition.rows) || !hasValidIds(definition.columns)) throw new Error();

    const reportDefinition = getTemplate(definition);
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    return {
      name: sheetName,
      templateSheetName: TEMPLATE_SHEET,
      mappingSheetName: mappingSheetName === MAPPING_SHEET && sheetName !== MAPPING_SHEET ? MAPPING_SHEET : undefined,
      rowCount: range.e.r - range.s.r + 1,
      columnCount: range.e.c - range.s.c + 1,
      reportDefinition,
      detectedRows: reportDefinition.rows,
      detectedColumns: reportDefinition.columns,
      previewRows: reportDefinition.rows.slice(0, 5).map((row) => row.desc),
      isRecommended: true,
    };
  } catch {
    throw new Error('The Carmen report template in this workbook is invalid or unsupported.');
  }
};
