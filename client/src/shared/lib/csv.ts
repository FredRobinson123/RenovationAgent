export type CsvCell = string | number | boolean | null | undefined;
export type CsvRow = CsvCell[];

function formatCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) {
    return "";
  }
  const value = String(cell);
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function buildCsvContent(rows: CsvRow[]): string {
  return rows.map((row) => row.map(formatCell).join(",")).join("\n");
}

export function downloadCsvFile(filename: string, rows: CsvRow[]): void {
  if (!rows.length) {
    return;
  }

  const csvContent = buildCsvContent(rows);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const normalizedName = filename.endsWith(".csv") ? filename : `${filename}.csv`;

  link.href = url;
  link.setAttribute("download", normalizedName);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

