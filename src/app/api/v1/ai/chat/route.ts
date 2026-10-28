import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/utils/response";
import { getCategoriesForUser } from "@/features/categories/services/categoriesService";
import { createTransaction, deleteTransaction } from "@/features/transactions/services/transactionsService";
import { parseChatMessage } from "@/lib/ai/geminiClient";
import { getVietnamTodayString } from "@/lib/utils/date";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError("UNAUTHORIZED", "Chưa đăng nhập.", undefined, 401);
    }

    const body = await req.json();
    const message = body.message?.trim();
    if (!message) {
      return jsonError("BAD_REQUEST", "Nội dung tin nhắn không được để trống.", undefined, 400);
    }

    const clientDate = body.clientDate || getVietnamTodayString();
    const categories = await getCategoriesForUser(session.userId);

    // Parse message with AI / Fallback
    const aiResult = await parseChatMessage(message, clientDate, categories);

    if (
      aiResult.action === "CREATE_TRANSACTION" &&
      aiResult.transaction &&
      aiResult.transaction.amount > 0
    ) {
      const tx = aiResult.transaction;

      // Match valid category with matching type
      let categoryId = tx.categoryId;
      const matchingCategory =
        categories.find((c) => c.id === categoryId && c.type === tx.type) ||
        categories.find((c) => c.type === tx.type);

      if (!matchingCategory) {
        return jsonError("NOT_FOUND", "Không tìm thấy danh mục phù hợp.", undefined, 404);
      }

      // Persist transaction directly into database
      const createdTx = await createTransaction(session.userId, {
        description: tx.description,
        amount: String(tx.amount),
        type: tx.type,
        categoryId: matchingCategory.id,
        transactionDate: tx.transactionDate,
        note: "Ghi chép tự động từ AI Chatbot",
      });

      return jsonSuccess({
        action: "CREATE_TRANSACTION",
        transaction: {
          ...createdTx,
          category: matchingCategory,
        },
        replyMessage: aiResult.replyMessage,
      });
    }

    return jsonSuccess({
      action: aiResult.action,
      replyMessage: aiResult.replyMessage,
    });
  } catch (error) {
    console.error("AI Chat route error:", error);
    return jsonError("INTERNAL_ERROR", "Lỗi xử lý tin nhắn AI.", undefined, 500);
  }
}

// DELETE: Undo / delete a transaction created via chat
export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return jsonError("UNAUTHORIZED", "Chưa đăng nhập.", undefined, 401);
    }

    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get("transactionId");
    if (!transactionId) {
      return jsonError("BAD_REQUEST", "Thiếu transactionId.", undefined, 400);
    }

    await deleteTransaction(session.userId, transactionId);
    return jsonSuccess({ deleted: true });
  } catch (error) {
    console.error("AI Chat delete error:", error);
    return jsonError("INTERNAL_ERROR", "Không thể xóa giao dịch.", undefined, 500);
  }
}
