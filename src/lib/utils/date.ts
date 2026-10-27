/**
 * PocketFlow Date Utilities
 * Anchored strictly to 'Asia/Ho_Chi_Minh' (UTC+7).
 */

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Returns the current date in Vietnam formatted as YYYY-MM-DD.
 */
export function getVietnamTodayString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Returns current calendar month in Vietnam as YYYY-MM.
 */
export function getVietnamCurrentMonthString(): string {
  const today = getVietnamTodayString();
  return today.substring(0, 7);
}

/**
 * Returns start and end dates for a given YYYY-MM string.
 * Example: '2026-10' -> { startDate: '2026-10-01', endDate: '2026-10-31' }
 */
export function getMonthDateRange(monthString: string): { startDate: string; endDate: string } {
  const [yearStr, monthStr] = monthString.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const startDate = `${yearStr}-${monthStr.padStart(2, '0')}-01`;
  // Day 0 of next month is the last day of current month
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${yearStr}-${monthStr.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { startDate, endDate };
}

/**
 * Formats a YYYY-MM-DD string into Vietnamese friendly date (e.g., "26/10/2026" or "Thứ Hai, 26 thg 10").
 */
export function formatVNDate(dateString: string, format: 'short' | 'full' = 'short'): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (format === 'short') {
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(date);
}
