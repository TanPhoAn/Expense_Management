import { describe, it, expect } from "vitest";
import { evaluatePasswordStrength } from "@/features/auth/components/PasswordStrengthMeter";

describe("evaluatePasswordStrength", () => {
  it("should evaluate empty or very short password as Rất yếu", () => {
    const res = evaluatePasswordStrength("");
    expect(res.score).toBe(0);
    expect(res.label).toBe("Rất yếu");
    expect(res.hasMinLength).toBe(false);
  });

  it("should evaluate simple 6-char lowercase password as Yếu", () => {
    const res = evaluatePasswordStrength("abcdef");
    expect(res.score).toBe(1);
    expect(res.label).toBe("Yếu");
    expect(res.hasMinLength).toBe(true);
    expect(res.hasNumber).toBe(false);
  });

  it("should evaluate password with length and numbers as Trung bình", () => {
    const res = evaluatePasswordStrength("abcdef123");
    expect(res.score).toBe(2);
    expect(res.label).toBe("Trung bình");
    expect(res.hasMinLength).toBe(true);
    expect(res.hasNumber).toBe(true);
  });

  it("should evaluate complex password with uppercase, number and special char as Mạnh", () => {
    const res = evaluatePasswordStrength("Abcdef123!@#");
    expect(res.score).toBe(4);
    expect(res.label).toBe("Mạnh");
    expect(res.hasMinLength).toBe(true);
    expect(res.hasNumber).toBe(true);
    expect(res.hasMixedCase).toBe(true);
    expect(res.hasSpecialChar).toBe(true);
  });
});
