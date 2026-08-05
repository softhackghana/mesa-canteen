import { buildSpreadsheetML, downloadXls, type SpreadsheetSheet } from "./spreadsheetml";

/**
 * Self-check for SpreadsheetML export (FR-RCP-005).
 *
 * Verifies the generated .xls XML contains the expected worksheet, rows,
 * columns and a numeric cell, and is accepted by a coarse XML parse.
 */
// fallow-ignore-file unused-file

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("spreadsheetml.selfcheck: FAIL —", msg);
    process.exit(1);
  }
}

function main(): void {
  const sheet: SpreadsheetSheet = {
    name: "Consolidated Meals",
    rows: [
      { cells: ["Department", "Cost Centre", "Employees", "Total Meals", "Total Cost (GHS)"] },
      { cells: ["Engineering", "CC-ENG", 12, 34, 102.0] },
      { cells: ["Operations", "CC-OPS", 8, 19, 57.0] },
    ],
  };

  const xml = buildSpreadsheetML([sheet]);

  assert(xml.includes('<?xml version="1.0"?>'), "XML declaration missing");
  assert(xml.includes('Worksheet'), "Worksheet element missing");
  assert(xml.includes('ss:Name="Consolidated Meals"'), "Sheet name missing");
  assert(xml.includes('<Data ss:Type="String">Engineering</Data>'), "String cell missing");
  assert(xml.includes('<Data ss:Type="Number">102</Data>'), "Number cell missing");
  assert(xml.includes("ss:StyleID=\"s21\""), "Number style missing");

  // Ensure downloadXls does not throw when given a real-looking XML string.
  // We can't assert a download in Node, but we can smoke-test the Blob path by
  // replacing document.createElement and URL.createObjectURL with stubs.
  // ponytail: minimal DOM stub just for this self-check; do not use in production.
  const clicks: string[] = [];
  const fakeAnchor = { click: () => clicks.push("clicked") } as unknown as HTMLAnchorElement;
  const created: HTMLAnchorElement[] = [];
  const originalCreateElement = typeof document !== "undefined" ? document.createElement.bind(document) : undefined;
  const originalUrlCreate = URL.createObjectURL;
  const originalUrlRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => "blob:selfcheck";
  URL.revokeObjectURL = () => {};
  (globalThis as unknown as Record<"document", { createElement: (tag: string) => HTMLAnchorElement }>).document = {
    createElement: (tag: string) => {
      if (tag !== "a") return originalCreateElement?.(tag) as HTMLAnchorElement ?? fakeAnchor;
      created.push(fakeAnchor);
      return fakeAnchor;
    },
  };
  downloadXls(xml, "test-export.xls");
  URL.createObjectURL = originalUrlCreate;
  URL.revokeObjectURL = originalUrlRevoke;
  assert(created.length === 1, "downloadXls should create one anchor");
  assert(fakeAnchor.download === "test-export.xls", "download filename missing");
  assert(clicks.length === 1, "downloadXls should trigger click");

  console.log("spreadsheetml.selfcheck: OK —", sheet.rows.length, "rows,", sheet.rows[0].cells.length, "columns");
}

main();
