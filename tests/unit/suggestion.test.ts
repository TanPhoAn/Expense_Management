import { describe, it, expect } from 'vitest';
import { suggestCategoryFromDescription } from '../../src/features/categories/services/suggestionService';

describe('Vietnamese Category Suggestion Engine (Phase 4 Deterministic)', () => {
  describe('Ăn uống (Expense)', () => {
    it('should suggest Ăn uống for "cơm", "ăn", "trưa", "tối"', () => {
      expect(suggestCategoryFromDescription('Ăn cơm tấm')?.categoryName).toBe('Ăn uống');
      expect(suggestCategoryFromDescription('Đi ăn trưa')?.categoryName).toBe('Ăn uống');
      expect(suggestCategoryFromDescription('Ăn tối cùng gia đình')?.categoryName).toBe('Ăn uống');
      expect(suggestCategoryFromDescription('Cơm gà xối mỡ')?.categoryName).toBe('Ăn uống');
      expect(suggestCategoryFromDescription('Đi ăn trưa')?.type).toBe('EXPENSE');
    });
  });

  describe('Di chuyển (Expense)', () => {
    it('should suggest Di chuyển for "grab", "taxi", "xăng"', () => {
      expect(suggestCategoryFromDescription('Đi grab đi làm')?.categoryName).toBe('Di chuyển');
      expect(suggestCategoryFromDescription('Tiền taxi sân bay')?.categoryName).toBe('Di chuyển');
      expect(suggestCategoryFromDescription('Đổ xăng xe máy')?.categoryName).toBe('Di chuyển');
      expect(suggestCategoryFromDescription('Gửi xe trung tâm thương mại')?.categoryName).toBe('Di chuyển');
      expect(suggestCategoryFromDescription('Đổ xăng')?.type).toBe('EXPENSE');
    });
  });

  describe('Giải trí (Expense)', () => {
    it('should suggest Giải trí for "phim", "game", "concert"', () => {
      expect(suggestCategoryFromDescription('Vé xem phim')?.categoryName).toBe('Giải trí');
      expect(suggestCategoryFromDescription('Mua phim trên app')?.categoryName).toBe('Giải trí');
      expect(suggestCategoryFromDescription('Nạp game steam')?.categoryName).toBe('Giải trí');
      expect(suggestCategoryFromDescription('Vé concert ca nhạc')?.categoryName).toBe('Giải trí');
      expect(suggestCategoryFromDescription('Xem phim CGV')?.type).toBe('EXPENSE');
    });
  });

  describe('Lương & Thưởng (Income)', () => {
    it('should suggest Lương / Thưởng for income keywords', () => {
      const matchLuong = suggestCategoryFromDescription('Lương tháng 10');
      expect(matchLuong?.categoryName).toBe('Lương');
      expect(matchLuong?.type).toBe('INCOME');

      const matchThuong = suggestCategoryFromDescription('Thưởng dự án quý 3');
      expect(matchThuong?.categoryName).toBe('Thưởng');
      expect(matchThuong?.type).toBe('INCOME');

      const matchSalary = suggestCategoryFromDescription('Salary transferred');
      expect(matchSalary?.categoryName).toBe('Lương');
    });
  });

  describe('Accent & Case Insensitivity', () => {
    it('should match correctly regardless of accents and upper/lowercase', () => {
      expect(suggestCategoryFromDescription('di an trua')?.categoryName).toBe('Ăn uống');
      expect(suggestCategoryFromDescription('DO XANG')?.categoryName).toBe('Di chuyển');
      expect(suggestCategoryFromDescription('Ve CoNcErT')?.categoryName).toBe('Giải trí');
      expect(suggestCategoryFromDescription('luong thang nay')?.categoryName).toBe('Lương');
    });

    it('should return null when description is empty or non-matching', () => {
      expect(suggestCategoryFromDescription('')).toBeNull();
      expect(suggestCategoryFromDescription('   ')).toBeNull();
      expect(suggestCategoryFromDescription('abcdef 123456')).toBeNull();
    });
  });
});
