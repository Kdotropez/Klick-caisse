export function parsePrice(input: unknown): number {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  let s = String(input ?? '').trim();
  if (!s) return 0;
  // Nettoyages supplémentaires: guillemets, espaces insécables, symbole €, espaces
  s = s
    .replace(/["']/g, '')
    .replace(/\u00A0/g, '')
    .replace(/\s+/g, '')
    .replace(/[€]/g, '');
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && !hasDot) {
    // EU style: 8,50 -> 8.50
    s = s.replace(',', '.');
  } else if (hasComma && hasDot) {
    // Heuristic: if last comma is after last dot, commas are decimals and dots are thousands.
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Example: 1.234,56 -> 1234.56
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Example: 1,234.56 -> 1234.56 (US style with thousands commas)
      s = s.replace(/,/g, '');
    }
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}


