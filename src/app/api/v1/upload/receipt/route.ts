import { getCurrentUser } from '@/lib/auth/session';
import { uploadReceiptToCloudinary } from '@/lib/cloudinary';
import { jsonError, jsonSuccess } from '@/lib/utils/response';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return jsonError('UNAUTHORIZED', 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.', undefined, 401);
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return jsonError('BAD_REQUEST', 'Vui lòng chọn tệp hình ảnh để tải lên.', undefined, 400);
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return jsonError(
        'BAD_REQUEST',
        'Định dạng ảnh không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.',
        undefined,
        400
      );
    }

    // Validate size limit
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return jsonError(
        'BAD_REQUEST',
        'Dung lượng ảnh vượt quá giới hạn 5MB. Vui lòng chọn ảnh nhỏ hơn.',
        undefined,
        400
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = (file as File).name || 'receipt.jpg';

    const uploadResult = await uploadReceiptToCloudinary(
      buffer,
      fileName,
      file.type,
      sessionUser.userId
    );

    return jsonSuccess(uploadResult, undefined, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Tải lên hình ảnh thất bại.';
    return jsonError('INTERNAL_ERROR', message, undefined, 500);
  }
}
