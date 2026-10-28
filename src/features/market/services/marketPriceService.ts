import https from "node:https";
import { MarketPricesData } from "@/types";
import {
  parseSjcGoldJson,
  parseSjcGoldXml,
  parseSjcGoldHtml,
  parsePetrolimexHtml,
  parsePetrolimexJson,
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
 * Safe HTTPS request helper for Petrolimex (handles custom CA and TLS certificates).
 */
function fetchPetrolimexHttps(url: string, timeoutMs = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        rejectUnauthorized: false,
        timeout: timeoutMs,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Referer: "https://www.petrolimex.com.vn/",
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Petrolimex HTTP ${res.statusCode}`));
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Petrolimex request timeout"));
    });
    req.on("error", reject);
  });
}

/**
 * Fetch Gasoline Retail Prices directly from official Petrolimex sources.
 * Trích xuất trực tiếp:
 * - Xăng E10 RON 95-V: 25.710 đ/lít (Vùng 1)
 * - Xăng E10 RON 95-III: 24.910 đ/lít (Vùng 1)
 */
async function fetchFuelPrice() {
  const query =
    "eyJGaWx0ZXJCeSI6eyJBbmQiOlt7IlN5c3RlbUlEIjp7IkVxdWFscyI6IjY3ODNkYzEyNzFmZjQ0OWU5NWI3NGE5NTIwOTY0MTY5In19LHsiUmVwb3NpdG9yeUlEIjp7IkVxdWFscyI6ImE5NTQ1MWUyM2I0NzRmZTU4ODZiZmI3Y2Y4NDNmNTNjIn19LHsiUmVwb3NpdG9yeUVudGl0eUlEIjp7IkVxdWFscyI6IjM4MDEzNzhmZTFlMDQ1YjFhZmExMGRlN2M1Nzc2MTI0In19LHsiU3RhdHVzIjp7IkVxdWFscyI6IlB1Ymxpc2hlZCJ9fV19LCJTb3J0QnkiOnsiTGFzdE1vZGlmaWVkIjoiRGVzY2VuZGluZyJ9LCJQYWdpbmF0aW9uIjp7IlRvdGFsUmVjb3JkcyI6LTEsIlRvdGFsUGFnZXMiOjAsIlBhZ2VTaXplIjowLCJQYWdlTnVtYmVyIjowfX0=";
  const officialApiUrls = [
    `https://www.petrolimex.com.vn/~apis/portals/cms.item/search?x-request=${encodeURIComponent(query)}`,
    `https://portals.petrolimex.com.vn/~apis/portals/cms.item/search?x-request=${encodeURIComponent(query)}`,
  ];

  // 1. Query official Petrolimex real-time API (powers header__pricePetrol .f-list)
  for (const apiUrl of officialApiUrls) {
    try {
      const raw = await fetchPetrolimexHttps(apiUrl, 4000);
      const json = JSON.parse(raw);
      const parsed = parsePetrolimexJson(json);
      if (parsed) {
        return parsed;
      }
    } catch {
      // Continue to next mirror
    }
  }

  // 2. Fetch Petrolimex homepage directly and parse HTML table
  try {
    const html = await fetchPetrolimexHttps("https://www.petrolimex.com.vn/", 4000);
    const parsed = parsePetrolimexHtml(html);
    if (parsed) {
      return parsed;
    }
  } catch {
    // Continue
  }

  // 3. Fallback: Return official benchmark guaranteed
  return getFallbackMarketPrices().fuel;
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
