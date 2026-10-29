import { describe, it, expect } from "vitest";
import {
  parseVietnameseCurrency,
  cleanOcrAmount,
  resolveVietnameseDate,
  detectTransactionType,
  extractCleanDescription,
  matchBestCategory,
  parseNaturalLanguageTransaction,
} from "@/lib/ai/nlpParser";
import { Category } from "@/types";

describe("AI Natural Language Parser & Receipt OCR Sanitizer (Phase 15)", () => {
  describe("Vietnamese Number & Currency Multipliers", () => {
    it("should parse 'k' shorthand correctly", () => {
      expect(parseVietnameseCurrency("40k")).toBe(40000);
      expect(parseVietnameseCurrency("ăn trưa 40k")).toBe(40000);
      expect(parseVietnameseCurrency("cơm gà 40 k")).toBe(40000);
      expect(parseVietnameseCurrency("đổ xăng 55K")).toBe(55000);
      expect(parseVietnameseCurrency("mua bánh 12.5k")).toBe(12500);
    });

    it("should parse 'ngàn' / 'nghìn' shorthand correctly", () => {
      expect(parseVietnameseCurrency("50 ngàn")).toBe(50000);
      expect(parseVietnameseCurrency("50 nghìn")).toBe(50000);
      expect(parseVietnameseCurrency("uống cà phê 35 ngàn")).toBe(35000);
      expect(parseVietnameseCurrency("100 nghìn đồng")).toBe(100000);
    });

    it("should parse 'tr' / 'triệu' shorthand with decimals correctly", () => {
      expect(parseVietnameseCurrency("1.5tr")).toBe(1500000);
      expect(parseVietnameseCurrency("1,5 triệu")).toBe(1500000);
      expect(parseVietnameseCurrency("lương 15 triệu")).toBe(15000000);
      expect(parseVietnameseCurrency("mua điện thoại 12tr")).toBe(12000000);
    });

    it("should parse compound millions shorthand like '2tr5'", () => {
      expect(parseVietnameseCurrency("mua tai nghe 2tr5")).toBe(2500000);
      expect(parseVietnameseCurrency("2tr500")).toBe(2500000);
    });

    it("should parse formatted numbers with dots/commas and plain digits", () => {
      expect(parseVietnameseCurrency("120.000")).toBe(120000);
      expect(parseVietnameseCurrency("120,000")).toBe(120000);
      expect(parseVietnameseCurrency("120000")).toBe(120000);
      expect(parseVietnameseCurrency("tiền nhà 3.500.000 đ")).toBe(3500000);
    });

    it("should return null when no amount is present", () => {
      expect(parseVietnameseCurrency("hôm nay đi dạo")).toBeNull();
      expect(parseVietnameseCurrency("xin chào bot")).toBeNull();
    });
  });

  describe("Receipt OCR Data Sanitizer", () => {
    it("should clean string numbers with currency symbols into integer VND", () => {
      expect(cleanOcrAmount("40.000đ")).toBe(40000);
      expect(cleanOcrAmount("VND 85,000")).toBe(85000);
      expect(cleanOcrAmount("Tổng cộng: 125.000 VND")).toBe(125000);
      expect(cleanOcrAmount("Total: 78,000")).toBe(78000);
      expect(cleanOcrAmount("135k")).toBe(135000);
      expect(cleanOcrAmount(95000)).toBe(95000);
    });

    it("should safely return null for invalid or empty OCR amount inputs", () => {
      expect(cleanOcrAmount("")).toBeNull();
      expect(cleanOcrAmount("Không có số tiền")).toBeNull();
      expect(cleanOcrAmount(0)).toBeNull();
    });
  });

  describe("Relative Date Resolution (Asia/Ho_Chi_Minh)", () => {
    const fixedBaseDate = "2026-10-28";

    it("should resolve 'hôm nay' to the base date", () => {
      expect(resolveVietnameseDate("hôm nay ăn trưa 40k", fixedBaseDate)).toBe("2026-10-28");
      expect(resolveVietnameseDate("bữa nay đổ xăng 50k", fixedBaseDate)).toBe("2026-10-28");
    });

    it("should resolve 'hôm qua' to baseDate - 1 day", () => {
      expect(resolveVietnameseDate("hôm qua uống trà sữa 35k", fixedBaseDate)).toBe("2026-10-27");
      expect(resolveVietnameseDate("qua đi ăn lẩu 200k", fixedBaseDate)).toBe("2026-10-27");
    });

    it("should resolve 'hôm kia' to baseDate - 2 days", () => {
      expect(resolveVietnameseDate("hôm kia mua sắm 500k", fixedBaseDate)).toBe("2026-10-26");
    });

    it("should resolve explicit dates formatted as DD/MM or DD/MM/YYYY", () => {
      expect(resolveVietnameseDate("ngày 25/10 ăn tối 150k", fixedBaseDate)).toBe("2026-10-25");
      expect(resolveVietnameseDate("15/09/2026 mua vé máy bay 1tr2", fixedBaseDate)).toBe(
        "2026-09-15"
      );
    });
  });

  describe("Transaction Type & Category Mapping", () => {
    const mockCategories: Category[] = [
      {
        id: "cat_food",
        userId: "u1",
        name: "Ăn uống",
        type: "EXPENSE",
        isDefault: true,
        icon: "utensils",
        color: "#f43f5e",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cat_transport",
        userId: "u1",
        name: "Di chuyển",
        type: "EXPENSE",
        isDefault: true,
        icon: "car",
        color: "#0ea5e9",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cat_shopping",
        userId: "u1",
        name: "Mua sắm",
        type: "EXPENSE",
        isDefault: true,
        icon: "shopping-bag",
        color: "#8b5cf6",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cat_bills",
        userId: "u1",
        name: "Hóa đơn",
        type: "EXPENSE",
        isDefault: true,
        icon: "file-text",
        color: "#f97316",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cat_salary",
        userId: "u1",
        name: "Lương",
        type: "INCOME",
        isDefault: true,
        icon: "wallet",
        color: "#10b981",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cat_bonus",
        userId: "u1",
        name: "Thưởng",
        type: "INCOME",
        isDefault: true,
        icon: "gift",
        color: "#f59e0b",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("should detect EXPENSE for general spending", () => {
      expect(detectTransactionType("đi ăn cơm gà 40k")).toBe("EXPENSE");
      expect(detectTransactionType("đổ xăng 50k")).toBe("EXPENSE");
    });

    it("should detect INCOME for earnings and salaries", () => {
      expect(detectTransactionType("nhận tiền thưởng dự án 2 triệu")).toBe("INCOME");
      expect(detectTransactionType("ting ting lúa về lương tháng 15tr")).toBe("INCOME");
    });

    it("should clean description text removing amount and filler words", () => {
      expect(extractCleanDescription("hôm nay tui đi ăn trưa cơm gà 40k")).toBe("Cơm gà");
      expect(extractCleanDescription("vừa đổ xăng 50k")).toBe("Đổ xăng");
    });

    it("should match best category based on keywords", () => {
      const catFood = matchBestCategory("cơm gà", "EXPENSE", mockCategories);
      expect(catFood?.name).toBe("Ăn uống");

      const catTransport = matchBestCategory("xăng xe", "EXPENSE", mockCategories);
      expect(catTransport?.name).toBe("Di chuyển");

      const catBonus = matchBestCategory("tiền thưởng", "INCOME", mockCategories);
      expect(catBonus?.name).toBe("Thưởng");
    });

    it("should classify real-world object photos and activities into correct categories (Multimodal Vision Heuristics)", () => {
      // Food & Drink items (đồ ăn, nước uống)
      expect(matchBestCategory("Cà phê phin sữa đá", "EXPENSE", mockCategories)?.name).toBe("Ăn uống");
      expect(matchBestCategory("Đĩa cơm sườn bì chả", "EXPENSE", mockCategories)?.name).toBe("Ăn uống");
      expect(matchBestCategory("Tô bún bò Huế", "EXPENSE", mockCategories)?.name).toBe("Ăn uống");
      expect(matchBestCategory("Trà đào cam sả", "EXPENSE", mockCategories)?.name).toBe("Ăn uống");

      // Transport & Fuel items (xe cộ, đi lại, đổ xăng)
      expect(matchBestCategory("Đổ xăng xe máy", "EXPENSE", mockCategories)?.name).toBe("Di chuyển");
      expect(matchBestCategory("Cây xăng Petrolimex", "EXPENSE", mockCategories)?.name).toBe("Di chuyển");
      expect(matchBestCategory("Chuyến GrabCar đi làm", "EXPENSE", mockCategories)?.name).toBe("Di chuyển");
      expect(matchBestCategory("Vé gửi xe tòa nhà", "EXPENSE", mockCategories)?.name).toBe("Di chuyển");

      // Shopping items (quần áo, giày dép, siêu thị)
      expect(matchBestCategory("Áo thun polo đen", "EXPENSE", mockCategories)?.name).toBe("Mua sắm");
      expect(matchBestCategory("Quần jean baggy", "EXPENSE", mockCategories)?.name).toBe("Mua sắm");
      expect(matchBestCategory("Giày chạy bộ", "EXPENSE", mockCategories)?.name).toBe("Mua sắm");
      expect(matchBestCategory("Mua đồ siêu thị WinMart", "EXPENSE", mockCategories)?.name).toBe("Mua sắm");

      // Bills & Utilities (hóa đơn, tiện ích)
      expect(matchBestCategory("Hóa đơn tiền điện", "EXPENSE", mockCategories)?.name).toBe("Hóa đơn");
      expect(matchBestCategory("Tiền nước sinh hoạt", "EXPENSE", mockCategories)?.name).toBe("Hóa đơn");
      expect(matchBestCategory("Cước mạng internet wifi", "EXPENSE", mockCategories)?.name).toBe("Hóa đơn");
    });

    it("should assemble full parsed natural language transaction", () => {
      const result = parseNaturalLanguageTransaction(
        "hôm qua tui đi ăn trưa cơm gà 40k",
        "2026-10-28",
        mockCategories
      );

      expect(result.amount).toBe(40000);
      expect(result.type).toBe("EXPENSE");
      expect(result.transactionDate).toBe("2026-10-27");
      expect(result.categoryName).toBe("Ăn uống");
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });
});
