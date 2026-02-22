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
        // All failed, use professional fallback
        return this.saveFallbackResponse(userId, question);
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
          title: "Market Analysis Paused",
          description: "We're currently updating our market data models. A fresh insight will be available shortly.",
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

  private async saveFallbackResponse(userId: string, question: string) {
    const defaultResponse = "WealthZer AI is currently processing a high volume of requests. While I'm temporarily offline, remember that consistent budgeting and regular portfolio reviews are key to long-term financial health. Please try your question again in a moment!";
    
    let response = defaultResponse;
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('save') || lowerQuestion.includes('budget') || lowerQuestion.includes('spend')) {
      response = "I'm having trouble connecting to my analysis engine right now. General tip: Tracking every expense, no matter how small, is the first step toward a healthier budget. WealthZer's budget tools can help you identify areas where you can optimize your spending.";
    } else if (lowerQuestion.includes('invest') || lowerQuestion.includes('portfolio') || lowerQuestion.includes('asset')) {
      response = "My detailed investment analysis is temporarily unavailable. A common professional strategy is maintaining a diversified portfolio across different asset classes to manage risk effectively. Check your Portfolio tab for a breakdown of your current holdings.";
    } else if (lowerQuestion.includes('hello') || lowerQuestion.includes('hi') || lowerQuestion.includes('hey')) {
      response = "Hello! I'm WealthZer AI, your personal financial assistant. I'm currently undergoing some quick maintenance, but I'll be back shortly to analyze your finances and provide personalized advice. How can I assist you in the meantime?";
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
