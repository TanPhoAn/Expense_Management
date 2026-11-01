import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/utils/response";
import { getGoldPriceHistory } from "@/features/market/services/marketPriceService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days");
    let days = 7;
    if (daysParam) {
      const parsed = parseInt(daysParam, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 30) {
        days = parsed;
      }
    }

    const data = await getGoldPriceHistory(days);
    return jsonSuccess(data);
  } catch (error) {
    console.error("Gold price history API error:", error);
    return jsonError("INTERNAL_ERROR", "Không thể lấy lịch sử giá vàng.", undefined, 500);
  }
}
