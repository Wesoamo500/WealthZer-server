import { Controller, Get, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { User } from '../auth/user.decorator';

@Controller('advisor')
export class AdvisorController {
  constructor(@Inject('ADVISOR_SERVICE') private readonly advisorClient: ClientProxy) {}

  @Get('chat-history')
  async getChatHistory(@User('userId') userId: string) {
    return firstValueFrom(this.advisorClient.send({ cmd: 'get-chat-history' }, { userId }));
  }

  @Post('ask')
  async askAdvisor(@User('userId') userId: string, @Body('question') question: string) {
    return firstValueFrom(this.advisorClient.send({ cmd: 'ask-advisor' }, { userId, question }));
  }

  @Post('clear-history')
  async clearChatHistory(@User('userId') userId: string) {
    return firstValueFrom(this.advisorClient.send({ cmd: 'clear-chat-history' }, { userId }));
  }

  @Get('insight')
  async generateInsight(@User('userId') userId: string) {
    return firstValueFrom(this.advisorClient.send({ cmd: 'generate-insight' }, { userId }));
  }
}
