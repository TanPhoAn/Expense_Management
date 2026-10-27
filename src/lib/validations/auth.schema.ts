import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100, 'Tên tối đa 100 ký tự').trim(),
  email: z.string().email('Email không hợp lệ').toLowerCase().trim(),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(100, 'Mật khẩu tối đa 100 ký tự'),
});

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ').toLowerCase().trim(),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ').toLowerCase().trim(),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().email('Email không hợp lệ').toLowerCase().trim(),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Mã xác thực OTP phải gồm đúng 6 chữ số'),
    newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự').max(100, 'Mật khẩu tối đa 100 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận lại mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không trùng khớp',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự').max(100, 'Mật khẩu tối đa 100 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận lại mật khẩu mới'),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không trùng khớp',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
