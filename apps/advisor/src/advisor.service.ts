import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../auth/src/prisma/prisma.service';

@Injectable()
export class AdvisorService {
  constructor(private readonly prisma: PrismaService) {}

  async getChatHistory(userId: string) {
    return this.prisma.aiChatHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async askAdvisor(userId: string, question: string) {
    // Save user message
    await this.prisma.aiChatHistory.create({
      data: {
        userId,
        message: question,
        role: 'USER',
      },
    });

    // Simulated AI Response logic
    let response = "I'm analyzing your spending patterns. It looks like you've spent 15% more on dining this week compared to last week.";
    
    if (question.toLowerCase().includes('save')) {
      response = "To save more, consider setting a limit on 'Entertainment' and 'Dining' categories. You currently spend $450/month there.";
    } else if (question.toLowerCase().includes('invest')) {
      response = "Your portfolio is currently 80% Crypto. Diversifying into some low-cost index funds could reduce your risk.";
    }

    // Save advisor response
    const aiMessage = await this.prisma.aiChatHistory.create({
      data: {
        userId,
        message: response,
        role: 'ASSISTANT',
      },
    });

    return aiMessage;
  }
}
