import { describe, it, expect } from 'vitest';
import {
  getVietnamTodayString,
  getVietnamCurrentMonthString,
  getMonthDateRange,
  formatVNDate,
} from '../../src/lib/utils/date';

describe('Vietnam Timezone & Date Utilities', () => {
  it('should format today as valid YYYY-MM-DD string', () => {
    const today = getVietnamTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should format current month as YYYY-MM', () => {
    const currentMonth = getVietnamCurrentMonthString();
    expect(currentMonth).toMatch(/^\d{4}-\d{2}$/);
  });

  it('should calculate accurate start and end dates for a month', () => {
    const { startDate, endDate } = getMonthDateRange('2026-10');
    expect(startDate).toBe('2026-10-01');
    expect(endDate).toBe('2026-10-31');

    // Leap year check
    const febLeap = getMonthDateRange('2024-02');
    expect(febLeap.startDate).toBe('2024-02-01');
    expect(febLeap.endDate).toBe('2024-02-29');

    // Non leap year
    const febNonLeap = getMonthDateRange('2025-02');
    expect(febNonLeap.endDate).toBe('2025-02-28');
  });

  it('should format date string in short Vietnamese display', () => {
    const formatted = formatVNDate('2026-10-26');
    expect(formatted).toBe('26/10/2026');
  });
});
