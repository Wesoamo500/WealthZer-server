import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger('NotificationService');

  async sendEmail(to: string, subject: string, body: string) {
    // In a real app, use SendGrid/AWS SES
    this.logger.log(`[EMAIL SENT] To: ${to} | Subject: ${subject}`);
    this.logger.debug(`Body: ${body}`);
    return { success: true };
  }

  async sendSms(to: string, message: string) {
    // In a real app, use Twilio
    this.logger.log(`[SMS SENT] To: ${to} | Message: ${message}`);
    return { success: true };
  }

  async sendOtp(email: string, code: string) {
    return this.sendEmail(
      email,
      'WealthZer Verification Code',
      `Your 2FA code is: ${code}. It expires in 5 minutes.`
    );
  }
}
