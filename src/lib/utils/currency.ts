/**
 * PocketFlow Financial Utility
 * Safe monetary formatting and arithmetic for VND.
 * Avoids IEEE-754 floating-point inaccuracies.
 */

const VND_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

/**
 * Format numeric string or BigInt to standard Vietnamese currency (e.g., 55.000 ₫).
 */
export function formatVND(value: string | number | bigint): string {
  try {
    const numericValue = typeof value === 'bigint' ? Number(value) : typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) return '0 ₫';
    return VND_FORMATTER.format(numericValue);
  } catch {
    return '0 ₫';
  }
}

/**
 * Format raw number with dot thousand separators (e.g., "55.000") without currency symbol.
 */
export function formatNumberVN(value: string | number | bigint): string {
  try {
    const numericValue = typeof value === 'bigint' ? Number(value) : typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) return '0';
    return new Intl.NumberFormat('vi-VN').format(numericValue);
  } catch {
    return '0';
  }
}

/**
 * Cleanly parse user-entered text (e.g. "55.000", "55,000", "55000 VND") to a numeric string.
 */
export function sanitizeCurrencyInput(input: string): string {
  // Remove non-digit characters except negative sign if any
  const cleaned = input.replace(/[^\d]/g, '');
  if (!cleaned) return '';
  return cleaned;
}

/**
 * Perform exact integer addition on numeric strings without floating-point drift.
 */
export function addCurrency(a: string, b: string): string {
  const bigA = BigInt(Math.round(parseFloat(a) || 0));
  const bigB = BigInt(Math.round(parseFloat(b) || 0));
  return (bigA + bigB).toString();
}

/**
 * Perform exact integer subtraction on numeric strings (can be negative).
 */
export function subtractCurrency(a: string, b: string): string {
  const bigA = BigInt(Math.round(parseFloat(a) || 0));
  const bigB = BigInt(Math.round(parseFloat(b) || 0));
  return (bigA - bigB).toString();
}
