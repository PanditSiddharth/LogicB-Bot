// ============================================
// UTILITY COMMANDS PART 2
// functions/bot/utility_commands_part2.ts
// Settings, Dashboard Callbacks, Utilities
// ============================================

import { Telegraf } from "telegraf";
import mongoose from "mongoose";
import { AutoModSettings, Community, GlobalBan, Group, UserCommunity } from "../../mongo";

export class UtilityPart2 {
  
  static initialize(bot: Telegraf) {
    console.log("🔧 Loading Part 2: Settings, Callbacks...");
    
    this.initializeSettings(bot);
    this.initializeDashboardCallbacks(bot);
    this.initializeActionCallbacks(bot);
    
    console.log("✅ Part 2 Loaded!");
  }

  // ============================================
  // SETTINGS COMMANDS
  // ============================================
  private static initializeSettings(bot: Telegraf) {
    
    // Community Info
    bot.command("communityinfo", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community. Use /mycommunities");
        }
        
        const groups = await Group.countDocuments({ 
          communityId: community.communityId,
          isActive: true 
        });
        
        const bans = await GlobalBan.countDocuments({ 
          communityId: community.communityId,
          isActive: true 
        });

        const adminList = community.admins.map((a: any) => 
          `   • ${a.userName} (${a.userId})`
        ).join('\n') || "   No admins";

        const message = `
📊 *Community Information*

📋 *Name:* ${community.communityName}
🆔 *ID:* \`${community.communityId}\`
👑 *Owner:* ${community.ownerName}

📊 *Statistics:*
   📁 Groups: ${groups}
   🚫 Bans: ${bans}
   👥 Admins: ${community.admins.length}
   💬 Messages: ${(community.stats?.totalMessages || 0).toLocaleString()}

👥 *Admins:*
${adminList}

📅 *Created:* ${community.createdAt.toLocaleDateString()}
⏰ *Days Active:* ${Math.floor((Date.now() - community.createdAt.getTime()) / 86400000)}

⚙️ *Settings:*
   ${community.settings?.allowAutoModeration ? '✅' : '❌'} Auto Moderation
   ${community.settings?.welcomeMessage ? '✅' : '❌'} Welcome Message
   ${community.settings?.logChannel ? '✅' : '❌'} Log Channel
        `;

        await ctx.reply(message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Remove Admin
    bot.command("removeadmin", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        if (community.ownerId !== ctx.from.id) {
          return ctx.reply("❌ Only owner can remove admins!");
        }

        if (!ctx.message.reply_to_message) {
          return ctx.reply("❌ Reply to admin's message to remove.");
        }

        const adminId = ctx.message.reply_to_message.from.id;
        const adminIndex = community.admins.findIndex((a: any) => a.userId === adminId);

        if (adminIndex === -1) {
          return ctx.reply("❌ User is not an admin!");
        }

        const removedAdmin = community.admins[adminIndex];
        community.admins.splice(adminIndex, 1);
        await community.save();

        await ctx.reply(`✅ ${removedAdmin.userName} removed as admin.`);
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Delete Community
    bot.command("deletecommunity", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        if (community.ownerId !== ctx.from.id) {
          return ctx.reply("❌ Only owner can delete!");
        }

        const keyboard = {
          inline_keyboard: [
            [
              { text: "❌ Cancel", callback_data: "delete_cancel" },
              { text: "✅ Confirm", callback_data: `delete_confirm_${community.communityId}` }
            ]
          ]
        };

        await ctx.reply(
          `⚠️ *WARNING*\n\n` +
          `Delete "${community.communityName}"?\n\n` +
          `This will:\n` +
          `• Remove all groups\n` +
          `• Remove all admins\n` +
          `• Clear ban lists\n` +
          `• Delete settings\n\n` +
          `*Cannot be undone!*`,
          { parse_mode: "Markdown", reply_markup: keyboard }
        );
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Export Data
    bot.command("exportdata", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        if (community.ownerId !== ctx.from.id) {
          return ctx.reply("❌ Only owner can export!");
        }

        const groups = await Group.find({ communityId: community.communityId });
        const bans = await GlobalBan.find({ communityId: community.communityId });

        const exportData = {
          community: {
            id: community.communityId,
            name: community.communityName,
            owner: community.ownerName,
            created: community.createdAt,
            stats: community.stats
          },
          groups: groups.map((g: any) => ({
            name: g.groupName,
            id: g.chatId,
            username: g.username,
            added: g.addedAt
          })),
          bans: bans.map((b: any) => ({
            user: b.userName,
            userId: b.userId,
            reason: b.reason,
            date: b.bannedAt
          })),
          admins: community.admins,
          exportDate: new Date()
        };

        const jsonData = JSON.stringify(exportData, null, 2);
        
        await ctx.replyWithDocument({
          source: Buffer.from(jsonData),
          filename: `${community.communityName}_${Date.now()}.json`
        }, {
          caption: `📊 Export: ${community.communityName}`
        });
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Find User
    bot.command("finduser", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        const args = ctx.message.text.split(" ");
        if (args.length < 2) {
          return ctx.reply("❌ Usage: /finduser <user_id>");
        }

        const userId = parseInt(args[1]);
        if (isNaN(userId)) {
          return ctx.reply("❌ Invalid user ID!");
        }

        const ban = await GlobalBan.findOne({
          communityId: community.communityId,
          userId: userId,
          isActive: true
        });

        const groupCount = await Group.countDocuments({ 
          communityId: community.communityId,
          isActive: true 
        });

        let message = `🔍 *User Search*\n\n`;
        message += `👤 ID: \`${userId}\`\n\n`;

        if (ban) {
          message += `🚫 *Status:* BANNED\n`;
          message += `📝 Reason: ${ban.reason}\n`;
          message += `📅 Date: ${ban.bannedAt.toLocaleDateString()}\n`;
        } else {
          message += `✅ *Status:* Not banned\n\n`;
        }

        message += `📁 Community has ${groupCount} groups`;

        await ctx.reply(message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });
  }

  // ============================================
  // DASHBOARD CALLBACKS
  // ============================================
  private static initializeDashboardCallbacks(bot: Telegraf) {
    
    // Groups
    bot.action("dash_groups", async (ctx: any) => {
      try {
        await ctx.answerCbQuery();
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.editMessageText("❌ No active community.");
        }

        const groups = await Group.find({ 
          communityId: community.communityId,
          isActive: true 
        }).limit(20);

        if (groups.length === 0) {
          return ctx.editMessageText(
            "📁 *No Groups*\n\n" +
            "Add groups:\n" +
            "1. Go to group\n" +
            "2. Make bot admin\n" +
            "3. \`/addgroup\`\n\n" +
            "Back: /dashboard",
            { parse_mode: "Markdown" }
          );
        }

        let message = `📁 *Groups - ${community.communityName}*\n\n`;
        message += `Total: ${groups.length}\n\n`;
        
        groups.forEach((group: any, i: number) => {
          message += `${i + 1}. *${group.groupName}*\n`;
          message += `   ${group.username ? '@' + group.username : `ID: ${group.chatId}`}\n`;
          message += `   ${group.addedAt.toLocaleDateString()}\n\n`;
        });

        message += `*Commands:*\n`;
        message += `\`/listgroups\` | \`/addgroup\` | \`/removegroup\``;

        const keyboard = {
          inline_keyboard: [[
            { text: "🔙 Back", callback_data: "dash_back" }
          ]]
        };

        await ctx.editMessageText(message, { 
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } catch (error: any) {
        await ctx.answerCbQuery("Error");
      }
    });

    // Admins
    bot.action("dash_admins", async (ctx: any) => {
      try {
        await ctx.answerCbQuery();
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.editMessageText("❌ No active community.");
        }

        let message = `👥 *Admins - ${community.communityName}*\n\n`;
        message += `👑 *Owner:* ${community.ownerName}\n\n`;

        if (community.admins.length === 0) {
          message += `No admins yet.\n\n`;
        } else {
          message += `*Admins (${community.admins.length}):*\n\n`;
          
          community.admins.forEach((admin: any, i: number) => {
            message += `${i + 1}. *${admin.userName}*\n`;
            message += `   ${admin.permissions?.canAddGroups ? '✅' : '❌'} Add Groups\n`;
            message += `   ${admin.permissions?.canBan ? '✅' : '❌'} Ban\n`;
            message += `   ${admin.permissions?.canBroadcast ? '✅' : '❌'} Broadcast\n\n`;
          });
        }

        message += `*Commands:*\n`;
        message += `\`/addadmin\` | \`/removeadmin\` | \`/setperm\``;

        const keyboard = {
          inline_keyboard: [[
            { text: "🔙 Back", callback_data: "dash_back" }
          ]]
        };

        await ctx.editMessageText(message, { 
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } catch (error: any) {
        await ctx.answerCbQuery("Error");
      }
    });

    // Bans
    bot.action("dash_bans", async (ctx: any) => {
      try {
        await ctx.answerCbQuery();
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.editMessageText("❌ No active community.");
        }

        const bans = await GlobalBan.find({ 
          communityId: community.communityId,
          isActive: true 
        }).limit(20).sort({ bannedAt: -1 });

        if (bans.length === 0) {
          return ctx.editMessageText(
            "✅ *No Bans*\n\n" +
            `${community.communityName} has no banned users.\n\n` +
            "Back: /dashboard",
            { parse_mode: "Markdown" }
          );
        }

        let message = `🚫 *Ban List - ${community.communityName}*\n\n`;
        message += `Total: ${bans.length}\n\n`;

        bans.forEach((ban: any, i: number) => {
          message += `${i + 1}. *${ban.userName}* (${ban.userId})\n`;
          message += `   📝 ${ban.reason}\n`;
          message += `   📅 ${ban.bannedAt.toLocaleDateString()}\n\n`;
        });

        message += `*Commands:*\n\`/banlist\` | \`/cgban\` | \`/cunban\``;

        const keyboard = {
          inline_keyboard: [[
            { text: "🔙 Back", callback_data: "dash_back" }
          ]]
        };

        await ctx.editMessageText(message, { 
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } catch (error: any) {
        await ctx.answerCbQuery("Error");
      }
    });

    // Stats
    bot.action("dash_stats", async (ctx: any) => {
      try {
        await ctx.answerCbQuery();
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.editMessageText("❌ No active community.");
        }

        const groups = await Group.countDocuments({ 
          communityId: community.communityId,
          isActive: true 
        });
        
        const bans = await GlobalBan.countDocuments({ 
          communityId: community.communityId,
          isActive: true 
        });

        const message = `
📊 *Statistics*

*${community.communityName}*
Owner: ${community.ownerName}

📈 *Overview:*
📁 Groups: ${groups}
👥 Admins: ${community.admins.length}
🚫 Bans: ${bans}

📊 *Activity:*
💬 Messages: ${(community.stats?.totalMessages || 0).toLocaleString()}
🔨 Total Bans: ${community.stats?.totalBans || 0}

📅 *Timeline:*
Created: ${community.createdAt.toLocaleDateString()}
Days: ${Math.floor((Date.now() - community.createdAt.getTime()) / 86400000)}

\`/stats\` | \`/communityinfo\`
        `;

        const keyboard = {
          inline_keyboard: [
            [
              { text: "📊 Export", callback_data: "dash_export" },
              { text: "🔙 Back", callback_data: "dash_back" }
            ]
          ]
        };

        await ctx.editMessageText(message, { 
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } catch (error: any) {
        await ctx.answerCbQuery("Error");
      }
    });

    // Settings
    bot.action("dash_settings", async (ctx: any) => {
      try {
        await ctx.answerCbQuery();
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.editMessageText("❌ No active community.");
        }

        let autoMod = await AutoModSettings.findOne({ 
          communityId: community.communityId 
        });

        if (!autoMod) {
          autoMod = await AutoModSettings.create({ 
            communityId: community.communityId 
          });
        }

        const message = `
⚙️ *Settings - ${community.communityName}*

*Community:*
${community.settings?.allowAutoModeration ? '✅' : '❌'} Auto Moderation
${community.settings?.welcomeMessage ? '✅' : '❌'} Welcome Message
${community.settings?.logChannel ? '✅' : '❌'} Log Channel

*Auto-Moderation:*
${autoMod.bannedWords?.enabled ? '✅' : '❌'} Banned Words (${autoMod.bannedWords?.words?.length || 0})
${autoMod.antiSpam?.enabled ? '✅' : '❌'} Anti-Spam
${autoMod.antiFlood?.enabled ? '✅' : '❌'} Anti-Flood
${autoMod.mediaRestrictions?.enabled ? '✅' : '❌'} Media
${autoMod.warningSystem?.enabled ? '✅' : '❌'} Warnings

\`/automod\` | \`/settings\`
        `;

        const keyboard = {
          inline_keyboard: [
            [
              { text: "🤖 Auto-Mod", callback_data: "dash_automod" },
              { text: "🔙 Back", callback_data: "dash_back" }
            ]
          ]
        };

        await ctx.editMessageText(message, { 
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } catch (error: any) {
        await ctx.answerCbQuery("Error");
      }
    });

    // Broadcast
    bot.action("dash_broadcast", async (ctx: any) => {
      try {
        await ctx.answerCbQuery();
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.editMessageText("❌ No active community.");
        }

        
        const groupCount = await Group.countDocuments({ 
          communityId: community.communityId,
          isActive: true 
        });

        const message = `
📨 *Broadcast*

*Community:* ${community.communityName}
*Target:* ${groupCount} groups

*How to:*
1. Send message to bot
2. Reply to it
3. Use \`/cbroadcast\`

*Example:*
\`\`\`
Your announcement
(with media)

Reply: /cbroadcast
\`\`\`

*Note:*
• Sends to all ${groupCount} groups
• Takes few minutes
• Bot must be admin

Back: /dashboard
        `;

        const keyboard = {
          inline_keyboard: [[
            { text: "🔙 Back", callback_data: "dash_back" }
          ]]
        };

        await ctx.editMessageText(message, { 
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } catch (error: any) {
        await ctx.answerCbQuery("Error");
      }
    });

    // Switch
    bot.action("dash_switch", async (ctx: any) => {
      try {
        await ctx.answerCbQuery();
        
        const userComm = await UserCommunity.findOne({ userId: ctx.from.id });
        
        if (!userComm || userComm.communities.length === 0) {
          return ctx.editMessageText(
            "📋 No communities.\n\nCreate: \`/createcommunity <n>\`",
            { parse_mode: "Markdown" }
          );
        }

        const communities = await Community.find({ 
          communityId: { $in: userComm.communities } 
        });

        let message = `🔄 *Switch Community*\n\nSelect:\n\n`;
        
        const keyboard = {
          inline_keyboard: communities.map((comm: any) => ([
            { 
              text: `${userComm.activeCommunity === comm.communityId ? '✅' : '⚪'} ${comm.communityName}`,
              callback_data: `switch_${comm.communityId}`
            }
          ]))
        };

        keyboard.inline_keyboard.push([
          { text: "🔙 Back", callback_data: "dash_back" }
        ]);

        await ctx.editMessageText(message, {
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } catch (error: any) {
        await ctx.answerCbQuery("Error");
      }
    });

    // Auto-Mod
    bot.action("dash_automod", async (ctx: any) => {
      try {
        await ctx.answerCbQuery("Opening...");
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.editMessageText("❌ No active community.");
        }

        await ctx.editMessageText(
          `🤖 *Auto-Moderation*\n\n` +
          `Community: ${community.communityName}\n\n` +
          `Use \`/automod\` for full dashboard\n\n` +
          `Quick:\n` +
          `\`/addword <words>\` - Add words\n` +
          `\`/antispam_toggle\` - Toggle spam\n` +
          `\`/mediarestrict\` - Media settings`,
          { parse_mode: "Markdown" }
        );
      } catch (error: any) {
        await ctx.answerCbQuery("Error");
      }
    });

    // Export
    bot.action("dash_export", async (ctx: any) => {
      try {
        await ctx.answerCbQuery("Exporting...");
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return;

        if (community.ownerId !== ctx.from.id) {
          return ctx.answerCbQuery("❌ Only owner!", true);
        }

        const groups = await Group.find({ communityId: community.communityId });
        const bans = await GlobalBan.find({ communityId: community.communityId });

        const exportData = {
          community: {
            id: community.communityId,
            name: community.communityName,
            owner: community.ownerName,
            stats: community.stats
          },
          groups: groups.map((g: any) => ({
            name: g.groupName,
            id: g.chatId,
            username: g.username
          })),
          bans: bans.map((b: any) => ({
            user: b.userName,
            userId: b.userId,
            reason: b.reason
          })),
          admins: community.admins,
          date: new Date()
        };

        const jsonData = JSON.stringify(exportData, null, 2);
        
        await ctx.replyWithDocument({
          source: Buffer.from(jsonData),
          filename: `${community.communityName}_${Date.now()}.json`
        }, {
          caption: `📊 ${community.communityName}`
        });

        await ctx.answerCbQuery("✅ Exported!");
      } catch (error: any) {
        await ctx.answerCbQuery("❌ Failed!");
      }
    });

    // Back
    bot.action("dash_back", async (ctx: any) => {
      try {
        await ctx.answerCbQuery();
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.editMessageText("❌ No active community.");
        }

        
        const groups = await Group.countDocuments({ 
          communityId: community.communityId,
          isActive: true 
        });
        
        const bans = await GlobalBan.countDocuments({ 
          communityId: community.communityId,
          isActive: true 
        });

        const message = `
📊 *${community.communityName} Dashboard*

🆔 ID: \`${community.communityId}\`
👑 Owner: ${community.ownerName}
📁 Groups: ${groups}
🚫 Bans: ${bans}
👥 Admins: ${community.admins.length}

📅 Created: ${community.createdAt.toLocaleDateString()}
        `;

        const keyboard = {
          inline_keyboard: [
            [
              { text: "📁 Groups", callback_data: "dash_groups" },
              { text: "👥 Admins", callback_data: "dash_admins" }
            ],
            [
              { text: "🚫 Bans", callback_data: "dash_bans" },
              { text: "📊 Stats", callback_data: "dash_stats" }
            ],
            [
              { text: "⚙️ Settings", callback_data: "dash_settings" },
              { text: "📨 Broadcast", callback_data: "dash_broadcast" }
            ],
            [
              { text: "🔄 Switch", callback_data: "dash_switch" }
            ]
          ]
        };

        await ctx.editMessageText(message, { 
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } catch (error: any) {
        await ctx.answerCbQuery("Error");
      }
    });
  }

  // ============================================
  // ACTION CALLBACKS
  // ============================================
  private static initializeActionCallbacks(bot: Telegraf) {
    
    // Delete Community
    bot.action(/^delete_confirm_(.+)$/, async (ctx: any) => {
      try {
        const communityId = ctx.match[1];
        const community = await Community.findOne({ communityId });

        if (!community || community.ownerId !== ctx.from.id) {
          return ctx.answerCbQuery("❌ Unauthorized!", true);
        }

        await Group.deleteMany({ communityId });
        await GlobalBan.deleteMany({ communityId });
        await Community.deleteOne({ communityId });

        await UserCommunity.updateMany(
          { communities: communityId },
          { 
            $pull: { communities: communityId },
            $unset: { activeCommunity: "" }
          }
        );

        await ctx.answerCbQuery("✅ Deleted!");
        await ctx.editMessageText(
          `✅ *Deleted*\n\n` +
          `"${community.communityName}" removed.\n` +
          `All data cleared.`,
          { parse_mode: "Markdown" }
        );
      } catch (error: any) {
        await ctx.answerCbQuery("❌ Error!");
      }
    });

    bot.action("delete_cancel", async (ctx: any) => {
      await ctx.answerCbQuery("Cancelled");
      await ctx.editMessageText("❌ Deletion cancelled.");
    });

    // Switch Community
    bot.action(/^switch_(.+)$/, async (ctx: any) => {
      try {
        const communityId = ctx.match[1];
        const userComm = await UserCommunity.findOne({ userId: ctx.from.id });

        if (userComm && userComm.communities.includes(communityId)) {
          userComm.activeCommunity = communityId;
          await userComm.save();

          const community = await Community.findOne({ communityId });
          
          await ctx.answerCbQuery(`✅ Switched to: ${community?.communityName}`);
          await ctx.editMessageText(
            `✅ *Switched*\n\n` +
            `Active: ${community?.communityName}\n\n` +
            `Use \`/dashboard\` to manage.`,
            { parse_mode: "Markdown" }
          );
        }
      } catch (error: any) {
        await ctx.answerCbQuery("❌ Error!");
      }
    });
  }

  // ============================================
  // HELPER
  // ============================================
  private static async getActiveCommunity(userId: number) {
    try {
      
      const userComm = await UserCommunity.findOne({ userId });
      if (!userComm || !userComm.activeCommunity) return null;
      
      return await Community.findOne({ 
        communityId: userComm.activeCommunity 
      });
    } catch {
      return null;
    }
  }
}
