import { Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { IAiProvider } from './ai-provider.interface';

export class GeminiProvider implements IAiProvider {
  name = 'Gemini';
  private ai: GoogleGenAI | null = null;
  private logger = new Logger('GeminiProvider');

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }

  isAvailable(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  async chat(userId: string, context: string, question: string): Promise<string> {
    if (!this.ai) throw new Error('Gemini API key not configured');

    const systemPrompt = `You are WealthZer AI (Powered by Gemini), the native AI financial assistant for an app called WealthZer.
Below is the user's real-time financial data containing their Budgets, Assets, and Recent Transactions.
Analyze this data carefully to answer the user's question.
If the data is empty, politely inform them they need to track transactions or add assets first.
Keep responses concise, friendly, and formatted in HTML (use <b>, <i>, <br>, <ul>, <li>). Do not use markdown headers or \`\`\`.

Context Data:
${context}
`;

    const model = this.ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'user', parts: [{ text: question }] }
      ],
    });

    const result = await model;
    let aiText = result.text || "I'm sorry, I couldn't process your request right now.";
    return aiText.replace(/```html/g, '').replace(/```/g, '').trim();
  }

  async generateInsight(userId: string, context: string): Promise<any> {
    if (!this.ai) throw new Error('Gemini API key not configured');

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

    const model = this.ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const result = await model;
    let responseText = result.text || "{}";
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    try {
      return JSON.parse(responseText);
    } catch (e) {
      this.logger.error('Failed to parse Gemini insight JSON', e);
      return null;
    }
  }
}
