/**
 * Builds a CSV file that opens correctly in Excel and Google Sheets.
 *
 * - Every field is quoted, so commas, quotes and line breaks in names,
 *   company names or messages can't shift columns.
 * - Fields starting with = + - @ (or a tab/CR) get a leading apostrophe:
 *   lead fields come from anonymous visitors, and spreadsheets would
 *   otherwise run them as formulas.
 * - A byte-order mark makes Excel read the file as UTF-8, so Arabic text
 *   isn't garbled.
 */
function cell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return '﻿' + [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}

/** Triggers a browser download of `csv` as `filename`. */
export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
