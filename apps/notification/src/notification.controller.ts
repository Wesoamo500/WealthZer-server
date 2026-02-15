import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @EventPattern({ cmd: 'send-otp' })
  async sendOtp(@Payload() data: { email: string, code: string }) {
    console.log(`[NotificationController] Received send-otp event for ${data.email}`);
    return this.notificationService.sendOtp(data.email, data.code);
  }

  @EventPattern({ cmd: 'send-email' })
  async sendEmail(@Payload() data: { to: string, subject: string, body: string }) {
    return this.notificationService.sendEmail(data.to, data.subject, data.body);
  }
}
