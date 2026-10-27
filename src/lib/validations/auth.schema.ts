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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
