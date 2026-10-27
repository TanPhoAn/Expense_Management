import { describe, it, expect } from 'vitest';
import { getMonthDateRange, getVietnamTodayString, formatVNDate } from '../../src/lib/utils/date';
import { addCurrency, subtractCurrency, formatVND } from '../../src/lib/utils/currency';

/**
 * Phase 4: Financial correctness and edge cases verification.
 * Tests month boundaries, leap years, midnight / day borders, and financial math.
 */
describe('Phase 4: Financial Correctness & Boundary Edge Cases', () => {

  describe('transactionDate vs createdAt boundary rules', () => {
    it('financial reports must aggregate by transactionDate, not arbitrary timestamps', () => {
      // Simulating a transaction created near midnight (e.g. 23:59:50 UTC on Oct 31, which is 06:59:50 Nov 1 in VN)
      // The transactionDate persisted is strictly YYYY-MM-DD
      const tx = {
        id: 'tx-1',
        description: 'Ăn khuya',
        amount: '120000',
        type: 'EXPENSE',
        transactionDate: '2026-10-31', // User intended Oct 31 expense
        createdAt: new Date('2026-10-31T17:00:00Z'), // 00:00:00 Nov 1 VN time
      };

      const octRange = getMonthDateRange('2026-10');
      const isInOct = tx.transactionDate >= octRange.startDate && tx.transactionDate <= octRange.endDate;
      expect(isInOct).toBe(true);

      const novRange = getMonthDateRange('2026-11');
      const isInNov = tx.transactionDate >= novRange.startDate && tx.transactionDate <= novRange.endDate;
      expect(isInNov).toBe(false);
    });
  });

  describe('Month changes and boundary dates', () => {
    it('verifies exact boundary dates of all 12 calendar months', () => {
      // Standard year 2026
      expect(getMonthDateRange('2026-01')).toEqual({ startDate: '2026-01-01', endDate: '2026-01-31' });
      expect(getMonthDateRange('2026-02')).toEqual({ startDate: '2026-02-01', endDate: '2026-02-28' });
      expect(getMonthDateRange('2026-03')).toEqual({ startDate: '2026-03-01', endDate: '2026-03-31' });
      expect(getMonthDateRange('2026-04')).toEqual({ startDate: '2026-04-01', endDate: '2026-04-30' });
      expect(getMonthDateRange('2026-05')).toEqual({ startDate: '2026-05-01', endDate: '2026-05-31' });
      expect(getMonthDateRange('2026-06')).toEqual({ startDate: '2026-06-01', endDate: '2026-06-30' });
      expect(getMonthDateRange('2026-07')).toEqual({ startDate: '2026-07-01', endDate: '2026-07-31' });
      expect(getMonthDateRange('2026-08')).toEqual({ startDate: '2026-08-01', endDate: '2026-08-31' });
      expect(getMonthDateRange('2026-09')).toEqual({ startDate: '2026-09-01', endDate: '2026-09-30' });
      expect(getMonthDateRange('2026-10')).toEqual({ startDate: '2026-10-01', endDate: '2026-10-31' });
      expect(getMonthDateRange('2026-11')).toEqual({ startDate: '2026-11-01', endDate: '2026-11-30' });
      expect(getMonthDateRange('2026-12')).toEqual({ startDate: '2026-12-01', endDate: '2026-12-31' });
    });

    it('verifies leap year February 29th for 2024 and 2028', () => {
      expect(getMonthDateRange('2024-02')).toEqual({ startDate: '2024-02-01', endDate: '2024-02-29' });
      expect(getMonthDateRange('2028-02')).toEqual({ startDate: '2028-02-01', endDate: '2028-02-29' });
    });

    it('verifies non-leap year century rules (e.g. 2100 is not leap, 2000 is leap)', () => {
      expect(getMonthDateRange('2000-02')).toEqual({ startDate: '2000-02-01', endDate: '2000-02-29' });
      expect(getMonthDateRange('2100-02')).toEqual({ startDate: '2100-02-01', endDate: '2100-02-28' });
    });
  });

  describe('Exact monetary representation & BigInt arithmetic', () => {
    it('avoids floating point addition inaccuracy (0.1 + 0.2 problem in VND sums)', () => {
      // Multiple transactions adding up
      const items = ['1000000', '2500000', '350000', '45000', '5000'];
      const total = items.reduce((acc, curr) => addCurrency(acc, curr), '0');
      expect(total).toBe('3900000');
    });

    it('supports deficit / negative balance without crashing', () => {
      const income = '5000000';
      const expense = '7500000';
      const balance = subtractCurrency(income, expense);
      expect(balance).toBe('-2500000');
    });

    it('formats VND currency accurately', () => {
      expect(formatVND('55000')).toContain('55');
      expect(formatVND('55000')).toContain('₫');
      expect(formatVND('12000000')).toContain('12');
      expect(formatVND('12000000')).toContain('₫');
    });
  });
});
