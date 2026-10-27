import 'server-only';
import { Resend } from 'resend';

export interface SendOtpEmailParams {
  to: string;
  name?: string | null;
  otpCode: string;
  expiresInMinutes?: number;
}

/**
 * Send OTP Verification Email for Password Reset.
 * If RESEND_API_KEY is configured, sends via Resend API.
 * In development or when no key is provided, logs cleanly to console.
 */
export async function sendPasswordResetEmail({
  to,
  name,
  otpCode,
  expiresInMinutes = 15,
}: SendOtpEmailParams): Promise<{ success: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'PocketFlow <onboarding@resend.dev>';
  const userName = name || 'Bạn';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .logo { display: inline-flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 24px; }
          .badge { display: inline-block; background: #10b981; color: white; width: 32px; height: 32px; border-radius: 8px; line-height: 32px; text-align: center; font-weight: bold; }
          .title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }
          .otp-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
          .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0f172a; font-family: monospace; }
          .warning { font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 16px; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <span class="badge">P</span>
            <span>PocketFlow</span>
          </div>
          <div class="title">Xin chào ${userName},</div>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản PocketFlow của bạn.
            Vui lòng sử dụng mã xác thực (OTP) dưới đây để tiếp tục:
          </p>

          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
          </div>

          <p class="warning">
            ⏱ Mã xác thực này có hiệu lực trong vòng <strong>${expiresInMinutes} phút</strong>.<br/>
            🔒 <strong>Lưu ý an toàn:</strong> Không chia sẻ mã này với bất kỳ ai. Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể yên tâm bỏ qua email này.
          </p>

          <div class="footer">
            PocketFlow — Quản Lý Chi Tiêu Cá Nhân Thông Minh<br/>
            Email tự động, vui lòng không phản hồi.
          </div>
        </div>
      </body>
    </html>
  `;

  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const response = await resend.emails.send({
        from: fromEmail,
        to,
        subject: `[PocketFlow] Mã xác nhận đặt lại mật khẩu: ${otpCode}`,
        html: htmlContent,
      });

      return { success: true, id: response.data?.id };
    } catch (error) {
      console.error('❌ Failed to send email via Resend:', error);
      // Fallback log
      console.log(`[PocketFlow Email Fallback] Sent OTP ${otpCode} to ${to}`);
      return { success: false };
    }
  }

  // Development simulation log
  console.log('--------------------------------------------------');
  console.log(`[DEVELOPMENT EMAIL] To: ${to}`);
  console.log(`[DEVELOPMENT EMAIL] PocketFlow OTP: ${otpCode} (Expires in ${expiresInMinutes}m)`);
  console.log('--------------------------------------------------');
  return { success: true, id: 'dev-simulation-id' };
}
