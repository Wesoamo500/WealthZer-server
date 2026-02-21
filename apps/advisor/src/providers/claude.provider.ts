import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { IAiProvider } from './ai-provider.interface';

export class ClaudeProvider implements IAiProvider {
  name = 'Claude';
  private ai: Anthropic | null = null;
  private logger = new Logger('ClaudeProvider');

  constructor() {
    if (process.env.CLAUDE_API_KEY) {
      this.ai = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    }
  }

  isAvailable(): boolean {
    return !!process.env.CLAUDE_API_KEY;
  }

  async chat(userId: string, context: string, question: string): Promise<string> {
    if (!this.ai) throw new Error('Claude API key not configured');

    const systemPrompt = `You are WealthZer AI (Powered by Anthropic Claude), the native AI financial assistant for an app called WealthZer.
Below is the user's real-time financial data containing their Budgets, Assets, and Recent Transactions.
Analyze this data carefully to answer the user's question.
If the data is empty, politely inform them they need to track transactions or add assets first.
Keep responses concise, friendly, and formatted in HTML (use <b>, <i>, <br>, <ul>, <li>). Do not use markdown headers or \`\`\`.

Context Data:
${context}
`;

    const response = await this.ai.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    return "I'm sorry, I couldn't process your request right now.";
  }

  async generateInsight(userId: string, context: string): Promise<any> {
    if (!this.ai) throw new Error('Claude API key not configured');

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

    const response = await this.ai.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 512,
      system: 'You are a helpful financial assistant. Respond only with JSON.',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    let responseText = "{}";
    if (content.type === 'text') {
      responseText = content.text;
    }
    
    try {
      // Claude might include some conversational filler, try to find JSON block
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(responseText);
    } catch (e) {
      this.logger.error('Failed to parse Claude insight JSON', e);
      return null;
    }
  }
}
