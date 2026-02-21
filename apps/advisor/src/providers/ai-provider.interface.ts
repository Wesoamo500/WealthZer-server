export interface IAiProvider {
  name: string;
  chat(userId: string, context: string, question: string): Promise<string>;
  generateInsight(userId: string, context: string): Promise<any>;
  isAvailable(): boolean;
}
