"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  X,
  Loader2,
  Undo2,
  CheckCircle2,
  Bot,
  User,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/utils/currency";
import { formatVNDate, getVietnamTodayString } from "@/lib/utils/date";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatTransactionData {
  id: string;
  description: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  transactionDate: string;
  category?: {
    id: string;
    name: string;
    color?: string;
  };
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  transaction?: ChatTransactionData;
  isUndone?: boolean;
  timestamp: Date;
}

const QUICK_SUGGESTIONS = [
  "Ăn trưa cơm gà 40k",
  "Cà phê sữa đá 35k",
  "Đổ xăng 60k",
  "Lương tháng 10 15tr",
];

export function FloatingAIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Xin chào! Mình là trợ lý AI PocketFlow. Bạn chỉ cần nhắn tự nhiên như *'Ăn trưa cơm gà 40k'* hay *'Đổ xăng 50k'*, mình sẽ tự động bóc tách và lưu vào hệ thống nhé!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Handle sending message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isSubmitting) return;

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          clientDate: getVietnamTodayString(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Không thể xử lý tin nhắn.");
      }

      const { action, transaction, replyMessage } = json.data;

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: "ai",
        text: replyMessage || "Đã xử lý thông tin của bạn!",
        transaction: action === "CREATE_TRANSACTION" ? transaction : undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      // If a transaction was created, broadcast event to update Dashboard, Charts, and Calendar
      if (action === "CREATE_TRANSACTION" && transaction) {
        window.dispatchEvent(new CustomEvent("pocketflow:transaction-created"));
        toast.success(`Đã lưu: ${transaction.description} (${formatVND(transaction.amount)})`);
      }
    } catch (err: unknown) {
      console.error("Chatbot send error:", err);
      const errMsg = err instanceof Error ? err.message : "Có lỗi xảy ra khi trò chuyện với AI.";
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          sender: "ai",
          text: `⚠️ ${errMsg}`,
          timestamp: new Date(),
        },
      ]);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Undo (Delete transaction created via chat)
  const handleUndo = async (transactionId: string, messageId: string) => {
    setUndoingId(transactionId);
    try {
      const res = await fetch(`/api/v1/ai/chat?transactionId=${transactionId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Không thể hoàn tác giao dịch.");
      }

      // Mark message transaction as undone
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isUndone: true } : m))
      );

      window.dispatchEvent(new CustomEvent("pocketflow:transaction-created"));
      toast.info("Đã hoàn tác và xóa giao dịch khỏi hệ thống.");
    } catch (err: unknown) {
      console.error("Undo error:", err);
      toast.error("Không thể hoàn tác giao dịch.");
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 right-4 sm:right-6 z-40">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20 select-none animate-in fade-in"
            title="Mở Trợ lý Chat AI"
          >
            <div className="relative">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-indigo-600" />
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-wide">
              Chat ghi chép AI
            </span>
          </button>
        )}
      </div>

      {/* Expandable Chat Drawer / Panel */}
      {isOpen && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 right-3 sm:right-6 z-50 w-[94vw] sm:w-[400px] h-[520px] max-h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px))] bg-background border border-border/80 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0 select-none shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs sm:text-sm leading-tight">
                    Trợ lý AI PocketFlow
                  </h3>
                  <Badge className="bg-white/25 text-white hover:bg-white/30 text-[9px] px-1.5 py-0 border-0">
                    Gemini Flash
                  </Badge>
                </div>
                <p className="text-[10px] text-white/80">
                  Nhận diện tiếng Việt & lưu giao dịch tức thì
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-full w-8 h-8 cursor-pointer"
              title="Đóng chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-muted/20 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex gap-2 max-w-[88%]",
                  m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                {/* Avatar Icon */}
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold shadow-xs",
                    m.sender === "user"
                      ? "bg-slate-700"
                      : "bg-gradient-to-br from-indigo-500 to-purple-600"
                  )}
                >
                  {m.sender === "user" ? (
                    <User className="w-3.5 h-3.5" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  )}
                </div>

                {/* Message Bubble & Content */}
                <div className="space-y-1.5 overflow-hidden">
                  <div
                    className={cn(
                      "p-3 rounded-2xl leading-relaxed shadow-xs break-words",
                      m.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-xs"
                        : "bg-card text-card-foreground border border-border/60 rounded-tl-xs"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>

                  {/* Interactive Transaction Confirmation Card */}
                  {m.transaction && (
                    <div
                      className={cn(
                        "p-3 rounded-xl border bg-card/90 shadow-md transition-all space-y-2",
                        m.isUndone ? "opacity-60 bg-muted/40" : "border-emerald-500/40"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2
                            className={cn(
                              "w-4 h-4",
                              m.isUndone ? "text-muted-foreground" : "text-emerald-500"
                            )}
                          />
                          <span className="font-bold text-xs truncate">
                            {m.transaction.description}
                          </span>
                        </div>
                        <Badge
                          variant={m.transaction.type === "INCOME" ? "income" : "expense"}
                          className="text-[9px] px-1.5 py-0 shrink-0"
                        >
                          {m.transaction.type === "INCOME" ? "Thu nhập" : "Chi tiêu"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                        <span
                          className={cn(
                            "font-extrabold text-sm",
                            m.transaction.type === "INCOME"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {m.transaction.type === "INCOME" ? "+" : "-"}
                          {formatVND(m.transaction.amount)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatVNDate(m.transaction.transactionDate, "short")}
                        </span>
                      </div>

                      {/* Undo Action */}
                      {!m.isUndone ? (
                        <div className="pt-1 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={undoingId === m.transaction.id}
                            onClick={() => handleUndo(m.transaction!.id, m.id)}
                            className="h-6 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 rounded-md gap-1 cursor-pointer"
                          >
                            {undoingId === m.transaction.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Undo2 className="w-3 h-3" />
                            )}
                            <span>Hoàn tác (Xóa)</span>
                          </Button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic text-right">
                          Đã hoàn tác giao dịch này
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isSubmitting && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mr-auto p-2 bg-card border rounded-xl animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>AI đang phân tích & ghi chép...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-3 py-2 bg-muted/40 border-t flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
              Gợi ý:
            </span>
            {QUICK_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSendMessage(s)}
                disabled={isSubmitting}
                className="text-[10px] bg-background hover:bg-accent border rounded-full px-2.5 py-1 text-foreground whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input & Send Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-background border-t flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập: ăn trưa 40k, đổ xăng 50k..."
              disabled={isSubmitting}
              className="flex-1 bg-muted/50 border border-input rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isSubmitting}
              className="h-8 w-8 rounded-xl bg-primary hover:bg-primary/90 text-white shrink-0 cursor-pointer"
              title="Gửi tin nhắn"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
