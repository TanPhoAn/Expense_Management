import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/utils/response";
import { getCategoriesForUser } from "@/features/categories/services/categoriesService";
import { scanReceiptWithAI } from "@/lib/ai/geminiClient";
import { getVietnamTodayString } from "@/lib/utils/date";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError("UNAUTHORIZED", "Chưa đăng nhập.", undefined, 401);
    }

    const contentType = req.headers.get("content-type") || "";
    let base64Data = "";
    let mimeType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return jsonError("BAD_REQUEST", "Thiếu tệp hình ảnh hóa đơn.", undefined, 400);
      }
      const buffer = await file.arrayBuffer();
      base64Data = Buffer.from(buffer).toString("base64");
      mimeType = file.type || "image/jpeg";
    } else {
      const body = await req.json();
      const dataUrl = body.dataUrl || body.imageBase64;
      if (!dataUrl) {
        return jsonError("BAD_REQUEST", "Thiếu dữ liệu hình ảnh (dataUrl).", undefined, 400);
      }
      if (dataUrl.includes(",")) {
        const [header, data] = dataUrl.split(",");
        const match = header.match(/:(.*?);/);
        mimeType = match ? match[1] : "image/jpeg";
        base64Data = data;
      } else {
        base64Data = dataUrl;
      }
    }

    const categories = await getCategoriesForUser(session.userId);
    const today = getVietnamTodayString();

    const scanResult = await scanReceiptWithAI(base64Data, mimeType, categories, today);

    return jsonSuccess(scanResult);
  } catch (error) {
    console.error("Receipt OCR scan error:", error);
    return jsonError("INTERNAL_ERROR", "Không thể phân tích hóa đơn.", undefined, 500);
  }
}
