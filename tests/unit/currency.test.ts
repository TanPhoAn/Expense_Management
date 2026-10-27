import { describe, it, expect } from 'vitest';
import {
  formatVND,
  formatNumberVN,
  sanitizeCurrencyInput,
  addCurrency,
  subtractCurrency,
} from '../../src/lib/utils/currency';

describe('VND Currency Utilities', () => {
  it('should correctly format standard VND values', () => {
    // 55000 -> 55.000 ₫
    const formatted = formatVND(55000);
    expect(formatted).toMatch(/55[.,]000/);
    expect(formatted).toContain('₫');
  });

  it('should format large income amounts properly', () => {
    // 12000000 -> 12.000.000 ₫
    const formatted = formatVND('12000000');
    expect(formatted).toMatch(/12[.,]000[.,]000/);
    expect(formatted).toContain('₫');
  });

  it('should sanitize raw string inputs with symbols or spaces', () => {
    expect(sanitizeCurrencyInput('55.000 VND')).toBe('55000');
    expect(sanitizeCurrencyInput('12,000,000 ₫')).toBe('12000000');
    expect(sanitizeCurrencyInput('150 000')).toBe('150000');
    expect(sanitizeCurrencyInput('abc')).toBe('');
  });

  it('should perform exact addition without floating point imprecision', () => {
    // 0.1 + 0.2 floating point error check
    const sum = addCurrency('55000', '45000');
    expect(sum).toBe('100000');
  });

  it('should perform subtraction and allow negative balance', () => {
    // Income: 50,000 - Expense: 75,000 = -25,000
    const balance = subtractCurrency('50000', '75000');
    expect(balance).toBe('-25000');
  });
});
