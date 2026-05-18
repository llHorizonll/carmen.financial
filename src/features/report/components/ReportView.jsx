import React from 'react';

export default function ReportView({
  activeReport,
  displayCompanyLabel,
  displayDateLabel,
  displayPeriodLabel,
  reportData,
  activeCols,
  currentTheme,
  tableZoom,
  getIndentClass,
}) {
  if (!activeReport) return null;

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-300">
      <div className="text-center space-y-1 py-1 print:py-0 print:mb-4 flex-shrink-0" data-testid="report-print-header">
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">{displayCompanyLabel}</h1>
        <h2 className="text-base font-bold text-slate-700">{activeReport.name}</h2>
        <p className="text-xs font-medium text-slate-500">{displayDateLabel}</p>
        <p className="text-xs font-medium text-slate-500">{displayPeriodLabel}</p>
      </div>

      <div className="flex-1 bg-white shadow-lg border border-purple-100 overflow-auto print:shadow-none print:border-none print:overflow-visible custom-scrollbar relative">
        <table className="text-left border-collapse whitespace-nowrap min-w-full" style={{ zoom: tableZoom / 100 }}>
          <thead className={`sticky top-0 z-30 print:static print:bg-slate-100 print:text-black ${currentTheme.header}`}>
            <tr>
              <th className={`p-3 font-black border-r sticky left-0 z-40 text-[10px] uppercase tracking-[0.2em] text-center min-w-[300px] print:border-slate-300 print:bg-white ${currentTheme.header}`}>Description</th>
              {activeCols.map((col) => (
                <th key={col.id} style={{ width: col.width ? `${col.width}px` : 'auto', minWidth: col.width ? `${col.width}px` : '100px' }} className={`p-3 font-black text-center border-r print:border-slate-300 ${currentTheme.header}`}>
                  <div className="text-[11px] tracking-wider">{col.label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-700 text-xs font-medium bg-white">
            {reportData.map((row) => {
              const isHeader = row.isHeader || false;
              const isTotal = row.isTotal || false;
              const indentClass = getIndentClass(row.indent || 0);

              let rowThemeClass = 'hover:bg-slate-50/50';
              if (isTotal) rowThemeClass = currentTheme.total;
              else if (isHeader) rowThemeClass = currentTheme.subHeader;
              else rowThemeClass = currentTheme.rowHover;

              return (
                <tr key={row.id} className={`border-b transition-colors print:border-slate-200 print:break-inside-avoid ${currentTheme.cellBorder} ${rowThemeClass}`}>
                  <td className={`p-2.5 px-4 border-r sticky left-0 z-20 print:border-slate-300 print:static shadow-[1px_0_0_0_#e2e8f0] ${isTotal || isHeader ? '' : 'bg-white font-semibold'} ${currentTheme.cellBorder} ${indentClass}`}>{row.desc}</td>
                  {activeCols.map(col => {
                    const val = Number(row.results?.[col.id]) || 0;
                    const isNegativeVar = col.formula?.includes('-') && val < 0 && !col.isPercent;
                    if (isHeader) return <td key={col.id} className={`border-r print:border-slate-300 ${currentTheme.cellBorder}`}></td>;

                    const isDisplayPercent = col.isPercent || col.formatAsPercent;

                    return (
                      <td key={col.id} className={`p-2.5 px-3 text-right border-r tabular-nums print:border-slate-300 ${currentTheme.cellBorder} ${isNegativeVar || val < 0 ? 'text-red-500 font-bold' : ''}`}>
                        {isDisplayPercent
                          ? (val < 0 ? `(${Math.abs(val).toFixed(2)}%)` : val.toFixed(2) + '%')
                          : (val < 0 ? `(${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2 })})` : val.toLocaleString(undefined, { minimumFractionDigits: 2 }))}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
