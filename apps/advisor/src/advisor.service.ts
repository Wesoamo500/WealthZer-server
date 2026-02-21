import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../auth/src/prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AdvisorService {
  constructor(private readonly prisma: PrismaService) {}

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

  async askAdvisor(userId: string, question: string) {
    // 1. Save user message
    await this.prisma.aiChatHistory.create({
      data: {
        userId,
        message: question,
        role: 'USER',
      },
    });

    try {
      // 2. Fetch User Financial Data for RAG
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          transactions: {
            orderBy: { date: 'desc' },
            take: 50 // Get last 50 transactions for context
          },
          budgets: true,
          portfolioAssets: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // 3. Build Context String
      let context = `User Name: ${user.fullName || 'User'}\n`;
      context += `AI Advisor Mode Preference: ${user.advisorMode}\n\n`;

      context += `--- BUDGETS ---\n`;
      if (user.budgets.length > 0) {
        user.budgets.forEach(b => {
          context += `- ${b.category}: $${b.amount} (${b.period})\n`;
        });
      } else {
        context += `No budgets set.\n`;
      }

      context += `\n--- ASSETS ---\n`;
      if (user.portfolioAssets.length > 0) {
        user.portfolioAssets.forEach(a => {
           context += `- ${a.name} (${a.symbol}): ${a.amount} units @ $${a.purchasePrice} (Current: $${a.currentValue || 'Unknown'})\n`;
        });
      } else {
        context += `No assets.\n`;
      }

      context += `\n--- RECENT TRANSACTIONS ---\n`;
      if (user.transactions.length > 0) {
        user.transactions.forEach(t => {
           const dateStr = t.date.toISOString().split('T')[0];
           context += `- ${dateStr} - ${t.category}: $${t.amount} (${t.title})\n`;
        });
      } else {
        context += `No recent transactions.\n`;
      }

      // 4. Initialize Gemini (requires process.env.GEMINI_API_KEY)
      // Note: If no key is provided, it falls back to a simulated response to prevent crashing the dev environment if the user hasn't set it yet.
      if (!process.env.GEMINI_API_KEY) {
        Logger.warn('GEMINI_API_KEY not found. Using simulated response.', 'AdvisorService');
        return this.saveSimulatedResponse(userId, question);
      }

      const ai = new GoogleGenAI();
      
      const systemPrompt = `You are Finner, the native AI financial assistant for an app called WealthZer.
Below is the user's real-time financial data containing their Budgets, Assets, and Recent Transactions.
Analyze this data carefully to answer the user's question.
If the data is empty, politely inform them they need to track transactions or add assets first.
Keep responses concise, friendly, and formatted in HTML (use <b>, <i>, <br>, <ul>, <li>). Do not use markdown headers or \`\`\`.

Context Data:
${context}
`;

      // 5. Generate Response
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'user', parts: [{ text: question }] }
        ],
      });

      let aiText = response.text || "I'm sorry, I couldn't process your request right now.";
      
      // Clean up markdown markers if Gemini accidentally returns them despite prompt
      aiText = aiText.replace(/```html/g, '').replace(/```/g, '').trim();

      // 6. Save and Return Response
      const aiMessage = await this.prisma.aiChatHistory.create({
        data: {
          userId,
          message: aiText,
          role: 'ASSISTANT',
        },
      });

      return aiMessage;

    } catch (error) {
      Logger.error(`Failed to get AI response: ${(error as Error).message}`, 'AdvisorService');
      const aiMessage = await this.prisma.aiChatHistory.create({
        data: {
          userId,
          message: "I'm sorry, I encountered an error connecting to my brain. Please check your API keys or try again later.",
          role: 'ASSISTANT',
        },
      });
      return aiMessage;
    }
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
