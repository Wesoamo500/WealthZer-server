import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
  ) {
    console.log('[NotificationService] Initialized');
  }

  async sendEmail(to: string, subject: string, body: string) {
    return this.emailProvider.send({ to, subject, message: body });
  }

  async sendSms(to: string, message: string) {
    return this.smsProvider.send({ to, message });
  }

  async sendOtp(email: string, code: string) {
    const htmlBody = this.getOtpTemplate(code);
    return this.sendEmail(email, 'WealthZer Verification Code', htmlBody);
  }

  private getOtpTemplate(code: string): string {
    const digits = code.split('');
    const digitBoxes = digits
      .map(
        (d) => `
      <div style="display: inline-block; width: 45px; height: 60px; line-height: 60px; font-size: 32px; font-weight: bold; color: #FFCC00; background-color: #2D2D2D; border-radius: 8px; margin: 0 4px; text-align: center; border-bottom: 3px solid #FFCC00;">
        ${d}
      </div>
    `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; background-color: #121212; color: #FFFFFF; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #1A1A1A; text-align: center; border-radius: 12px; }
          .logo { margin-bottom: 30px; }
          .title { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .description { color: #A0A0A0; font-size: 16px; margin-bottom: 30px; line-height: 1.5; }
          .otp-container { margin-bottom: 30px; }
          .expiry-box { display: inline-block; background-color: #262615; border: 1px solid #3d3d1f; color: #FFCC00; padding: 12px 20px; border-radius: 8px; font-size: 14px; margin-bottom: 30px; }
          .footer { padding-top: 30px; border-top: 1px solid #333333; color: #666666; font-size: 12px; }
          .footer a { color: #666666; text-decoration: none; margin: 0 10px; }
          .secure-link { color: #FFCC00; font-weight: bold; text-decoration: none; display: block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
             <div style="background-color: #FFCC00; width: 40px; height: 40px; border-radius: 8px; display: inline-block; vertical-align: middle; position: relative;">
                <div style="position: absolute; top: 12px; left: 10px; width: 20px; height: 16px; border: 2px solid #000; border-radius: 4px;"></div>
                <div style="position: absolute; top: 18px; left: 24px; width: 4px; height: 4px; background-color: #000; border-radius: 50%;"></div>
             </div>
             <span style="font-size: 24px; font-weight: bold; color: #FFFFFF; vertical-align: middle; margin-left: 10px;">wealth<span style="color: #FFCC00;">Zer</span></span>
          </div>
          
          <div class="title">Verification Code</div>
          <p class="description">Please use the following 6-digit code to verify your login attempt.</p>
          
          <div class="otp-container">
            ${digitBoxes}
          </div>
          
          <div class="expiry-box">
            <span style="margin-right: 8px;">⏱️</span> This code will expire in 10 minutes.
          </div>
          
          <div style="border-top: 1px solid #333333; margin: 30px 0;"></div>
          
          <p style="color: #666666; font-size: 14px; margin-bottom: 5px;">Didn't request this code?</p>
          <a href="#" class="secure-link">Secure your account immediately →</a>
          
          <div class="footer">
            <div style="margin-bottom: 20px;">
              <span style="font-size: 18px; margin: 0 10px;">❓</span>
              <span style="font-size: 18px; margin: 0 10px;">🛡️</span>
              <span style="font-size: 18px; margin: 0 10px;">🌐</span>
            </div>
            <p>© 2026 wealthZer Global Inc. All rights reserved.</p>
            <p>
              <a href="#">Privacy Policy</a> • 
              <a href="#">Terms of Service</a> • 
              <a href="#">Support Center</a>
            </p>
            <p style="margin-top: 20px; font-size: 11px;">This is an automated security notification. Please do not reply to this email. To ensure security, never share your verification code with anyone.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
