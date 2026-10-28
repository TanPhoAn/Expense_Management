import { describe, it, expect } from "vitest";
import {
  normalizeGoldPricePerChi,
  cleanNumericValue,
  parseSjcGoldJson,
  parseSjcGoldXml,
  parseSjcGoldHtml,
  parseVietFuelData,
  getFallbackMarketPrices,
} from "@/features/market/services/marketParsers";

describe("Market Prices Parsers & Normalization", () => {
  describe("normalizeGoldPricePerChi", () => {
    it("converts thousand-per-lượng values (e.g. 88,500) to VND per 1 chỉ", () => {
      // 88,500 thousand VND / lượng = 88,500,000 / 10 = 8,850,000 VND / chỉ
      expect(normalizeGoldPricePerChi(88_500)).toBe(8_850_000);
      expect(normalizeGoldPricePerChi(135_500)).toBe(13_550_000);
    });

    it("converts thousand-per-chỉ values (e.g. 8,850) to VND per 1 chỉ", () => {
      // 8,850 thousand VND / chỉ = 8,850,000 VND / chỉ
      expect(normalizeGoldPricePerChi(8_850)).toBe(8_850_000);
      expect(normalizeGoldPricePerChi(13_550)).toBe(13_550_000);
    });

    it("converts full VND per lượng values (e.g. 88,500,000) to VND per 1 chỉ", () => {
      expect(normalizeGoldPricePerChi(88_500_000)).toBe(8_850_000);
      expect(normalizeGoldPricePerChi(142_700_000)).toBe(14_270_000);
    });

    it("keeps already normalized VND per chỉ values intact", () => {
      expect(normalizeGoldPricePerChi(8_850_000)).toBe(8_850_000);
    });

    it("safely handles 0, negative or NaN values", () => {
      expect(normalizeGoldPricePerChi(0)).toBe(0);
      expect(normalizeGoldPricePerChi(-100)).toBe(0);
      expect(normalizeGoldPricePerChi(NaN)).toBe(0);
    });
  });

  describe("cleanNumericValue", () => {
    it("parses multiple thousand dots correctly", () => {
      expect(cleanNumericValue("8.850.000")).toBe(8850000);
    });

    it("parses multiple thousand commas correctly", () => {
      expect(cleanNumericValue("8,850,000")).toBe(8850000);
    });

    it("parses string with currency labels and whitespace", () => {
      expect(cleanNumericValue(" 21.540 đ/lít ")).toBe(21540);
      expect(cleanNumericValue("88.500 VND")).toBe(88500);
    });

    it("handles empty or invalid strings", () => {
      expect(cleanNumericValue("")).toBe(0);
      expect(cleanNumericValue("N/A")).toBe(0);
    });
  });

  describe("parseSjcGoldJson", () => {
    it("extracts SJC 99.99% gold ring (SJ9999) from live JSON feed", () => {
      const payload = {
        success: true,
        timestamp: 1793223000,
        time: "04:30",
        date: "2026-10-29",
        prices: {
          DOJINHTV: { name: "DOJI Jewelry", buy: 137600000, sell: 141600000 },
          SJ9999: { name: "SJC Ring", buy: 135500000, sell: 139500000 },
        },
      };

      const result = parseSjcGoldJson(payload);
      expect(result).not.toBeNull();
      expect(result?.name).toBe("Vàng nhẫn SJC 99,99% (1 chỉ)");
      expect(result?.buyPrice).toBe(13_550_000);
      expect(result?.sellPrice).toBe(13_950_000);
      expect(result?.spread).toBe(400_000);
      expect(result?.updatedAt).toContain("04:30");
    });

    it("returns null for empty or invalid json payload", () => {
      expect(parseSjcGoldJson(null)).toBeNull();
      expect(parseSjcGoldJson({})).toBeNull();
    });
  });

  describe("parseSjcGoldXml", () => {
    it("extracts SJC 99.99% gold ring prices from official SJC XML format", () => {
      const sampleXml = `<?xml version="1.0" encoding="utf-8"?>
<root>
  <title>Tỷ giá vàng</title>
  <ratelist unit="nghìn đồng/lượng" updated="28/10/2026 15:30:00">
    <city name="Hồ Chí Minh">
      <item type="Vàng SJC 1L, 10L, 1KG" buy="88,500" sell="89,800" />
      <item type="Vàng nhẫn SJC 99,99 1 chỉ, 2 chỉ, 5 chỉ" buy="87,500" sell="88,800" />
      <item type="Nữ trang 99.99%" buy="86,000" sell="87,500" />
    </city>
  </ratelist>
</root>`;

      const result = parseSjcGoldXml(sampleXml);
      expect(result).not.toBeNull();
      expect(result?.name).toBe("Vàng nhẫn SJC 99,99% (1 chỉ)");
      expect(result?.buyPrice).toBe(8_750_000);
      expect(result?.sellPrice).toBe(8_880_000);
      expect(result?.spread).toBe(130_000);
      expect(result?.updatedAt).toBe("28/10/2026 15:30:00");
    });

    it("falls back to SJC 1L if gold ring is missing in XML", () => {
      const sampleXml = `
<root>
  <ratelist updated="28/10/2026 09:00:00">
    <city name="Hà Nội">
      <item type="Vàng SJC 1L" buy="88,000" sell="89,500" />
    </city>
  </ratelist>
</root>`;

      const result = parseSjcGoldXml(sampleXml);
      expect(result).not.toBeNull();
      expect(result?.buyPrice).toBe(8_800_000);
      expect(result?.sellPrice).toBe(8_950_000);
      expect(result?.spread).toBe(150_000);
    });

    it("returns null for malformed or empty XML", () => {
      expect(parseSjcGoldXml("")).toBeNull();
      expect(parseSjcGoldXml("<root><empty/></root>")).toBeNull();
    });
  });

  describe("parseSjcGoldHtml", () => {
    it("extracts SJC 99.99% gold ring from SJC table HTML", () => {
      const sampleHtml = `
      <table class="table-price">
        <tr>
          <th>Loại vàng</th>
          <th>Giá mua</th>
          <th>Giá bán</th>
        </tr>
        <tr>
          <td>Vàng SJC 1L - 10L</td>
          <td>88.500.000</td>
          <td>89.800.000</td>
        </tr>
        <tr>
          <td>Vàng nhẫn SJC 99,99% (1 chỉ, 2 chỉ, 5 chỉ)</td>
          <td>87.500.000</td>
          <td>88.800.000</td>
        </tr>
      </table>`;

      const result = parseSjcGoldHtml(sampleHtml);
      expect(result).not.toBeNull();
      expect(result?.buyPrice).toBe(8_750_000);
      expect(result?.sellPrice).toBe(8_880_000);
      expect(result?.spread).toBe(130_000);
    });

    it("returns null when HTML does not contain matching table rows", () => {
      expect(parseSjcGoldHtml("<div>No gold table</div>")).toBeNull();
    });
  });

  describe("parseVietFuelData", () => {
    it("extracts E10 RON 95-III gasoline from VietFuel payload", () => {
      const payload = {
        status: "success",
        effectiveDate: "2026-10-24",
        data: [
          {
            name: "Xăng E5 RON 92-II",
            price: 19800,
            zone2: 20190,
            unit: "VNĐ/lít",
          },
          {
            name: "Xăng E10 RON 95-III",
            price: 21540,
            zone2: 21970,
            change: -180,
            effectiveDate: "2026-10-24",
          },
          {
            name: "Dầu Diesel 0.05S-II",
            price: 18200,
            zone2: 18560,
          },
        ],
      };

      const result = parseVietFuelData(payload);
      expect(result).not.toBeNull();
      expect(result?.fuelName).toBe("Xăng E10 RON 95-III");
      expect(result?.priceZone1).toBe(21540);
      expect(result?.priceZone2).toBe(21970);
      expect(result?.trend).toBe("DOWN");
      expect(result?.changeAmount).toBe(180);
      expect(result?.effectiveDate).toBe("24/10/2026");
    });

    it("matches standard RON 95-III if E10 prefix is not explicitly in name", () => {
      const payload = [
        {
          product: "Xăng RON 95-III",
          priceZone1: 21650,
          priceZone2: 22080,
          delta: 120,
        },
      ];

      const result = parseVietFuelData(payload);
      expect(result).not.toBeNull();
      expect(result?.fuelName).toContain("RON 95-III");
      expect(result?.priceZone1).toBe(21650);
      expect(result?.priceZone2).toBe(22080);
      expect(result?.trend).toBe("UP");
      expect(result?.changeAmount).toBe(120);
    });

    it("returns null for empty or invalid fuel payload", () => {
      expect(parseVietFuelData(null)).toBeNull();
      expect(parseVietFuelData({})).toBeNull();
      expect(parseVietFuelData({ data: [] })).toBeNull();
    });
  });

  describe("getFallbackMarketPrices", () => {
    it("returns stable benchmark data with isStale=true", () => {
      const fallback = getFallbackMarketPrices();
      expect(fallback).toBeDefined();
      expect(fallback.isStale).toBe(true);
      expect(fallback.gold.buyPrice).toBeGreaterThan(0);
      expect(fallback.gold.sellPrice).toBeGreaterThan(fallback.gold.buyPrice);
      expect(fallback.fuel.priceZone1).toBeGreaterThan(0);
      expect(fallback.fuel.priceZone2).toBeGreaterThan(fallback.fuel.priceZone1);
    });
  });
});
