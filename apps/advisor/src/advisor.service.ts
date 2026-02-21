import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../auth/src/prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';
import { IAiProvider } from './providers/ai-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';

@Injectable()
export class AdvisorService {
  private providers: IAiProvider[] = [];

  constructor(private readonly prisma: PrismaService) {
    this.providers = [
      new GeminiProvider(),
      new ClaudeProvider(),
      new OpenAIProvider(),
    ];
  }

  async getChatHistory(userId: string) {
    return this.prisma.aiChatHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async clearChatHistory(userId: string) {
    return this.prisma.aiChatHistory.deleteMany({
      where: { userId }
    });
  }

  async askAdvisor(userId: string, question: string, preferredProvider?: string) {
    // 1. Save user message
    await this.prisma.aiChatHistory.create({
      data: {
        userId,
        message: question,
        role: 'USER',
      },
    });

    try {
      // 2. Fetch User Financial Data for RAG (Unchanged)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          transactions: { orderBy: { date: 'desc' }, take: 50 },
          budgets: true,
          portfolioAssets: true
        }
      });

      if (!user) throw new Error('User not found');

      const context = this.buildContext(user);

      // 3. Select Provider with Failover
      let responseText = '';
      let usedProvider = '';

      const availableProviders = this.getProviderChain(preferredProvider);

      for (const provider of availableProviders) {
        try {
          Logger.log(`Attempting chat with ${provider.name} provider...`, 'AdvisorService');
          responseText = await provider.chat(userId, context, question);
          usedProvider = provider.name;
          break; // Success!
        } catch (e) {
          Logger.warn(`${provider.name} provider failed: ${(e as Error).message}. Trying next...`, 'AdvisorService');
        }
      }

      if (!usedProvider) {
        // All failed, check for simulated
        return this.saveSimulatedResponse(userId, question);
      }

      // 4. Save and Return Response
      const aiMessage = await this.prisma.aiChatHistory.create({
        data: {
          userId,
          message: responseText,
          role: 'ASSISTANT',
        },
      });

      return aiMessage;

    } catch (error) {
      Logger.error(`Failed to get AI response: ${(error as Error).message}`, 'AdvisorService');
      return this.prisma.aiChatHistory.create({
        data: {
          userId,
          message: "I'm sorry, I encountered an error connecting to my brain. Please try again later.",
          role: 'ASSISTANT',
        },
      });
    }
  }

  async generateInsight(userId: string, preferredProvider?: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          transactions: { orderBy: { date: 'desc' }, take: 30 },
          budgets: true,
          portfolioAssets: true
        }
      });

      if (!user) throw new Error('User not found');
      const context = this.buildContext(user);

      const availableProviders = this.getProviderChain(preferredProvider);
      let insight = null;

      for (const provider of availableProviders) {
        try {
          Logger.log(`Attempting insight generation with ${provider.name} provider...`, 'AdvisorService');
          insight = await provider.generateInsight(userId, context);
          if (insight) break;
        } catch (e) {
          Logger.warn(`${provider.name} provider failed: ${(e as Error).message}. Trying next...`, 'AdvisorService');
        }
      }

      if (!insight) {
        return {
          title: "Insight Unavailable",
          description: "We couldn't generate a fresh insight right now. Check your API keys!",
          action: "Retry"
        };
      }

      return insight;

    } catch (error) {
      Logger.error(`Failed to generate AI insight: ${(error as Error).message}`, 'AdvisorService');
      return {
        title: "Error",
        description: "An unexpected error occurred while generating insights.",
        action: "Dismiss"
      };
    }
  }

  private getProviderChain(preferred?: string): IAiProvider[] {
    const activeProviders = this.providers.filter(p => p.isAvailable());
    
    if (preferred) {
      const pref = activeProviders.find(p => p.name.toLowerCase() === preferred.toLowerCase());
      if (pref) {
        // Put preferred first, then others
        return [pref, ...activeProviders.filter(p => p !== pref)];
      }
    }
    
    return activeProviders;
  }

  private buildContext(user: any): string {
    let context = `User Name: ${user.fullName || 'User'}\n`;
    context += `AI Advisor Mode Preference: ${user.advisorMode}\n\n`;

    context += `--- BUDGETS ---\n`;
    if (user.budgets.length > 0) {
      user.budgets.forEach(b => { context += `- ${b.category}: $${b.amount}\n`; });
    }

    context += `\n--- ASSETS ---\n`;
    user.portfolioAssets.forEach(a => {
       context += `- ${a.name} (${a.symbol}): ${a.amount} Units\n`;
    });

    context += `\n--- RECENT TRANSACTIONS ---\n`;
    user.transactions.slice(0, 10).forEach(t => {
       context += `- ${t.category}: $${t.amount} (${t.title})\n`;
    });

    return context;
  }

  private async saveSimulatedResponse(userId: string, question: string) {
    let response = "I'm a simulated version of Finner AI. Please provide a GEMINI_API_KEY in your backend/.env file to chat with your real data!";
    
    if (question.toLowerCase().includes('save')) {
      response = "To save more, consider setting a limit on 'Entertainment' and 'Dining' categories.";
    } else if (question.toLowerCase().includes('invest')) {
      response = "Your portfolio is currently 80% Crypto. Diversifying into some low-cost index funds could reduce your risk.";
    }

    return this.prisma.aiChatHistory.create({
      data: {
        userId,
        message: response,
        role: 'ASSISTANT',
      },
    });
  }
}
