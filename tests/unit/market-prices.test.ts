import { describe, it, expect } from "vitest";
import {
  normalizeGoldPricePerChi,
  cleanNumericValue,
  parseSjcGoldJson,
  parseSjcGoldXml,
  parseSjcGoldHtml,
  parsePetrolimexHtml,
  parsePetrolimexJson,
  formatPetrolimexDate,
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
    it("extracts SJC 99.99% gold ring from SJC table HTML matching official website row", () => {
      const sampleHtml = `
      <table>
        <tr>
          <td>VÀNG NHẪN SJC 99,99% 1 CHỈ, 2 CHỈ, 5 CHỈ</td>
          <td>135,500,000</td>
          <td>139,500,000</td>
        </tr>
      </table>`;

      const result = parseSjcGoldHtml(sampleHtml);
      expect(result).not.toBeNull();
      expect(result?.buyPrice).toBe(13_550_000);
      expect(result?.sellPrice).toBe(13_950_000);
      expect(result?.spread).toBe(400_000);
    });

    it("extracts SJC 99.99% gold ring from SJC table HTML with dot formatting", () => {
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

  describe("parsePetrolimexJson", () => {
    it("extracts E10 RON 95-V and E10 RON 95-III directly from Petrolimex official Portal CMS API payload", () => {
      const payload = {
        Objects: [
          { Title: "Dầu hỏa 2-K", Zone1Price: 30050, Zone2Price: 30650 },
          { Title: "Xăng E10 RON 95-V", Zone1Price: 25710, Zone2Price: 26220, LastModified: "2026-10-22T07:52:54.709Z" },
          { Title: "Xăng E10 RON 95-III", Zone1Price: 24910, Zone2Price: 25400, LastModified: "2026-10-22T07:53:23.9Z" },
          { Title: "Xăng E5 RON 92", Zone1Price: 25060, Zone2Price: 25560 },
        ],
      };

      const result = parsePetrolimexJson(payload);
      expect(result).not.toBeNull();
      expect(result?.ron95V?.name).toBe("Xăng E10 RON 95-V");
      expect(result?.ron95V?.priceZone1).toBe(25710);
      expect(result?.ron95V?.priceZone2).toBe(26220);
      expect(result?.priceZone1).toBe(24910);
      expect(result?.priceZone2).toBe(25400);
      expect(result?.effectiveDate).toContain("22/10/2026");
      expect(result?.source).toContain("Petrolimex");
    });

    it("returns null for empty or invalid JSON payload", () => {
      expect(parsePetrolimexJson(null)).toBeNull();
      expect(parsePetrolimexJson({})).toBeNull();
      expect(parsePetrolimexJson({ Objects: [] })).toBeNull();
    });
  });

  describe("formatPetrolimexDate", () => {
    it("formats ISO date with UTC+7 adjustment to official Petrolimex timestamp", () => {
      // 07:52 UTC = 14:52 UTC+7 -> rounds to 15:00 - 22/10/2026
      const formatted = formatPetrolimexDate("2026-10-22T07:52:54.709Z");
      expect(formatted).toBe("15:00 - 22/10/2026");
    });
  });

  describe("parsePetrolimexHtml", () => {
    it("extracts both E10 RON 95-V (25.710) and E10 RON 95-III (24.910) from header__pricePetrol f-list table", () => {
      const samplePetrolimexHtml = `
      <div class="header__pricePetrol">
        <a href="#" class="f-btn">Giá bán lẻ xăng dầu</a>
        <div class="f-list">
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Vùng 1</th>
                <th>Vùng 2</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><a href="/xang-e10-ron-95-v">Xăng E10 RON 95-V</a></td>
                <td>25.710</td>
                <td>26.220</td>
              </tr>
              <tr>
                <td><a href="/xang-e10-ron-95-iii">Xăng E10 RON 95-III</a></td>
                <td>24.910</td>
                <td>25.400</td>
              </tr>
            </tbody>
          </table>
          <p class="f-info">Giá của Petrolimex cập nhật lúc 15:00 - 22/10/2026</p>
        </div>
      </div>`;

      const result = parsePetrolimexHtml(samplePetrolimexHtml);
      expect(result).not.toBeNull();
      expect(result?.ron95V).toBeDefined();
      expect(result?.ron95V?.name).toBe("Xăng E10 RON 95-V");
      expect(result?.ron95V?.priceZone1).toBe(25710);
      expect(result?.ron95V?.priceZone2).toBe(26220);
      expect(result?.priceZone1).toBe(24910);
      expect(result?.priceZone2).toBe(25400);
      expect(result?.effectiveDate).toBe("15:00 - 22/10/2026");
      expect(result?.regionNote).toContain("Vùng 1");
    });

    it("parses prices via regex fallback if table markup is stripped", () => {
      const plainText = `
        Petrolimex cập nhật lúc 15:00 - 22/10/2026
        Xăng E10 RON 95-V: 25.710 đồng (vùng 1) 26.220 đồng (vùng 2)
        Xăng E10 RON 95-III: 24.910 đồng (vùng 1) 25.400 đồng (vùng 2)
      `;

      const result = parsePetrolimexHtml(plainText);
      expect(result).not.toBeNull();
      expect(result?.priceZone1).toBe(24910);
      expect(result?.priceZone2).toBe(25400);
      expect(result?.ron95V?.priceZone1).toBe(25710);
      expect(result?.ron95V?.priceZone2).toBe(26220);
    });

    it("returns null for empty or non-petrolimex HTML", () => {
      expect(parsePetrolimexHtml("")).toBeNull();
      expect(parsePetrolimexHtml("<div>No fuel data here</div>")).toBeNull();
    });
  });

  describe("getFallbackMarketPrices", () => {
    it("returns stable benchmark data with isStale=true", () => {
      const fallback = getFallbackMarketPrices();
      expect(fallback).toBeDefined();
      expect(fallback.isStale).toBe(true);
      expect(fallback.gold.buyPrice).toBe(13_550_000);
      expect(fallback.gold.sellPrice).toBe(13_950_000);
      expect(fallback.fuel.priceZone1).toBe(24910);
      expect(fallback.fuel.priceZone2).toBe(25400);
      expect(fallback.fuel.ron95V?.priceZone1).toBe(25710);
      expect(fallback.fuel.ron95V?.priceZone2).toBe(26220);
    });
  });
});
