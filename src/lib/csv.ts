/** Minimal, dependency-free RFC 4180 CSV reader / writer. */

/** Parse CSV text into rows of cells. Handles quotes, escaped quotes, CRLF and BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  // Drop fully blank lines.
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function escapeCell(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(escapeCell).join(',')).join('\n') + '\n';
}

/** Case/space/underscore-insensitive header lookup. */
export function headerIndex(header: string[], ...aliases: string[]): number {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]/g, '');
  const h = header.map(norm);
  for (const a of aliases) {
    const idx = h.indexOf(norm(a));
    if (idx >= 0) return idx;
  }
  return -1;
}
