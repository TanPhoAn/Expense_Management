import { NextRequest } from "next/server";
import { jsonSuccess, jsonError } from "@/lib/utils/response";
import { getMarketPrices } from "@/features/market/services/marketPriceService";

export const dynamic = "force-dynamic";
export const revalidate = 900; // 15 minutes edge revalidation

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    const data = await getMarketPrices(forceRefresh);

    return jsonSuccess(data, undefined, 200);
  } catch (error) {
    console.error("Market prices API route error:", error);
    return jsonError("INTERNAL_ERROR", "Không thể tải dữ liệu giá thị trường.", undefined, 500);
  }
}
