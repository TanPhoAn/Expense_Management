import { z } from 'zod';
import { transactionTypeEnum } from './transaction.schema';

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Tên danh mục không được để trống')
    .max(100, 'Tên danh mục tối đa 100 ký tự')
    .trim(),
  type: transactionTypeEnum,
  icon: z.string().min(1, 'Biểu tượng không được để trống').default('Tag'),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Mã màu HEX không hợp lệ')
    .default('#64748b'),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
