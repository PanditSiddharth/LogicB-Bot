// ============================================
// MESSAGE CLEANUP SERVICE
// functions/services/messageCleanup.ts
// ============================================

import { BotMessageQueue } from '../../models/messageManager';

export class MessageCleanupService {
  private bot: any;
  private isRunning: boolean = false;
  private cleanupInterval: number = 30000; // Run every 30 seconds

  constructor(bot: any) {
    this.bot = bot;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🧹 Starting message cleanup service...');
    this.run();
  }

  stop() {
    this.isRunning = false;
    console.log('⏹️ Stopped message cleanup service');
  }

  private async run() {
    while (this.isRunning) {
      try {
        await this.cleanupMessages();
      } catch (error) {
        console.error('Error in message cleanup:', error);
      }
      
      // Wait for next interval
      await new Promise(resolve => setTimeout(resolve, this.cleanupInterval));
    }
  }

  private async cleanupMessages() {
    // Find messages that need to be deleted
    const messages = await BotMessageQueue.find({
      deleteAt: { $lte: new Date() },
      isDeleted: false
    }).limit(100); // Process in batches

    for (const msg of messages) {
      try {
        // Delete the message
        await this.bot.telegram.deleteMessage(msg.chatId, msg.messageId);
        
        // Mark as deleted
        msg.isDeleted = true;
        await msg.save();
      } catch (error: any) {
        // If message is already deleted or not found, mark it
        if (error.description?.includes('message to delete not found')) {
          msg.isDeleted = true;
          await msg.save();
        } else {
          console.error(`Failed to delete message ${msg.messageId} in chat ${msg.chatId}:`, error);
        }
      }
    }

    // Clean up old records periodically (keep 7 days history)
    if (Math.random() < 0.1) { // 10% chance to run cleanup
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await BotMessageQueue.deleteMany({
        isDeleted: true,
        deleteAt: { $lt: cutoff }
      });
    }
  }
}
