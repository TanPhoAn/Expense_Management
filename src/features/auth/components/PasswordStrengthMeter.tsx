import React from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthMeterProps {
  password?: string;
}

export function evaluatePasswordStrength(password: string = ""): {
  score: number; // 0 to 4
  label: "Rất yếu" | "Yếu" | "Trung bình" | "Mạnh";
  colorClass: string;
  hasMinLength: boolean;
  hasNumber: boolean;
  hasMixedCase: boolean;
  hasSpecialChar: boolean;
} {
  const hasMinLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasMinLength) score += 1;
  if (hasNumber) score += 1;
  if (hasMixedCase) score += 1;
  if (hasSpecialChar) score += 1;

  let label: "Rất yếu" | "Yếu" | "Trung bình" | "Mạnh" = "Rất yếu";
  let colorClass = "bg-rose-500";

  if (score === 1) {
    label = "Yếu";
    colorClass = "bg-rose-500";
  } else if (score === 2) {
    label = "Trung bình";
    colorClass = "bg-amber-500";
  } else if (score >= 3) {
    label = "Mạnh";
    colorClass = "bg-emerald-500";
  }

  return {
    score,
    label,
    colorClass,
    hasMinLength,
    hasNumber,
    hasMixedCase,
    hasSpecialChar,
  };
}

export function PasswordStrengthMeter({ password = "" }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { score, label, colorClass, hasMinLength, hasNumber, hasMixedCase, hasSpecialChar } =
    evaluatePasswordStrength(password);

  return (
    <div className="space-y-2 pt-1 animate-in fade-in-0 duration-200">
      {/* Progress Bars */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              score >= bar ? colorClass : "bg-muted"
            }`}
          />
        ))}
        <span className="text-[11px] font-semibold text-muted-foreground ml-1.5 min-w-[65px] text-right font-mono">
          {label}
        </span>
      </div>

      {/* Criteria Checklist */}
      <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
        <div className={`flex items-center gap-1 ${hasMinLength ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}>
          {hasMinLength ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-muted-foreground/50" />}
          <span>Tối thiểu 6 ký tự</span>
        </div>
        <div className={`flex items-center gap-1 ${hasNumber ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}>
          {hasNumber ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-muted-foreground/50" />}
          <span>Có chữ số (0-9)</span>
        </div>
        <div className={`flex items-center gap-1 ${hasMixedCase ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}>
          {hasMixedCase ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-muted-foreground/50" />}
          <span>Chữ hoa & thường</span>
        </div>
        <div className={`flex items-center gap-1 ${hasSpecialChar ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}>
          {hasSpecialChar ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-muted-foreground/50" />}
          <span>Ký tự đặc biệt (!@#)</span>
        </div>
      </div>
    </div>
  );
}
