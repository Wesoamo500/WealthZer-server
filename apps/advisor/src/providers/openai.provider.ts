import { Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { IAiProvider } from './ai-provider.interface';

export class OpenAIProvider implements IAiProvider {
  name = 'OpenAI';
  private ai: OpenAI | null = null;
  private logger = new Logger('OpenAIProvider');

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async chat(userId: string, context: string, question: string): Promise<string> {
    if (!this.ai) throw new Error('OpenAI API key not configured');

    const systemPrompt = `You are WealthZer AI (Powered by OpenAI), the native AI financial assistant for an app called WealthZer.
Below is the user's real-time financial data containing their Budgets, Assets, and Recent Transactions.
Analyze this data carefully to answer the user's question.
If the data is empty, politely inform them they need to track transactions or add assets first.
Keep responses concise, friendly, and formatted in HTML (use <b>, <i>, <br>, <ul>, <li>). Do not use markdown headers or \`\`\`.

Context Data:
${context}
`;

    const response = await this.ai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message?.content || "I'm sorry, I couldn't process your request right now.";
  }

  async generateInsight(userId: string, context: string): Promise<any> {
    if (!this.ai) throw new Error('OpenAI API key not configured');

    const prompt = `You are a financial AI. Look at this user's recent data:
${context}
Generate exactly ONE actionable, smart financial insight for the user. 
Return ONLY a raw JSON object (with no whitespace/markdown formatting blocks like \`\`\`json) with the following structure:
{
  "title": "Short catchy title (e.g., Subscription Optimization)",
  "description": "1-2 sentence description of the insight.",
  "action": "A short 2-3 word action label (e.g., Review Subscriptions)"
}
If there's almost no data, tell them to add some transactions to get insights!`;

    const response = await this.ai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful financial assistant. Respond only with JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const responseText = response.choices[0].message?.content || "{}";
    
    try {
      return JSON.parse(responseText);
    } catch (e) {
      this.logger.error('Failed to parse OpenAI insight JSON', e);
      return null;
    }
  }
}
