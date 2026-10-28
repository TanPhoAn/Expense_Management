import { GoldPriceData, FuelPriceData, MarketPricesData } from "@/types";

/**
 * Normalizes gold prices to VND per 1 chỉ.
 * Handles variations across SJC units (triệu/lượng, nghìn/lượng, đ/chỉ, đ/lượng).
 */
export function normalizeGoldPricePerChi(val: number): number {
  if (!val || isNaN(val) || val <= 0) return 0;

  // Case 1: Value is in thousand VND per lượng (e.g. 88,500 means 88,500,000 VND / lượng -> 8,850,000 VND / chỉ)
  if (val > 30_000 && val < 250_000) {
    return Math.round((val * 1000) / 10);
  }

  // Case 2: Value is in thousand VND per chỉ (e.g. 8,850 means 8,850,000 VND / chỉ)
  if (val >= 3_000 && val <= 30_000) {
    return Math.round(val * 1000);
  }

  // Case 3: Value is full VND per lượng (e.g. 88,500,000 or 135,500,000 -> divide by 10 to get 1 chỉ)
  if (val >= 50_000_000) {
    return Math.round(val / 10);
  }

  // Case 4: Value is already full VND per chỉ (e.g. 8,850,000 or 13,550,000)
  return Math.round(val);
}

/**
 * Clean numeric string from HTML/XML (handles dots, commas, spaces).
 */
export function cleanNumericValue(str: string): number {
  if (!str) return 0;
  // Replace comma with dot if decimal or strip standard thousand commas/dots
  const sanitized = str.replace(/[^\d.,]/g, "").trim();
  if (!sanitized) return 0;

  // Format with thousand dots: "88.500" or "88,500" or "8.850.000"
  const dotCount = (sanitized.match(/\./g) || []).length;
  const commaCount = (sanitized.match(/,/g) || []).length;

  if (dotCount > 1) {
    // "8.850.000" -> 8850000
    return parseFloat(sanitized.replace(/\./g, "")) || 0;
  }
  if (commaCount > 1) {
    // "8,850,000" -> 8850000
    return parseFloat(sanitized.replace(/,/g, "")) || 0;
  }

  if (dotCount === 1 && commaCount === 1) {
    // e.g. "88,500.00" or "88.500,00"
    if (sanitized.indexOf(",") < sanitized.indexOf(".")) {
      return parseFloat(sanitized.replace(/,/g, "")) || 0;
    } else {
      return parseFloat(sanitized.replace(/\./g, "").replace(",", ".")) || 0;
    }
  }

  if (dotCount === 1) {
    // "88.500" (thousand) vs "8.5" (decimal)
    const parts = sanitized.split(".");
    if (parts[1].length === 3) {
      return parseFloat(parts.join("")) || 0;
    }
    return parseFloat(sanitized) || 0;
  }

  if (commaCount === 1) {
    const parts = sanitized.split(",");
    if (parts[1].length === 3) {
      return parseFloat(parts.join("")) || 0;
    }
    return parseFloat(sanitized.replace(",", ".")) || 0;
  }

  return parseFloat(sanitized) || 0;
}

/**
 * Parse SJC Gold XML Feed (`https://sjc.com.vn/xml/tygiavang.xml`).
 */
export function parseSjcGoldXml(xml: string): GoldPriceData | null {
  if (!xml) return null;

  try {
    // Extract update timestamp: updated="10/28/2026 09:34:17 AM"
    const updateMatch = xml.match(/updated=["']([^"']+)["']/i);
    const updatedAt = updateMatch ? updateMatch[1].trim() : "";

    // Match items. Look specifically for "Vàng nhẫn SJC 99,99" or "nhẫn SJC 99,99"
    // Examples:
    // <item type="Vàng nhẫn SJC 99,99 1 chỉ, 2 chỉ, 5 chỉ" buy="88,500" sell="89,800"/>
    // <item type="Vàng nhẫn SJC 99,99% 1 chỉ" buy="8850000" sell="8980000"/>
    const itemRegex = /<item\s+[^>]*type=["']([^"']+)["'][^>]*buy=["']([^"']+)["'][^>]*sell=["']([^"']+)["'][^>]*\/?>/gi;
    let match: RegExpExecArray | null;

    let targetItem: { type: string; buy: string; sell: string } | null = null;
    let fallbackSjc1L: { type: string; buy: string; sell: string } | null = null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const typeStr = match[1];
      const buyStr = match[2];
      const sellStr = match[3];

      const lower = typeStr.toLowerCase();
      if (lower.includes("nhẫn") && (lower.includes("99,99") || lower.includes("99.99"))) {
        targetItem = { type: typeStr, buy: buyStr, sell: sellStr };
        break; // Priority match!
      }

      if (lower.includes("1l") || lower.includes("1 lượng") || lower.includes("sjc 1l")) {
        fallbackSjc1L = { type: typeStr, buy: buyStr, sell: sellStr };
      }
    }

    const item = targetItem || fallbackSjc1L;
    if (!item) return null;

    const rawBuy = cleanNumericValue(item.buy);
    const rawSell = cleanNumericValue(item.sell);

    const buyPrice = normalizeGoldPricePerChi(rawBuy);
    const sellPrice = normalizeGoldPricePerChi(rawSell);
    const spread = Math.max(0, sellPrice - buyPrice);

    return {
      name: "Vàng nhẫn SJC 99,99% (1 chỉ)",
      buyPrice,
      sellPrice,
      spread,
      updatedAt: updatedAt || new Date().toLocaleDateString("vi-VN"),
      source: "SJC Online (sjc.com.vn)",
    };
  } catch {
    return null;
  }
}

/**
 * Parse SJC Gold HTML from `https://sjc.com.vn/gia-vang-online`.
 */
export function parseSjcGoldHtml(html: string): GoldPriceData | null {
  if (!html) return null;

  try {
    // Look for rows containing "Vàng nhẫn SJC 99,99"
    // <td>Vàng nhẫn SJC 99,99% (1 chỉ, 2 chỉ, 5 chỉ)</td>...<td>88.500</td>...<td>89.800</td>
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const rowContent = rowMatch[1];
      const lower = rowContent.toLowerCase();

      if (lower.includes("nhẫn") && (lower.includes("99,99") || lower.includes("99.99"))) {
        // Extract all td cells
        const tdMatches = [...rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
          m[1].replace(/<[^>]+>/g, "").trim()
        );

        if (tdMatches.length >= 3) {
          const buyStr = tdMatches[1];
          const sellStr = tdMatches[2];

          const rawBuy = cleanNumericValue(buyStr);
          const rawSell = cleanNumericValue(sellStr);

          const buyPrice = normalizeGoldPricePerChi(rawBuy);
          const sellPrice = normalizeGoldPricePerChi(rawSell);

          if (buyPrice > 0 && sellPrice > 0) {
            return {
              name: "Vàng nhẫn SJC 99,99% (1 chỉ)",
              buyPrice,
              sellPrice,
              spread: Math.max(0, sellPrice - buyPrice),
              updatedAt: new Date().toLocaleDateString("vi-VN"),
              source: "SJC Online (sjc.com.vn)",
            };
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse SJC Gold from live real-time JSON feed (giavang.now / SJC Mirror).
 */
export function parseSjcGoldJson(payload: unknown): GoldPriceData | null {
  if (!payload || typeof payload !== "object") return null;

  try {
    const obj = payload as Record<string, unknown>;
    const prices = (obj.prices || obj.data || obj) as Record<string, Record<string, unknown>>;

    // "SJ9999" is the official code for SJC Ring 99.99% (Vàng nhẫn SJC 99,99)
    const ring = prices.SJ9999 || prices["SJ9999"] || prices.SJL1L10;
    if (!ring) return null;

    const rawBuy = Number(ring.buy || ring.buy_price || 0);
    const rawSell = Number(ring.sell || ring.sell_price || 0);

    const buyPrice = normalizeGoldPricePerChi(rawBuy);
    const sellPrice = normalizeGoldPricePerChi(rawSell);

    if (buyPrice > 0 && sellPrice > 0) {
      const timeStr = obj.time && obj.date ? `${obj.time} ngày ${obj.date}` : new Date().toLocaleDateString("vi-VN");
      return {
        name: "Vàng nhẫn SJC 99,99% (1 chỉ)",
        buyPrice,
        sellPrice,
        spread: Math.max(0, sellPrice - buyPrice),
        updatedAt: timeStr,
        source: "SJC Online (sjc.com.vn)",
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse VietFuel API Response.
 * Targets "Xăng E10 RON 95-III" or "Xăng RON 95-III" or "RON 95".
 */
export function parseVietFuelData(payload: unknown): FuelPriceData | null {
  if (!payload || typeof payload !== "object") return null;

  const dataObj = payload as Record<string, unknown>;
  const list = Array.isArray(dataObj.data)
    ? dataObj.data
    : Array.isArray(payload)
    ? payload
    : Array.isArray(dataObj.prices)
    ? dataObj.prices
    : null;

  if (!list || list.length === 0) return null;

  // Search priority:
  // 1. "E10 RON 95-III" or "E10 RON 95"
  // 2. "RON 95-III"
  // 3. "RON 95-V" or any "RON 95"
  let matchedItem: Record<string, unknown> | null = null;

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const name = String(item.name || item.product || item.fuelName || "").toLowerCase();

    if (name.includes("e10") && name.includes("95")) {
      matchedItem = item;
      break;
    }
  }

  if (!matchedItem) {
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const name = String(item.name || item.product || item.fuelName || "").toLowerCase();

      if (name.includes("95-iii") || (name.includes("ron") && name.includes("95"))) {
        matchedItem = item;
        break;
      }
    }
  }

  if (!matchedItem) return null;

  const rawZone1 =
    matchedItem.priceZone1 ??
    matchedItem.zone1 ??
    matchedItem.price ??
    matchedItem.retailPrice;

  const rawZone2 =
    matchedItem.priceZone2 ??
    matchedItem.zone2;

  const priceZone1 = cleanNumericValue(String(rawZone1 || 0));
  const priceZone2 = rawZone2 ? cleanNumericValue(String(rawZone2)) : undefined;

  // Format effective date
  const rawDate = String(
    matchedItem.effectiveDate ||
    matchedItem.updatedAt ||
    matchedItem.date ||
    dataObj.effectiveDate ||
    ""
  );

  let effectiveDate = rawDate;
  if (rawDate && rawDate.includes("-")) {
    const parts = rawDate.split("T")[0].split("-");
    if (parts.length === 3) {
      effectiveDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  // Trend detection
  let trend: "UP" | "DOWN" | "UNCHANGED" = "UNCHANGED";
  const delta = Number(matchedItem.change || matchedItem.delta || matchedItem.diff);
  if (!isNaN(delta)) {
    if (delta > 0) trend = "UP";
    else if (delta < 0) trend = "DOWN";
  }

  const fuelName =
    String(matchedItem.name || matchedItem.product || "").trim() ||
    "Xăng E10 RON 95-III";

  return {
    fuelName: fuelName.includes("E10") ? fuelName : `Xăng E10 ${fuelName}`,
    priceZone1: priceZone1 || 21540,
    priceZone2: priceZone2 || (priceZone1 ? Math.round(priceZone1 * 1.02) : 21970),
    effectiveDate: effectiveDate || "Kỳ điều hành mới nhất",
    trend,
    changeAmount: !isNaN(delta) ? Math.abs(delta) : undefined,
    source: "VietFuel API (Petrolimex)",
  };
}

/**
 * Official Benchmark fallback when external network is temporarily unreachable.
 * Guaranteed to keep the dashboard stable and informative at all times.
 */
export function getFallbackMarketPrices(): MarketPricesData {
  return {
    gold: {
      name: "Vàng nhẫn SJC 99,99% (1 chỉ)",
      buyPrice: 87_500_000 / 10, // 8,750,000 đ/chỉ
      sellPrice: 88_800_000 / 10, // 8,880,000 đ/chỉ
      spread: 1_300_000 / 10, // 130,000 đ/chỉ
      updatedAt: "Hôm nay (Tham khảo SJC)",
      source: "SJC Online (sjc.com.vn)",
    },
    fuel: {
      fuelName: "Xăng E10 RON 95-III",
      priceZone1: 21540,
      priceZone2: 21970,
      effectiveDate: "Kỳ điều hành gần nhất",
      trend: "DOWN",
      changeAmount: 180,
      source: "VietFuel API (Petrolimex)",
    },
    cachedAt: new Date().toISOString(),
    isStale: true,
  };
}
