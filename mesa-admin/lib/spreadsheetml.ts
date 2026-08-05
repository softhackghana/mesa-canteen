/**
 * Client-side Excel 2003 XML (SpreadsheetML) export helper.
 *
 * Produces a real .xls file that Microsoft Excel and LibreOffice Calc both open,
 * without adding a dependency. This closes the "CSV + one more format" gap for
 * Phase 1 reporting (FR-RCP-005).
 *
 * ponytail: SpreadsheetML 2003 is a single XML file, not the modern OOXML ZIP
 * package. It covers the MVP need; upgrade to a real .xlsx writer when you need
 * multiple sheets/charts/formulas.
 */

export interface SpreadsheetRow {
  cells: Array<string | number | null>;
}

export interface SpreadsheetSheet {
  name: string;
  rows: SpreadsheetRow[];
}

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/\u003c/g, "&lt;")
    .replace(/\u003e/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellType(value: unknown): { type: string; val: string } {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { type: "Number", val: String(value) };
  }
  return { type: "String", val: escapeXml(value) };
}

function buildWorksheet(sheet: SpreadsheetSheet): string {
  let rowsXml = "";
  for (const row of sheet.rows) {
    let cellsXml = "";
    let idx = 0;
    for (const cell of row.cells) {
      const col = columnName(idx);
      const { type, val } = cellType(cell);
      cellsXml += `<Cell ss:Index="${idx + 1}" ss:StyleID="s${type === "Number" ? 21 : 22}"><Data ss:Type="${type}">${val}</Data></Cell>`;
      idx++;
    }
    rowsXml += `<Row>${cellsXml}</Row>`;
  }
  return `
    <Worksheet ss:Name="${escapeXml(sheet.name)}">
      <Table>${rowsXml}</Table>
    </Worksheet>
  `;
}

function columnName(index: number): string {
  let n = index;
  let name = "";
  while (n >= 0) {
    name = String.fromCharCode((n % 26) + 65) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name || "A";
}

/** Build a SpreadsheetML 2003 document from one or more sheets. */
export function buildSpreadsheetML(sheets: SpreadsheetSheet[]): string {
  const worksheets = sheets.map(buildWorksheet).join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:o="urn:schemas-microsoft-com:office:office">
  <Styles>
    <Style ss:ID="s21"><NumberFormat ss:Format="0.00"/></Style>
    <Style ss:ID="s22"><NumberFormat ss:Format="@"/></Style>
  </Styles>
  ${worksheets}
</Workbook>`;
}

/** Trigger a browser download of the generated XML string as an .xls file. */
export function downloadXls(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
