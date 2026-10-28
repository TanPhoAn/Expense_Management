import { GoogleGenerativeAI } from "@google/generative-ai";
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
 * Initialize Gemini AI model if API key is present
 */
function getGeminiModel(modelName = "gemini-1.5-flash") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key" || apiKey.trim() === "") {
    return null;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });
}

/**
 * Parse user chat message using Gemini 1.5 Flash, with automatic fallback to NLP rules.
 */
export async function parseChatMessage(
  message: string,
  clientDate: string,
  categories: Category[]
): Promise<AIChatResponse> {
  const model = getGeminiModel();

  if (model) {
    try {
      const categoriesContext = categories
        .map((c) => `- ID: "${c.id}", Tên: "${c.name}", Loại: "${c.type}"`)
        .join("\n");

      const prompt = `Bạn là trợ lý tài chính thông minh PocketFlow chuyên quản lý thu chi cá nhân cho người Việt Nam.
Ngày hiện tại theo giờ Việt Nam: ${clientDate}.

Danh mục sẵn có của người dùng:
${categoriesContext}

Hãy phân tích câu chat sau đây của người dùng:
"${message}"

Nhiệm vụ:
1. Xác định ý định người dùng (action):
   - "CREATE_TRANSACTION": Nếu người dùng muốn ghi nhận một khoản chi tiêu hoặc thu nhập (vd: "hôm nay ăn cơm gà 40k", "đổ xăng 50k", "lương về 15tr").
   - "GENERAL_CHAT": Nếu là lời chào, hỏi thăm thông thường hoặc không liên quan đến thu chi.
2. Nếu là "CREATE_TRANSACTION":
   - "description": Tên món, dịch vụ hoặc nội dung chi tiêu rõ ràng, viết hoa chữ cái đầu (vd: "Ăn trưa cơm gà", "Đổ xăng", "Nhận lương tháng 10").
   - "amount": Số tiền nguyên bản VND dạng integer (lưu ý: 40k = 40000, 50 ngàn = 50000, 1.5tr = 1500000).
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

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text);

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

      return {
        action: parsed.action || "GENERAL_CHAT",
        replyMessage:
          parsed.replyMessage ||
          "Mình đã nghe! Bạn muốn ghi nhận chi tiêu gì hôm nay (ví dụ: 'Ăn trưa 40k')?",
      };
    } catch (err) {
      console.warn("Gemini API call failed, falling back to deterministic NLP parser:", err);
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
 * Scan receipt image using Gemini Vision OCR or heuristic fallback.
 */
export async function scanReceiptWithAI(
  imageBase64: string,
  mimeType = "image/jpeg",
  categories: Category[] = [],
  clientDate?: string
): Promise<AIReceiptScanResult> {
  const model = getGeminiModel();
  const today = clientDate || new Date().toISOString().split("T")[0];

  if (model) {
    try {
      const categoriesContext = categories.map((c) => c.name).join(", ");
      const prompt = `Bạn là chuyên gia phân tích hóa đơn, phiếu tính tiền, biên lai thanh toán tại Việt Nam.
Ngày hiện tại: ${today}.
Các danh mục có sẵn: ${categoriesContext}.

Hãy phân tích hình ảnh hóa đơn này và trích xuất thông tin dưới dạng JSON chuẩn:
1. "merchant": Tên cửa hàng, nhà hàng, quán ăn, siêu thị (hoặc chuỗi thương hiệu, ví dụ: "Highlands Coffee", "Cơm tấm Ba Ghiền", "WinMart").
2. "description": Tóm tắt các món ăn/thức uống hoặc mặt hàng chính trên hóa đơn (ví dụ: "Highlands Coffee - 2 Phin Sữa Đá", "Cơm tấm sườn bì chả").
3. "amount": TỔNG TIỀN THANH TOÁN CUỐI CÙNG (Grand Total) dạng integer số nguyên VND (loại bỏ mọi ký tự đ, VND, dấu chấm).
4. "date": Ngày in hóa đơn định dạng YYYY-MM-DD. Nếu không nhìn thấy rõ ngày, dùng "${today}".
5. "categoryName": Gợi ý danh mục phù hợp nhất từ danh sách trên (ví dụ: "Ăn uống", "Mua sắm", "Di chuyển").
6. "items": Danh sách món (nếu đọc được rõ) gồm name, quantity, price.

Trả về duy nhất định dạng JSON:
{
  "merchant": "Highlands Coffee",
  "description": "Highlands Coffee - 2 Phin Sữa Đá",
  "amount": 78000,
  "date": "${today}",
  "categoryName": "Ăn uống",
  "items": [
    { "name": "Phin Sữa Đá (L)", "quantity": 2, "price": 78000 }
  ]
}`;

      // Prepare image data part for Gemini Multimodal
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType,
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const text = result.response.text();
      const parsed = JSON.parse(text);

      const cleanedAmount = cleanOcrAmount(parsed.amount) || 0;

      return {
        merchant: parsed.merchant || undefined,
        description: parsed.description || parsed.merchant || "Hóa đơn thanh toán",
        amount: cleanedAmount,
        date: parsed.date || today,
        categoryName: parsed.categoryName || "Ăn uống",
        items: Array.isArray(parsed.items) ? parsed.items : undefined,
        confidence: cleanedAmount > 0 ? 0.95 : 0.6,
      };
    } catch (err) {
      console.warn("Gemini Vision OCR failed, using fallback:", err);
    }
  }

  // Graceful fallback when no key or network issue
  return {
    merchant: "Hóa đơn đã chụp",
    description: "Hóa đơn thanh toán",
    amount: 0,
    date: today,
    categoryName: "Ăn uống",
    confidence: 0.3,
  };
}
