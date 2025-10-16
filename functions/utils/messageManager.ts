import { BotMessageTracker } from '../../models/botMessageTracker';
import { BotHelpers } from './helpers';

export class MessageManager {
  private static async deleteOldMessages(ctx: any): Promise<void> {
    try {
      const community = await BotHelpers.getActiveCommunity(ctx.from?.id);
      if (!community) return;

      // Find all messages from this bot in this chat
      const oldMessages = await BotMessageTracker.find({
        communityId: community.communityId,
        chatId: ctx.chat.id
      });

      // Delete each message from both Telegram and our tracker
      for (const msg of oldMessages) {
        try {
          await ctx.telegram.deleteMessage(msg.chatId, msg.messageId);
        } catch (error) {
          console.log('Could not delete old message:', error.message);
        }
        await msg.deleteOne();
      }
    } catch (error) {
      console.error('Error deleting old messages:', error);
    }
  }

  private static async trackNewMessage(ctx: any, messageType: string, sentMessage: any): Promise<void> {
    try {
      const community = await BotHelpers.getActiveCommunity(ctx.from?.id);
      if (!community) return;

      await BotMessageTracker.create({
        communityId: community.communityId,
        chatId: ctx.chat.id,
        messageId: sentMessage.message_id,
        messageType
      });
    } catch (error) {
      console.error('Error tracking new message:', error);
    }
  }

  private static async findExistingMessage(ctx: any, messageType: string): Promise<any> {
    try {
      const community = await BotHelpers.getActiveCommunity(ctx.from?.id);
      if (!community) return null;

      return await BotMessageTracker.findOne({
        communityId: community.communityId,
        chatId: ctx.chat.id,
        messageType
      }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error finding existing message:', error);
      return null;
    }
  }

  static async send(
    ctx: any,
    messageType: string,
    message: string,
    options: any = {}
  ): Promise<any> {
    try {
      const existingMessage = await this.findExistingMessage(ctx, messageType);

      // Try to edit existing message if possible
      if (existingMessage) {
        try {
          const edited = await ctx.telegram.editMessageText(
            existingMessage.chatId,
            existingMessage.messageId,
            undefined,
            message,
            { ...options, parse_mode: 'Markdown' }
          );
          if (edited) return edited;
        } catch (error) {
          console.log('Could not edit message, will send new:', error.message);
        }
      }

      // Delete all old messages before sending new one
      await this.deleteOldMessages(ctx);

      // Send new message
      const sent = await ctx.reply(message, { ...options, parse_mode: 'Markdown' });
      
      // Track the new message
      if (sent) {
        await this.trackNewMessage(ctx, messageType, sent);
      }

      return sent;
    } catch (error) {
      console.error('Error in MessageManager.send:', error);
      // Fallback to normal reply
      return ctx.reply(message, options);
    }
  }

  static async updateUI(
    ctx: any,
    messageType: string,
    component: { message: string; keyboard: any }
  ): Promise<any> {
    try {
      const existingMessage = await this.findExistingMessage(ctx, messageType);

      // If this is a callback query, edit the existing message
      if (ctx.callbackQuery) {
        const edited = await ctx.editMessageText(component.message, {
          parse_mode: 'Markdown',
          reply_markup: component.keyboard
        });
        return edited;
      }

      // For command responses, try to edit existing or send new
      if (existingMessage) {
        try {
          const edited = await ctx.telegram.editMessageText(
            existingMessage.chatId,
            existingMessage.messageId,
            undefined,
            component.message,
            {
              parse_mode: 'Markdown',
              reply_markup: component.keyboard
            }
          );
          if (edited) return edited;
        } catch (error) {
          console.log('Could not edit UI, will send new:', error.message);
        }
      }

      // Delete all old messages before sending new one
      await this.deleteOldMessages(ctx);

      // Send new message
      const sent = await ctx.reply(component.message, {
        parse_mode: 'Markdown',
        reply_markup: component.keyboard
      });

      // Track the new message
      if (sent) {
        await this.trackNewMessage(ctx, messageType, sent);
      }

      return sent;
    } catch (error) {
      console.error('Error in MessageManager.updateUI:', error);
      // Fallback to normal reply
      return ctx.reply(component.message, {
        parse_mode: 'Markdown',
        reply_markup: component.keyboard
      });
    }
  }
}
