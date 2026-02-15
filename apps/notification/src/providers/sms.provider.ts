import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider } from './notification-provider.interface';

@Injectable()
export class SmsProvider implements NotificationProvider {
  private readonly logger = new Logger(SmsProvider.name);

  async send(options: { to: string; message: string }): Promise<{ success: boolean; messageId?: string; error?: any }> {
    this.logger.log(`[SMS SIMULATION] To: ${options.to} | Message: ${options.message}`);
    // Future implementation: integrate with Twilio or other SMS gateway
    return { success: true, messageId: 'simulated-sms-id' };
  }
}
