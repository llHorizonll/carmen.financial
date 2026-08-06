const ERROR_VALUE = /^#(?:NAME\?|REF!|DIV\/0!|VALUE!|N\/A|NULL!|NUM!)/i;
const NUMBER_VALUE = /^\(?-?[\d,.]+\)?%?$/;
const FINANCIAL_NUMBER_VALUE =
  /^\(?-?\s*(?:[$฿€£¥]\s*)?[\d,.]+\s*\)?\s*%?$/;
const EMPTY_VALUE = /^[-–—]$/;
const HEADER_NOISE =
  /^(?:%|bht|actual|budget|plan|variance|description|current month|last month|last year|this month|this year|year to date|month to date|report description)$/i;
const DESCRIPTION_HEADER = /^(?:description|report description)$/i;
const NON_REPORT_SHEET =
  /^(?:intro|cover|glac|sheet1|sheet2|aspenmacro)$/i;

const cleanText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const isUsableText = (value) => {
  const text = cleanText(value);
  return (
    text.length > 1 &&
    !ERROR_VALUE.test(text) &&
    !NUMBER_VALUE.test(text) &&
    /[A-Za-zก-๙]/.test(text)
  );
};

const detectDescriptionColumn = (matrix) => {
  const scores = [];
  matrix.forEach((row) =>
    row.forEach((value, columnIndex) => {
      if (!isUsableText(value)) return;
      const text = cleanText(value);
      const score =
        Math.min(text.length, 60) +
        (HEADER_NOISE.test(text) ? -40 : 0) +
        (text.length >= 8 ? 12 : 0);
      scores[columnIndex] = (scores[columnIndex] || 0) + Math.max(score, 1);
    }),
  );
  return scores.reduce(
    (best, score = 0, index) =>
      score > best.score ? { index, score } : best,
    { index: 0, score: -1 },
  ).index;
};

const isNumericValue = (value) => {
  const text = cleanText(value);
  return (
    typeof value === "number" ||
    ERROR_VALUE.test(text) ||
    FINANCIAL_NUMBER_VALUE.test(text)
  );
};

const detectColumns = (matrix, descriptionColumn, cellMatrix = []) => {
  const candidates = [];
  const merges = cellMatrix["!merges"] || [];
  const columnSettings = cellMatrix["!cols"] || [];
  const maximumColumns = matrix.reduce(
    (maximum, row) => Math.max(maximum, row.length),
    0,
  );

  for (let columnIndex = 0; columnIndex < maximumColumns; columnIndex += 1) {
    if (columnIndex === descriptionColumn || columnSettings[columnIndex]?.hidden)
      continue;
    const values = matrix.map((row) => row[columnIndex]);
    const numericCount = values.filter(isNumericValue).length;
    if (numericCount < 2) continue;
    candidates.push({ columnIndex, numericCount });
  }

  const reportColumnIndexes = new Set();
  const addContiguousSide = (items, getGap) => {
    items.forEach((candidate, index) => {
      if (index > 0 && getGap(items[index - 1], candidate) > 4) return;
      if (
        index === 0 ||
        reportColumnIndexes.has(items[index - 1].columnIndex)
      ) {
        reportColumnIndexes.add(candidate.columnIndex);
      }
    });
  };
  addContiguousSide(
    candidates
      .filter(({ columnIndex }) => columnIndex < descriptionColumn)
      .sort((left, right) => right.columnIndex - left.columnIndex),
    (previous, current) => previous.columnIndex - current.columnIndex,
  );
  addContiguousSide(
    candidates
      .filter(({ columnIndex }) => columnIndex > descriptionColumn)
      .sort((left, right) => left.columnIndex - right.columnIndex),
    (previous, current) => current.columnIndex - previous.columnIndex,
  );
  const reportCandidates =
    reportColumnIndexes.size > 0
      ? candidates.filter(({ columnIndex }) =>
          reportColumnIndexes.has(columnIndex),
        )
      : candidates;

  const firstDataRow = matrix.findIndex(
    (row) =>
      isUsableText(row[descriptionColumn]) &&
      row.filter(
        (value, columnIndex) =>
          columnIndex !== descriptionColumn && isNumericValue(value),
      ).length >= 2,
  );
  const headerEnd =
    firstDataRow >= 0 ? firstDataRow : Math.min(12, matrix.length);
  const headerStart = Math.max(0, headerEnd - 8);
  const qualifyingHeaderRows = Array.from(
    { length: headerEnd - headerStart },
    (_, index) => headerStart + index,
  ).filter(
    (rowIndex) =>
      reportCandidates.filter(
        ({ columnIndex }) => cleanText(matrix[rowIndex]?.[columnIndex]) !== "",
      ).length >= 2,
  );
  const headerRows = qualifyingHeaderRows.reduce((rows, rowIndex) => {
    if (rows.length > 0 && rowIndex - rows.at(-1) > 1) rows.length = 0;
    rows.push(rowIndex);
    return rows;
  }, []);
  const lastHeaderColumn =
    headerRows.length > 0
      ? Math.max(
          ...reportCandidates
            .filter(({ columnIndex }) =>
              headerRows.some(
                (rowIndex) =>
                  cleanText(matrix[rowIndex]?.[columnIndex]) !== "",
              ),
            )
            .map(({ columnIndex }) => columnIndex),
        )
      : maximumColumns - 1;
  const selected = reportCandidates
    .filter(({ columnIndex }) => columnIndex <= lastHeaderColumn)
    .sort((left, right) => left.columnIndex - right.columnIndex);

  const getHeaderValue = (rowIndex, columnIndex) => {
    const merge = merges.find(
      ({ s, e }) =>
        rowIndex >= s.r &&
        rowIndex <= e.r &&
        columnIndex >= s.c &&
        columnIndex <= e.c,
    );
    return matrix[merge?.s.r ?? rowIndex]?.[merge?.s.c ?? columnIndex];
  };

  const columns = [];
  selected.forEach((candidate) => {
    const headerParts = (
      headerRows.length > 0
        ? headerRows.map((rowIndex) =>
            getHeaderValue(rowIndex, candidate.columnIndex),
          )
        : matrix.slice(0, 12).map((row) => row[candidate.columnIndex])
    )
      .map(cleanText)
      .filter(
        (value) =>
          value !== "" &&
          !EMPTY_VALUE.test(value) &&
          !ERROR_VALUE.test(value) &&
          !isNumericValue(value),
      )
      .filter((value, index, items) => items.indexOf(value) === index);
    if (headerRows.length > 0 && headerParts.length === 0) return;
    let label =
      headerParts.join(" · ") || `Excel column ${candidate.columnIndex + 1}`;
    if (/^(?:%|percent)$/i.test(label) && columns.length > 0) {
      label = `${columns.at(-1).label.replace(/ · %$/, "")} · %`;
    }
    const lowerLabel = label.toLowerCase();
    const isPercent = /%|percent/.test(lowerLabel) && columns.length > 0;
    const previousDataColumn = [...columns]
      .reverse()
      .find((column) => !column.isPercent);
    columns.push({
      id: `C${columns.length + 1}`,
      label,
      isActive: true,
      isFormula: false,
      isPercent,
      formatAsPercent: isPercent,
      ...(isPercent
        ? { targetCol: previousDataColumn?.id || "C1", width: "80" }
        : {
            type: /budget|plan/.test(lowerLabel) ? "BC" : "AC",
            yearMode: /last year|prior year/.test(lowerLabel)
              ? "-1"
              : "current",
            periodMode: "current",
            width: "",
          }),
    });
  });

  return columns.length > 0
    ? columns
    : [
        {
          id: "C1",
          label: "Actual",
          isActive: true,
          isFormula: false,
          isPercent: false,
          formatAsPercent: false,
          yearMode: "current",
          periodMode: "current",
          type: "AC",
          width: "",
        },
      ];
};

const decodeWorkbookXml = (workbook, path) => {
  const content =
    workbook.files?.[String(path || "").replace(/^\//, "")]?.content;
  return content ? new TextDecoder().decode(content) : "";
};

const getXmlSection = (xml, tag) =>
  xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] || "";

const getXmlItems = (xml, tag) =>
  [
    ...xml.matchAll(
      new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g"),
    ),
  ].map((match) => match[0]);

const parseWorkbookStyles = (workbook) => {
  const xml = decodeWorkbookXml(
    workbook,
    workbook.Directory?.style || "xl/styles.xml",
  );
  if (!xml) return [];

  const fonts = getXmlItems(getXmlSection(xml, "fonts"), "font").map(
    (font) => ({
      bold: /<b(?:\s[^>]*)?(?:\/>|>)/.test(font),
      underline: /<u(?:\s[^>]*)?(?:\/>|>)/.test(font),
    }),
  );
  const borders = getXmlItems(getXmlSection(xml, "borders"), "border").map(
    (border) => ({
      top: /<top\s[^>]*style=/.test(border),
      bottom: /<bottom\s[^>]*style=/.test(border),
    }),
  );

  return [
    ...getXmlSection(xml, "cellXfs").matchAll(
      /<xf\b([^>]*?)(?:\/>|>([\s\S]*?)<\/xf>)/g,
    ),
  ].map((match) => {
    const attributes = match[1];
    const body = match[2] || "";
    const fontId = Number(attributes.match(/\bfontId="(\d+)"/)?.[1] || 0);
    const borderId = Number(attributes.match(/\bborderId="(\d+)"/)?.[1] || 0);
    const indent = body.match(/<alignment[^>]*\bindent="(\d+)"/)?.[1];
    return {
      ...fonts[fontId],
      ...borders[borderId],
      indent: indent === undefined ? undefined : Number(indent),
    };
  });
};

const parseSheetStyles = (workbook, sheetIndex, styles, XLSX) => {
  const xml = decodeWorkbookXml(
    workbook,
    workbook.Directory?.sheets?.[sheetIndex],
  );
  const result = new Map();

  for (const match of xml.matchAll(/<c\b[^>]*>/g)) {
    const address = match[0].match(/\br="([^"]+)"/)?.[1];
    const styleIndex = match[0].match(/\bs="(\d+)"/)?.[1];
    if (!address || styleIndex === undefined) continue;
    const position = XLSX.utils.decode_cell(address);
    result.set(
      `${position.r}:${position.c}`,
      styles[Number(styleIndex)] || {},
    );
  }

  return result;
};

const getExcelIndent = (cell, style, original) => {
  const styleIndent = Number(style?.indent ?? cell?.s?.alignment?.indent);
  if (Number.isFinite(styleIndent) && styleIndent >= 0) {
    return Math.min(7, Math.round(styleIndent));
  }

  const leadingSpaces = (original.match(/^[ \t]*/)?.[0] || "").replace(
    /\t/g,
    "    ",
  ).length;
  return leadingSpaces === 0
    ? 0
    : Math.min(7, Math.max(1, Math.round(leadingSpaces / 5)));
};

const detectRows = (
  matrix,
  descriptionColumn,
  cellMatrix = [],
  cellStyles = new Map(),
) => {
  const descriptionHeaderIndex = matrix.findIndex((row) =>
    DESCRIPTION_HEADER.test(cleanText(row[descriptionColumn])),
  );
  let hasSection = false;

  return matrix.flatMap((sourceRow, sourceIndex) => {
    const original = String(sourceRow[descriptionColumn] ?? "");
    const desc = cleanText(original);
    if (
      !isUsableText(desc) ||
      HEADER_NOISE.test(desc) ||
      (descriptionHeaderIndex >= 0 && sourceIndex <= descriptionHeaderIndex)
    ) {
      return [];
    }
    const populatedCells = sourceRow.filter(
      (value) => cleanText(value) !== "" && !ERROR_VALUE.test(cleanText(value)),
    );
    const style = cellStyles.get(`${sourceIndex}:${descriptionColumn}`);
    const isStyleBoundary = Boolean(
      style && (style.bold || style.underline || style.top || style.bottom),
    );
    const sourceIndent = getExcelIndent(
      cellMatrix[sourceIndex]?.[descriptionColumn],
      style,
      original,
    );
    const indent = isStyleBoundary
      ? 0
      : hasSection
        ? Math.max(1, sourceIndent)
        : sourceIndent;
    const letters = desc.replace(/[^\p{L}]/gu, "");
    const isHeader = style
      ? isStyleBoundary
      : populatedCells.length <= 2 ||
        (letters.length >= 4 && desc === desc.toUpperCase());
    if (isStyleBoundary) hasSection = true;

    return [
      {
        id: `excel-row-${sourceIndex + 1}`,
        desc,
        isActive: true,
        isHeader,
        isTotal: false,
        dept: "",
        groupLevel: "L4",
        groups: "",
        accCodes: "",
        percentBase: "",
        formula: "",
        indent,
      },
    ];
  });
};

export const analyzeExcelSheet = (
  name,
  matrix,
  cellMatrix = [],
  cellStyles = new Map(),
) => {
  const descriptionColumn = detectDescriptionColumn(matrix);
  const rows = detectRows(
    matrix,
    descriptionColumn,
    cellMatrix,
    cellStyles,
  );
  const columns = detectColumns(matrix, descriptionColumn, cellMatrix);
  const populatedRows = new Set();
  const populatedColumns = new Set();
  let reportDataRowCount = 0;

  matrix.forEach((row, rowIndex) => {
    let hasReportValue = false;
    row.forEach((value, columnIndex) => {
      const text = cleanText(value);
      if (!text) return;
      populatedRows.add(rowIndex);
      populatedColumns.add(columnIndex);
      if (
        columnIndex !== descriptionColumn &&
        (typeof value === "number" ||
          ERROR_VALUE.test(text) ||
          NUMBER_VALUE.test(text))
      ) {
        hasReportValue = true;
      }
    });
    if (isUsableText(row[descriptionColumn]) && hasReportValue) {
      reportDataRowCount += 1;
    }
  });

  return {
    name,
    rowCount: populatedRows.size,
    columnCount: populatedColumns.size,
    descriptionColumn,
    detectedRows: rows,
    detectedColumns: columns,
    previewRows: rows.slice(0, 5).map((row) => row.desc),
    isRecommended:
      !NON_REPORT_SHEET.test(name) &&
      rows.length >= 2 &&
      columns.length >= 2 &&
      reportDataRowCount >= 2,
  };
};

export const parseExcelWorkbook = async (file) => {
  const xlsxModule = await import("xlsx");
  const XLSX = xlsxModule.default || xlsxModule;
  const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), {
    cellDates: true,
    cellStyles: true,
    bookFiles: true,
    dense: true,
    type: "array",
  });
  const styles = parseWorkbookStyles(workbook);

  return {
    fileName: file.name,
    sheets: workbook.SheetNames.map((name, sheetIndex) => {
      const sheet = workbook.Sheets[name];
      const matrix = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        blankrows: true,
        raw: false,
      });
      return analyzeExcelSheet(
        name,
        matrix,
        sheet,
        parseSheetStyles(workbook, sheetIndex, styles, XLSX),
      );
    }),
  };
};

export const createReportsFromExcelSheets = (
  workbook,
  selectedSheetNames,
  { companyName, userIds, owner, idSeed = Date.now() },
) => {
  const selected = new Set(selectedSheetNames);
  const workbookName = workbook.fileName.replace(/\.(?:xlsx?|xlsm)$/i, "");

  return workbook.sheets
    .filter((sheet) => selected.has(sheet.name) && sheet.isRecommended)
    .map((sheet, index) => ({
      id: `rep-excel-${idSeed}-${index + 1}`,
      name: sheet.name,
      companyName,
      category: ["ALL"],
      assignedUsers: [...userIds],
      isActive: true,
      periodFormat: "standard",
      reportType: "Monthly",
      owner,
      overrideDateDisplay: "",
      overridePeriodDisplay: "",
      day: "",
      theme: "blue",
      sourceWorkbook: workbookName,
      sourceSheet: sheet.name,
      columns: sheet.detectedColumns,
      rows: sheet.detectedRows,
    }));
};
