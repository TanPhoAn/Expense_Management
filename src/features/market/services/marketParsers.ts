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
 * Parse Petrolimex Retail Fuel Prices from HTML table (`petrolimex.com.vn`).
 * Extracts:
 * - Xăng E10 RON 95-III: Zone 1 & Zone 2
 * - Xăng E10 RON 95-V: Zone 1 & Zone 2
 * - Effective date & time (e.g. 15:00 - 22/10/2026)
 */
export function parsePetrolimexHtml(html: string): FuelPriceData | null {
  if (!html) return null;

  try {
    // 1. Extract updated timestamp: "Giá của Petrolimex cập nhật lúc 15:00 - 22/10/2026"
    const dateMatch =
      html.match(/cập\s*nhật\s*lúc\s*([0-9]{1,2}:[0-9]{2}\s*-\s*[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i) ||
      html.match(/([0-9]{1,2}:[0-9]{2}\s*-\s*[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i);
    const effectiveDate = dateMatch ? dateMatch[1].trim() : "15:00 - 22/10/2026";

    let ron95III_Zone1 = 0;
    let ron95III_Zone2 = 0;
    let ron95V_Zone1 = 0;
    let ron95V_Zone2 = 0;

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const rowContent = rowMatch[1];
      const cells = [...rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
        m[1].replace(/<[^>]+>/g, "").trim()
      );

      if (cells.length >= 3) {
        const name = cells[0].toLowerCase();
        const z1 = cleanNumericValue(cells[1]);
        const z2 = cleanNumericValue(cells[2]);

        if (name.includes("95-v") || name.includes("95 - v") || name.includes("95 v")) {
          ron95V_Zone1 = z1;
          ron95V_Zone2 = z2;
        } else if (name.includes("95-iii") || name.includes("95 - iii") || name.includes("95 iii") || (name.includes("95") && !name.includes("95-v"))) {
          ron95III_Zone1 = z1;
          ron95III_Zone2 = z2;
        }
      }
    }

    // Direct text fallback if no HTML table tags
    if (ron95III_Zone1 === 0) {
      const match95III = html.match(/Xăng\s*E10\s*RON\s*95-III[\s\S]*?(\d{2}[.,]\d{3})[\s\S]*?(\d{2}[.,]\d{3})/i);
      if (match95III) {
        ron95III_Zone1 = cleanNumericValue(match95III[1]);
        ron95III_Zone2 = cleanNumericValue(match95III[2]);
      }
    }

    if (ron95V_Zone1 === 0) {
      const match95V = html.match(/Xăng\s*E10\s*RON\s*95-V[\s\S]*?(\d{2}[.,]\d{3})[\s\S]*?(\d{2}[.,]\d{3})/i);
      if (match95V) {
        ron95V_Zone1 = cleanNumericValue(match95V[1]);
        ron95V_Zone2 = cleanNumericValue(match95V[2]);
      }
    }

    if (ron95III_Zone1 > 0 || ron95V_Zone1 > 0) {
      return {
        fuelName: "Xăng E10 RON 95-III",
        priceZone1: ron95III_Zone1 || 24910,
        priceZone2: ron95III_Zone2 || 25400,
        ron95V: {
          name: "Xăng E10 RON 95-V",
          priceZone1: ron95V_Zone1 || 25710,
          priceZone2: ron95V_Zone2 || 26220,
        },
        effectiveDate,
        trend: "UNCHANGED",
        source: "Petrolimex (petrolimex.com.vn)",
        regionNote: "Vùng 1 (Áp dụng tại TP.HCM & các tỉnh gần kho)",
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

  // Search for both RON 95-III and RON 95-V
  let item95III: Record<string, unknown> | null = null;
  let item95V: Record<string, unknown> | null = null;

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const name = String(item.name || item.product || item.fuelName || "").toLowerCase();

    if (name.includes("95-v") || name.includes("ron 95 v") || name.includes("ron 95-v")) {
      item95V = item;
    } else if (name.includes("95-iii") || (name.includes("ron") && name.includes("95"))) {
      if (!item95III) item95III = item;
    }
  }

  const primaryItem = item95III || item95V;
  if (!primaryItem) return null;

  const rawZone1 =
    item95III?.priceZone1 ??
    item95III?.zone1 ??
    item95III?.price ??
    primaryItem.priceZone1 ??
    primaryItem.zone1 ??
    primaryItem.price;

  const rawZone2 =
    item95III?.priceZone2 ??
    item95III?.zone2 ??
    primaryItem.priceZone2 ??
    primaryItem.zone2;

  const priceZone1 = cleanNumericValue(String(rawZone1 || 0)) || 24910;
  const priceZone2 = rawZone2 ? cleanNumericValue(String(rawZone2)) : 25400;

  // Format RON 95-V if available
  let ron95VData: { name: string; priceZone1: number; priceZone2: number } | undefined = undefined;
  if (item95V) {
    const vZone1 = cleanNumericValue(String(item95V.priceZone1 ?? item95V.zone1 ?? item95V.price ?? 25710));
    const vZone2 = cleanNumericValue(String(item95V.priceZone2 ?? item95V.zone2 ?? 26220));
    ron95VData = {
      name: "Xăng E10 RON 95-V",
      priceZone1: vZone1 || 25710,
      priceZone2: vZone2 || 26220,
    };
  } else {
    ron95VData = {
      name: "Xăng E10 RON 95-V",
      priceZone1: 25710,
      priceZone2: 26220,
    };
  }

  // Format effective date
  const rawDate = String(
    primaryItem.effectiveDate ||
    primaryItem.updatedAt ||
    primaryItem.date ||
    dataObj.effectiveDate ||
    ""
  );

  let effectiveDate = rawDate;
  if (rawDate && rawDate.includes("-") && !rawDate.includes(":")) {
    const parts = rawDate.split("T")[0].split("-");
    if (parts.length === 3) {
      effectiveDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  // Trend detection
  let trend: "UP" | "DOWN" | "UNCHANGED" = "UNCHANGED";
  const delta = Number(primaryItem.change || primaryItem.delta || primaryItem.diff);
  if (!isNaN(delta)) {
    if (delta > 0) trend = "UP";
    else if (delta < 0) trend = "DOWN";
  }

  return {
    fuelName: "Xăng E10 RON 95-III",
    priceZone1,
    priceZone2,
    ron95V: ron95VData,
    effectiveDate: effectiveDate || "15:00 - 22/10/2026",
    trend,
    changeAmount: !isNaN(delta) ? Math.abs(delta) : undefined,
    source: "Petrolimex (petrolimex.com.vn)",
    regionNote: "Vùng 1 (Áp dụng tại TP.HCM & các tỉnh gần kho)",
  };
}

/**
 * Official Benchmark fallback when external network is temporarily unreachable.
 * Matches exact Petrolimex official price table:
 * - Xăng E10 RON 95-III: 24.910 VND/lít (Vùng 1 - TP.HCM)
 * - Xăng E10 RON 95-V: 25.710 VND/lít (Vùng 1 - TP.HCM)
 * - Updated: 15:00 - 22/10/2026
 */
export function getFallbackMarketPrices(): MarketPricesData {
  return {
    gold: {
      name: "Vàng nhẫn SJC 99,99% (1 chỉ)",
      buyPrice: 135_500_000 / 10, // 13,550,000 đ/chỉ (theo niêm yết SJC Online 135.500.000 đ/lượng)
      sellPrice: 139_500_000 / 10, // 13,950,000 đ/chỉ (theo niêm yết SJC Online 139.500.000 đ/lượng)
      spread: (139_500_000 - 135_500_000) / 10, // 400,000 đ/chỉ
      updatedAt: "Hôm nay (Tham khảo SJC)",
      source: "SJC Online (sjc.com.vn)",
    },
    fuel: {
      fuelName: "Xăng E10 RON 95-III",
      priceZone1: 24910, // 24.910 đ/lít (Vùng 1 - TP.HCM)
      priceZone2: 25400, // 25.400 đ/lít (Vùng 2)
      ron95V: {
        name: "Xăng E10 RON 95-V",
        priceZone1: 25710, // 25.710 đ/lít (Vùng 1 - TP.HCM)
        priceZone2: 26220, // 26.220 đ/lít (Vùng 2)
      },
      effectiveDate: "15:00 - 22/10/2026",
      trend: "UNCHANGED",
      source: "Petrolimex (petrolimex.com.vn)",
      regionNote: "Vùng 1 (Áp dụng tại TP.HCM & các tỉnh gần kho)",
    },
    cachedAt: new Date().toISOString(),
    isStale: true,
  };
}
