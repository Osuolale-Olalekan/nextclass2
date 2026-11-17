const FORMULA_START = /^[=+\-@\t\r]/;
const VALIDATED_PHONE = /^\+\d{7,15}$/;

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);

  // Stop spreadsheet apps from running user-typed text as a formula (CSV injection).
  // Validated phone numbers start with "+" legitimately, so they pass through untouched.
  if (FORMULA_START.test(text) && !VALIDATED_PHONE.test(text)) text = "'" + text;

  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Builds a CSV string (with a UTF-8 BOM so Excel reads names with accents correctly). */
export function toCSV(columns: readonly string[], rows: ReadonlyArray<Record<string, unknown>>): string {
  const lines = [columns.map(cell).join(",")];
  for (const row of rows) lines.push(columns.map((c) => cell(row[c])).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
