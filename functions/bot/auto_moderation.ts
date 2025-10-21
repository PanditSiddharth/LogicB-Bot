
// ============================================
// AUTO-MODERATION SYSTEM
// functions/bot/auto_moderation.ts
// ============================================

import { Context, Telegraf } from "telegraf";
import mongoose from "mongoose";
import { AutoDeleteQueue, AutoModSettings, Community, Group, MessageTracker, UserCommunity, UserWarning } from "../../mongo"
import { BotHelpers } from "../utils/helpers";

// ============================================
// AUTO-MODERATION CLASS
// ============================================
const send = BotHelpers.send;
export class AutoModerationSystem {
  private bot: Telegraf;
  
  constructor(bot: Telegraf) {

    this.bot = bot;
    this.initialize();
  }

  private initialize() {
        // Initialize default settings for new communities
    this.setupCommands();
    this.setupMessageHandlers();
    this.startAutoDeleteWorker();
    this.startWarningCleanupWorker();
  }

  // ============================================
  // HELPER METHOD FOR SCANNING
  // ============================================

  private async scanGroupForUser(
    chatId: number,
    userId: number,
    scanLimit: number
  ): Promise<number[]> {
    const foundMessages: number[] = [];
    try {
      const tracker = await MessageTracker.findOne({ userId, chatId });
      if (tracker && tracker.messages.length > 0) {
        // Filter out undefined messageIds
        return tracker.messages.map(msg => msg.messageId).filter((id): id is number => typeof id === 'number');
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  // ============================================
  // SETUP COMMANDS
  // ============================================

  private setupCommands() {
    // Main auto-mod settings
    this.bot.command("automod", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        if (!await this.isOwnerOrAdmin(ctx.from.id, community)) {
          return send(ctx, "❌ Only admins can access auto-moderation settings?.");
        }

        const settings = await this.getSettings(community.communityId);

        const message = `
⚙️ *Auto-Moderation Settings*

*Current Status:*
${settings?.bannedWords?.enabled ? '✅' : '❌'} Banned Words Filter
${settings?.antiSpam?.enabled ? '✅' : '❌'} Anti-Spam
${settings?.antiFlood?.enabled ? '✅' : '❌'} Anti-Flood
${settings?.mediaRestrictions?.enabled ? '✅' : '❌'} Media Restrictions
${settings?.multiJoinDetection?.enabled ? '✅' : '❌'} Multi-Join Detection
${settings?.warningSystem?.enabled ? '✅' : '❌'} Warning System
${settings?.autoDelete?.enabled ? '✅' : '❌'} Auto-Delete
${settings?.reportSettings?.enabled ? '✅' : '❌'} Report System

*Quick Commands:*
/automod_words - Manage banned words
/automod_spam - Configure anti-spam
/automod_media - Media restrictions
/automod_warnings - Warning settings
/automod_delete - Auto-delete settings
/automod_report - Report settings
        `;

        const keyboard = {
          inline_keyboard: [
            [
              { text: "🚫 Banned Words", callback_data: "automod_words" },
              { text: "📊 Anti-Spam", callback_data: "automod_spam" }
            ],
            [
              { text: "🎬 Media Filter", callback_data: "automod_media" },
              { text: "⚠️ Warnings", callback_data: "automod_warnings" }
            ],
            [
              { text: "🗑️ Auto-Delete", callback_data: "automod_delete" },
              { text: "📢 Reports", callback_data: "automod_report" }
            ],
            [
              { text: "👥 Multi-Join", callback_data: "automod_multijoin" },
              { text: "🆕 New Users", callback_data: "automod_newuser" }
            ]
          ]
        };

        await send(ctx, message, {
          parse_mode: "HTML",
          reply_markup: keyboard
        });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Banned Words Management
    this.bot.command("automod_words", async (ctx: any) => {
      const help = `
🚫 *Banned Words Management*

*Add words:*
\`/addword <word1> <word2> ...\`
Example: \`/addword spam scam\`

*Remove words:*
\`/removeword <word>\`

*List words:*
\`/listwords\`

*Set action:*
\`/wordaction <delete/warn/mute/kick/ban>\`
Example: \`/wordaction ban\`

*Enable/Disable:*
\`/togglewords\`

*Set warnings:*
\`/wordwarnings <number>\`
Example: \`/wordwarnings 3\`
      `;

      await send(ctx, help, { parse_mode: "Markdown" });
    });

    // Add banned words
    this.bot.command("addword", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        const args = ctx.message.text.split(" ").slice(1);
        if (args.length === 0) {
          return send(ctx, "❌ Usage: /addword <word1> <word2> ...");
        }

        const settings = await this.getSettings(community.communityId);

        const newWords = args.map((w: string) => w.toLowerCase());
        const existing = settings?.bannedWords?.words || [];
        const added: string[] = [];
        
        newWords.forEach((word: string) => {
          if (!existing.includes(word)) {
            existing.push(word);
            added.push(word);
          }
        });

        settings.bannedWords.words = existing;
        await settings?.save();

        await send(ctx, 
          `✅ Added ${added.length} banned words:\n${added.join(', ')}\n\n` +
          `Total banned words: ${existing.length}`
        );
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Remove banned word
    this.bot.command("removeword", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        const args = ctx.message.text.split(" ").slice(1);
        if (args.length === 0) {
          return send(ctx, "❌ Usage: /removeword <word>");
        }

        const word = args[0].toLowerCase();
        const settings = await this.getSettings(community.communityId);
        
        const index = settings?.bannedWords.words.indexOf(word);
        if (index === -1) {
          return send(ctx, "❌ Word not found in banned list.");
        }

        settings?.bannedWords.words.splice(index, 1);
        await settings?.save();

        await send(ctx, `✅ Removed "${word}" from banned words list.`);
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // List banned words
    this.bot.command("listwords", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        const settings = await this.getSettings(community.communityId);
        const words = settings?.bannedWords.words;

        if (words.length === 0) {
          return send(ctx, "📋 No banned words configured.");
        }

        const message = `
🚫 *Banned Words List* (${words.length})

${words.map((w, i) => `${i + 1}. ${w}`).join('\n')}

*Action:* ${settings?.bannedWords.action}
*Status:* ${settings?.bannedWords.enabled ? 'Enabled ✅' : 'Disabled ❌'}
        `;

        await send(ctx, message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Toggle banned words
    this.bot.command("togglewords", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        const settings = await this.getSettings(community.communityId);
        settings.bannedWords.enabled = !settings?.bannedWords.enabled;
        await settings?.save();

        await send(ctx, 
          `✅ Banned words filter is now ${settings?.bannedWords.enabled ? 'ENABLED ✅' : 'DISABLED ❌'}`
        );
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Set word action
    this.bot.command("wordaction", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        const args = ctx.message.text.split(" ");
        if (args.length < 2) {
          return send(ctx, "❌ Usage: /wordaction <delete/warn/mute/kick/ban>");
        }

        const action = args[1].toLowerCase();
        const validActions = ['delete', 'warn', 'mute', 'kick', 'ban'];
        
        if (!validActions.includes(action)) {
          return send(ctx, "❌ Invalid action! Use: delete, warn, mute, kick, or ban");
        }

        const settings = await this.getSettings(community.communityId);
        settings.bannedWords.action = action as any;
        await settings?.save();

        await send(ctx, `✅ Banned words action set to: ${action.toUpperCase()}`);
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Anti-Spam Configuration
    this.bot.command("antispam", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        const settings = await this.getSettings(community.communityId);

        const message = `
📊 *Anti-Spam Settings*

*Current Configuration:*
Status: ${settings?.antiSpam.enabled ? 'Enabled ✅' : 'Disabled ❌'}
Max Messages: ${settings?.antiSpam.maxMessages} messages
Time Window: ${settings?.antiSpam.timeWindow} seconds
Action: ${settings?.antiSpam.action.toUpperCase()}
Mute Duration: ${settings?.antiSpam.muteDuration / 60} minutes

*Commands:*
\`/antispam_toggle\` - Enable/disable
\`/antispam_limit <number>\` - Set max messages
\`/antispam_window <seconds>\` - Set time window
\`/antispam_action <warn/mute/kick/ban>\` - Set action
\`/antispam_duration <seconds>\` - Set mute duration
        `;

        await send(ctx, message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Toggle anti-spam
    this.bot.command("antispam_toggle", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        const settings = await this.getSettings(community.communityId);
        settings.antiSpam.enabled = !settings?.antiSpam.enabled;
        await settings?.save();

        await send(ctx, 
          `✅ Anti-spam is now ${settings?.antiSpam?.enabled ? 'ENABLED ✅' : 'DISABLED ❌'}`
        );
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Delete messages by user in last 48 hours (Telegram limit)
    // Supports: Reply OR User ID
    this.bot.command("delmessages", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        let userId: number;
        let userName: string;

        // Check if user ID is provided in command
        const args = ctx.message.text.split(" ");
        const firstArg = args[1];

        if (firstArg && /^\d+$/.test(firstArg)) {
          // User ID provided in command
          userId = parseInt(firstArg);
          
          // Try to get user info
          try {
            const member = await ctx.getChatMember(userId);
            userName = member.user.first_name;
          } catch {
            userName = `User ${userId}`;
          }
        } else if (ctx.message.reply_to_message) {
          // Reply to message method
          userId = ctx.message.reply_to_message.from.id;
          userName = ctx.message.reply_to_message.from.first_name;
        } else {
          return send(ctx, 
            "❌ Usage:\n\n" +
            "**Method 1:** Reply to user's message\n" +
            "`/delmessages 48`\n\n" +
            "**Method 2:** Provide user ID\n" +
            "`/delmessages 123456789 48`\n\n" +
            "Hours: 1-48 (default: 48)",
            { parse_mode: "Markdown" }
          );
        }

        // Get hours parameter
        let hours: number;
        if (firstArg && /^\d+$/.test(firstArg)) {
          // User ID was provided, hours is 2nd arg
          hours = args[2] ? parseInt(args[2]) : 48;
        } else {
          // Reply method, hours is 1st arg
          hours = args[1] ? parseInt(args[1]) : 48;
        }

        if (isNaN(hours) || hours < 1 || hours > 48) {
          return send(ctx, 
            "❌ Hours must be between 1 and 48\n\n" +
            "⚠️ **Telegram Limitation:** Bot can only delete messages up to 48 hours old.\n" +
            "For older messages, use `/scandelete`",
            { parse_mode: "Markdown" }
          );
        }

        const statusMsg = await send(ctx, 
          `🗑️ Deleting ${userName}'s messages from last ${hours} hours...\n` +
          `⏳ Please wait, this may take a few minutes...`
        );

        // Get all groups in community
        
        const groups = await Group.find({ 
          communityId: community.communityId,
          isActive: true 
        });

        let totalDeleted = 0;
        let totalFailed = 0;
        let totalOld = 0;
        const cutoffTime = Date.now() - (hours * 3600 * 1000);
        const telegram48HourLimit = Date.now() - (48 * 3600 * 1000);

        // Find messages in tracker
        const messages = await MessageTracker.find({
          communityId: community.communityId,
          userId: userId,
          'messages.timestamp': { $gte: new Date(cutoffTime) }
        });

        for (const tracker of messages) {
          for (const msg of tracker.messages) {
            const msgTime = msg.timestamp.getTime();
            
            if (msgTime >= cutoffTime) {
              // Check if message is within Telegram's 48-hour limit
              if (msgTime < telegram48HourLimit) {
                totalOld++;
                continue; // Skip messages older than 48 hours
              }

              try {
                await this.bot.telegram.deleteMessage(tracker.chatId, msg.messageId as number);
                totalDeleted++;
              } catch (error: any) {
                totalFailed++;
                // Message already deleted, no permission, or too old
              }
            }
          }

          if ((totalDeleted + totalFailed) % 10 === 0) {
            await this.bot.telegram.editMessageText(
              ctx.chat.id,
              statusMsg.message_id,
              undefined,
              `🗑️ Progress:\n` +
              `✅ Deleted: ${totalDeleted}\n` +
              `❌ Failed: ${totalFailed}\n` +
              `⏰ Too old: ${totalOld}`
            ).catch(() => {});
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        }

        let resultMsg = `✅ *Deletion Complete*\n\n`;
        resultMsg += `👤 User: ${userName} (${userId})\n`;
        resultMsg += `🗑️ Deleted: ${totalDeleted} messages\n`;
        resultMsg += `❌ Failed: ${totalFailed} messages\n`;
        
        if (totalOld > 0) {
          resultMsg += `⏰ Too old (>48h): ${totalOld} messages\n\n`;
          resultMsg += `⚠️ *Note:* Telegram doesn't allow bots to delete messages older than 48 hours.\n`;
          resultMsg += `Use /scandelete to find and list old messages for manual deletion.`;
        }
        
        resultMsg += `\n\n⏱️ Time range: Last ${hours} hours`;

        await send(ctx, resultMsg, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Scan and report user messages (for messages older than 48 hours)
    // Supports: Reply OR User ID
    this.bot.command("scandelete", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        let userId: number;
        let userName: string;

        // Check if user ID is provided in command
        const args = ctx.message.text.split(" ");
        const firstArg = args[1];

        if (firstArg && /^\d+$/.test(firstArg)) {
          // User ID provided
          userId = parseInt(firstArg);
          
          try {
            const member = await ctx.getChatMember(userId);
            userName = member.user.first_name;
          } catch {
            userName = `User ${userId}`;
          }
        } else if (ctx.message.reply_to_message) {
          // Reply method
          userId = ctx.message.reply_to_message.from.id;
          userName = ctx.message.reply_to_message.from.first_name;
        } else {
          return send(ctx, 
            "❌ Usage:\n\n" +
            "**Method 1:** Reply to user's message\n" +
            "`/scandelete`\n\n" +
            "**Method 2:** Provide user ID\n" +
            "`/scandelete 123456789`",
            { parse_mode: "Markdown" }
          );
        }

        const statusMsg = await send(ctx, 
          `🔍 Scanning for ${userName}'s messages across all groups...\n` +
          `This will check tracked messages in the database.`
        );

        
        const groups = await Group.find({ 
          communityId: community.communityId,
          isActive: true 
        });

        let foundMessages: any[] = [];
        let scannedGroups = 0;

        for (const group of groups) {
          try {
            // Check tracker for this group
            const tracker = await MessageTracker.findOne({
              userId: userId,
              chatId: group.chatId,
              communityId: community.communityId
            });

            if (tracker && tracker.messages.length > 0) {
              foundMessages.push({
                groupName: group.groupName,
                groupId: group.chatId,
                username: group.username,
                messages: tracker.messages.map(m => m.messageId),
                count: tracker.messages.length
              });
            }

            scannedGroups++;

            if (scannedGroups % 5 === 0) {
              await this.bot.telegram.editMessageText(
                ctx.chat.id,
                statusMsg.message_id,
                undefined,
                `🔍 Scanning... ${scannedGroups}/${groups.length} groups\n` +
                `Found messages in ${foundMessages.length} groups`
              ).catch(() => {});
            }
          } catch (error) {
            console.error(`Error scanning group ${group.groupName}:`, error);
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Generate report
        if (foundMessages.length === 0) {
          return send(ctx, 
            `✅ No tracked messages found from ${userName} (${userId}).\n\n` +
            `Either:\n` +
            `• Messages are already deleted\n` +
            `• Messages are very old (not tracked)\n` +
            `• User never sent messages in these groups`
          );
        }

        let report = `📋 **Message Scan Report**\n\n`;
        report += `👤 User: ${userName} (${userId})\n`;
        report += `🔍 Scanned: ${scannedGroups} groups\n`;
        report += `📁 Found in: ${foundMessages.length} groups\n\n`;
        
        let totalMsgs = 0;
        for (const groupData of foundMessages.slice(0, 10)) { // Show first 10
          totalMsgs += groupData.count;
          report += `📌 **${groupData.groupName}**\n`;
          report += `   ${groupData.username ? '@' + groupData.username : 'Private'}\n`;
          report += `   Messages: ${groupData.count}\n`;
          report += `   Sample IDs: ${groupData.messages.slice(0, 3).join(', ')}...\n\n`;
        }

        if (foundMessages.length > 10) {
          report += `... and ${foundMessages.length - 10} more groups\n\n`;
        }

        report += `\n📊 **Total Messages:** ${totalMsgs}\n\n`;
        report += `💡 **Quick Actions:**\n`;
        report += `• \`/delmessages ${userId} 48\` - Delete last 48h\n`;
        report += `• \`/forcedelete ${userId}\` - Scan & delete all\n`;
        report += `• \`/cgban ${userId} reason\` - Ban from all groups`;

        await send(ctx, report, { parse_mode: "Markdown" });

      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Force delete by scanning recent messages
    // Supports: Reply OR User ID
    this.bot.command("forcedelete", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        if (!await this.isOwnerOrAdmin(ctx.from.id, community)) {
          return send(ctx, "❌ Only community admins can use this command!");
        }

        let userId: number;
        let userName: string;

        // Check if user ID is provided
        const args = ctx.message.text.split(" ");
        const firstArg = args[1];

        if (firstArg && /^\d+$/.test(firstArg)) {
          userId = parseInt(firstArg);
          
          try {
            const member = await ctx.getChatMember(userId);
            userName = member.user.first_name;
          } catch {
            userName = `User ${userId}`;
          }
        } else if (ctx.message.reply_to_message) {
          userId = ctx.message.reply_to_message.from.id;
          userName = ctx.message.reply_to_message.from.first_name;
        } else {
          return send(ctx, 
            "❌ Usage:\n\n" +
            "**Method 1:** Reply to user's message\n" +
            "`/forcedelete`\n\n" +
            "**Method 2:** Provide user ID\n" +
            "`/forcedelete 123456789`\n\n" +
            "⚠️ **Warning:** This will:\n" +
            "• Scan last 100 messages in each group\n" +
            "• Delete all messages from this user\n" +
            "• Works for messages within 48 hours\n" +
            "• May take 5-10 minutes",
            { parse_mode: "Markdown" }
          );
        }

        const confirmKeyboard = {
          inline_keyboard: [
            [
              { text: "❌ Cancel", callback_data: "forcedel_cancel" },
              { text: "✅ Confirm", callback_data: `forcedel_confirm_${userId}` }
            ]
          ]
        };

        await send(ctx, 
          `⚠️ **Force Delete Confirmation**\n\n` +
          `👤 User: ${userName} (${userId})\n\n` +
          `This will:\n` +
          `• Scan all community groups\n` +
          `• Find user's messages (last 100 per group)\n` +
          `• Delete all messages within 48 hours\n` +
          `• May take 5-10 minutes\n\n` +
          `Are you sure?`,
          { parse_mode: "Markdown", reply_markup: confirmKeyboard }
        );

      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Force delete confirmation callback
    this.bot.action(/^forcedel_confirm_(\d+)$/, async (ctx: any) => {
      try {
        const userId = parseInt(ctx.match[1]);
        
        await ctx.answerCbQuery("Starting force delete...");
        await ctx.editMessageText("🔄 Force delete started... Please wait...");

        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return;

        
        const groups = await Group.find({ 
          communityId: community.communityId,
          isActive: true 
        });

        let totalDeleted = 0;
        let totalScanned = 0;
        const statusMsg = await send(ctx, "🔄 Starting deletion process...");

        // Use tracked messages for faster deletion
        for (const group of groups) {
          try {
            const tracker = await MessageTracker.findOne({
              userId: userId,
              chatId: group.chatId,
              communityId: community.communityId
            });

            if (tracker && tracker.messages.length > 0) {
              const telegram48HourLimit = Date.now() - (48 * 3600 * 1000);

              for (const msg of tracker.messages) {
                if (msg.timestamp.getTime() >= telegram48HourLimit) {
                  try {
                    await this.bot.telegram.deleteMessage(group.chatId, msg?.messageId as number);
                    totalDeleted++;
                  } catch (delError) {
                    // Message already deleted or no permission
                  }
                }
              }
            }

            totalScanned++;

            if (totalScanned % 5 === 0) {
              await this.bot.telegram.editMessageText(
                ctx.chat.id,
                statusMsg.message_id,
                undefined,
                `🔄 Progress: ${totalScanned}/${groups.length} groups\n` +
                `🗑️ Deleted: ${totalDeleted} messages`
              ).catch(() => {});
            }

          } catch (error) {
            console.error(`Error in group ${group.groupName}:`, error);
          }

          await new Promise(resolve => setTimeout(resolve, 300));
        }

        await send(ctx, 
          `✅ **Force Delete Complete**\n\n` +
          `📁 Scanned: ${totalScanned} groups\n` +
          `🗑️ Deleted: ${totalDeleted} messages\n\n` +
          `⚠️ Messages older than 48 hours cannot be deleted by bot.`,
          { parse_mode: "Markdown" }
        );

      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    this.bot.action("forcedel_cancel", async (ctx: any) => {
      await ctx.answerCbQuery("Cancelled");
      await ctx.editMessageText("❌ Force delete cancelled.");
    });

    /*
        const args = ctx.message.text.split(" ");
        const hours = args[1] ? parseInt(args[1]) : 48;

        if (isNaN(hours) || hours < 1 || hours > 48) {
          return send(ctx, 
            "❌ Hours must be between 1 and 48\n\n" +
            "⚠️ *Telegram Limitation:* Bot can only delete messages up to 48 hours old.\n" +
            "For older messages, you need to delete manually or use /scandelete",
            { parse_mode: "Markdown" }
          );
        }

        const statusMsg = await send(ctx, 
          `🗑️ Deleting ${userName}'s messages from last ${hours} hours...\n` +
          `⏳ Please wait, this may take a few minutes...`
        );

        // Get all groups in community
        
        const groups = await Group.find({ 
          communityId: community.communityId,
          isActive: true 
        });

        let totalDeleted = 0;
        let totalFailed = 0;
        let totalOld = 0;
        const cutoffTime = Date.now() - (hours * 3600 * 1000);
        const telegram48HourLimit = Date.now() - (48 * 3600 * 1000);

        // Find messages in tracker
        const messages = await MessageTracker.find({
          communityId: community.communityId,
          userId: userId,
          'messages.timestamp': { $gte: new Date(cutoffTime) }
        });

        for (const tracker of messages) {
          for (const msg of tracker.messages) {
            const msgTime = msg.timestamp.getTime();
            
            if (msgTime >= cutoffTime) {
              // Check if message is within Telegram's 48-hour limit
              if (msgTime < telegram48HourLimit) {
                totalOld++;
                continue; // Skip messages older than 48 hours
              }

              try {
                await this.bot.telegram.deleteMessage(tracker.chatId, msg.messageId);
                totalDeleted++;
              } catch (error: any) {
                totalFailed++;
                // Message already deleted, no permission, or too old
              }
            }
          }

          if ((totalDeleted + totalFailed) % 10 === 0) {
            await this.bot.telegram.editMessageText(
              ctx.chat.id,
              statusMsg.message_id,
              undefined,
              `🗑️ Progress:\n` +
              `✅ Deleted: ${totalDeleted}\n` +
              `❌ Failed: ${totalFailed}\n` +
              `⏰ Too old: ${totalOld}`
            ).catch(() => {});
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        }

        let resultMsg = `✅ *Deletion Complete*\n\n`;
        resultMsg += `👤 User: ${userName} (${userId})\n`;
        resultMsg += `🗑️ Deleted: ${totalDeleted} messages\n`;
        resultMsg += `❌ Failed: ${totalFailed} messages\n`;
        
        if (totalOld > 0) {
          resultMsg += `⏰ Too old (>48h): ${totalOld} messages\n\n`;
          resultMsg += `⚠️ *Note:* Telegram doesn't allow bots to delete messages older than 48 hours.\n`;
          resultMsg += `Use /scandelete to find and list old messages for manual deletion.`;
        }
        
        resultMsg += `\n\n⏱️ Time range: Last ${hours} hours`;

        await send(ctx, resultMsg, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    }
*/
    // Scan and report user messages (for messages older than 48 hours)
    this.bot.command("scandelete", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        if (!ctx.message.reply_to_message) {
          return send(ctx, "❌ Reply to user's message to scan their messages.");
        }

        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name;

        const statusMsg = await send(ctx, 
          `🔍 Scanning for ${userName}'s messages across all groups...\n` +
          `This will check last 1000 messages in each group.`
        );

        
        const groups = await Group.find({ 
          communityId: community.communityId,
          isActive: true 
        });

        let foundMessages: any[] = [];
        let scannedGroups = 0;

        for (const group of groups) {
          try {
            // Get chat info to get latest message
            const chat = await this.bot.telegram.getChat(group.chatId);
            
            // Scan through messages by trying to forward them
            // This is a workaround to find user messages
            const groupMsgs = await this.scanGroupForUser(
              group.chatId, 
              userId, 
              1000 // Scan last 1000 messages
            );

            if (groupMsgs.length > 0) {
              foundMessages.push({
                groupName: group.groupName,
                groupId: group.chatId,
                username: group.username,
                messages: groupMsgs
              });
            }

            scannedGroups++;

            if (scannedGroups % 5 === 0) {
              await this.bot.telegram.editMessageText(
                ctx.chat.id,
                statusMsg.message_id,
                undefined,
                `🔍 Scanning... ${scannedGroups}/${groups.length} groups\n` +
                `Found messages in ${foundMessages.length} groups`
              ).catch(() => {});
            }
          } catch (error) {
            console.error(`Error scanning group ${group.groupName}:`, error);
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Generate report
        if (foundMessages.length === 0) {
          return send(ctx, 
            `✅ No messages found from ${userName} in recent scans.\n` +
            `Either messages are already deleted or very old.`
          );
        }

        let report = `📋 *Message Scan Report for ${userName}*\n\n`;
        report += `🔍 Scanned ${scannedGroups} groups\n`;
        report += `📁 Found messages in ${foundMessages.length} groups\n\n`;
        
        let totalMsgs = 0;
        for (const groupData of foundMessages) {
          totalMsgs += groupData.messages.length;
          report += `📌 *${groupData.groupName}*\n`;
          report += `   ${groupData.username ? '@' + groupData.username : 'Private'}\n`;
          report += `   Messages: ${groupData.messages.length}\n`;
          report += `   IDs: ${groupData.messages.slice(0, 5).join(', ')}${groupData.messages.length > 5 ? '...' : ''}\n\n`;
        }

        report += `\n📊 *Total Messages:* ${totalMsgs}\n\n`;
        report += `⚠️ *For messages older than 48 hours:*\n`;
        report += `You need to delete them manually or use group admin panel.\n\n`;
        report += `💡 *Actions you can take:*\n`;
        report += `1. Go to each group\n`;
        report += `2. Search user's messages\n`;
        report += `3. Delete manually\n`;
        report += `4. Or use /forceban to ban user from all groups`;

        await send(ctx, report, { parse_mode: "Markdown" });

      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Force delete by scanning recent messages
    this.bot.command("forcedelete", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        if (!await this.isOwnerOrAdmin(ctx.from.id, community)) {
          return send(ctx, "❌ Only community admins can use this command!");
        }

        if (!ctx.message.reply_to_message) {
          return send(ctx, 
            "❌ Reply to user's message to force delete.\n\n" +
            "⚠️ *Warning:* This will:\n" +
            "1. Scan last 100 messages in each group\n" +
            "2. Delete all messages from this user\n" +
            "3. Works for messages within 48 hours\n" +
            "4. May take several minutes",
            { parse_mode: "Markdown" }
          );
        }

        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name;

        const confirmKeyboard = {
          inline_keyboard: [
            [
              { text: "❌ Cancel", callback_data: "forcedel_cancel" },
              { text: "✅ Confirm", callback_data: `forcedel_confirm_${userId}` }
            ]
          ]
        };

        await send(ctx, 
          `⚠️ *Force Delete Confirmation*\n\n` +
          `User: ${userName} (${userId})\n\n` +
          `This will:\n` +
          `• Scan all community groups\n` +
          `• Find user's messages (last 100 per group)\n` +
          `• Delete all messages within 48 hours\n` +
          `• May take 5-10 minutes\n\n` +
          `Are you sure?`,
          { parse_mode: "Markdown", reply_markup: confirmKeyboard }
        );

      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Force delete confirmation callback
    this.bot.action(/^forcedel_confirm_(\d+)$/, async (ctx: any) => {
      try {
        const userId = parseInt(ctx.match[1]);
        
        await ctx.answerCbQuery("Starting force delete...");
        await ctx.editMessageText("🔄 Force delete started... Please wait...");

        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return;

        
        const groups = await Group.find({ 
          communityId: community.communityId,
          isActive: true 
        });

        let totalDeleted = 0;
        let totalScanned = 0;
        const statusMsg = await send(ctx, "🔄 Starting deletion process...");

        // Use tracked messages for faster deletion
        for (const group of groups) {
          try {
            const tracker = await MessageTracker.findOne({
              userId: userId,
              chatId: group.chatId,
              communityId: community.communityId
            });

            if (tracker && tracker.messages.length > 0) {
              const telegram48HourLimit = Date.now() - (48 * 3600 * 1000);

              for (const msg of tracker.messages) {
                if (msg.timestamp.getTime() >= telegram48HourLimit) {
                  try {
                    await this.bot.telegram.deleteMessage(group.chatId, msg.messageId as number);
                    totalDeleted++;
                  } catch (delError) {
                    // Message already deleted or no permission
                  }
                }
              }
            }

            totalScanned++;

            if (totalScanned % 5 === 0) {
              await this.bot.telegram.editMessageText(
                ctx.chat.id,
                statusMsg.message_id,
                undefined,
                `🔄 Progress: ${totalScanned}/${groups.length} groups\n` +
                `🗑️ Deleted: ${totalDeleted} messages`
              ).catch(() => {});
            }

          } catch (error) {
            console.error(`Error in group ${group.groupName}:`, error);
          }

          await new Promise(resolve => setTimeout(resolve, 300));
        }

        await send(ctx, 
          `✅ *Force Delete Complete*\n\n` +
          `📁 Scanned: ${totalScanned} groups\n` +
          `🗑️ Deleted: ${totalDeleted} messages\n\n` +
          `⚠️ Messages older than 48 hours cannot be deleted by bot.`,
          { parse_mode: "Markdown" }
        );

      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    this.bot.action("forcedel_cancel", async (ctx: any) => {
      await ctx.answerCbQuery("Cancelled");
      await ctx.editMessageText("❌ Force delete cancelled.");
    });

    // Warn user
    this.bot.command("warn", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        if (!ctx.message.reply_to_message) {
          return send(ctx, "❌ Reply to user's message to warn them.");
        }

        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name;

        const args = ctx.message.text.split(" ");
        const reason = args.slice(1).join(" ") || "No reason provided";

        await this.addWarning(
          community.communityId,
          userId,
          userName,
          reason,
          ctx.from.id,
          ctx.chat.id
        );

        const userWarnings = await UserWarning.findOne({
          communityId: community.communityId,
          userId: userId
        });

        const settings = await this.getSettings(community.communityId);
        const maxWarnings = settings?.warningSystem.maxWarnings;

        await send(ctx, 
          `⚠️ *Warning Issued*\n\n` +
          `👤 User: ${userName}\n` +
          `📝 Reason: ${reason}\n` +
          `📊 Warnings: ${userWarnings?.totalWarnings || 1}/${maxWarnings}`,
          { parse_mode: "Markdown" }
        );

        // Check if max warnings reached
        if (userWarnings && userWarnings.totalWarnings >= maxWarnings) {
          await this.executeWarningAction(
            community.communityId,
            userId,
            userName,
            ctx.chat.id,
            settings?.warningSystem.actionOnMax
          );
        }
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // View user warnings
    this.bot.command("warnings", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        let userId: number;
        let userName: string;

        if (ctx.message.reply_to_message) {
          userId = ctx.message.reply_to_message.from.id;
          userName = ctx.message.reply_to_message.from.first_name;
        } else {
          userId = ctx.from.id;
          userName = ctx.from.first_name;
        }

        const userWarnings = await UserWarning.findOne({
          communityId: community.communityId,
          userId: userId
        });
        if (!community) return send(ctx, "❌ No active community.");

        if (!userWarnings || userWarnings.totalWarnings === 0) {
          return send(ctx, `✅ ${userName} has no warnings.`);
        }

        const settings = await this.getSettings(community.communityId);
        let message = `⚠️ *Warnings for ${userName}*\n\n`;
        message += `📊 Total: ${userWarnings.totalWarnings}/${settings?.warningSystem.maxWarnings}\n\n`;
        message += `*Recent Warnings:*\n`;

        userWarnings.warnings.slice(-5).reverse().forEach((w, i) => {
          message += `${i + 1}. ${w.reason}\n`;
          message += `   📅 ${w.timestamp.toLocaleDateString()}\n`;
        });

        await send(ctx, message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Clear warnings
    this.bot.command("clearwarnings", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        if (!await this.isOwnerOrAdmin(ctx.from.id, community)) {
          return send(ctx, "❌ Only admins can clear warnings.");
        }

        if (!ctx.message.reply_to_message) {
          return send(ctx, "❌ Reply to user's message to clear their warnings.");
        }

        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name;

        await UserWarning.deleteOne({
          communityId: community.communityId,
          userId: userId
        });

        await send(ctx, `✅ Cleared all warnings for ${userName}`);
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });

    // Media restrictions
    this.bot.command("mediarestrict", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return send(ctx, "❌ No active community.");

        const settings = await this.getSettings(community.communityId);

        const message = `
🎬 *Media Restrictions*

*Current Status:*
${settings?.mediaRestrictions.enabled ? '✅ Enabled' : '❌ Disabled'}

*Blocked Media:*
${settings?.mediaRestrictions.blockPhotos ? '✅' : '❌'} Photos
${settings?.mediaRestrictions.blockVideos ? '✅' : '❌'} Videos
${settings?.mediaRestrictions.blockStickers ? '✅' : '❌'} Stickers
${settings?.mediaRestrictions.blockGifs ? '✅' : '❌'} GIFs
${settings?.mediaRestrictions.blockDocuments ? '✅' : '❌'} Documents
${settings?.mediaRestrictions.blockLinks ? '✅' : '❌'} Links

*Commands:*
\`/media_toggle\` - Enable/disable
\`/media_block <type>\` - Block specific media
\`/media_allow <type>\` - Allow specific media

Types: photos, videos, stickers, gifs, documents, links
        `;

        await send(ctx, message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await send(ctx, `❌ Error: ${error.message}`);
      }
    });
  }

  // ============================================
  // MESSAGE HANDLERS
  // ============================================

  private setupMessageHandlers() {
    this.bot.on("message", async (ctx: any, next: any) => {
      try {
        // Skip if not in a group
        if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
          return next();
        }

        // Get group and community
        
        const group = await Group.findOne({ chatId: ctx.chat.id, isActive: true });
        if (!group) return next();

        const settings = await this.getSettings(group.communityId);
        
        // Check if user is admin (skip auto-mod for admins)
        const isAdmin = await this.isGroupAdmin(ctx);
        if (isAdmin) return next();

        // Track message
        await this.trackMessage(
          ctx.from.id,
          ctx.chat.id,
          group.communityId,
          ctx.message.text || "",
          ctx.message.message_id
        );

        // Banned Words Check
        if (settings?.bannedWords.enabled && ctx.message.text) {
          const hasBannedWord = await this.checkBannedWords(
            ctx.message.text,
            settings?.bannedWords.words
          );

          if (hasBannedWord) {
            await this.handleBannedWord(ctx, group.communityId, settings);
            return; // Don't continue to next checks
          }
        }

        // Anti-Spam Check
        if (settings?.antiSpam.enabled) {
          const isSpam = await this.checkSpam(
            ctx.from.id,
            ctx.chat.id,
            group.communityId,
            settings?.antiSpam
          );

          if (isSpam) {
            await this.handleSpam(ctx, group.communityId, settings?.antiSpam);
            return;
          }
        }

        // Anti-Flood Check
        if (settings?.antiFlood.enabled && ctx.message.text) {
          const isFlood = await this.checkFlood(
            ctx.from.id,
            ctx.chat.id,
            group.communityId,
            ctx.message.text,
            settings?.antiFlood
          );

          if (isFlood) {
            await this.handleFlood(ctx, group.communityId, settings?.antiFlood);
            return;
          }
        }

        // Media Restrictions
        if (settings?.mediaRestrictions?.enabled) {
          const hasRestrictedMedia = this.checkRestrictedMedia(ctx.message, settings?.mediaRestrictions);
          
          if (hasRestrictedMedia) {
            await this.handleRestrictedMedia(ctx, group.communityId);
            return;
          }
        }

        // Auto-Delete Queue (if enabled)
        if (settings?.autoDelete.enabled) {
          await this.queueForDeletion(
            group.communityId,
            ctx.chat.id,
            ctx.message.message_id,
            ctx.from.id,
            settings?.autoDelete.deleteAfter
          );
        }

        await next();
      } catch (error) {
        console.error("Error in message handler:", error);
        await next();
      }
    });
  }

  // ============================================
  // AUTO-DELETE WORKER
  // ============================================

  private startAutoDeleteWorker() {
    setInterval(async () => {
      try {
        const now = new Date();
        const messagesToDelete = await AutoDeleteQueue.find({
          deleteAt: { $lte: now },
          processed: false
        }).limit(100);

        for (const msg of messagesToDelete) {
          try {
            await this.bot.telegram.deleteMessage(msg.chatId, msg.messageId);
            msg.processed = true;
            await msg.save();
          } catch (error) {
            // Message might be already deleted
            msg.processed = true;
            await msg.save();
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Clean up old processed entries
        await AutoDeleteQueue.deleteMany({
          processed: true,
          deleteAt: { $lt: new Date(Date.now() - 86400000) } // 1 day old
        });
      } catch (error) {
        console.error("Auto-delete worker error:", error);
      }
    }, 60000); // Run every minute
  }

  // ============================================
  // WARNING CLEANUP WORKER
  // ============================================

  private startWarningCleanupWorker() {
    setInterval(async () => {
      try {
        const allSettings = await AutoModSettings.find({
          'warningSystem.enabled': true
        });

        for (const settings of allSettings) {
          const expiryTime = Date.now() - (settings?.warningSystem.warningExpiry * 1000);
          
          // Find and update expired warnings
          const warnings = await UserWarning.find({
            communityId: settings?.communityId,
            'warnings.timestamp': { $lt: new Date(expiryTime) }
          });

          for (const userWarning of warnings) {
            userWarning.warnings = userWarning.warnings.filter(
              w => w.timestamp.getTime() >= expiryTime
            ) as any;
            userWarning.totalWarnings = userWarning.warnings.length;
            
            if (userWarning.totalWarnings === 0) {
              await UserWarning.deleteOne({ _id: userWarning._id });
            } else {
              await userWarning.save();
            }
          }
        }
      } catch (error) {
        console.error("Warning cleanup worker error:", error);
      }
    }, 3600000); // Run every hour
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async getSettings(communityId: string) {
    let settings = await AutoModSettings.findOne({ communityId });
    
    if (!settings) {
      settings = await AutoModSettings.create({ communityId });
    }
    
 settings.bannedWords = settings.bannedWords || {
    enabled: true,
    words: ["badwordyes"],
    action: "warn",
    warningsBeforePunish: 5
}


    return settings;
  }

  private async getActiveCommunity(userId: number) {
    
    
    
    const userComm = await UserCommunity.findOne({ userId });
    if (!userComm || !userComm.activeCommunity) return null;
    
    return await Community.findOne({ communityId: userComm.activeCommunity });
  }

  private async isOwnerOrAdmin(userId: number, community: any) {
    if (community.ownerId === userId) return true;
    return community.admins.some((a: any) => a.userId === userId);
  }

  private async isGroupAdmin(ctx: any) {
    try {
      const member = await this.bot.telegram.getChatMember(ctx.chat.id, ctx.from.id);
      return member.status === "creator" || member.status === "administrator";
    } catch {
      return false;
    }
  }

  // ============================================
  // BANNED WORDS FUNCTIONS
  // ============================================

  private async checkBannedWords(text: string, bannedWords: string[]): Promise<boolean> {
    const lowerText = text.toLowerCase();
    return bannedWords.some(word => lowerText.includes(word));
  }

  private async handleBannedWord(ctx: any, communityId: string, settings: any) {
    try {
      // Delete the message
      await ctx.deleteMessage();

      const action = settings?.bannedWords.action;
      const userId = ctx.from.id;
      const userName = ctx.from.first_name;

      switch (action) {
        case 'delete':
          // Already deleted
          break;

        case 'warn':
          await this.addWarning(
            communityId,
            userId,
            userName,
            "Used banned word",
            0,
            ctx.chat.id
          );
          
          const userWarnings = await UserWarning.findOne({ communityId, userId });
          
          await send(ctx, 
            `⚠️ ${userName}, that word is not allowed!\n` +
            `Warnings: ${userWarnings?.totalWarnings || 1}/${settings?.bannedWords.warningsBeforePunish}`,
            { reply_to_message_id: ctx.message.message_id }
          ).then((msg: any) => {
            setTimeout(() => ctx.deleteMessage(msg.message_id).catch(() => {}), 5000);
          });

          if (userWarnings && userWarnings.totalWarnings >= settings?.bannedWords.warningsBeforePunish) {
            await this.executeAction(ctx, userId, 'mute', communityId);
          }
          break;

        case 'mute':
          await this.executeAction(ctx, userId, 'mute', communityId);
          await send(ctx, `🔇 ${userName} has been muted for using banned words.`);
          break;

        case 'kick':
          await this.executeAction(ctx, userId, 'kick', communityId);
          await send(ctx, `👢 ${userName} has been kicked for using banned words.`);
          break;

        case 'ban':
          await this.executeAction(ctx, userId, 'ban', communityId);
          await send(ctx, `🚫 ${userName} has been banned for using banned words.`);
          break;
      }

      // Report if enabled
      if (settings?.reportSettings.enabled && settings?.reportSettings.autoReportBannedWords) {
        await this.sendReport(
          communityId,
          userId,
          userName,
          "Used banned word",
          ctx.chat.title,
          ctx.message.text,
          settings?.reportSettings.reportChannel
        );
      }
    } catch (error) {
      console.error("Error handling banned word:", error);
    }
  }

  // ============================================
  // SPAM DETECTION FUNCTIONS
  // ============================================

  private async trackMessage(
    userId: number,
    chatId: number,
    communityId: string,
    text: string,
    messageId: number
  ) {
    try {
      let tracker = await MessageTracker.findOne({ userId, chatId, communityId });

      if (!tracker) {
        tracker = new MessageTracker({
          userId,
          chatId,
          communityId,
          messages: []
        });
      }

      tracker.messages.push({
        text,
        timestamp: new Date(),
        messageId
      });

      // Keep only last 20 messages
      if (tracker.messages.length > 20) {
        tracker.messages = tracker.messages.slice(-20) as any;
      }

      await tracker.save();
    } catch (error) {
      console.error("Error tracking message:", error);
    }
  }

  private async checkSpam(
    userId: number,
    chatId: number,
    communityId: string,
    spamSettings: any
  ): Promise<boolean> {
    try {
      const tracker = await MessageTracker.findOne({ userId, chatId, communityId });
      if (!tracker) return false;

      const timeWindow = spamSettings.timeWindow * 1000;
      const now = Date.now();
      
      const recentMessages = tracker.messages.filter(
        msg => now - msg.timestamp.getTime() < timeWindow
      );

      return recentMessages.length >= spamSettings.maxMessages;
    } catch (error) {
      return false;
    }
  }

  private async handleSpam(ctx: any, communityId: string, spamSettings: any) {
    try {
      const userId = ctx.from.id;
      const userName = ctx.from.first_name;

      // Delete recent messages
      const tracker = await MessageTracker.findOne({
        userId,
        chatId: ctx.chat.id,
        communityId
      });

      if (tracker) {
        for (const msg of tracker.messages.slice(-5)) {
          try {
            await ctx.deleteMessage(msg.messageId);
          } catch (error) {}
        }
      }

      const action = spamSettings.action;
      await this.executeAction(ctx, userId, action, communityId, spamSettings.muteDuration);

      await send(ctx, 
        `⚠️ ${userName} has been detected for spamming and ${action}ed!`
      );

      // Report
      const settings = await this.getSettings(communityId);
      if (settings?.reportSettings.enabled && settings?.reportSettings.autoReportSpam) {
        await this.sendReport(
          communityId,
          userId,
          userName,
          "Spamming",
          ctx.chat.title,
          "Multiple messages in short time",
          settings?.reportSettings.reportChannel
        );
      }
    } catch (error) {
      console.error("Error handling spam:", error);
    }
  }

  // ============================================
  // FLOOD DETECTION FUNCTIONS
  // ============================================

  private async checkFlood(
    userId: number,
    chatId: number,
    communityId: string,
    text: string,
    floodSettings: any
  ): Promise<boolean> {
    try {
      const tracker = await MessageTracker.findOne({ userId, chatId, communityId });
      if (!tracker) return false;

      const recentMessages = tracker.messages.slice(-10);
      const sameMessages = recentMessages.filter(msg => msg.text === text);

      return sameMessages.length >= floodSettings.maxRepeats;
    } catch (error) {
      return false;
    }
  }

  private async handleFlood(ctx: any, communityId: string, floodSettings: any) {
    try {
      await ctx.deleteMessage();
      const action = floodSettings.action;
      await this.executeAction(ctx, ctx.from.id, action, communityId);
      
      await send(ctx, 
        `⚠️ ${ctx.from.first_name}, stop repeating the same message!`
      ).then((msg: any) => {
        setTimeout(() => ctx.deleteMessage(msg.message_id).catch(() => {}), 5000);
      });
    } catch (error) {
      console.error("Error handling flood:", error);
    }
  }

  // ============================================
  // MEDIA RESTRICTION FUNCTIONS
  // ============================================

  private checkRestrictedMedia(message: any, mediaSettings: any): boolean {
    if (mediaSettings.blockPhotos && message.photo) return true;
    if (mediaSettings.blockVideos && message.video) return true;
    if (mediaSettings.blockStickers && message.sticker) return true;
    if (mediaSettings.blockGifs && message.animation) return true;
    if (mediaSettings.blockDocuments && message.document) return true;
    if (mediaSettings.blockLinks && message.entities) {
      return message.entities.some((e: any) => e.type === 'url' || e.type === 'text_link');
    }
    return false;
  }

  private async handleRestrictedMedia(ctx: any, communityId: string) {
    try {
      await ctx.deleteMessage();
      await send(ctx, 
        `⚠️ ${ctx.from.first_name}, that type of media is not allowed in this group!`
      ).then((msg: any) => {
        setTimeout(() => ctx.deleteMessage(msg.message_id).catch(() => {}), 5000);
      });
    } catch (error) {
      console.error("Error handling restricted media:", error);
    }
  }

  // ============================================
  // NEW USER RESTRICTIONS
  // ============================================

  private async applyNewUserRestrictions(
    ctx: any,
    userId: number,
    restrictions: any
  ) {
    try {
      const untilDate = Math.floor(Date.now() / 1000) + restrictions.restrictDuration;

      await this.bot.telegram.restrictChatMember(ctx.chat.id, userId, {
        permissions: {
          can_send_messages: restrictions.canSendMessages,
          can_send_other_messages: restrictions.canSendStickers,
          can_send_polls: restrictions.canSendPolls,
          can_add_web_page_previews: false
        },
        until_date: untilDate
      });
    } catch (error) {
      console.error("Error applying new user restrictions:", error);
    }
  }

  // ============================================
  // WARNING SYSTEM FUNCTIONS
  // ============================================

  private async addWarning(
    communityId: string,
    userId: number,
    userName: string,
    reason: string,
    issuedBy: number,
    groupId: number
  ) {
    try {
      let userWarning = await UserWarning.findOne({ communityId, userId });

      if (!userWarning) {
        userWarning = new UserWarning({
          communityId,
          userId,
          userName,
          warnings: [],
          totalWarnings: 0
        });
      }

      userWarning.warnings.push({
        reason,
        timestamp: new Date(),
        issuedBy,
        groupId
      });

      userWarning.totalWarnings += 1;
      userWarning.lastWarning = new Date();

      await userWarning.save();
    } catch (error) {
      console.error("Error adding warning:", error);
    }
  }

  private async executeWarningAction(
    communityId: string,
    userId: number,
    userName: string,
    chatId: number,
    action: string
  ) {
    try {
      
      const groups = await Group.find({ communityId, isActive: true });

      for (const group of groups) {
        try {
          switch (action) {
            case 'mute':
              await this.bot.telegram.restrictChatMember(group.chatId, userId, {
                permissions: { can_send_messages: false },
                until_date: Math.floor(Date.now() / 1000) + 86400 // 24 hours
              });
              break;

            case 'kick':
              await this.bot.telegram.kickChatMember(group.chatId, userId);
              await this.bot.telegram.unbanChatMember(group.chatId, userId);
              break;

            case 'ban':
              await this.bot.telegram.banChatMember(group.chatId, userId);
              break;
          }
        } catch (error) {}
      }

      await this.bot.telegram.sendMessage(
        chatId,
        `⚠️ *Maximum warnings reached!*\n\n` +
        `👤 User: ${userName}\n` +
        `⚡ Action: ${action.toUpperCase()}\n` +
        `📊 Applied to all community groups`,
        { parse_mode: "Markdown" }
      ).catch(() => {});
    } catch (error) {
      console.error("Error executing warning action:", error);
    }
  }

  // ============================================
  // GENERAL ACTION EXECUTOR
  // ============================================

  private async executeAction(
    ctx: any,
    userId: number,
    action: string,
    communityId: string,
    duration?: number
  ) {
    try {
      switch (action) {
        case 'warn':
          await this.addWarning(
            communityId,
            userId,
            ctx.from.first_name,
            "Auto-moderation",
            0,
            ctx.chat.id
          );
          break;

        case 'mute':
          const muteUntil = Math.floor(Date.now() / 1000) + (duration || 3600);
          await this.bot.telegram.restrictChatMember(ctx.chat.id, userId, {
            permissions: { can_send_messages: false },
            until_date: muteUntil
          });
          break;

        case 'kick':
          await this.bot.telegram.kickChatMember(ctx.chat.id, userId);
          await this.bot.telegram.unbanChatMember(ctx.chat.id, userId);
          break;

        case 'ban':
          await this.bot.telegram.banChatMember(ctx.chat.id, userId);
          break;
      }
    } catch (error) {
      console.error("Error executing action:", error);
    }
  }

  // ============================================
  // REPORT SYSTEM
  // ============================================

  private async sendReport(
    communityId: string,
    userId: number,
    userName: string,
    reason: string,
    groupName: string,
    details: string,
    reportChannel?: string
  ) {
    try {
      const message = `
🚨 *Auto-Moderation Report*

👤 *User:* ${userName} (\`${userId}\`)
📁 *Group:* ${groupName}
⚠️ *Reason:* ${reason}

📝 *Details:*
${details}

🕐 *Time:* ${new Date().toLocaleString()}
🆔 *Community ID:* \`${communityId}\`
      `;

      if (reportChannel) {
        await this.bot.telegram.sendMessage(reportChannel, message, {
          parse_mode: "Markdown"
        });
      }

      // Notify community admins
      
      const community = await Community.findOne({ communityId });
      
      if (community) {
        // Send to owner
        try {
          await this.bot.telegram.sendMessage(community.ownerId, message, {
            parse_mode: "Markdown"
          });
        } catch (error) {}

        // Send to admins who have notification enabled
        for (const admin of community.admins) {
          try {
            await this.bot.telegram.sendMessage(admin?.userId!, message, {
              parse_mode: "Markdown"
            });
          } catch (error) {}
        }
      }
    } catch (error) {
      console.error("Error sending report:", error);
    }
  }

  // ============================================
  // AUTO-DELETE QUEUE
  // ============================================
  private async queueForDeletion(
    communityId: string,
    chatId: number,
    messageId: number,
    userId: number,
    deleteAfter: number
  ) {
    try {
      const settings = await this.getSettings(communityId);
      
      // Check if user should be excluded
      if (settings?.autoDelete.excludeAdmins) {
        const isAdmin = await this.isGroupAdmin({ chat: { id: chatId }, from: { id: userId } });
        if (isAdmin) return;
      }

      // Check if specific user is targeted
      if (settings?.autoDelete.specificUsers && settings?.autoDelete.specificUsers.length > 0) {
        if (!settings?.autoDelete.specificUsers.includes(userId)) return;
      }

      const deleteAt = new Date(Date.now() + (deleteAfter * 1000));

      await AutoDeleteQueue.create({
        communityId,
        chatId,
        messageId,
        userId,
        deleteAt,
        processed: false
      });
    } catch (error) {
      console.error("Error queuing message for deletion:", error);
    }
  }
}

// ============================================
// EXPORT AND INITIALIZATION
// ============================================

export async function initializeAutoModeration(bot: Telegraf) {
  const autoMod = new AutoModerationSystem(bot);
  console.log("✅ Auto-Moderation System Initialized");
  return autoMod;
}

export default {
  AutoModerationSystem,
  initializeAutoModeration,
  AutoModSettings,
  UserWarning,
  MessageTracker,
  AutoDeleteQueue
};