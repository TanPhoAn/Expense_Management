import 'server-only';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { eq, and, desc, gt, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, passwordResetTokens } from '@/lib/db/schema';
import { sendPasswordResetEmail } from '@/lib/email';

const OTP_EXPIRY_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Generate a cryptographically secure 6-digit numeric OTP.
 */
export function generateNumericOtp(): string {
  const number = crypto.randomInt(100000, 1000000);
  return number.toString();
}

/**
 * Request password reset:
 * - Anti-enumeration: returns generic success even if email is not found.
 * - Cooldown rate limit: prevents spamming requests within 60 seconds.
 * - Stores hashed OTP in database with expiration.
 * - Dispatches email.
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

  // Anti-enumeration: If user does not exist, return success immediately
  if (!user) {
    return {
      success: true,
      message: 'Nếu email tồn tại trong hệ thống, mã xác nhận đã được gửi đến hộp thư của bạn.',
    };
  }

  // Check cooldown for latest active token
  const now = new Date();
  const [latestToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)))
    .orderBy(desc(passwordResetTokens.createdAt))
    .limit(1);

  if (latestToken) {
    const timeSinceCreated = (now.getTime() - new Date(latestToken.createdAt).getTime()) / 1000;
    if (timeSinceCreated < RESEND_COOLDOWN_SECONDS) {
      const waitSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - timeSinceCreated);
      throw new Error(`Vui lòng chờ ${waitSeconds} giây trước khi yêu cầu gửi lại mã mới.`);
    }
  }

  // Generate OTP and compute hash
  const otpCode = generateNumericOtp();
  const hashedCode = await bcrypt.hash(otpCode, 10);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any older unused tokens for this user
  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));

  // Insert new token
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    code: hashedCode,
    expiresAt,
    attempts: 0,
  });

  // Dispatch email
  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    otpCode,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
  });

  return {
    success: true,
    message: 'Mã xác nhận đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư (hoặc mục Spam).',
  };
}

/**
 * Verify OTP and reset password:
 * - Checks code matching and expiration.
 * - Enforces max 5 attempts.
 * - Hashes new password with bcrypt (salt 12).
 * - Marks token as used.
 */
export async function resetPasswordWithOtp(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (!user) {
    throw new Error('Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
  }

  const now = new Date();

  // Find valid unexpired, unused token
  const [tokenRecord] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, user.id),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now)
      )
    )
    .orderBy(desc(passwordResetTokens.createdAt))
    .limit(1);

  if (!tokenRecord) {
    throw new Error('Mã xác thực không tồn tại hoặc đã hết hiệu lực. Vui lòng yêu cầu mã mới.');
  }

  // Check attempt limit
  if (tokenRecord.attempts >= MAX_ATTEMPTS) {
    // Invalidate token
    await db.update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, tokenRecord.id));
    throw new Error('Bạn đã nhập sai mã xác nhận quá 5 lần. Vui lòng yêu cầu mã mới.');
  }

  // Verify OTP
  const isMatch = await bcrypt.compare(code, tokenRecord.code);
  if (!isMatch) {
    const updatedAttempts = tokenRecord.attempts + 1;
    await db
      .update(passwordResetTokens)
      .set({ attempts: updatedAttempts })
      .where(eq(passwordResetTokens.id, tokenRecord.id));

    const remaining = MAX_ATTEMPTS - updatedAttempts;
    if (remaining <= 0) {
      await db.update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, tokenRecord.id));
      throw new Error('Bạn đã nhập sai mã xác nhận quá 5 lần. Vui lòng yêu cầu mã mới.');
    }

    throw new Error(`Mã xác thực không chính xác. Bạn còn ${remaining} lần thử.`);
  }

  // Hash new password with 12 rounds
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Update password in Neon DB
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  // Mark token as used
  await db.update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, tokenRecord.id));

  return {
    success: true,
    message: 'Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập ngay bây giờ.',
  };
}

/**
 * Change password for authenticated user:
 * - Checks current password against persisted passwordHash.
 * - Rejects if current password does not match.
 * - Updates password with bcrypt salt 12.
 */
export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new Error('Người dùng không tồn tại.');
  }

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new Error('Mật khẩu hiện tại không chính xác.');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

  return {
    success: true,
    message: 'Đổi mật khẩu thành công.',
  };
}
