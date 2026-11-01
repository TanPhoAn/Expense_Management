/**
 * PocketFlow Gold Price History Utility Helpers
 * Formatter, trend calculations, and fallback seed data generator.
 */

import { GoldPriceHistoryItem, GoldPriceHistorySummary } from '@/types';
import { VIETNAM_TIMEZONE } from '@/lib/utils/date';

/**
 * Format raw VND gold price to short million representation for charts and badges.
 * Example: 87500000 -> "87.5 tr"
 */
export function formatGoldPriceMillion(price: number): string {
  if (!price || isNaN(price)) return '0 tr';
  const inMillion = price / 1_000_000;
  // If exact whole number, display without decimal, otherwise up to 2 decimal places
  const formatted = inMillion % 1 === 0 ? inMillion.toString() : inMillion.toFixed(2).replace(/\.?0+$/, '');
  return `${formatted} tr`;
}

/**
 * Computes trend metrics (high, low, spread, change amount, percentage, trend direction)
 * across an array of gold price history items.
 */
export function calculateGoldTrendMetrics(
  history: GoldPriceHistoryItem[]
): GoldPriceHistorySummary {
  if (!history || history.length === 0) {
    return {
      currentBuy: 0,
      currentSell: 0,
      currentSpread: 0,
      weekHigh: 0,
      weekLow: 0,
      weekTrend: 'UNCHANGED',
      weekChangeAmount: 0,
      weekChangePercentage: 0,
    };
  }

  const latest = history[history.length - 1];
  const first = history[0];

  const allSellPrices = history.map((h) => h.sellPrice);
  const allBuyPrices = history.map((h) => h.buyPrice);

  const weekHigh = Math.max(...allSellPrices);
  const weekLow = Math.min(...allBuyPrices);

  const currentBuy = latest.buyPrice;
  const currentSell = latest.sellPrice;
  const currentSpread = currentSell - currentBuy;

  const weekChangeAmount = currentSell - first.sellPrice;
  const weekChangePercentage =
    first.sellPrice > 0
      ? Math.round((weekChangeAmount / first.sellPrice) * 10000) / 100
      : 0;

  let weekTrend: 'UP' | 'DOWN' | 'UNCHANGED' = 'UNCHANGED';
  if (weekChangeAmount > 0) weekTrend = 'UP';
  else if (weekChangeAmount < 0) weekTrend = 'DOWN';

  return {
    currentBuy,
    currentSell,
    currentSpread,
    weekHigh,
    weekLow,
    weekTrend,
    weekChangeAmount,
    weekChangePercentage,
  };
}

/**
 * Generates realistic benchmark daily SJC 99.99 gold prices for the last N days.
 * Used when database has fewer historical records than requested.
 */
export function generateFallbackGoldHistory(
  days: number = 7,
  latestBuy: number = 87500000,
  latestSell: number = 89500000
): GoldPriceHistoryItem[] {
  const result: GoldPriceHistoryItem[] = [];
  const baseSpread = latestSell - latestBuy || 2000000;

  // Daily fluctuation steps for simulation (in thousands VND)
  const steps = [-200000, 300000, -100000, 400000, 100000, -200000, 0];

  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

    const dayFormatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: VIETNAM_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
    });
    const fullFormatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: VIETNAM_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const dateStr = dayFormatter.format(targetDate);
    const fullDateStr = fullFormatter.format(targetDate);

    // Calculate price for this historical day
    let daySell = latestSell;
    if (i > 0) {
      const stepIdx = (days - 1 - i) % steps.length;
      daySell = Math.max(80000000, latestSell - i * 80000 + steps[stepIdx]);
    }
    const dayBuy = daySell - baseSpread;

    result.push({
      date: dateStr,
      fullDate: fullDateStr,
      buyPrice: dayBuy,
      sellPrice: daySell,
      spread: baseSpread,
    });
  }

  // Calculate day-over-day changes
  for (let i = 0; i < result.length; i++) {
    if (i === 0) {
      result[i].changeAmount = 0;
      result[i].changePercentage = 0;
    } else {
      const prev = result[i - 1];
      const diff = result[i].sellPrice - prev.sellPrice;
      result[i].changeAmount = diff;
      result[i].changePercentage =
        prev.sellPrice > 0 ? Math.round((diff / prev.sellPrice) * 10000) / 100 : 0;
    }
  }

  return result;
}
