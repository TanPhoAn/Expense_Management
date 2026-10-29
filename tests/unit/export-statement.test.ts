import { describe, it, expect } from 'vitest';
import {
  escapeCsvField,
  formatDateDDMMYYYY,
  formatTimeHHmm,
  generateAccountingCsv,
  calculateStatementSummary,
  extractTopExpenses,
  extractCategoryBreakdown,
  formatPeriodLabel,
  countDaysBetween,
  RawExportTransaction,
} from '@/lib/utils/export';

describe('Data Export & Financial Statement Engine (Phase 25)', () => {
  const mockTransactions: RawExportTransaction[] = [
    {
      id: 'tx_01',
      userId: 'user_1',
      categoryId: 'cat_food',
      description: 'Cơm tấm sườn bì chả, trà đá',
      amount: '55000',
      type: 'EXPENSE',
      transactionDate: '2026-10-05',
      note: 'Ăn cùng đồng nghiệp',
      receiptUrl: 'https://storage.pocketflow.vn/receipts/01.jpg',
      createdAt: new Date('2026-10-05T05:30:00Z'),
      category: {
        id: 'cat_food',
        name: 'Ăn uống',
        type: 'EXPENSE',
        icon: 'Utensils',
        color: '#f43f5e',
      },
    },
    {
      id: 'tx_02',
      userId: 'user_1',
      categoryId: 'cat_tech',
      description: 'Mua màn hình "UltraWide" 4K',
      amount: '8500000',
      type: 'EXPENSE',
      transactionDate: '2026-10-10',
      note: 'Bảo hành 24 tháng\nCó VAT',
      receiptUrl: null,
      createdAt: new Date('2026-10-10T08:15:00Z'),
      category: {
        id: 'cat_tech',
        name: 'Thiết bị & Công nghệ',
        type: 'EXPENSE',
        icon: 'Monitor',
        color: '#8b5cf6',
      },
    },
    {
      id: 'tx_03',
      userId: 'user_1',
      categoryId: 'cat_transport',
      description: 'Đổ xăng xe máy Petrolimex',
      amount: '70000',
      type: 'EXPENSE',
      transactionDate: '2026-10-15',
      note: null,
      receiptUrl: null,
      createdAt: new Date('2026-10-15T10:00:00Z'),
      category: {
        id: 'cat_transport',
        name: 'Di chuyển',
        type: 'EXPENSE',
        icon: 'Car',
        color: '#0ea5e9',
      },
    },
    {
      id: 'tx_04',
      userId: 'user_1',
      categoryId: 'cat_salary',
      description: 'Lương tháng 10 ting ting',
      amount: '25000000',
      type: 'INCOME',
      transactionDate: '2026-10-25',
      note: 'Chuyển khoản từ công ty',
      receiptUrl: null,
      createdAt: new Date('2026-10-25T02:00:00Z'),
      category: {
        id: 'cat_salary',
        name: 'Lương',
        type: 'INCOME',
        icon: 'Wallet',
        color: '#10b981',
      },
    },
    {
      id: 'tx_05',
      userId: 'user_1',
      categoryId: 'cat_bonus',
      description: 'Thưởng dự án quý 3',
      amount: '5000000',
      type: 'INCOME',
      transactionDate: '2026-10-28',
      note: null,
      receiptUrl: null,
      createdAt: new Date('2026-10-28T09:30:00Z'),
      category: {
        id: 'cat_bonus',
        name: 'Thưởng',
        type: 'INCOME',
        icon: 'Gift',
        color: '#f59e0b',
      },
    },
    {
      id: 'tx_06',
      userId: 'user_1',
      categoryId: 'cat_food',
      description: 'Cà phê Highland',
      amount: '45000',
      type: 'EXPENSE',
      transactionDate: '2026-10-29',
      note: null,
      receiptUrl: null,
      createdAt: new Date('2026-10-29T03:00:00Z'),
      category: {
        id: 'cat_food',
        name: 'Ăn uống',
        type: 'EXPENSE',
        icon: 'Coffee',
        color: '#f43f5e',
      },
    },
  ];

  describe('1. CSV Accounting Formatting & RFC 4180 Escaping', () => {
    it('should escape strings containing commas properly with quotes', () => {
      expect(escapeCsvField('Cơm trưa, cafe')).toBe('"Cơm trưa, cafe"');
    });

    it('should escape strings containing double quotes by doubling them', () => {
      expect(escapeCsvField('Mua "sách" hay')).toBe('"Mua ""sách"" hay"');
    });

    it('should escape strings containing newlines', () => {
      expect(escapeCsvField('Dòng 1\nDòng 2')).toBe('"Dòng 1\nDòng 2"');
    });

    it('should format raw numeric amounts without quotes for Excel SUM compatibility', () => {
      expect(escapeCsvField('55000', true)).toBe('55000');
      expect(escapeCsvField(8500000, true)).toBe('8500000');
      expect(escapeCsvField('invalid', true)).toBe('0');
      expect(escapeCsvField(null, true)).toBe('0');
    });

    it('should handle null and undefined string values cleanly', () => {
      expect(escapeCsvField(null)).toBe('""');
      expect(escapeCsvField(undefined)).toBe('""');
    });
  });

  describe('2. Date & Time Helpers', () => {
    it('should format YYYY-MM-DD to standard Vietnamese DD/MM/YYYY', () => {
      expect(formatDateDDMMYYYY('2026-10-05')).toBe('05/10/2026');
      expect(formatDateDDMMYYYY('2026-01-01')).toBe('01/01/2026');
      expect(formatDateDDMMYYYY('')).toBe('');
    });

    it('should format time correctly in HH:mm', () => {
      const date = new Date('2026-10-05T07:30:00Z');
      const timeStr = formatTimeHHmm(date);
      expect(timeStr).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should count days between two dates inclusive', () => {
      expect(countDaysBetween('2026-10-01', '2026-10-31')).toBe(31);
      expect(countDaysBetween('2026-10-01', '2026-10-01')).toBe(1);
      expect(countDaysBetween('2026-02-01', '2026-02-28')).toBe(28);
    });

    it('should format period labels correctly', () => {
      expect(formatPeriodLabel('2026-10-01', '2026-10-31', '2026-10')).toBe('Tháng 10/2026');
      expect(formatPeriodLabel('2026-10-01', '2026-10-31')).toBe('Tháng 10/2026');
      expect(formatPeriodLabel('2026-10-05', '2026-10-20')).toBe('05/10/2026 — 20/10/2026');
    });
  });

  describe('3. CSV Generation with UTF-8 BOM', () => {
    it('should start with UTF-8 BOM character (\\uFEFF) to prevent Excel mojibake', () => {
      const csv = generateAccountingCsv(mockTransactions);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it('should contain all required accounting header columns in Vietnamese', () => {
      const csv = generateAccountingCsv(mockTransactions);
      const lines = csv.split('\r\n');
      const headerLine = lines[0].replace('\uFEFF', '');

      expect(headerLine).toContain('"Mã giao dịch"');
      expect(headerLine).toContain('"Ngày giao dịch"');
      expect(headerLine).toContain('"Giờ ghi nhận"');
      expect(headerLine).toContain('"Loại"');
      expect(headerLine).toContain('"Danh mục"');
      expect(headerLine).toContain('"Số tiền (VND)"');
      expect(headerLine).toContain('"Mô tả giao dịch"');
      expect(headerLine).toContain('"Ghi chú"');
      expect(headerLine).toContain('"Đường dẫn hóa đơn"');
    });

    it('should format each row with correct transaction data and unquoted integer amount', () => {
      const csv = generateAccountingCsv([mockTransactions[0]]);
      const lines = csv.split('\r\n');
      expect(lines.length).toBe(2);

      const row = lines[1];
      expect(row).toContain('"tx_01"');
      expect(row).toContain('"05/10/2026"');
      expect(row).toContain('"Chi tiêu"');
      expect(row).toContain('"Ăn uống"');
      expect(row).toContain('55000'); // numeric without quotes
      expect(row).toContain('"Cơm tấm sườn bì chả, trà đá"');
      expect(row).toContain('"Ăn cùng đồng nghiệp"');
      expect(row).toContain('"https://storage.pocketflow.vn/receipts/01.jpg"');
    });
  });

  describe('4. Financial Statement Math & KPI Aggregation', () => {
    it('should compute exact totalIncome, totalExpense, and netSavings', () => {
      const summary = calculateStatementSummary(mockTransactions, '2026-10-01', '2026-10-31');

      // Income: 25,000,000 + 5,000,000 = 30,000,000
      expect(summary.totalIncome).toBe(30000000);

      // Expense: 55,000 + 8,500,000 + 70,000 + 45,000 = 8,670,000
      expect(summary.totalExpense).toBe(8670000);

      // Net Savings: 30,000,000 - 8,670,000 = 21,330,000
      expect(summary.netSavings).toBe(21330000);

      // Savings Rate: Math.round((21,330,000 / 30,000,000) * 100) = 71%
      expect(summary.savingsRate).toBe(71);

      // Transaction count: 6
      expect(summary.transactionCount).toBe(6);

      // Days: 31 days in October -> dailyAverage = Math.round(8,670,000 / 31) = 279,677
      expect(summary.daysInPeriod).toBe(31);
      expect(summary.dailyAverage).toBe(Math.round(8670000 / 31));
    });

    it('should handle zero income without division by zero', () => {
      const expenseOnly = mockTransactions.filter((tx) => tx.type === 'EXPENSE');
      const summary = calculateStatementSummary(expenseOnly, '2026-10-01', '2026-10-31');

      expect(summary.totalIncome).toBe(0);
      expect(summary.totalExpense).toBe(8670000);
      expect(summary.netSavings).toBe(-8670000);
      expect(summary.savingsRate).toBe(0);
    });

    it('should extract top 5 largest expenses in descending order', () => {
      const top = extractTopExpenses(mockTransactions, 5);

      // Should only include EXPENSE (not INCOME)
      expect(top.length).toBe(4); // Only 4 expenses in mock data
      expect(top[0].description).toBe('Mua màn hình "UltraWide" 4K');
      expect(top[0].amount).toBe(8500000);
      expect(top[1].description).toBe('Đổ xăng xe máy Petrolimex');
      expect(top[1].amount).toBe(70000);
      expect(top[2].description).toBe('Cơm tấm sườn bì chả, trà đá');
      expect(top[2].amount).toBe(55000);
      expect(top[3].description).toBe('Cà phê Highland');
      expect(top[3].amount).toBe(45000);
    });

    it('should extract category distribution with correct percentages', () => {
      const breakdown = extractCategoryBreakdown(mockTransactions);

      // Total expense = 8,670,000
      // Thiết bị & Công nghệ: 8,500,000 (98%)
      // Ăn uống: 55,000 + 45,000 = 100,000 (1%)
      // Di chuyển: 70,000 (1%)
      expect(breakdown.length).toBe(3);
      expect(breakdown[0].name).toBe('Thiết bị & Công nghệ');
      expect(breakdown[0].amount).toBe(8500000);
      expect(breakdown[0].percentage).toBe(98);

      const foodCategory = breakdown.find((c) => c.name === 'Ăn uống');
      expect(foodCategory?.amount).toBe(100000);
      expect(foodCategory?.count).toBe(2);

      const transportCategory = breakdown.find((c) => c.name === 'Di chuyển');
      expect(transportCategory?.amount).toBe(70000);
      expect(transportCategory?.count).toBe(1);
    });
  });
});
