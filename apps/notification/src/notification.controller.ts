import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @MessagePattern({ cmd: 'send-otp' })
  async sendOtp(@Payload() data: { email: string, code: string }) {
    return this.notificationService.sendOtp(data.email, data.code);
  }

  @MessagePattern({ cmd: 'send-email' })
  async sendEmail(@Payload() data: { to: string, subject: string, body: string }) {
    return this.notificationService.sendEmail(data.to, data.subject, data.body);
  }
}
