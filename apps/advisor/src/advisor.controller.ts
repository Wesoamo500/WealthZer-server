import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AdvisorService } from './advisor.service';

@Controller()
export class AdvisorController {
  constructor(private readonly advisorService: AdvisorService) {}

  @MessagePattern({ cmd: 'get-chat-history' })
  async getChatHistory(@Payload() data: { userId: string }) {
    return this.advisorService.getChatHistory(data.userId);
  }

  @MessagePattern({ cmd: 'clear-chat-history' })
  async clearChatHistory(@Payload() data: { userId: string }) {
    return this.advisorService.clearChatHistory(data.userId);
  }

  @MessagePattern({ cmd: 'ask-advisor' })
  async askAdvisor(@Payload() data: { userId: string, question: string }) {
    return this.advisorService.askAdvisor(data.userId, data.question);
  }

  @MessagePattern({ cmd: 'generate-insight' })
  async generateInsight(@Payload() data: { userId: string }) {
    return this.advisorService.generateInsight(data.userId);
  }
}
