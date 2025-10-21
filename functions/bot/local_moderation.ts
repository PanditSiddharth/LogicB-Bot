// ============================================
// LOCAL MODERATION SYSTEM
// functions/bot/local_moderation.ts
// ============================================

import { Context, Telegraf } from "telegraf";
import { Group } from "../../mongo";
import { BotHelpers } from "../utils/helpers";

interface ModAction {
  userId?: number;
  userName?: string;
  duration?: number;
  reason?: string;
}
const send = BotHelpers.send
export class LocalModeration {
  private bot: Telegraf;

  constructor(bot: Telegraf) {
  
    this.bot = bot;
    this.initialize();
  }

  private initialize() {
    this.setupBanCommands();
    this.setupMuteCommands();
    this.setupKickCommand();
    this.setupDeleteCommands();
    this.setupPromoteDemote();
    this.setupInfoCommand();
  }

  // ============================================
  // BAN COMMANDS
  // ============================================
  private setupBanCommands() {
    // Ban user
    this.bot.command("ban", async (ctx: Context) => {
      try {
        if (!await this.isGroupAdmin(ctx)) {
          return send(ctx, "❌ Only admins can ban users!");
        }

        const action = await this.parseModAction(ctx);
        if (!action.userId) {
          return send(ctx, 
            "❌ *Usage:*\n\n" +
            "*Reply:* `/ban [reason]`\n" +
            "*ID:* `/ban 123456 [reason]`\n" +
            "*Mention:* `/ban @user [reason]`\n\n" +
            "*Examples:*\n" +
            "`/ban Spamming`\n" +
            "`/ban 123456 Porn content`\n" +
            "`/ban @spammer Advertising`",
            { parse_mode: "Markdown" }
          );
        }

        const untilDate = action.duration 
          ? Math.floor(Date.now() / 1000) + action.duration
          : 0; // 0 means permanent

        // Ban the user
        await ctx.banChatMember(action.userId, untilDate);

        const message = 
          `🔨 *User Banned*\n\n` +
          `👤 User: ${action.userName}\n` +
          `🆔 ID: \`${action.userId}\`\n` +
          `📝 Reason: ${action.reason || "No reason provided"}\n` +
          `👮 By: ${ctx?.from?.first_name}`;

        await send(ctx, message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Unban user
    this.bot.command("unban", async (ctx: any) => {
      try {
        if (!await this.isGroupAdmin(ctx)) {
          return send(ctx, "❌ Only admins can unban users!");
        }

        const action = await this.parseModAction(ctx);
        if (!action.userId) {
          return send(ctx, 
            "❌ *Usage:*\n\n" +
            "*ID:* `/unban 123456`\n" +
            "*Reply:* `/unban` (reply to user's old message)\n\n" +
            "*Example:*\n" +
            "`/unban 123456`",
            { parse_mode: "Markdown" }
          );
        }

        await ctx.unbanChatMember(action.userId);

        const message = 
          `✅ *User Unbanned*\n\n` +
          `👤 User: ${action.userName}\n` +
          `🆔 ID: \`${action.userId}\`\n` +
          `👮 By: ${ctx.from.first_name}`;

        await send(ctx, message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });
  }

  // ============================================
  // MUTE COMMANDS
  // ============================================
  private setupMuteCommands() {
    // Mute user
    this.bot.command("mute", async (ctx: any) => {
      try {
        if (!await this.isGroupAdmin(ctx)) {
          return send(ctx, "❌ Only admins can mute users!");
        }

        const action = await this.parseModAction(ctx);
        if (!action.userId) {
          return send(ctx, 
            "❌ *Usage:*\n\n" +
            "*Reply:* `/mute [time] [reason]`\n" +
            "*ID:* `/mute 123456 [time] [reason]`\n\n" +
            "*Time Format:*\n" +
            "`10s` - 10 seconds\n" +
            "`5m` - 5 minutes\n" +
            "`2h` - 2 hours\n" +
            "`1d` - 1 day\n" +
            "`1w` - 1 week\n\n" +
            "*Examples:*\n" +
            "`/mute 1h Spamming`\n" +
            "`/mute 123456 30m Flooding`\n" +
            "`/mute @user 1d Bad behavior`\n" +
            "`/mute` (permanent, reply)",
            { parse_mode: "Markdown" }
          );
        }

        const untilDate = action.duration 
          ? Math.floor(Date.now() / 1000) + action.duration
          : 0; // 0 means permanent

        await ctx.restrictChatMember(action.userId, {
          permissions: {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false,
            can_change_info: false,
            can_invite_users: false,
            can_pin_messages: false
          },
          until_date: untilDate
        });

        const durationText = action.duration 
          ? BotHelpers.formatDuration(action.duration)
          : "Permanent";

        const message = 
          `🔇 *User Muted*\n\n` +
          `👤 User: ${action.userName}\n` +
          `🆔 ID: \`${action.userId}\`\n` +
          `⏱️ Duration: ${durationText}\n` +
          `📝 Reason: ${action.reason || "No reason provided"}\n` +
          `👮 By: ${ctx.from.first_name}`;

        await send(ctx, message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Unmute user
    this.bot.command("unmute", async (ctx: any) => {
      try {
        if (!await this.isGroupAdmin(ctx)) {
          return send(ctx, "❌ Only admins can unmute users!");
        }

        const action = await this.parseModAction(ctx);
        if (!action.userId) {
          return send(ctx, 
            "❌ *Usage:*\n\n" +
            "*Reply:* `/unmute`\n" +
            "*ID:* `/unmute 123456`\n\n" +
            "*Example:*\n" +
            "`/unmute 123456`",
            { parse_mode: "Markdown" }
          );
        }

        await ctx.restrictChatMember(action.userId, {
          permissions: {
            can_send_messages: true,
            can_send_media_messages: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
            can_change_info: false,
            can_invite_users: true,
            can_pin_messages: false
          }
        });

        const message = 
          `🔊 *User Unmuted*\n\n` +
          `👤 User: ${action.userName}\n` +
          `🆔 ID: \`${action.userId}\`\n` +
          `👮 By: ${ctx.from.first_name}`;

        await send(ctx, message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Temporary mute (tmute)
    this.bot.command("tmute", async (ctx: any) => {
      try {
        if (!await this.isGroupAdmin(ctx)) {
          return send(ctx, "❌ Only admins can mute users!");
        }

        const action = await this.parseModAction(ctx);
        if (!action.userId || !action.duration) {
          return send(ctx, 
            "❌ *Usage:*\n\n" +
            "`/tmute <time> [reason]` (reply)\n" +
            "`/tmute 123456 <time> [reason]`\n\n" +
            "*Examples:*\n" +
            "`/tmute 30m Calm down`\n" +
            "`/tmute 123456 1h Stop spamming`",
            { parse_mode: "Markdown" }
          );
        }

        const untilDate = Math.floor(Date.now() / 1000) + action.duration;

        await ctx.restrictChatMember(action.userId, {
          permissions: {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false
          },
          until_date: untilDate
        });

        const message = 
          `⏱️ *Temporary Mute*\n\n` +
          `👤 User: ${action.userName}\n` +
          `⏱️ Duration: ${BotHelpers.formatDuration(action.duration)}\n` +
          `📝 Reason: ${action.reason || "No reason"}\n` +
          `👮 By: ${ctx.from.first_name}`;

        await send(ctx, message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });
  }

  // ============================================
  // KICK COMMAND
  // ============================================
  private setupKickCommand() {
    this.bot.command("kick", async (ctx: any) => {
      try {
        if (!await this.isGroupAdmin(ctx)) {
          return send(ctx, "❌ Only admins can kick users!");
        }

        const action = await this.parseModAction(ctx);
        if (!action.userId) {
          return send(ctx, 
            "❌ *Usage:*\n\n" +
            "*Reply:* `/kick [reason]`\n" +
            "*ID:* `/kick 123456 [reason]`\n" +
            "*Mention:* `/kick @user [reason]`\n\n" +
            "*Examples:*\n" +
            "`/kick Spamming`\n" +
            "`/kick 123456 Inappropriate content`",
            { parse_mode: "Markdown" }
          );
        }

        // Kick = ban + unban (allows rejoin)
        await ctx.banChatMember(action.userId);
        await ctx.unbanChatMember(action.userId);

        const message = 
          `👢 *User Kicked*\n\n` +
          `👤 User: ${action.userName}\n` +
          `🆔 ID: \`${action.userId}\`\n` +
          `📝 Reason: ${action.reason || "No reason provided"}\n` +
          `👮 By: ${ctx.from.first_name}\n\n` +
          `User can rejoin via invite link.`;

        await send(ctx, message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });
  }

  // ============================================
  // DELETE COMMANDS
  // ============================================
  private setupDeleteCommands() {
    // Delete single message
    this.bot.command("del", async (ctx: any) => {
      try {
        if (!await this.isGroupAdmin(ctx)) {
          return send(ctx, "❌ Only admins can delete messages!");
        }

        if (!ctx.message.reply_to_message) {
          return send(ctx, "❌ Reply to a message to delete it!");
        }

        await ctx.deleteMessage(ctx.message.reply_to_message.message_id);
        await ctx.deleteMessage(ctx.message.message_id);
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Purge messages (bulk delete)
    this.bot.command("purge", async (ctx: any) => {
      try {
        if (!await this.isGroupAdmin(ctx)) {
          return send(ctx, "❌ Only admins can purge messages!");
        }

        if (!ctx.message.reply_to_message) {
          return send(ctx, 
            "❌ *Usage:*\n\n" +
            "Reply to a message and use `/purge`\n" +
            "All messages from replied message to your command will be deleted.\n\n" +
            "*Note:* Can only delete messages ≤48 hours old",
            { parse_mode: "Markdown" }
          );
        }

        const fromId = ctx.message.reply_to_message.message_id;
        const toId = ctx.message.message_id;

        if (toId - fromId > 100) {
          return send(ctx, "❌ Can only purge up to 100 messages at once!");
        }

        const statusMsg = await send(ctx, "🗑️ Purging messages...");
        let deleted = 0;
        let failed = 0;

        for (let i = fromId; i <= toId; i++) {
          try {
            await ctx.deleteMessage(i);
            deleted++;
          } catch {
            failed++;
          }
          await BotHelpers.sleep(100); // Rate limit
        }

        await ctx.telegram.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          undefined,
          `✅ *Purge Complete*\n\n` +
          `🗑️ Deleted: ${deleted}\n` +
          `❌ Failed: ${failed}`,
          { parse_mode: "Markdown" }
        );

        // Auto-delete status after 5s
        setTimeout(() => {
          ctx.deleteMessage(statusMsg.message_id).catch(() => {});
        }, 5000);
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });
  }

  // ============================================
  // PROMOTE/DEMOTE
  // ============================================
  private setupPromoteDemote() {
    // Promote to admin
    this.bot.command("promote", async (ctx: any) => {
      try {
        if (!await this.isGroupAdmin(ctx)) {
          return send(ctx, "❌ Only admins can promote users!");
        }

        const action = await this.parseModAction(ctx);
        if (!action.userId) {
          return send(ctx, 
            "❌ *Usage:*\n\n" +
            "*Reply:* `/promote [title]`\n" +
            "*ID:* `/promote 123456 [title]`\n\n" +
            "*Example:*\n" +
            "`/promote Moderator`",
            { parse_mode: "Markdown" }
          );
        }

        await ctx.promoteChatMember(action.userId, {
          can_manage_chat: true,
          can_delete_messages: true,
          can_manage_video_chats: true,
          can_restrict_members: true,
          can_promote_members: false,
          can_change_info: false,
          can_invite_users: true,
          can_pin_messages: true
        });

        const title = action.reason || "Admin";
        if (title.length <= 16) {
          try {
            await ctx.setChatAdministratorCustomTitle(action.userId, title);
          } catch {}
        }

        const message = 
          `⬆️ *User Promoted*\n\n` +
          `👤 User: ${action.userName}\n` +
          `🆔 ID: \`${action.userId}\`\n` +
          `👑 Title: ${title}\n` +
          `👮 By: ${ctx.from.first_name}`;

        await send(ctx, message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Demote from admin
    this.bot.command("demote", async (ctx: any) => {
      try {
        if (!await this.isGroupAdmin(ctx)) {
          return send(ctx, "❌ Only admins can demote users!");
        }

        const action = await this.parseModAction(ctx);
        if (!action.userId) {
          return send(ctx, 
            "❌ *Usage:*\n\n" +
            "*Reply:* `/demote`\n" +
            "*ID:* `/demote 123456`",
            { parse_mode: "Markdown" }
          );
        }

        await ctx.promoteChatMember(action.userId, {
          can_manage_chat: false,
          can_delete_messages: false,
          can_manage_video_chats: false,
          can_restrict_members: false,
          can_promote_members: false,
          can_change_info: false,
          can_invite_users: false,
          can_pin_messages: false
        });

        const message = 
          `⬇️ *User Demoted*\n\n` +
          `👤 User: ${action.userName}\n` +
          `🆔 ID: \`${action.userId}\`\n` +
          `👮 By: ${ctx.from.first_name}`;

        await send(ctx, message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });
  }

  // ============================================
  // INFO COMMAND
  // ============================================
  private setupInfoCommand() {
    this.bot.command("info", async (ctx: any) => {
      try {
        const action = await this.parseModAction(ctx);
        
        let targetUser;
        if (action.userId) {
          targetUser = { id: action.userId };
        } else {
          targetUser = ctx.from;
        }

        const member = await ctx.getChatMember(targetUser.id);
        const user = member.user;

        let status = "Unknown";
        switch (member.status) {
          case "creator": status = "👑 Owner"; break;
          case "administrator": status = "👮 Admin"; break;
          case "member": status = "👤 Member"; break;
          case "restricted": status = "🔇 Restricted"; break;
          case "left": status = "🚪 Left"; break;
          case "kicked": status = "🚫 Banned"; break;
        }

        let message = `
📊 *User Information*

👤 *Name:* ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}
${user.username ? `🔗 *Username:* @${user.username}` : ''}
🆔 *ID:* \`${user.id}\`
🤖 *Bot:* ${user.is_bot ? 'Yes' : 'No'}
📍 *Status:* ${status}
`;

        if (member.status === "administrator" || member.status === "creator") {
          const customTitle = (member as any).custom_title;
          if (customTitle) {
            message += `👑 *Title:* ${customTitle}\n`;
          }
        }

        if (member.status === "restricted") {
          const restricted = member as any;
          message += `\n🔒 *Restrictions:*\n`;
          message += `${restricted.can_send_messages ? '✅' : '❌'} Send Messages\n`;
          message += `${restricted.can_send_media_messages ? '✅' : '❌'} Send Media\n`;
          message += `${restricted.can_send_polls ? '✅' : '❌'} Send Polls\n`;
          
          if (restricted.until_date) {
            const untilDate = new Date(restricted.until_date * 1000);
            message += `⏰ *Until:* ${untilDate.toLocaleString()}\n`;
          }
        }

        await send(ctx, message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async isGroupAdmin(ctx: any): Promise<boolean> {
    try {
      const member = await ctx.getChatMember(ctx.from.id);
      return member.status === "creator" || member.status === "administrator";
    } catch {
      return false;
    }
  }

  private async parseModAction(ctx: any): Promise<ModAction> {
    const result: ModAction = {};
    const args = ctx.message.text.split(/\s+/).slice(1);

    // Check reply
    if (ctx.message.reply_to_message) {
      result.userId = ctx.message.reply_to_message.from.id;
      result.userName = ctx.message.reply_to_message.from.first_name;

      // Parse args for duration and reason
      const parsed = this.parseArgs(args);
      result.duration = parsed.duration;
      result.reason = parsed.reason;

      return result;
    }

    // Check for user ID or mention
    if (args.length > 0) {
      const firstArg = args[0];

      // Check for user ID
      if (/^\d{5,10}$/.test(firstArg)) {
        result.userId = parseInt(firstArg);
        
        try {
          const member = await ctx.getChatMember(result.userId);
          result.userName = member.user.first_name;
        } catch {
          result.userName = `User ${result.userId}`;
        }

        // Parse remaining args
        const remainingArgs = args.slice(1);
        const parsed = this.parseArgs(remainingArgs);
        result.duration = parsed.duration;
        result.reason = parsed.reason;

        return result;
      }

      // Check for mention
      if (ctx.message.entities) {
        const mention = ctx.message.entities.find(
          (e: any) => e.type === "text_mention" || e.type === "mention"
        );

        if (mention?.user) {
          result.userId = mention.user.id;
          result.userName = mention.user.first_name;

          const parsed = this.parseArgs(args.slice(1));
          result.duration = parsed.duration;
          result.reason = parsed.reason;

          return result;
        }
      }

      // No user found, treat all as reason
      const parsed = this.parseArgs(args);
      result.duration = parsed.duration;
      result.reason = parsed.reason;
    }

    return result;
  }

  private parseArgs(args: string[]): { duration?: number; reason?: string } {
    const result: { duration?: number; reason?: string } = {};
    const reasonParts: string[] = [];

    for (const arg of args) {
      // Check if it's a duration
      const duration = this.parseDuration(arg);
      if (duration && !result.duration) {
        result.duration = duration;
      } else {
        reasonParts.push(arg);
      }
    }

    if (reasonParts.length > 0) {
      result.reason = reasonParts.join(' ');
    }

    return result;
  }

  private parseDuration(str: string): number | null {
    const match = str.match(/^(\d+)([smhdw])$/i);
    if (!match) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      case 'w': return value * 604800;
      default: return null;
    }
  }
}

export function initializeLocalModeration(bot: Telegraf) {
  new LocalModeration(bot);
  console.log("✅ Local Moderation System initialized");
}