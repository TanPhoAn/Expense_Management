import { MarketPricesData } from "@/types";
import {
  parseSjcGoldJson,
  parseSjcGoldXml,
  parseSjcGoldHtml,
  parsePetrolimexHtml,
  parseVietFuelData,
  getFallbackMarketPrices,
} from "./marketParsers";

// In-memory cache singleton
let cachedData: MarketPricesData | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Fetch SJC Gold Price from official SJC endpoints and live real-time mirrors.
 */
async function fetchSjcGoldPrice() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  // 1. Try real-time live JSON feed (giavang.now / SJC Ring SJ9999)
  try {
    const res = await fetch("https://giavang.now/api/prices", {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
      next: { revalidate: 900 },
    });

    if (res.ok) {
      const json = await res.json();
      const parsed = parseSjcGoldJson(json);
      if (parsed && parsed.buyPrice > 0) {
        clearTimeout(timeoutId);
        return parsed;
      }
    }
  } catch {
    // Continue to official SJC endpoints
  }

  // 2. Try SJC XML feed
  try {
    const res = await fetch("https://sjc.com.vn/xml/tygiavang.xml", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/xml, text/xml, */*",
      },
      signal: controller.signal,
      next: { revalidate: 900 },
    });

    if (res.ok) {
      const xml = await res.text();
      const parsed = parseSjcGoldXml(xml);
      if (parsed && parsed.buyPrice > 0) {
        clearTimeout(timeoutId);
        return parsed;
      }
    }
  } catch {
    // Continue to next source
  }

  // 3. Try SJC HTML page
  try {
    const res = await fetch("https://sjc.com.vn/gia-vang-online", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
      next: { revalidate: 900 },
    });

    if (res.ok) {
      const html = await res.text();
      const parsed = parseSjcGoldHtml(html);
      if (parsed && parsed.buyPrice > 0) {
        clearTimeout(timeoutId);
        return parsed;
      }
    }
  } catch {
    // Fall through to fallback
  } finally {
    clearTimeout(timeoutId);
  }

  return null;
}

/**
 * Fetch Gasoline Retail Prices via Petrolimex Official and VietFuel API.
 */
async function fetchFuelPrice() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  // 1. Try Petrolimex homepage directly
  try {
    const res = await fetch("https://www.petrolimex.com.vn/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
      next: { revalidate: 900 },
    });

    if (res.ok) {
      const html = await res.text();
      const parsed = parsePetrolimexHtml(html);
      if (parsed) {
        clearTimeout(timeoutId);
        return parsed;
      }
    }
  } catch {
    // Continue
  }

  // 2. Try VietFuel API endpoint
  const baseUrl =
    process.env.VIETFUEL_API_URL ||
    "https://vietfuel-api.tranqui.workers.dev/api/fuel-prices";

  try {
    const res = await fetch(baseUrl, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
      next: { revalidate: 900 },
    });

    if (res.ok) {
      const json = await res.json();
      const parsed = parseVietFuelData(json);
      if (parsed) {
        clearTimeout(timeoutId);
        return parsed;
      }
    }
  } catch {
    // Fall through
  } finally {
    clearTimeout(timeoutId);
  }

  return null;
}

/**
 * Get Consolidated Market Prices with 15-minute server cache.
 */
export async function getMarketPrices(forceRefresh = false): Promise<MarketPricesData> {
  const now = Date.now();

  if (!forceRefresh && cachedData && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedData;
  }

  const fallback = getFallbackMarketPrices();

  try {
    const [goldResult, fuelResult] = await Promise.allSettled([
      fetchSjcGoldPrice(),
      fetchFuelPrice(),
    ]);

    const gold =
      goldResult.status === "fulfilled" && goldResult.value
        ? goldResult.value
        : (cachedData?.gold || fallback.gold);

    const fuel =
      fuelResult.status === "fulfilled" && fuelResult.value
        ? fuelResult.value
        : (cachedData?.fuel || fallback.fuel);

    const isStale =
      (goldResult.status !== "fulfilled" || !goldResult.value) &&
      (fuelResult.status !== "fulfilled" || !fuelResult.value);

    cachedData = {
      gold,
      fuel,
      cachedAt: new Date().toISOString(),
      isStale,
    };
    lastFetchTime = now;

    return cachedData;
  } catch (error) {
    console.warn("Market prices fetch error, using fallback:", error);
    return cachedData || fallback;
  }
}
