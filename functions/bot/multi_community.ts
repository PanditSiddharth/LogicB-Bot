// ============================================
// Multi-Community Management System
// Allows multiple users to create and manage their own communities
// ============================================

import { Context, Telegraf } from "telegraf";
import {  Community, Group, GlobalBan, UserCommunity } from "../../mongo"
import { BotHelpers } from "../utils/helpers";
import { ChatMemberAdministrator } from "telegraf/types";
// ============================================
// COMMUNITY MANAGEMENT CLASS
// ============================================

export class CommunityManager {
  bot: Telegraf;

  constructor(bot: Telegraf) {
    this.bot = bot;
    this.initializeCommands();
  }

  initializeCommands() {
    // Community Management Commands
    this.setupCommunityCommands();
    this.setupGroupCommands();
    this.setupModerationCommands();
    this.setupSettingsCommands();
    this.setupCallbacks();
  }

  // ============================================
  // COMMUNITY COMMANDS
  // ============================================

  setupCommunityCommands() {
    // Create a new community
    this.bot.command("createcommunity", async (ctx: any) => {
      try {
        const args = ctx.message.text.split(" ").slice(1);
        
        if (args.length < 1) {
          return ctx.reply(
            "❌ Usage: /createcommunity <CommunityName>\n\n" +
            "Example: /createcommunity MyAwesomeCommunity"
          );
        }

        const communityName = args.join(" ");
        const communityId = this.generateCommunityId();

        // Check if user already has too many communities (limit: 5)
        const userComm = await UserCommunity.findOne({ userId: ctx.from.id });
        if (userComm && userComm.communities.length >= 5) {
          return ctx.reply("❌ You can only create up to 5 communities!");
        }

        const community = await Community.create({
          communityId,
          ownerId: ctx.from.id,
          ownerName: ctx.from.first_name,
          communityName
        });

        // Update user-community mapping
        if (userComm) {
          userComm.communities.push(communityId);
          if (!userComm.activeCommunity) {
            userComm.activeCommunity = communityId;
          }
          await userComm.save();
        } else {
          await UserCommunity.create({
            userId: ctx.from.id,
            activeCommunity: communityId,
            communities: [communityId]
          });
        }

        await ctx.reply(
          `✅ *Community Created Successfully!*\n\n` +
          `📋 Name: ${communityName}\n` +
          `🆔 ID: \`${communityId}\`\n` +
          `👑 Owner: ${ctx.from.first_name}\n\n` +
          `Now add groups using: /addgroup\n` +
          `View dashboard: /dashboard`,
          { parse_mode: "Markdown" }
        );
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // List user's communities
    this.bot.command("mycommunities", async (ctx: any) => {
      try {
        const userComm = await UserCommunity.findOne({ userId: ctx.from.id });
        
        if (!userComm || userComm.communities.length === 0) {
          return ctx.reply(
            "📋 You don't have any communities yet.\n\n" +
            "Create one with: /createcommunity <name>"
          );
        }

        const communities = await Community.find({ 
          communityId: { $in: userComm.communities } 
        });

        let message = `📋 *Your Communities (${communities.length})*\n\n`;
        
        for (const comm of communities) {
          const isActive = userComm.activeCommunity === comm.communityId;
          const groups = await Group.countDocuments({ communityId: comm.communityId });
          
          message += `${isActive ? "✅" : "⚪"} *${comm.communityName}*\n`;
          message += `   🆔 \`${comm.communityId}\`\n`;
          message += `   📁 Groups: ${groups}\n`;
          message += `   ${isActive ? "*(Active)*" : ""}\n\n`;
        }

        message += `\nSwitch community: /switchcommunity <ID>`;

        const keyboard = {
          inline_keyboard: communities.map(comm => ([
            { 
              text: `${userComm.activeCommunity === comm.communityId ? "✅" : ""} ${comm.communityName}`,
              callback_data: `switch_${comm.communityId}`
            }
          ]))
        };

        await ctx.reply(message, { 
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Switch active community
    this.bot.command("switchcommunity", async (ctx: any) => {
      const args = ctx.message.text.split(" ");
      if (args.length < 2) {
        return ctx.reply("❌ Usage: /switchcommunity <community_id>");
      }

      const communityId = args[1];
      const userComm = await UserCommunity.findOne({ userId: ctx.from.id });

      if (!userComm || !userComm.communities.includes(communityId)) {
        return ctx.reply("❌ You don't have access to this community!");
      }

      userComm.activeCommunity = communityId;
      await userComm.save();

      const community = await Community.findOne({ communityId });
      await ctx.reply(
        `✅ Switched to: *${community?.communityName}*\n` +
        `All commands will now work with this community.`,
        { parse_mode: "Markdown" }
      );
    });

    // Community Dashboard
    this.bot.command("dashboard", async (ctx: any) => {
      try {
        const activeCommunity = await this.getActiveCommunity(ctx.from.id);
        if (!activeCommunity) {
          return ctx.reply("❌ No active community. Use /mycommunities to select one.");
        }

        const groups = await Group.countDocuments({ 
          communityId: activeCommunity.communityId,
          isActive: true 
        });
        
        const bans = await GlobalBan.countDocuments({ 
          communityId: activeCommunity.communityId,
          isActive: true 
        });

        const message = `
📊 *${activeCommunity.communityName} Dashboard*

🆔 ID: \`${activeCommunity.communityId}\`
👑 Owner: ${activeCommunity.ownerName}
📁 Groups: ${groups}
🚫 Global Bans: ${bans}
👥 Admins: ${activeCommunity.admins.length}

📅 Created: ${activeCommunity.createdAt.toLocaleDateString()}
        `;

        const keyboard = {
          inline_keyboard: [
            [
              { text: "📁 Manage Groups", callback_data: "dash_groups" },
              { text: "👥 Manage Admins", callback_data: "dash_admins" }
            ],
            [
              { text: "🚫 Ban List", callback_data: "dash_bans" },
              { text: "📊 Statistics", callback_data: "dash_stats" }
            ],
            [
              { text: "⚙️ Settings", callback_data: "dash_settings" },
              { text: "📨 Broadcast", callback_data: "dash_broadcast" }
            ],
            [
              { text: "🔄 Switch Community", callback_data: "dash_switch" }
            ]
          ]
        };

        await ctx.reply(message, { 
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Add admin to community
    this.bot.command("addadmin", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        if (community.ownerId !== ctx.from.id) {
          return ctx.reply("❌ Only community owner can add admins!");
        }

        if (!ctx.message.reply_to_message) {
          return ctx.reply("❌ Reply to a user's message to add them as admin.");
        }

        const newAdminId = ctx.message.reply_to_message.from.id;
        const newAdminName = ctx.message.reply_to_message.from.first_name;

        // Check if already admin
        if (community.admins.some((a: any) => a.userId === newAdminId)) {
          return ctx.reply("❌ User is already an admin!");
        }

        community.admins.push({
          userId: newAdminId,
          userName: newAdminName,
          permissions: {
            canAddGroups: true,
            canRemoveGroups: false,
            canBan: true,
            canMute: true,
            canBroadcast: false,
            canManageAdmins: false
          }
        });

        await community.save();

        // Add community to admin's list
        let userComm = await UserCommunity.findOne({ userId: newAdminId });
        if (userComm) {
          if (!userComm.communities.includes(community.communityId)) {
            userComm.communities.push(community.communityId);
            await userComm.save();
          }
        } else {
          await UserCommunity.create({
            userId: newAdminId,
            activeCommunity: community.communityId,
            communities: [community.communityId]
          });
        }

        await ctx.reply(
          `✅ ${newAdminName} has been added as admin!\n` +
          `Use /setpermissions to configure their permissions.`
        );
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });
  }

  // ============================================
  // GROUP MANAGEMENT COMMANDS
  // ============================================

  setupGroupCommands() {
    // Add current group to community
    this.bot.command("addgroup", async (ctx: Context<any>) => {
      try {
        // Check if command is used in a group
        if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
          return ctx.reply("❌ This command can only be used in groups!");
        }

        const member = await ctx.getChatMember(ctx?.from?.id!);

         if (member.status !== "administrator" && member.status !== "creator") 
          return BotHelpers.send(ctx, "You must be an admin to add this group to a community.", 
        {type: "warnings"}
          );
          if(member.status === "administrator") {
            if(!member.can_manage_chat || !member.can_delete_messages ||
              !member.can_restrict_members
            ) 
           return BotHelpers.send(ctx, "You must be admin with delete, ban users and manage group permission to add this group to a community.",
            {type: "warnings"}
            )
          }

        const community = await this.getActiveCommunity(ctx?.from?.id!);
        if (!community) {
          return ctx.reply(
            "❌ No active community!\n\n" +
            "First create or switch to a community:\n" +
            "/createcommunity or /mycommunities"
          );
        }

        // Check permissions
        if (!await this.hasPermission(ctx.message.from.id, community, "canAddGroups")) {
          return ctx.reply("❌ You don't have permission to add groups!");
        }

        // Check if group already exists
        const existingGroup = await Group.findOne({ chatId: ctx.chat.id });
        if (existingGroup) {
          return ctx.reply(
            `❌ This group is already registered!\n` +
            `Community: ${existingGroup.communityId}`
          );
        }

        // Add group
        await Group.create({
          chatId: ctx.chat.id,
          communityId: community.communityId,
          username: ctx.chat.username || "",
          groupName: ctx.chat.title,
          addedBy: ctx.message.from.id
        });

        // Update community stats
  if (community.stats) community.stats.totalGroups += 1;
        await community.save();

        await ctx.reply(
          `✅ *Group Added to Community!*\n\n` +
          `📁 Group: ${ctx.chat.title}\n` +
          `🏠 Community: ${community.communityName}\n` +
          `🆔 Community ID: \`${community.communityId}\`\n\n` +
          `Now this group is managed by the bot!`,
          { parse_mode: "Markdown" }
        );
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Remove group from community
    this.bot.command("removegroup", async (ctx: any) => {
      try {
        if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
          return ctx.reply("❌ This command can only be used in groups!");
        }

        const group = await Group.findOne({ chatId: ctx.chat.id });
        if (!group) {
          return ctx.reply("❌ This group is not registered!");
        }

        const community = await Community.findOne({ 
          communityId: group.communityId 
        });

        if (!community) {
          return ctx.reply("❌ Community not found!");
        }

        // Check permissions
        if (!await this.hasPermission(ctx.from.id, community, "canRemoveGroups")) {
          return ctx.reply("❌ You don't have permission to remove groups!");
        }

        group.isActive = false;
        await group.save();

  if (community.stats) community.stats.totalGroups -= 1;
        await community.save();

        await ctx.reply(
          `✅ Group removed from community!\n` +
          `The bot will no longer manage this group.`
        );
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // List all groups in community
    this.bot.command("listgroups", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        const groups = await Group.find({ 
          communityId: community.communityId,
          isActive: true 
        });

        if (groups.length === 0) {
          return ctx.reply(
            "📁 No groups in this community yet.\n\n" +
            "Add groups using /addgroup in each group."
          );
        }

        let message = `📁 <b>Groups in ${community.communityName}</b> (${groups.length})\n\n`;
        
        groups.forEach((group, index) => {
          message += `${index + 1}. <b>${group.groupName}</b>\n`;
          message += `   ${group.username ? `@${group.username}` : `ID: ${group.chatId}`}\n`;
          message += `   Added: ${group.addedAt.toLocaleDateString()}\n\n`;
        });

        await ctx.reply(message, { parse_mode: "html" });
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });
  }

  // ============================================
  // MODERATION COMMANDS
  // ============================================

  setupModerationCommands() {
    // Global Ban across all groups in community
    this.bot.command("cgban", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        if (!await this.hasPermission(ctx.from.id, community, "canBan")) {
          return ctx.reply("❌ You don't have permission to ban users!");
        }

        const user = await this.identifyUser(ctx);
        if (!user) {
          return ctx.reply("❌ Please specify a user (reply, mention, or ID)");
        }

        const args = ctx.message.text.split(" ");
        const reason = args.slice(2).join(" ") || "No reason provided";

        // Add to global ban list
        await GlobalBan.create({
          communityId: community.communityId,
          userId: user.userId,
          userName: user.name,
          reason,
          bannedBy: ctx.from.id
        });

        // Ban from all groups
        const groups = await Group.find({ 
          communityId: community.communityId,
          isActive: true 
        });

        let success = 0;
        let failed = 0;

        const statusMsg = await ctx.reply(
          `🔨 Banning ${user.name} from ${groups.length} groups...`
        );

        for (const group of groups) {
          try {
            await this.bot.telegram.banChatMember(group.chatId, user.userId);
            success++;
          } catch (error) {
            failed++;
          }

          if ((success + failed) % 5 === 0) {
            await this.bot.telegram.editMessageText(
              ctx.chat.id,
              statusMsg.message_id,
              undefined,
              `🔨 Progress: ${success + failed}/${groups.length}\n✅ ${success} | ❌ ${failed}`
            ).catch(() => {});
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        }

  if (community.stats) community.stats.totalBans += 1;
        await community.save();

        await ctx.reply(
          `✅ *Community Ban Complete*\n\n` +
          `👤 User: ${user.name} (${user.userId})\n` +
          `📝 Reason: ${reason}\n` +
          `✅ Success: ${success} groups\n` +
          `❌ Failed: ${failed} groups`,
          { parse_mode: "Markdown" }
        );
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Global Unban
    this.bot.command("cunban", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        if (!await this.hasPermission(ctx.from.id, community, "canBan")) {
          return ctx.reply("❌ You don't have permission!");
        }

        const user = await this.identifyUser(ctx);
        if (!user) return ctx.reply("❌ Please specify a user");

        // Remove from ban list
        await GlobalBan.updateOne(
          { communityId: community.communityId, userId: user.userId },
          { isActive: false }
        );

        // Unban from all groups
        const groups = await Group.find({ 
          communityId: community.communityId,
          isActive: true 
        });

        let success = 0;
        const statusMsg = await ctx.reply(`🔓 Unbanning ${user.name}...`);

        for (const group of groups) {
          try {
            await this.bot.telegram.unbanChatMember(group.chatId, user.userId);
            success++;
          } catch (error) {}
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        await ctx.reply(
          `✅ *Community Unban Complete*\n\n` +
          `👤 User: ${user.name}\n` +
          `✅ Unbanned from: ${success} groups`,
          { parse_mode: "Markdown" }
        );
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Broadcast message to all groups
    this.bot.command("cbroadcast", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        if (!await this.hasPermission(ctx.from.id, community, "canBroadcast")) {
          return ctx.reply("❌ You don't have permission to broadcast!");
        }

        if (!ctx.message.reply_to_message) {
          return ctx.reply("❌ Please reply to a message to broadcast it.");
        }

        const groups = await Group.find({ 
          communityId: community.communityId,
          isActive: true 
        });

        let success = 0;
        let failed = 0;

        const statusMsg = await ctx.reply(
          `📡 Broadcasting to ${groups.length} groups...`
        );

        for (const group of groups) {
          try {
            await ctx.copyMessage(group.chatId, {
              message_id: ctx.message.reply_to_message.message_id
            });
            success++;
          } catch (error) {
            failed++;
          }

          if ((success + failed) % 5 === 0) {
            await this.bot.telegram.editMessageText(
              ctx.chat.id,
              statusMsg.message_id,
              undefined,
              `📡 Progress: ${success + failed}/${groups.length}\n✅ ${success} | ❌ ${failed}`
            ).catch(() => {});
          }

          await new Promise(resolve => setTimeout(resolve, 300));
        }

        await ctx.reply(
          `✅ *Broadcast Complete*\n\n` +
          `✅ Success: ${success}\n` +
          `❌ Failed: ${failed}`,
          { parse_mode: "Markdown" }
        );
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // View ban list
    this.bot.command("banlist", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        const bans = await GlobalBan.find({ 
          communityId: community.communityId,
          isActive: true 
        }).limit(20);

        if (bans.length === 0) {
          return ctx.reply("✅ No active bans in this community.");
        }

        let message = `🚫 *Ban List for ${community.communityName}*\n\n`;
        
        bans.forEach((ban, index) => {
          message += `${index + 1}. ${ban.userName} (${ban.userId})\n`;
          message += `   📝 ${ban.reason}\n`;
          message += `   📅 ${ban.bannedAt.toLocaleDateString()}\n\n`;
        });

        await ctx.reply(message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });
  }

  // ============================================
  // SETTINGS COMMANDS
  // ============================================

  setupSettingsCommands() {
    this.bot.command("settings", async (ctx: any) => {
      const community = await this.getActiveCommunity(ctx.from.id);
      if (!community) return ctx.reply("❌ No active community.");

      const message = `
⚙️ *Community Settings*

📋 Name: ${community.communityName}
🆔 ID: \`${community.communityId}\`

*Current Settings:*
${community.settings?.allowAutoModeration ? "✅" : "❌"} Auto Moderation
${community.settings?.logChannel ? "✅" : "❌"} Log Channel
${community.settings?.welcomeMessage ? "✅" : "❌"} Welcome Message

Use buttons below to configure:
      `;

      const keyboard = {
        inline_keyboard: [
          [
            { text: "📝 Edit Name", callback_data: "set_name" },
            { text: "📄 Description", callback_data: "set_desc" }
          ],
          [
            { text: "🤖 Auto Mod", callback_data: "set_automod" },
            { text: "📝 Log Channel", callback_data: "set_log" }
          ],
          [
            { text: "👋 Welcome Msg", callback_data: "set_welcome" },
            { text: "📜 Rules", callback_data: "set_rules" }
          ]
        ]
      };

      await ctx.reply(message, { 
        parse_mode: "Markdown",
        reply_markup: keyboard
      });
    });
  }

  // ============================================
  // CALLBACK HANDLERS
  // ============================================

  setupCallbacks() {
    // Switch community callback
    this.bot.action(/^switch_(.+)$/, async (ctx: any) => {
      const communityId = ctx.match[1];
      const userComm = await UserCommunity.findOne({ userId: ctx.from.id });

      if (userComm && userComm.communities.includes(communityId)) {
        userComm.activeCommunity = communityId;
        await userComm.save();

        const community = await Community.findOne({ communityId });
        await ctx.answerCbQuery(`Switched to: ${community?.communityName}`);
        await ctx.editMessageText(
          `✅ Active community: *${community?.communityName}*\n\n` +
          `Use /dashboard to manage this community.`,
          { parse_mode: "Markdown" }
        );
      }
    });

    // Dashboard callbacks
    const dashboardActions = {
      dash_groups: "listgroups",
      dash_bans: "banlist",
      dash_settings: "settings",
      dash_switch: "mycommunities"
    };

    Object.entries(dashboardActions).forEach(([action, command]) => {
      this.bot.action(action, async (ctx: any) => {
        await ctx.answerCbQuery();
        ctx.message = { text: `/${command}`, from: ctx.from, chat: ctx.chat };
        // Trigger the command
      });
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  generateCommunityId(): string {
    return `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getActiveCommunity(userId: number) {
    const userComm = await UserCommunity.findOne({ userId });
    if (!userComm || !userComm.activeCommunity) return null;

    return await Community.findOne({ communityId: userComm.activeCommunity });
  }

  async hasPermission(
    userId: number, 
    community: any, 
    permission: string
  ): Promise<boolean> {
    // Owner has all permissions
    if (community.ownerId === userId) return true;

    // Check admin permissions
    const admin = community.admins.find((a: any) => a.userId === userId);
    return admin ? admin.permissions[permission] : false;
  }

  async identifyUser(ctx: any) {
    try {
      if (ctx.message.entities?.[1]?.type === "text_mention") {
        return {
          userId: ctx.message.entities[1].user.id,
          name: ctx.message.entities[1].user.first_name
        };
      }

      if (ctx.message.reply_to_message) {
        return {
          userId: ctx.message.reply_to_message.from.id,
          name: ctx.message.reply_to_message.from.first_name
        };
      }

      const userIdMatch = ctx.message.text.match(/\b(\d{5,10})\b/);
      if (userIdMatch) {
        const userId = parseInt(userIdMatch[1]);
        try {
          const member = await ctx.getChatMember(userId);
          return { userId, name: member.user.first_name };
        } catch {
          return { userId, name: "User" };
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

// ============================================
// MAIN INITIALIZATION
// ============================================

export async function initializeMultiCommunityBot(bot: Telegraf) {
  const communityManager = new CommunityManager(bot);
  
  // Add help command
const help = async (ctx: any) => {
    const helpText = `
🤖 *Multi-Community Management Bot*

*Getting Started:*
1️⃣ Create your community: /createcommunity <name>
2️⃣ Add bot to groups and use: /addgroup
3️⃣ Manage from dashboard: /dashboard

*Community Commands:*
/createcommunity <name> - Create new community
/mycommunities - List your communities
/switchcommunity <id> - Switch active community
/dashboard - Community dashboard
/addadmin - Add admin (reply to user)
/settings - Community settings

*Group Commands:*
/addgroup - Add current group to community
/removegroup - Remove group from community
/listgroups - List all groups in community

*Moderation Commands:*
/cgban <user> [reason] - Community-wide ban
/cunban <user> - Community-wide unban
/cbroadcast - Broadcast message (reply to msg)
/banlist - View banned users

*Features:*
✅ Unlimited communities per bot
✅ Each user manages their own communities
✅ Multi-admin support with permissions
✅ Global ban/unban across all groups
✅ Broadcast messages to all groups
✅ Detailed statistics and logging
✅ Flexible permission system

*Examples:*
\`/createcommunity IGNOU Students\`
\`/cgban @spammer Advertising\`
\`/cbroadcast\` (reply to a message)

Need help? Contact support or check /dashboard
    `;

    await ctx.reply(helpText, { parse_mode: "Markdown" });
  };

  bot.start(help);
  bot.command("help", help);

  // Auto-check for banned users when they join
  bot.on("new_chat_members", async (ctx: any) => {
    try {
      const group = await Group.findOne({ chatId: ctx.chat.id, isActive: true });
      if (!group) return;

      const newMembers = ctx.message.new_chat_members;
      
      for (const member of newMembers) {
        const ban = await GlobalBan.findOne({
          communityId: group.communityId,
          userId: member.id,
          isActive: true
        });

        if (ban) {
          try {
            await bot.telegram.banChatMember(ctx.chat.id, member.id);
            await ctx.reply(
              `🚫 ${member.first_name} is banned in this community.\n` +
              `Reason: ${ban.reason}`
            );
          } catch (error) {
            console.error("Failed to ban user:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error in new_chat_members handler:", error);
    }
  });

  // Log messages for statistics
  bot.on("message", async (ctx: any, next: any) => {
    try {
      if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
        const group = await Group.findOne({ chatId: ctx.chat.id, isActive: true });
        if (group) {
          const community = await Community.findOne({ communityId: group.communityId });
          if (community) {
            if (community.stats) community.stats.totalMessages += 1;
            await community.save();
          }
        }
      }
      await next();
    } catch (error) {
      console.error("Error in message handler:", error);
      await next();
    }
  });

  console.log("✅ Multi-Community Management System Initialized");
}



// ============================================
// STATISTICS TRACKER
// ============================================

export class StatsTracker {
  static async getCommunityStats(communityId: string) {
    const community = await Community.findOne({ communityId });
    if (!community) return null;

    const groups = await Group.countDocuments({ 
      communityId, 
      isActive: true 
    });

    const bans = await GlobalBan.countDocuments({ 
      communityId, 
      isActive: true 
    });

    // Calculate total members (you need to implement member tracking)
    let totalMembers = 0;
    const allGroups = await Group.find({ communityId, isActive: true });
    
    return {
      communityName: community.communityName,
      totalGroups: groups,
      totalBans: bans,
      totalAdmins: community.admins.length,
  totalMessages: community.stats?.totalMessages ?? 0,
      createdAt: community.createdAt
    };
  }

  static async getGroupStats(chatId: number) {
    const group = await Group.findOne({ chatId, isActive: true });
    if (!group) return null;

    return {
      groupName: group.groupName,
      communityId: group.communityId,
      addedAt: group.addedAt,
      addedBy: group.addedBy
    };
  }
}

// ============================================
// USAGE EXAMPLES & DOCUMENTATION
// ============================================

/*

COMPLETE WORKFLOW EXAMPLE:

1. USER A CREATES THEIR COMMUNITY:
   /createcommunity "IGNOU Students Network"
   → Bot creates community with ID: comm_1234567890_abc123
   → User A is the owner

2. USER A ADDS GROUPS:
   - Go to Group 1 and use: /addgroup
   - Go to Group 2 and use: /addgroup
   - Go to Group 3 and use: /addgroup
   → All groups are now managed by User A's community

3. USER A ADDS ADMINS:
   - Reply to User B's message: /addadmin
   → User B can now help manage the community

4. USER A PERFORMS MODERATION:
   /cgban @spammer Posting spam links
   → User gets banned from all 3 groups in the community

5. USER A BROADCASTS MESSAGE:
   /cbroadcast (reply to announcement)
   → Message sent to all 3 groups

6. USER B CREATES THEIR OWN COMMUNITY:
   /createcommunity "Tech Study Group"
   → User B now has their own separate community
   → Completely independent from User A's community

7. SWITCHING BETWEEN COMMUNITIES:
   /mycommunities
   → See list of communities you own/admin
   /switchcommunity comm_9876543210_xyz789
   → Switch to different community

8. MANAGING MULTIPLE COMMUNITIES:
   User A: Manages "IGNOU Students" with 50 groups
   User B: Manages "Tech Study Group" with 30 groups
   User C: Manages "Fitness Community" with 20 groups
   → All using the same bot, completely separate!

PERMISSION LEVELS:

Owner:
- Full control over community
- Add/remove groups
- Add/remove admins
- Set permissions
- Delete community
- All moderation actions

Admin (configurable):
- Can add groups: YES/NO
- Can remove groups: YES/NO
- Can ban users: YES/NO
- Can mute users: YES/NO
- Can broadcast: YES/NO
- Can manage other admins: YES/NO

COMMAND SUMMARY:

Community Management:
├── /createcommunity <name>     - Create new community
├── /mycommunities               - List communities
├── /switchcommunity <id>        - Switch active
├── /dashboard                   - Main dashboard
├── /addadmin                    - Add admin (reply)
├── /removeadmin                 - Remove admin (reply)
└── /settings                    - Community settings

Group Management:
├── /addgroup                    - Add current group
├── /removegroup                 - Remove current group
└── /listgroups                  - List all groups

Moderation:
├── /cgban <user> [reason]       - Community ban
├── /cunban <user>               - Community unban
├── /cbroadcast                  - Broadcast (reply)
├── /banlist                     - View bans
└── /stats                       - Statistics

FEATURES:

✅ Multiple Communities: Each user can create up to 5 communities
✅ Independent Management: Each community operates separately
✅ Multi-Admin: Add multiple admins with custom permissions
✅ Global Actions: Ban/unban across all groups in community
✅ Broadcasting: Send messages to all groups at once
✅ Statistics: Track messages, bans, groups, etc.
✅ Auto-Moderation: Banned users automatically kicked if they join
✅ Flexible Permissions: Configure what each admin can do
✅ Easy Switching: Switch between communities seamlessly
✅ Scalable: Supports hundreds of groups per community

DATABASE STRUCTURE:

Communities Collection:
- communityId (unique)
- ownerId
- communityName
- admins[] (with permissions)
- settings
- stats

Groups Collection:
- chatId
- communityId (links to community)
- groupName
- addedBy
- settings

GlobalBans Collection:
- communityId
- userId
- reason
- bannedBy
- timestamp

UserCommunity Collection:
- userId
- activeCommunity
- communities[] (list of community IDs)

ADVANTAGES OVER SINGLE COMMUNITY:

❌ Old System: One bot = One community (everyone shares)
✅ New System: One bot = Unlimited communities (everyone independent)

❌ Old: If bot is used by multiple people, conflicts happen
✅ New: Each person has their own isolated space

❌ Old: Can't have different admin teams
✅ New: Each community has its own admin team

❌ Old: Single ban list for all groups
✅ New: Each community has separate ban lists

❌ Old: One person controls everything
✅ New: Democratic - anyone can create and manage

SCALING EXAMPLE:

Bot supports:
- 1000 different communities
- Each community has 100 groups
- Each community has 10 admins
- Each community has its own ban list
- Total: 100,000 groups managed!

All isolated, all independent, all efficient!

*/

export default {
  CommunityManager,
  StatsTracker,
  initializeMultiCommunityBot
};

// ============================================
// ADDITIONAL UTILITY COMMANDS
// ============================================

export class UtilityCommands {
  static initialize(bot: Telegraf) {
    
    // Community Info
    bot.command("communityinfo", async (ctx: any) => {
      try {
        const userComm = await UserCommunity.findOne({ userId: ctx.from.id });
        if (!userComm || !userComm.activeCommunity) {
          return ctx.reply("❌ No active community. Use /mycommunities");
        }

        const community = await Community.findOne({ 
          communityId: userComm.activeCommunity 
        });
        
        if (!community) return ctx.reply("❌ Community not found.");

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
👑 *Owner:* ${community.ownerName} (${community.ownerId})

📊 *Statistics:*
   📁 Total Groups: ${groups}
   🚫 Active Bans: ${bans}
   👥 Admins: ${community.admins.length}
  💬 Messages: ${community.stats?.totalMessages ?? 0}

👥 *Admin List:*
${adminList}

📅 *Created:* ${community.createdAt.toLocaleDateString()}

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

    // Set permissions for admin
    bot.command("setperm", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        if (community.ownerId !== ctx.from.id) {
          return ctx.reply("❌ Only owner can set permissions!");
        }

        if (!ctx.message.reply_to_message) {
          return ctx.reply(
            "❌ Reply to admin's message.\n\n" +
            "Usage: /setperm <permission> <yes/no>\n" +
            "Permissions: addgroups, removegroups, ban, mute, broadcast, manageadmins"
          );
        }

        const args = ctx.message.text.split(" ");
        if (args.length < 3) {
          return ctx.reply("❌ Usage: /setperm <permission> <yes/no>");
        }

        const adminId = ctx.message.reply_to_message.from.id;
        const permission = args[1].toLowerCase();
        const value = args[2].toLowerCase() === 'yes';

        const permissionMap: Record<string, string> = {
          'addgroups': 'canAddGroups',
          'removegroups': 'canRemoveGroups',
          'ban': 'canBan',
          'mute': 'canMute',
          'broadcast': 'canBroadcast',
          'manageadmins': 'canManageAdmins'
        };

        const permKey = permissionMap[permission];
        if (!permKey) {
          return ctx.reply("❌ Invalid permission!");
        }

        const admin = community.admins.find((a: any) => a.userId === adminId);
        if (!admin) {
          return ctx.reply("❌ User is not an admin!");
        }

        if (admin.permissions) {
          // Type assertion to allow string index
          (admin.permissions as any)[permKey] = value;
        }
        await community.save();

        await ctx.reply(
          `✅ Permission updated!\n\n` +
          `Admin: ${admin.userName}\n` +
          `Permission: ${permission}\n` +
          `Value: ${value ? 'YES' : 'NO'}`
        );
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Remove admin
    bot.command("removeadmin", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        if (community.ownerId !== ctx.from.id) {
          return ctx.reply("❌ Only owner can remove admins!");
        }

        if (!ctx.message.reply_to_message) {
          return ctx.reply("❌ Reply to admin's message to remove them.");
        }

        const adminId = ctx.message.reply_to_message.from.id;
        const adminIndex = community.admins.findIndex((a: any) => a.userId === adminId);

        if (adminIndex === -1) {
          return ctx.reply("❌ User is not an admin!");
        }

        const removedAdmin = community.admins[adminIndex];
        community.admins.splice(adminIndex, 1);
        await community.save();

        await ctx.reply(
          `✅ ${removedAdmin.userName} has been removed as admin.`
        );
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Delete community
    bot.command("deletecommunity", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        if (community.ownerId !== ctx.from.id) {
          return ctx.reply("❌ Only owner can delete the community!");
        }

        const keyboard = {
          inline_keyboard: [
            [
              { text: "❌ Cancel", callback_data: "delete_cancel" },
              { text: "✅ Confirm Delete", callback_data: `delete_confirm_${community.communityId}` }
            ]
          ]
        };

        await ctx.reply(
          `⚠️ *Warning!*\n\n` +
          `Are you sure you want to delete "${community.communityName}"?\n\n` +
          `This will:\n` +
          `• Remove all groups from the community\n` +
          `• Remove all admins\n` +
          `• Clear all ban lists\n` +
          `• Delete all settings\n\n` +
          `*This action cannot be undone!*`,
          { 
            parse_mode: "Markdown",
            reply_markup: keyboard
          }
        );
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Confirm delete callback
    bot.action(/^delete_confirm_(.+)$/, async (ctx: any) => {
      try {
        const communityId = ctx.match[1];
        const community = await Community.findOne({ communityId });

        if (!community || community.ownerId !== ctx.from.id) {
          return ctx.answerCbQuery("❌ Unauthorized!");
        }

        // Delete all associated data
        await Group.deleteMany({ communityId });
        await GlobalBan.deleteMany({ communityId });
        await Community.deleteOne({ communityId });

        // Update user communities
        await UserCommunity.updateMany(
          { communities: communityId },
          { 
            $pull: { communities: communityId },
            $unset: { activeCommunity: "" }
          }
        );

        await ctx.answerCbQuery("Community deleted!");
        await ctx.editMessageText(
          `✅ Community "${community.communityName}" has been deleted.\n\n` +
          `All data has been removed.`
        );
      } catch (error: any) {
        await ctx.answerCbQuery("❌ Error deleting community");
      }
    });

    bot.action("delete_cancel", async (ctx: any) => {
      await ctx.answerCbQuery("Cancelled");
      await ctx.editMessageText("❌ Deletion cancelled.");
    });

    // Export community data
    bot.command("exportdata", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        if (community.ownerId !== ctx.from.id) {
          return ctx.reply("❌ Only owner can export data!");
        }

        const groups = await Group.find({ 
          communityId: community.communityId 
        });

        const bans = await GlobalBan.find({ 
          communityId: community.communityId 
        });

        const exportData = {
          community: {
            id: community.communityId,
            name: community.communityName,
            owner: community.ownerName,
            created: community.createdAt,
            stats: community.stats
          },
          groups: groups.map(g => ({
            name: g.groupName,
            id: g.chatId,
            username: g.username,
            added: g.addedAt
          })),
          bans: bans.map(b => ({
            user: b.userName,
            userId: b.userId,
            reason: b.reason,
            date: b.bannedAt
          })),
          admins: community.admins
        };

        const jsonData = JSON.stringify(exportData, null, 2);
        
        // Send as file
        await ctx.replyWithDocument({
          source: Buffer.from(jsonData),
          filename: `${community.communityName}_export_${Date.now()}.json`
        }, {
          caption: `📊 Community data export for ${community.communityName}`
        });
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Search user in community
    bot.command("finduser", 
      async (ctx: any) => {
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

        // Check if banned
        const ban = await GlobalBan.findOne({
          communityId: community.communityId,
          userId: userId,
          isActive: true
        });

        // Check in which groups the user might be
        const groups = await Group.find({ 
          communityId: community.communityId,
          isActive: true 
        });

        let message = `🔍 *User Search Results*\n\n`;
        message += `👤 User ID: ${userId}\n\n`;

        if (ban) {
          message += `🚫 *Status:* BANNED\n`;
          message += `📝 Reason: ${ban.reason}\n`;
          message += `📅 Banned: ${ban.bannedAt.toLocaleDateString()}\n`;
          message += `👤 By: ${ban.bannedBy}\n\n`;
        } else {
          message += `✅ *Status:* Not banned\n\n`;
        }

        message += `📁 Groups in community: ${groups.length}\n`;
        message += `Use bot commands in groups to check membership.`;

        await ctx.reply(message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    }
  );

    // Community statistics
    bot.command("stats", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) return ctx.reply("❌ No active community.");

        const stats = await StatsTracker.getCommunityStats(community.communityId);
        
        if (!stats) {
          return ctx.reply("❌ Unable to fetch statistics.");
        }

        const message = `
📊 *Community Statistics*

*${stats.communityName}*

📁 *Groups:* ${stats.totalGroups}
🚫 *Bans:* ${stats.totalBans}
👥 *Admins:* ${stats.totalAdmins}
💬 *Messages:* ${stats.totalMessages.toLocaleString()}

📅 *Created:* ${stats.createdAt.toLocaleDateString()}

Use /dashboard for more options.
        `;

        await ctx.reply(message, { parse_mode: "Markdown" });
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });
  }

  static async getActiveCommunity(userId: number) {
    const userComm = await UserCommunity.findOne({ userId });
    if (!userComm || !userComm.activeCommunity) return null;
    return await Community.findOne({ communityId: userComm.activeCommunity });
  }
}

// ============================================
// QUICK START GUIDE
// ============================================

/*

QUICK START GUIDE FOR BOT SETUP:

1. INSTALL DEPENDENCIES:
   npm install telegraf mongoose dotenv

2. CREATE .env FILE:
   BOT_TOKEN=your_bot_token_here
   MONGODB_URI=mongodb://localhost:27017/communitybot

3. CREATE index.ts:
   (Use the code provided in comments above)

4. RUN THE BOT:
   ts-node index.ts

5. IN TELEGRAM:
   a) Start bot: /start
   b) Create community: /createcommunity My First Community
   c) Add bot to groups
   d) In each group: /addgroup
   e) Manage from: /dashboard

THAT'S IT! Your multi-community bot is ready!

*/