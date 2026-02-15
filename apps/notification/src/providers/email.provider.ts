import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificationProvider } from './notification-provider.interface';

@Injectable()
export class EmailProvider implements NotificationProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    console.log(`[EmailProvider] Initializing with host: ${smtpHost}, port: ${smtpPort}`);
    
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async send(options: { to: string; subject: string; message: string }): Promise<{ success: boolean; messageId?: string; error?: any }> {
    console.log(`[EmailProvider] Attempting to send email to ${options.to}`);
    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_FROM', '"WealthZer" <noreply@wealthzer.com>'),
        to: options.to,
        subject: options.subject,
        html: options.message,
      });

      this.logger.log(`Email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Error sending email: ${error.message}`, error.stack);
      return { success: false, error };
    }
  }
}
