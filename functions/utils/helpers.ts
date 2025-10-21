// ============================================
// SHARED HELPER UTILITIES
// functions/utils/helpers.ts
// ============================================

import { Community, UserCommunity } from "../../mongo";
import { BotMessageSettings, BotMessageQueue, MessageType } from "../../models/messageManager";

export class BotHelpers {
  // Get active community for user
  static async getActiveCommunity(userId: number) {
    try {
      const userComm = await UserCommunity.findOne({ userId }).lean();
      if (!userComm?.activeCommunity) return null;
      
      return await Community.findOne({ 
        communityId: userComm.activeCommunity 
      }).lean();
    } catch (error) {
      console.error('Error getting active community:', error);
      return null;
    }
  }

  // Check if user has permission
  static hasPermission(
    userId: number, 
    community: any, 
    permission: string
  ): boolean {
    if (!community) return false;
    if (community.ownerId === userId) return true;

    const admin = community.admins?.find((a: any) => a.userId === userId);
    return admin?.permissions?.[permission] ?? false;
  }

  // Check if user is group admin
  static async isGroupAdmin(bot: any, chatId: number, userId: number): Promise<boolean> {
    try {
      const member = await bot.telegram.getChatMember(chatId, userId);
      return member.status === "creator" || member.status === "administrator";
    } catch {
      return false;
    }
  }

  // Identify user from context
  static async identifyUser(ctx: any) {
    try {
      // Check for text mention
      if (ctx.message.entities?.[1]?.type === "text_mention") {
        return {
          userId: ctx.message.entities[1].user.id,
          name: ctx.message.entities[1].user.first_name
        };
      }

      // Check for reply
      if (ctx.message.reply_to_message) {
        return {
          userId: ctx.message.reply_to_message.from.id,
          name: ctx.message.reply_to_message.from.first_name
        };
      }

      // Check for user ID in text
      const userIdMatch = ctx.message.text.match(/\b(\d{5,10})\b/);
      if (userIdMatch) {
        const userId = parseInt(userIdMatch[1]);
        try {
          const member = await ctx.getChatMember(userId);
          return { userId, name: member.user.first_name };
        } catch {
          return { userId, name: `User ${userId}` };
        }
      }

      return null;
    } catch (error) {
      console.error('Error identifying user:', error);
      return null;
    }
  }

  // Generate unique community ID
  static generateCommunityId(): string {
    return `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Parse duration string (e.g., "15d", "6h", "30m")
  static parseDuration(str: string): number | null {
    const regex = /^(\d+)([dhms])$/i;
    const match = str.match(regex);
    if (!match) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'd': return value * 86400;
      case 'h': return value * 3600;
      case 'm': return value * 60;
      case 's': return value;
      default: return null;
    }
  }

  // Format duration for display
  static formatDuration(seconds: number): string {
    if (seconds >= 86400) {
      const days = Math.floor(seconds / 86400);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  // Sleep utility
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Error handler
  static handleError(ctx: any, error: any, customMessage?: string): Promise<any> {
    console.error('Bot Error:', error);
    const message = customMessage || `❌ Error: ${error.message || 'Unknown error'}`;
    return ctx.reply(message).catch(() => {});
  }

  // Rate limit check
  private static rateLimits = new Map<string, number>();

  static checkRateLimit(key: string, limitMs: number = 3000): boolean {
    const now = Date.now();
    const lastCall = this.rateLimits.get(key);
    
    if (lastCall && now - lastCall < limitMs) {
      return false; // Rate limited
    }
    
    this.rateLimits.set(key, now);
    return true;
  }

  // Clean old rate limits
  static cleanRateLimits() {
    const now = Date.now();
    const timeout = 60000; // 1 minute
    
    for (const [key, timestamp] of this.rateLimits.entries()) {
      if (now - timestamp > timeout) {
        this.rateLimits.delete(key);
      }
    }
  }

  // Escape markdown
  static escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  }

  // Truncate text
  static truncate(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  // Format number
  static formatNumber(num: number): string {
    return num.toLocaleString();
  }

  // Chunk array
  static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Validate user ID
  static isValidUserId(userId: any): boolean {
    const id = Number(userId);
    return !isNaN(id) && id > 0 && id < 10000000000;
  }

  // Get user display name
  static getUserDisplayName(user: any): string {
    if (user.username) return `@${user.username}`;
    if (user.first_name) return user.first_name;
    return `User ${user.id}`;
  }

  // Send message with auto-delete functionality
  static async send(
    ctx: any, 
    text: string, 
    options: {
      type?: MessageType,
      customType?: string,
      deleteAfter?: number, // Override default deletion time
      parse_mode?: 'Markdown' | 'HTML',
      reply_markup?: any,
      reply_to_message_id?: number,
      disable_web_page_preview?: boolean,
      disable_notification?: boolean,
      [key: string]: any // Allow other Telegraf options
    } = {}
  ) {
    try {
      // Get community and settings
      const community = await BotHelpers.getActiveCommunity(ctx.from?.id);
      if (!community) return ctx.reply(text, options); // Fallback to normal reply if no community

      // Get message deletion settings
      let settings = await BotMessageSettings.findOne({ communityId: community.communityId });
      
      // Create default settings if none exist
      if (!settings) {
        settings = await BotMessageSettings.create({
          communityId: community.communityId
        });
      }

      // Send the message
      const sent = await ctx.reply(text, options);

      // If message was sent successfully and deletion is configured
      if (sent && settings?.messageTypes) {
        let deleteAfter: number | undefined;
        
        // Get deletion time based on message type
        if (options.deleteAfter) {
          deleteAfter = options.deleteAfter;
        } else if (options.type && options.type !== 'custom') {
          const typeSettings = settings.messageTypes[options.type];
          if (typeSettings?.enabled) {
            deleteAfter = typeSettings.deleteAfter;
          }
        } else if (options.customType) {
          const customSetting = settings.customTypes?.find(
            t => t.name === options.customType
          );
          if (customSetting) {
            deleteAfter = customSetting.deleteAfter;
          }
        }

        // If deletion is configured, queue the message for deletion
        if (deleteAfter) {
          await BotMessageQueue.create({
            messageId: sent.message_id,
            chatId: ctx.chat.id,
            communityId: community.communityId,
            type: options.type || 'custom',
            customType: options.customType,
            deleteAt: new Date(Date.now() + (deleteAfter * 1000)),
            isDeleted: false
          });
        }
      }

      return sent;
    } catch (error) {
      console.error('Error in send:', error);
      // Fallback to normal reply on error
      return ctx.reply(text, options);
    }
  }
}

// Clean rate limits every minute
setInterval(() => BotHelpers.cleanRateLimits(), 60000);