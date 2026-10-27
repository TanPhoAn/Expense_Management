import { describe, it, expect } from 'vitest';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '@/lib/validations/auth.schema';
import { generateNumericOtp } from '@/lib/auth/passwordResetService';

describe('Phase 7 Auth Enhancement — Validation & Logic Tests', () => {
  describe('generateNumericOtp', () => {
    it('generates a 6-digit string', () => {
      for (let i = 0; i < 20; i++) {
        const otp = generateNumericOtp();
        expect(otp).toMatch(/^\d{6}$/);
        const num = parseInt(otp, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });
  });

  describe('forgotPasswordSchema', () => {
    it('accepts valid email', () => {
      const res = forgotPasswordSchema.safeParse({ email: 'user@example.com' });
      expect(res.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const res = forgotPasswordSchema.safeParse({ email: 'not-an-email' });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.errors[0].message).toContain('Email không hợp lệ');
      }
    });
  });

  describe('resetPasswordSchema', () => {
    it('accepts valid reset payload with matching passwords', () => {
      const res = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        code: '123456',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      });
      expect(res.success).toBe(true);
    });

    it('rejects OTP code not 6 digits', () => {
      const res1 = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        code: '12345', // 5 digits
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      });
      expect(res1.success).toBe(false);

      const res2 = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        code: '1234567', // 7 digits
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      });
      expect(res2.success).toBe(false);

      const res3 = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        code: 'abcdef', // letters
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      });
      expect(res3.success).toBe(false);
    });

    it('rejects passwords shorter than 6 characters', () => {
      const res = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        code: '123456',
        newPassword: '123',
        confirmPassword: '123',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.errors[0].message).toContain('ít nhất 6 ký tự');
      }
    });

    it('rejects non-matching confirmPassword', () => {
      const res = resetPasswordSchema.safeParse({
        email: 'user@example.com',
        code: '123456',
        newPassword: 'passwordA',
        confirmPassword: 'passwordB',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.errors[0].message).toContain('không trùng khớp');
      }
    });
  });

  describe('changePasswordSchema', () => {
    it('accepts valid change password payload', () => {
      const res = changePasswordSchema.safeParse({
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword456',
        confirmPassword: 'newPassword456',
      });
      expect(res.success).toBe(true);
    });

    it('rejects if newPassword is identical to currentPassword', () => {
      const res = changePasswordSchema.safeParse({
        currentPassword: 'samePassword123',
        newPassword: 'samePassword123',
        confirmPassword: 'samePassword123',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.errors[0].message).toContain('không được trùng');
      }
    });

    it('rejects if confirmPassword does not match newPassword', () => {
      const res = changePasswordSchema.safeParse({
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'differentPassword',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.errors[0].message).toContain('không trùng khớp');
      }
    });
  });
});
