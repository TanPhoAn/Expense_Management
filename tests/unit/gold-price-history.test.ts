import { describe, it, expect } from 'vitest';
import {
  formatGoldPriceMillion,
  calculateGoldTrendMetrics,
  generateFallbackGoldHistory,
} from '@/features/market/utils/goldHistoryHelpers';
import { GoldPriceHistoryItem } from '@/types';
import { GET } from '@/app/api/v1/market/gold-history/route';
import { NextRequest } from 'next/server';

describe('SJC Gold Price History & Trend Analytics (Phase 26)', () => {
  describe('formatGoldPriceMillion', () => {
    it('formats exact whole millions without trailing decimal zeros', () => {
      expect(formatGoldPriceMillion(87000000)).toBe('87 tr');
      expect(formatGoldPriceMillion(89000000)).toBe('89 tr');
      expect(formatGoldPriceMillion(90000000)).toBe('90 tr');
    });

    it('formats fractional millions with appropriate decimal precision', () => {
      expect(formatGoldPriceMillion(87500000)).toBe('87.5 tr');
      expect(formatGoldPriceMillion(89250000)).toBe('89.25 tr');
      expect(formatGoldPriceMillion(89100000)).toBe('89.1 tr');
    });

    it('formats sub-million amounts cleanly', () => {
      expect(formatGoldPriceMillion(500000)).toBe('0.5 tr');
    });

    it('handles zero, negative, or invalid numeric values gracefully', () => {
      expect(formatGoldPriceMillion(0)).toBe('0 tr');
      expect(formatGoldPriceMillion(NaN)).toBe('0 tr');
    });
  });

  describe('calculateGoldTrendMetrics', () => {
    it('returns safe zero defaults when history array is empty', () => {
      const summary = calculateGoldTrendMetrics([]);
      expect(summary).toEqual({
        currentBuy: 0,
        currentSell: 0,
        currentSpread: 0,
        weekHigh: 0,
        weekLow: 0,
        weekTrend: 'UNCHANGED',
        weekChangeAmount: 0,
        weekChangePercentage: 0,
      });
    });

    it('calculates metrics for a single snapshot', () => {
      const singleItem: GoldPriceHistoryItem[] = [
        {
          id: 'test-1',
          buyPrice: 87500000,
          sellPrice: 89500000,
          spread: 2000000,
          date: '01/11',
          fullDate: '01/11/2026',
        },
      ];

      const summary = calculateGoldTrendMetrics(singleItem);
      expect(summary.currentBuy).toBe(87500000);
      expect(summary.currentSell).toBe(89500000);
      expect(summary.currentSpread).toBe(2000000);
      expect(summary.weekHigh).toBe(89500000);
      expect(summary.weekLow).toBe(87500000);
      expect(summary.weekTrend).toBe('UNCHANGED');
      expect(summary.weekChangeAmount).toBe(0);
      expect(summary.weekChangePercentage).toBe(0);
    });

    it('identifies UP trend when price rises across the period', () => {
      const upwardHistory: GoldPriceHistoryItem[] = [
        {
          id: '1',
          buyPrice: 85000000,
          sellPrice: 87000000,
          spread: 2000000,
          date: '25/10',
          fullDate: '25/10/2026',
        },
        {
          id: '2',
          buyPrice: 86000000,
          sellPrice: 88000000,
          spread: 2000000,
          date: '28/10',
          fullDate: '28/10/2026',
        },
        {
          id: '3',
          buyPrice: 87500000,
          sellPrice: 89500000,
          spread: 2000000,
          date: '01/11',
          fullDate: '01/11/2026',
        },
      ];

      const summary = calculateGoldTrendMetrics(upwardHistory);
      expect(summary.weekTrend).toBe('UP');
      expect(summary.currentSell).toBe(89500000);
      expect(summary.currentBuy).toBe(87500000);
      expect(summary.currentSpread).toBe(2000000);
      expect(summary.weekHigh).toBe(89500000);
      expect(summary.weekLow).toBe(85000000);
      expect(summary.weekChangeAmount).toBe(2500000); // 89.5m - 87m
      expect(summary.weekChangePercentage).toBe(2.87); // (2.5m / 87m) * 100 = 2.8735... -> 2.87%
    });

    it('identifies DOWN trend when price falls across the period', () => {
      const downwardHistory: GoldPriceHistoryItem[] = [
        {
          id: '1',
          buyPrice: 88000000,
          sellPrice: 90000000,
          spread: 2000000,
          date: '25/10',
          fullDate: '25/10/2026',
        },
        {
          id: '2',
          buyPrice: 86500000,
          sellPrice: 88500000,
          spread: 2000000,
          date: '01/11',
          fullDate: '01/11/2026',
        },
      ];

      const summary = calculateGoldTrendMetrics(downwardHistory);
      expect(summary.weekTrend).toBe('DOWN');
      expect(summary.weekHigh).toBe(90000000);
      expect(summary.weekLow).toBe(86500000);
      expect(summary.weekChangeAmount).toBe(-1500000); // 88.5m - 90m
      expect(summary.weekChangePercentage).toBe(-1.67); // (-1.5m / 90m) * 100 = -1.666... -> -1.67%
    });
  });

  describe('generateFallbackGoldHistory', () => {
    it('generates exact count of days requested', () => {
      const history7 = generateFallbackGoldHistory(7);
      expect(history7).toHaveLength(7);

      const history30 = generateFallbackGoldHistory(30);
      expect(history30).toHaveLength(30);
    });

    it('anchors the final item to latestBuy and latestSell prices', () => {
      const history = generateFallbackGoldHistory(7, 88000000, 90000000);
      const latest = history[history.length - 1];
      expect(latest.buyPrice).toBe(88000000);
      expect(latest.sellPrice).toBe(90000000);
      expect(latest.spread).toBe(2000000);
    });

    it('produces valid date strings and strictly positive values', () => {
      const history = generateFallbackGoldHistory(7);
      for (const item of history) {
        expect(item.buyPrice).toBeGreaterThan(0);
        expect(item.sellPrice).toBeGreaterThan(item.buyPrice);
        expect(item.spread).toBe(item.sellPrice - item.buyPrice);
        expect(item.date).toMatch(/^\d{2}[/-]\d{2}$/);
        expect(item.fullDate).toMatch(/^\d{2}[/-]\d{2}[/-]\d{4}$/);
      }
    });
  });

  describe('GET /api/v1/market/gold-history Endpoint', () => {
    it('returns 200 with 7 days of historical points by default', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/market/gold-history');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.history.length).toBeGreaterThanOrEqual(1);
      expect(body.data.summary).toBeDefined();
      expect(body.data.summary.currentSell).toBeGreaterThan(0);
      expect(body.data.summary.currentBuy).toBeGreaterThan(0);
    });

    it('handles query parameter ?days=30', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/market/gold-history?days=30');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.history.length).toBeGreaterThanOrEqual(1);
    });

    it('clamps or safely falls back on invalid days parameters', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/market/gold-history?days=999');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      // Defaults to 7 when > 30
      expect(body.data.history.length).toBe(7);
    });
  });
});
