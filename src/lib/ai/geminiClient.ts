import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { Category } from "@/types";
import {
  parseNaturalLanguageTransaction,
  cleanOcrAmount,
  ParsedTransactionResult,
} from "./nlpParser";
import { formatVND } from "@/lib/utils/currency";

export interface AIChatResponse {
  action: "CREATE_TRANSACTION" | "QUERY_SPENDING" | "GENERAL_CHAT";
  transaction?: ParsedTransactionResult;
  replyMessage: string;
}

export interface AIReceiptScanResult {
  merchant?: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  categoryName?: string;
  items?: Array<{ name: string; quantity?: number; price?: number }>;
  confidence: number;
}

/**
 * Prioritized list of Gemini models.
 * Automatically tries available models in order.
 */
const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
];

/**
 * Strips markdown code fences (```json ... ```) from Gemini raw text.
 */
function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
  }
  return cleaned.trim();
}

/**
 * Execute Gemini prompt with automatic model fallback across candidate models.
 */
async function generateContentWithFallback(
  contents: string | Array<string | Part>
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key" || apiKey.trim() === "") {
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent(contents);
      const text = result.response.text();
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (err: unknown) {
      console.warn(`Gemini model [${modelName}] failed, trying next candidate:`, err instanceof Error ? err.message : err);
    }
  }

  return null;
}

/**
 * Parse user chat message using Gemini, with automatic fallback to NLP rules.
 */
export async function parseChatMessage(
  message: string,
  clientDate: string,
  categories: Category[]
): Promise<AIChatResponse> {
  const categoriesContext = categories
    .map((c) => `- ID: "${c.id}", Tên: "${c.name}", Loại: "${c.type}"`)
    .join("\n");

  const prompt = `Bạn là trợ lý tài chính thông minh PocketFlow chuyên quản lý thu chi cá nhân cho người Việt Nam.
Ngày hiện tại theo giờ Việt Nam: ${clientDate}.

Danh mục sẵn có của người dùng:
${categoriesContext}

Hãy phân tích câu chat sau đây của người dùng:
"${message}"

Lưu ý đặc biệt về ngôn ngữ đời thường & tiếng lóng tiền tệ Việt Nam:
- Bạn có năng lực hiểu mọi cách nói khẩu ngữ, tiếng lóng (Gen Z, địa phương, nói tắt) của người Việt:
  + Đơn vị ngàn: "k", "ka", "cành", "xu", "chục" (4 chục = 40.000), "lít" / "lốp" (1 lít = 100.000, 2 lít = 200.000), "xị" (1 xị = 100.000), "trăm rưỡi" = 150.000, "hai trăm rưỡi" = 250.000.
  + Đơn vị triệu: "tr", "triệu", "củ", "chai", "vé" (1 củ = 1.000.000, 1 củ 2 = 1.200.000, 2 củ rưỡi / 2 củ 5 = 2.500.000, nửa củ = 500.000, 3 chai = 3.000.000).
  + Từ viết tắt & ngữ cảnh: "cf" / "cà phê", "trà sữa", "đổ xăng", "bún bò", "cơm gà", "bắn tiền", "nhận lương", "ting ting".
- Hãy tự động chuyển đổi mọi từ lóng, tiếng đệm sang số tiền nguyên bản integer (VND) một cách thông minh và linh hoạt nhất.

Nhiệm vụ:
1. Xác định ý định người dùng (action):
   - "CREATE_TRANSACTION": Nếu người dùng muốn ghi nhận một khoản chi tiêu hoặc thu nhập (vd: "hôm nay ăn cơm gà 40 ka", "đổ xăng 50k", "lương về 15tr").
   - "GENERAL_CHAT": Nếu là lời chào, hỏi thăm thông thường hoặc không liên quan đến thu chi.
2. Nếu là "CREATE_TRANSACTION":
   - "description": Tên món, dịch vụ hoặc nội dung chi tiêu rõ ràng, viết hoa chữ cái đầu (vd: "Ăn trưa cơm gà", "Đổ xăng", "Nhận lương tháng 10").
   - "amount": Số tiền nguyên bản VND dạng integer (lưu ý: 40 ka = 40000, 60ka = 60000, 50 ngàn = 50000, 1.5tr = 1500000).
   - "type": "EXPENSE" (chi tiêu) hoặc "INCOME" (thu nhập).
   - "categoryId": Chọn ID danh mục khớp nhất từ danh sách trên (phải đúng type). Nếu không có, để null.
   - "categoryName": Tên danh mục đã chọn.
   - "transactionDate": Định dạng YYYY-MM-DD. Dựa vào "${clientDate}" để suy ra (hôm nay, hôm qua, v.v.).
   - "replyMessage": Câu phản hồi tự nhiên, vui vẻ bằng tiếng Việt báo cho người dùng biết đã ghi nhận.
3. Nếu là "GENERAL_CHAT":
   - "replyMessage": Câu trả lời thân thiện, hướng dẫn người dùng cách ghi chép chi tiêu (vd: "Bạn có thể gõ 'Ăn trưa 40k' hoặc 'Đổ xăng 50k' để mình ghi lại nhé!").

Trả về ĐÚNG cấu trúc JSON sau (không kèm markdown ngoài):
{
  "action": "CREATE_TRANSACTION",
  "transaction": {
    "description": "Ăn trưa cơm gà",
    "amount": 40000,
    "type": "EXPENSE",
    "categoryId": "...",
    "categoryName": "Ăn uống",
    "transactionDate": "${clientDate}"
  },
  "replyMessage": "Đã lưu khoản chi Ăn trưa cơm gà với số tiền 40.000 ₫ vào danh mục Ăn uống!"
}`;

  const rawText = await generateContentWithFallback(prompt);

  if (rawText) {
    try {
      const cleanJson = cleanJsonText(rawText);
      const parsed = JSON.parse(cleanJson);

      if (parsed.action === "CREATE_TRANSACTION" && parsed.transaction?.amount > 0) {
        return {
          action: "CREATE_TRANSACTION",
          transaction: {
            description: parsed.transaction.description || "Chi tiêu",
            amount: parseInt(String(parsed.transaction.amount), 10) || 0,
            type: parsed.transaction.type === "INCOME" ? "INCOME" : "EXPENSE",
            transactionDate: parsed.transaction.transactionDate || clientDate,
            categoryId: parsed.transaction.categoryId || undefined,
            categoryName: parsed.transaction.categoryName || undefined,
            confidence: 0.95,
          },
          replyMessage:
            parsed.replyMessage ||
            `Đã ghi nhận ${parsed.transaction.description} (${formatVND(parsed.transaction.amount)})!`,
        };
      }

      if (parsed.action === "GENERAL_CHAT") {
        return {
          action: "GENERAL_CHAT",
          replyMessage:
            parsed.replyMessage ||
            "Mình đã nghe! Bạn muốn ghi nhận chi tiêu gì hôm nay (ví dụ: 'Ăn trưa 40k')?",
        };
      }
    } catch (parseErr) {
      console.warn("JSON parse error from Gemini text:", parseErr, rawText);
    }
  }

  // Fallback to deterministic NLP parser
  const parsedLocal = parseNaturalLanguageTransaction(message, clientDate, categories);

  if (parsedLocal.amount > 0) {
    return {
      action: "CREATE_TRANSACTION",
      transaction: parsedLocal,
      replyMessage: `Đã tự động nhận diện: **${parsedLocal.description}** với số tiền **${formatVND(
        parsedLocal.amount
      )}** (${parsedLocal.categoryName || "Chưa phân loại"})!`,
    };
  }

  return {
    action: "GENERAL_CHAT",
    replyMessage:
      "Chào bạn! Hãy nhắn cho mình khoản chi tiêu của bạn nhé (ví dụ: *'Ăn trưa cơm gà 40k'*, *'Đổ xăng 50k'* hoặc *'Lương 15tr'*).",
  };
}

/**
 * Scan receipt or real-world expense object image using Gemini Vision OCR or heuristic fallback.
 */
export async function scanReceiptWithAI(
  imageBase64: string,
  mimeType = "image/jpeg",
  categories: Category[] = [],
  clientDate?: string
): Promise<AIReceiptScanResult> {
  const today = clientDate || new Date().toISOString().split("T")[0];
  const categoriesContext = categories.map((c) => c.name).join(", ");

  const prompt = `Bạn là chuyên gia thị giác máy tính và phân tích chi tiêu tài chính thông minh (Multimodal Financial Vision Specialist) tại Việt Nam.
Ngày hiện tại: ${today}.
Danh sách danh mục khả dụng của người dùng: [${categoriesContext}].

Hình ảnh người dùng chụp có thể thuộc một trong hai dạng:
1. HÓA ĐƠN / BIÊN LAI / PHIẾU TÍNH TIỀN / VÉ XE / MÀN HÌNH CHUYỂN KHOẢN (POS, Receipt, Bill, Invoice).
2. HOẶC ĐỒ VẬT / DỊCH VỤ / BỮA ĂN THỰC TẾ mà người dùng vừa chi tiền mua hoặc sử dụng:
   - Đồ ăn, đĩa cơm, tô phở, bún, bánh mì, ly cà phê, trà sữa, chai nước, bàn ăn -> Danh mục "Ăn uống" (hoặc tên tương đương trong danh sách).
   - Xe máy, ô tô, cây xăng, đổ xăng/dầu, vé cầu đường, bãi đỗ xe, chuyến Grab/Be -> Danh mục "Di chuyển" (hoặc "Đi lại").
   - Quần áo, giày dép, mỹ phẩm, phụ kiện, thiết bị điện tử, đồ gia dụng, gói hàng siêu thị -> Danh mục "Mua sắm".
   - Hóa đơn điện, nước, internet, truyền hình, phí nhà -> Danh mục "Hóa đơn & Tiện ích".
   - Vé xem phim, khu vui chơi, du lịch, thể thao, game -> Danh mục "Giải trí".
   - Thuốc men, khám bệnh, nha khoa, tập gym -> Danh mục "Sức khỏe".

Nhiệm vụ của bạn:
1. "categoryName": Xác định và chọn CHÍNH XÁC một danh mục phù hợp nhất từ danh sách [${categoriesContext}].
2. "description": Tóm tắt ngắn gọn mô tả chi tiêu hoặc tên đồ vật / dịch vụ (ví dụ: "Cà phê muối", "Cơm sườn bì chả", "Đổ xăng xe máy", "Áo thun polo", "Highlands Coffee - 2 Phin Sữa Đá").
3. "merchant": Tên thương hiệu, nhà hàng hoặc cửa hàng (nếu nhận diện được logo/biển hiệu hoặc tên trên hóa đơn).
4. "amount": Nếu là hóa đơn có ghi rõ số tiền, trích xuất TỔNG TIỀN THANH TOÁN (integer VND, loại bỏ mọi ký tự đ, dấu chấm). Nếu là ảnh chụp đồ vật không có giá tiền in, trả về 0 (để người dùng tự nhập).
5. "date": Ngày giao dịch YYYY-MM-DD (nếu không có ngày trên ảnh, dùng "${today}").

Trả về DUY NHẤT một đối tượng JSON:
{
  "merchant": "Highlands Coffee",
  "description": "Cà phê phin sữa đá",
  "amount": 35000,
  "date": "${today}",
  "categoryName": "Ăn uống"
}`;

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType,
    },
  };

  const rawText = await generateContentWithFallback([prompt, imagePart]);

  if (rawText) {
    try {
      const cleanJson = cleanJsonText(rawText);
      const parsed = JSON.parse(cleanJson);
      const cleanedAmount = cleanOcrAmount(parsed.amount) || 0;

      return {
        merchant: parsed.merchant || undefined,
        description: parsed.description || parsed.merchant || "Chi tiêu qua camera",
        amount: cleanedAmount,
        date: parsed.date || today,
        categoryName: parsed.categoryName || "Ăn uống",
        items: Array.isArray(parsed.items) ? parsed.items : undefined,
        confidence: cleanedAmount > 0 ? 0.95 : 0.7,
      };
    } catch (parseErr) {
      console.warn("JSON parse error from Gemini Vision OCR:", parseErr, rawText);
    }
  }

  // Graceful fallback when no key or network issue
  return {
    merchant: "Ảnh chụp chi tiêu",
    description: "Chi tiêu ghi nhận từ camera",
    amount: 0,
    date: today,
    categoryName: "Ăn uống",
    confidence: 0.3,
  };
}

export interface HealthInsightsInput {
  month: string;
  income: number;
  expense: number;
  score: number;
  gradeLabel: string;
  topCategories: Array<{ name: string; amount: number; percentage: number }>;
  overspentCategories: Array<{ name: string; overspentAmount: number }>;
}

export interface HealthInsightsOutput {
  highlight: string;
  warning: string;
  recommendation: string;
}

export async function generateFinancialHealthInsights(
  input: HealthInsightsInput
): Promise<HealthInsightsOutput> {
  const { month, income, expense, score, gradeLabel, topCategories, overspentCategories } = input;

  const prompt = `Bạn là cố vấn tài chính cá nhân Fintech chuyên nghiệp tại Việt Nam.
Hãy phân tích dữ liệu tài chính tháng ${month} của người dùng ứng dụng PocketFlow:
- Điểm sức khỏe tài chính: ${score}/100 (Xếp loại: ${gradeLabel})
- Tổng thu nhập: ${formatVND(income)}
- Tổng chi tiêu: ${formatVND(expense)}
- Top danh mục chi nhiều nhất: ${
    topCategories.length > 0
      ? topCategories.map((c) => `${c.name} (${formatVND(c.amount)} - ${c.percentage}%)`).join(", ")
      : "Chưa có"
  }
- Danh mục vượt trần ngân sách: ${
    overspentCategories.length > 0
      ? overspentCategories.map((c) => `${c.name} (vượt ${formatVND(c.overspentAmount)})`).join(", ")
      : "Không có danh mục nào bị vượt"
  }

Yêu cầu trả về DUY NHẤT một chuỗi JSON chuẩn (không kèm markdown ngoài) theo cấu trúc:
{
  "highlight": "1 câu khen ngợi điểm sáng hoặc thói quen tích cực nhận thấy trong tháng",
  "warning": "1 câu cảnh báo súc tích về danh mục ngốn nhiều tiền hoặc nguy cơ bội chi",
  "recommendation": "1 câu khuyên hành động thực tế, cụ thể để tháng tới tối ưu dòng tiền"
}`;

  const rawText = await generateContentWithFallback([prompt]);

  if (rawText) {
    try {
      const cleanJson = cleanJsonText(rawText);
      const parsed = JSON.parse(cleanJson);
      if (parsed.highlight && parsed.warning && parsed.recommendation) {
        return {
          highlight: String(parsed.highlight).trim(),
          warning: String(parsed.warning).trim(),
          recommendation: String(parsed.recommendation).trim(),
        };
      }
    } catch (parseErr) {
      console.warn("JSON parse error from Gemini Health Insights:", parseErr, rawText);
    }
  }

  // Deterministic Fallback based on financial metrics
  let fallbackHighlight = "Bạn đang chủ động theo dõi và ghi chép chi tiêu để quản lý tài chính chuẩn mực.";
  if (score >= 85) {
    fallbackHighlight = `Xuất sắc! Dòng tiền tháng ${month} thặng dư tốt, bạn đang giữ kỷ luật tiết kiệm tuyệt vời.`;
  } else if (score >= 70) {
    fallbackHighlight = "Tỷ lệ chi tiêu duy trì ổn định trong vùng an toàn so với thu nhập.";
  }

  let fallbackWarning = "Các khoản chi nhỏ lẻ phát sinh hàng ngày có thể tích tụ thành số tiền lớn.";
  if (overspentCategories.length > 0) {
    fallbackWarning = `Có ${overspentCategories.length} danh mục đã vượt trần ngân sách (${overspentCategories.map((c) => c.name).join(", ")}).`;
  } else if (expense > income) {
    fallbackWarning = "Tổng chi tiêu tháng này đang lớn hơn thu nhập, cảnh báo nguy cơ thâm hụt số dư.";
  } else if (topCategories[0] && topCategories[0].percentage > 45) {
    fallbackWarning = `Danh mục ${topCategories[0].name} đang chiếm tới ${topCategories[0].percentage}% tổng chi tiêu của bạn.`;
  }

  let fallbackRecommendation = "Áp dụng quy tắc 50/30/20: trích tối thiểu 20% thu nhập vào quỹ tiết kiệm ngay khi nhận lương.";
  if (overspentCategories.length > 0) {
    fallbackRecommendation = "Hãy cân nhắc hạ bớt tần suất ăn ngoài hoặc mua sắm để kéo ngân sách về mức an toàn.";
  } else if (score >= 80) {
    fallbackRecommendation = "Duy trì phong độ hiện tại và trích phần tiền nhàn rỗi gửi tiết kiệm tích lũy sinh lời.";
  }

  return {
    highlight: fallbackHighlight,
    warning: fallbackWarning,
    recommendation: fallbackRecommendation,
  };
}
