import 'server-only';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadReceiptResult {
  url: string;
  thumbnailUrl: string;
  publicId: string;
}

/**
 * Upload a receipt image buffer to Cloudinary in a user-scoped folder.
 * If Cloudinary credentials are not provided (e.g. in local development without keys),
 * gracefully creates a base64 data URL so functionality remains testable.
 */
export async function uploadReceiptToCloudinary(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  userId: string
): Promise<UploadReceiptResult> {
  const isCloudinaryConfigured =
    Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
    Boolean(process.env.CLOUDINARY_API_KEY) &&
    Boolean(process.env.CLOUDINARY_API_SECRET);

  if (!isCloudinaryConfigured) {
    console.warn(
      '⚠️ [Cloudinary] Environment variables not configured. Falling back to local data URI for testing.'
    );
    const base64 = fileBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;
    return {
      url: dataUri,
      thumbnailUrl: dataUri,
      publicId: `local-mock-${Date.now()}`,
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `pocketflow/receipts/${userId}`,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(error || new Error('Upload to Cloudinary failed'));
        }

        // Generate circular/avatar thumbnail transformation URL
        const thumbnailUrl = cloudinary.url(result.public_id, {
          transformation: [
            { width: 120, height: 120, crop: 'thumb', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
          secure: true,
        });

        resolve({
          url: result.secure_url,
          thumbnailUrl,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Helper to build an optimized thumbnail URL from any Cloudinary URL,
 * preserving non-Cloudinary URLs as-is.
 */
export function getOptimizedReceiptUrl(
  url?: string | null,
  type: 'thumbnail' | 'lightbox' = 'thumbnail'
): string | null {
  if (!url) return null;

  // If it's a Cloudinary URL, inject optimal transformation
  if (url.includes('res.cloudinary.com')) {
    const uploadIdx = url.indexOf('/upload/');
    if (uploadIdx !== -1) {
      const transform =
        type === 'thumbnail'
          ? '/upload/c_thumb,w_120,h_120,g_auto,q_auto,f_auto/'
          : '/upload/q_auto,f_auto/';
      return url.replace('/upload/', transform);
    }
  }

  return url;
}
