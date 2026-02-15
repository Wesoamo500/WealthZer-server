export interface NotificationProvider {
  send(options: { to: string; subject?: string; message: string; data?: any }): Promise<{ success: boolean; messageId?: string; error?: any }>;
}
