/**
 * PocketFlow Vietnamese Natural Language Financial Parser & OCR Sanitizer
 * Pure TypeScript, zero external dependencies, 100% testable & deterministic.
 */

import { Category } from "@/types";
import { getVietnamTodayString } from "@/lib/utils/date";

export interface ParsedTransactionResult {
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  transactionDate: string; // YYYY-MM-DD
  categoryId?: string;
  categoryName?: string;
  confidence: number;
}

/**
 * Normalizes text for keyword matching: removes extra whitespaces and lowercases.
 */
function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Parses Vietnamese currency shorthand from text into integer VND.
 * Handles:
 * - "40k", "40 k", "40K" -> 40,000
 * - "50 ngàn", "50 nghìn" -> 50,000
 * - "1.5tr", "1,5 triệu", "1.5 tr" -> 1,500,000
 * - "2tr5", "2tr500" -> 2,500,000
 * - "120.000", "120,000", "120000" -> 120,000
 */
export function parseVietnameseCurrency(text: string): number | null {
  if (!text) return null;
  const clean = text.trim();

  // Pattern A: "2tr5", "2tr500", "1tr2", "2 củ 5"
  const trSubMatch = clean.match(/(?:^|[^\d.,])(\d+)\s*(?:tr|triệu|củ)\s*(\d{1,3})(?:[^\d]|$)/i);
  if (trSubMatch) {
    const main = parseInt(trSubMatch[1], 10);
    const subStr = trSubMatch[2];
    const sub = parseInt(subStr.padEnd(3, "0").substring(0, 3), 10);
    return main * 1_000_000 + sub * 1_000;
  }

  // Pattern B: Millions with decimal (e.g., "1.5tr", "1,5 triệu", "2 triệu", "5 tr", "2 củ", "1 chai")
  const trMatch = clean.match(/(?:^|[^\d])(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|củ|chai)(?:[^\w]|$)/i);
  if (trMatch) {
    const num = parseFloat(trMatch[1].replace(",", "."));
    if (!isNaN(num) && num > 0) {
      return Math.round(num * 1_000_000);
    }
  }

  // Pattern C: Thousands shorthand: "40k", "40 ka", "40ka", "50 ngàn", "50 nghìn", "100 ngàn", "50 cành"
  const kMatch = clean.match(/(?:^|[^\d])(\d+(?:[.,]\d+)?)\s*(?:k|ka|cành|ngàn|nghìn)(?:[^\w]|$)/i);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(",", "."));
    if (!isNaN(num) && num > 0) {
      return Math.round(num * 1_000);
    }
  }

  // Pattern C2: Slang hundred-thousands: "2 lít", "1 xị" (1 lít = 100,000)
  const litMatch = clean.match(/(?:^|[^\d])(\d+(?:[.,]\d+)?)\s*(?:lít|xị)(?:[^\w]|$)/i);
  if (litMatch) {
    const num = parseFloat(litMatch[1].replace(",", "."));
    if (!isNaN(num) && num > 0) {
      return Math.round(num * 100_000);
    }
  }

  // Pattern D: Standard formatted numbers: "120.000", "120,000", "1.500.000"
  // Format with thousand dots/commas
  const formattedMatch = clean.match(/(?:^|[^\d])(\d{1,3}(?:[.,]\d{3})+)(?:\s*(?:đ|vnd|đồng))?(?:[^\d]|$)/i);
  if (formattedMatch) {
    const digits = formattedMatch[1].replace(/[.,]/g, "");
    const val = parseInt(digits, 10);
    if (!isNaN(val) && val > 0) {
      return val;
    }
  }

  // Pattern E: Plain numeric string (at least 4 digits or followed by currency symbol)
  const plainMatch = clean.match(/(?:^|[^\d])(\d{4,12})(?:\s*(?:đ|vnd|đồng))?(?:[^\d]|$)/i);
  if (plainMatch) {
    const val = parseInt(plainMatch[1], 10);
    if (!isNaN(val) && val > 0) {
      return val;
    }
  }

  return null;
}

/**
 * Cleans string numbers with currency symbols or OCR artifacts into integer VND.
 * Examples:
 * - "40.000đ" -> 40000
 * - "VND 85,000" -> 85000
 * - "Tổng cộng: 125.000 VND" -> 125000
 * - "Total: 78,000" -> 78000
 */
export function cleanOcrAmount(raw: string | number): number | null {
  if (typeof raw === "number") {
    return isNaN(raw) || raw <= 0 ? null : Math.round(raw);
  }
  if (!raw) return null;

  // First try parsing with shorthand handlers (e.g. 40k, 1.5tr)
  const shorthand = parseVietnameseCurrency(raw);
  if (shorthand !== null) return shorthand;

  // Remove common OCR words: "tổng", "cộng", "total", "amount", "vnd", "đ", spaces
  const sanitized = raw
    .replace(/[^\d.,]/g, "")
    .trim();

  if (!sanitized) return null;

  // If contains dots or commas as thousand separators
  if (sanitized.includes(".") || sanitized.includes(",")) {
    const digits = sanitized.replace(/[.,]/g, "");
    const val = parseInt(digits, 10);
    return isNaN(val) || val <= 0 ? null : val;
  }

  const val = parseInt(sanitized, 10);
  return isNaN(val) || val <= 0 ? null : val;
}

/**
 * Resolves relative Vietnamese dates based on Vietnam timezone (Asia/Ho_Chi_Minh).
 * Handles:
 * - "hôm nay", "bữa nay", "nay" -> baseDate
 * - "hôm qua", "qua" -> baseDate - 1 day
 * - "hôm kia", "hôm kìa" -> baseDate - 2 days
 * - "ngày 25/10", "25/10" -> "YYYY-10-25"
 * - "25/10/2026" -> "2026-10-25"
 */
export function resolveVietnameseDate(text: string, baseDateStr?: string): string {
  const base = baseDateStr || getVietnamTodayString();
  const [baseYearStr, baseMonthStr, baseDayStr] = base.split("-");
  const baseYear = parseInt(baseYearStr, 10);
  const baseMonth = parseInt(baseMonthStr, 10);
  const baseDay = parseInt(baseDayStr, 10);

  const lower = normalizeText(text);

  // Check "hôm qua" or "hôm trước"
  if (lower.includes("hôm qua") || lower.includes("bữa qua") || /\bqua\b/.test(lower)) {
    const d = new Date(Date.UTC(baseYear, baseMonth - 1, baseDay - 1, 12, 0, 0));
    return d.toISOString().split("T")[0];
  }

  // Check "hôm kia"
  if (lower.includes("hôm kia") || lower.includes("hôm kìa")) {
    const d = new Date(Date.UTC(baseYear, baseMonth - 1, baseDay - 2, 12, 0, 0));
    return d.toISOString().split("T")[0];
  }

  // Explicit full date: "DD/MM/YYYY" or "DD-MM-YYYY"
  const fullDateMatch = lower.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (fullDateMatch) {
    const day = String(parseInt(fullDateMatch[1], 10)).padStart(2, "0");
    const month = String(parseInt(fullDateMatch[2], 10)).padStart(2, "0");
    const year = fullDateMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Explicit short date: "ngày DD/MM" or "DD/MM"
  const shortDateMatch = lower.match(/(?:ngày\s+)?\b(\d{1,2})[/-](\d{1,2})\b/);
  if (shortDateMatch) {
    const day = String(parseInt(shortDateMatch[1], 10)).padStart(2, "0");
    const month = String(parseInt(shortDateMatch[2], 10)).padStart(2, "0");
    return `${baseYear}-${month}-${day}`;
  }

  // Default to today
  return base;
}

/**
 * Detects whether transaction is an INCOME or an EXPENSE.
 */
export function detectTransactionType(text: string): "INCOME" | "EXPENSE" {
  const lower = normalizeText(text);

  const incomeKeywords = [
    "lương",
    "thưởng",
    "nhận tiền",
    "được cho",
    "thu nhập",
    "bán được",
    "hoàn tiền",
    "ting ting",
    "lúa về",
    "lãi",
    "cổ tức",
    "thu nợ",
    "được tặng",
  ];

  for (const kw of incomeKeywords) {
    if (lower.includes(kw)) {
      return "INCOME";
    }
  }

  return "EXPENSE";
}

/**
 * Checks if a word exists in text as a whole word (using Unicode letter boundaries).
 * Prevents false positives like "ăn" matching inside "xăng".
 */
export function hasWholeWord(text: string, word: string): boolean {
  if (!text || !word) return false;
  // If word has spaces (compound word like "cà phê", "gửi xe"), do standard substring check with space boundary
  if (word.includes(" ")) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, "iu");
    return regex.test(text);
  }
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, "iu");
  return regex.test(text);
}

/**
 * Extracts a clean description from the user text by removing amounts, dates, and conversational filler.
 */
export function extractCleanDescription(text: string): string {
  let cleaned = text;

  // Remove relative dates (using unicode boundaries)
  const dateRegex = new RegExp("(?:^|[^\\p{L}\\p{N}])(hôm nay|hôm qua|hôm kia|bữa nay|bữa qua|sáng nay|trưa nay|chiều nay|tối nay|ăn trưa|ăn tối|ăn sáng)(?=$|[^\\p{L}\\p{N}])", "giu");
  cleaned = cleaned.replace(dateRegex, " ");
  cleaned = cleaned.replace(/(?:ngày\s+)?\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/gi, " ");

  // Remove currency tokens (e.g. 40k, 40 ka, 50 ngàn, 1.5tr, 120.000đ)
  cleaned = cleaned.replace(/\b\d+(?:[.,]\d+)?\s*(?:k|ka|cành|củ|chai|lít|xị|ngàn|nghìn|tr|triệu|đ|vnd|đồng)\b/gi, " ");
  cleaned = cleaned.replace(/\b\d{1,3}(?:[.,]\d{3})+\b/g, " ");
  cleaned = cleaned.replace(/\b\d{4,12}\b/g, " ");

  // Remove common filler words (using unicode boundaries so 'đi', 'được' are stripped cleanly)
  const fillerRegex = new RegExp("(?:^|[^\\p{L}\\p{N}])(tui|mình|tớ|em|anh|chị|đi|vừa|mới|hết|mất|được|có|chi|tiêu|trả)(?=$|[^\\p{L}\\p{N}])", "giu");
  cleaned = cleaned.replace(fillerRegex, " ");

  // Strip punctuation and excess whitespace
  cleaned = cleaned.replace(/[:;,!?"'()]/g, " ").replace(/\s+/g, " ").trim();

  // If empty, provide a fallback
  if (!cleaned) {
    return "Giao dịch không tên";
  }

  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Maps description keywords to best category.
 */
export function matchBestCategory(
  description: string,
  type: "INCOME" | "EXPENSE",
  categories: Category[]
): Category | undefined {
  const lower = normalizeText(description);

  // Filter categories by transaction type
  const typeMatched = categories.filter((c) => c.type === type);
  if (typeMatched.length === 0) return categories[0];

  // Common mapping rules
  const keywordMap: Record<string, string[]> = {
    "Ăn uống": ["ăn", "cơm", "phở", "bún", "bánh", "uống", "cà phê", "cafe", "trà", "nước", "highland", "starbucks", "trưa", "tối", "sáng", "nhậu", "buffet"],
    "Di chuyển": ["xăng", "xe", "grab", "be", "taxi", "gửi xe", "vé", "bus", "xe buýt", "bảo dưỡng"],
    "Mua sắm": ["mua", "quần", "áo", "giày", "dép", "shopee", "lazada", "tiki", "siêu thị", "chợ"],
    "Hóa đơn": ["điện", "nước", "mạng", "internet", "wifi", "nhà", "tiền phòng", "truyền hình"],
    "Giải trí": ["phim", "game", "du lịch", "karaoke", "sách", "truyện", "netflix", "spotify"],
    "Lương": ["lương", "salary", "công"],
    "Thưởng": ["thưởng", "bonus", "hoa hồng"],
  };

  // 1. Direct name match
  for (const cat of typeMatched) {
    if (hasWholeWord(lower, cat.name.toLowerCase())) {
      return cat;
    }
  }

  // 2. Keyword match using whole word verification
  for (const cat of typeMatched) {
    const keywords = keywordMap[cat.name] || [];
    for (const kw of keywords) {
      if (hasWholeWord(lower, kw)) {
        return cat;
      }
    }
  }

  // Return the first category of matching type as fallback
  return typeMatched[0];
}

/**
 * Complete deterministic natural language transaction parser.
 * Combines all heuristics into a structured transaction result.
 */
export function parseNaturalLanguageTransaction(
  message: string,
  baseDateStr?: string,
  categories: Category[] = []
): ParsedTransactionResult {
  const amount = parseVietnameseCurrency(message) || 0;
  const type = detectTransactionType(message);
  const transactionDate = resolveVietnameseDate(message, baseDateStr);
  const description = extractCleanDescription(message);
  const matchedCat = matchBestCategory(description, type, categories);

  return {
    description,
    amount,
    type,
    transactionDate,
    categoryId: matchedCat?.id,
    categoryName: matchedCat?.name,
    confidence: amount > 0 ? 0.9 : 0.4,
  };
}
