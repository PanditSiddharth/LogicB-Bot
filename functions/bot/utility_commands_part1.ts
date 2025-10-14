// ============================================
// UTILITY COMMANDS PART 1
// functions/bot/utility_commands_part1.ts
// Start, Help, Dashboard
// ============================================

import { Telegraf } from "telegraf";
import mongoose from "mongoose";
import { GlobalBan, Group } from "../../mongo";

export class UtilityPart1 {
  
  static initialize(bot: Telegraf) {
    console.log("🔧 Loading Part 1: Start, Help, Dashboard...");
    
    this.initializeStartCommand(bot);
    this.initializeHelpSystem(bot);
    this.initializeDashboard(bot);
    this.initializeHelpCallbacks(bot);
    
    console.log("✅ Part 1 Loaded!");
  }

  // ============================================
  // START COMMAND
  // ============================================
  private static initializeStartCommand(bot: Telegraf) {
    bot.command("start", async (ctx: any) => {
      const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";
      
      if (isGroup) {
        // Group welcome
        const welcomeMsg = `
👋 *Welcome to Multi-Community Bot!*

I help manage multiple groups with:
✅ Auto-Moderation
✅ Community Management  
✅ Message Tracking & Deletion

*Quick Commands:*
• \`/help\` - All commands
• \`/automod\` - Auto-moderation
• \`/dashboard\` - Control panel

*Setup:* Use \`/guide\` for tutorial
        `;
        
        await ctx.reply(welcomeMsg, { parse_mode: "Markdown" });
      } else {
        // Private chat
        const keyboard = {
          inline_keyboard: [
            [
              { text: "📖 Full Guide", callback_data: "help_guide" },
              { text: "⚡ Quick Start", callback_data: "help_quick" }
            ],
            [
              { text: "🏠 Community", callback_data: "help_community" },
              { text: "🤖 Auto-Mod", callback_data: "help_automod" }
            ],
            [
              { text: "🗑️ Deletion", callback_data: "help_deletion" },
              { text: "🛡️ Moderation", callback_data: "help_moderation" }
            ]
          ]
        };

        const startMsg = `
🤖 *Multi-Community Management Bot*

*What I Can Do:*

🏠 *Community Management*
• Create unlimited communities
• Manage 100s of groups per community
• Multi-admin support
• Global ban/unban/mute
• Broadcast to all groups

🤖 *Auto-Moderation*
• Banned words filter
• Anti-spam & anti-flood
• Media restrictions
• Multi-join detection
• Warning system
• Auto-delete messages
• Real-time reports

🗑️ *Message Management*
• Delete user messages (48h)
• Scan old messages
• Force delete with scanning

*Getting Started:*
1. \`/createcommunity YourName\`
2. Add bot to groups as admin
3. Use \`/addgroup\` in each group
4. Configure \`/automod\`

*Click buttons below for help* ⬇️
        `;

        await ctx.reply(startMsg, {
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      }
    });
  }

  // ============================================
  // HELP SYSTEM
  // ============================================
  private static initializeHelpSystem(bot: Telegraf) {
    
    // Main Help
    bot.command("help", async (ctx: any) => {
      const keyboard = {
        inline_keyboard: [
          [
            { text: "🏠 Community", callback_data: "help_community" },
            { text: "🤖 Auto-Mod", callback_data: "help_automod" }
          ],
          [
            { text: "🛡️ Moderation", callback_data: "help_moderation" },
            { text: "🗑️ Deletion", callback_data: "help_deletion" }
          ],
          [
            { text: "⚙️ Settings", callback_data: "help_settings" },
            { text: "📊 Advanced", callback_data: "help_advanced" }
          ],
          [
            { text: "📖 Full Guide", callback_data: "help_guide" }
          ]
        ]
      };

      const helpMsg = `
📚 *Complete Command Reference*

Choose a category:

🏠 *Community* - Create & manage
🤖 *Auto-Mod* - Automatic moderation
🛡️ *Moderation* - Manual actions
🗑️ *Deletion* - Delete messages
⚙️ *Settings* - Configure
📊 *Advanced* - Power features

*Quick Access:*
\`/dashboard\` - Main panel
\`/automod\` - Auto-mod
\`/mycommunities\` - Your communities
\`/guide\` - Tutorial

*Examples:* \`/examples\`
      `;

      await ctx.reply(helpMsg, {
        parse_mode: "Markdown",
        reply_markup: keyboard
      });
    });

    // Guide
    bot.command("guide", async (ctx: any) => {
      const keyboard = {
        inline_keyboard: [
          [
            { text: "📖 Full Guide", callback_data: "help_guide" },
            { text: "⚡ Quick Start", callback_data: "help_quick" }
          ]
        ]
      };

      await ctx.reply(
        "📖 *Choose Your Path:*",
        { parse_mode: "Markdown", reply_markup: keyboard }
      );
    });

    // Examples
    bot.command("examples", async (ctx: any) => {
      const msg = `
💡 *REAL-WORLD EXAMPLES*

*SCENARIO 1: User Posts Porn*
\`\`\`
/cgban 123456789 Porn content
/delmessages 123456789 48
/forcedelete 123456789
\`\`\`

*SCENARIO 2: Setup Community*
\`\`\`
/createcommunity IGNOU
/addgroup (in each group)
/addword spam scam porn
/wordaction ban
/togglewords
\`\`\`

*SCENARIO 3: Broadcast*
\`\`\`
Send message to bot
Reply: /cbroadcast
\`\`\`

*SCENARIO 4: Delete Spammer*
\`\`\`
/delmessages 5860242015 48
\`\`\`

*SCENARIO 5: Add Admin*
\`\`\`
Reply: /addadmin
/setperm ban yes
/setperm broadcast no
\`\`\`

More: \`/help\`
      `;

      await ctx.reply(msg, { parse_mode: "Markdown" });
    });

    // About
    bot.command("about", async (ctx: any) => {
      await ctx.reply(
        `ℹ️ *Multi-Community Bot*\n\n` +
        `Version: 2.0.0\n` +
        `Updated: ${new Date().toLocaleDateString()}\n\n` +
        `*Features:*\n` +
        `✅ Unlimited communities\n` +
        `✅ Multi-group management\n` +
        `✅ Auto-moderation\n` +
        `✅ Message deletion\n` +
        `✅ 60+ commands\n\n` +
        `*Commands:* \`/help\`\n` +
        `*Tutorial:* \`/guide\``,
        { parse_mode: "Markdown" }
      );
    });

    // Ping
    bot.command("ping", async (ctx: any) => {
      const start = Date.now();
      const msg = await ctx.reply("🏓 Pinging...");
      const ping = Date.now() - start;

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        msg.message_id,
        undefined,
        `🏓 Pong!\n\n⚡ ${ping}ms\n✅ Bot online!`
      );
    });

    // Version
    bot.command("version", async (ctx: any) => {
      await ctx.reply(
        `📦 *Version 2.0.0*\n\n` +
        `*Features:*\n` +
        `• Multi-community\n` +
        `• Auto-moderation\n` +
        `• Message tracking\n` +
        `• Interactive dashboard`,
        { parse_mode: "Markdown" }
      );
    });
  }

  // ============================================
  // DASHBOARD
  // ============================================
  private static initializeDashboard(bot: Telegraf) {
    bot.command("dashboard", async (ctx: any) => {
      try {
        const community = await this.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply(
            "❌ *No Active Community*\n\n" +
            "Create: \`/createcommunity <n>\`\n" +
            "Or switch: \`/mycommunities\`",
            { parse_mode: "Markdown" }
          );
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

        await ctx.reply(message, { 
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });
  }

  // ============================================
  // HELP CALLBACKS
  // ============================================
  private static initializeHelpCallbacks(bot: Telegraf) {
    
    // Community Help
    bot.action("help_community", async (ctx: any) => {
      await ctx.answerCbQuery();
      const msg = `
🏠 *COMMUNITY COMMANDS*

*Create & Manage:*
\`/createcommunity <n>\` - Create
\`/mycommunities\` - List
\`/switchcommunity <id>\` - Switch
\`/dashboard\` - Control panel
\`/communityinfo\` - Full info
\`/deletecommunity\` - Delete

*Groups:*
\`/addgroup\` - Add (in group)
\`/removegroup\` - Remove
\`/listgroups\` - Show all

*Admins:*
\`/addadmin\` - Add (reply)
\`/removeadmin\` - Remove
\`/setperm <p> <yes/no>\` - Permissions

*Global Actions:*
\`/cgban <id> <reason>\` - Ban all
\`/cunban <id>\` - Unban all
\`/cbroadcast\` - Broadcast
\`/banlist\` - View bans

*Examples:*
\`/createcommunity IGNOU\`
\`/cgban 123456 Spam\`
      `;
      await ctx.editMessageText(msg, { parse_mode: "Markdown" });
    });

    // Auto-Mod Help
    bot.action("help_automod", async (ctx: any) => {
      await ctx.answerCbQuery();
      const msg = `
🤖 *AUTO-MODERATION*

*Main:*
\`/automod\` - Dashboard

*Banned Words:*
\`/addword <words>\` - Add
\`/removeword <word>\` - Remove
\`/listwords\` - View
\`/togglewords\` - On/off
\`/wordaction <act>\` - Set action

*Anti-Spam:*
\`/antispam\` - Settings
\`/antispam_toggle\` - On/off
\`/antispam_limit <n>\` - Max msgs
\`/antispam_action <act>\` - Action

*Media:*
\`/mediarestrict\` - Settings
\`/media_toggle\` - On/off
\`/media_block <type>\` - Block
\`/media_allow <type>\` - Allow

*Warnings:*
\`/warn\` - Warn (reply)
\`/warnings\` - View
\`/clearwarnings\` - Clear

*Examples:*
\`/addword spam scam\`
\`/wordaction ban\`
      `;
      await ctx.editMessageText(msg, { parse_mode: "Markdown" });
    });

    // Moderation Help
    bot.action("help_moderation", async (ctx: any) => {
      await ctx.answerCbQuery();
      const msg = `
🛡️ *MODERATION*

*Basic:*
\`/ban\` - Ban (reply/ID)
\`/unban\` - Unban
\`/kick\` - Kick
\`/mute <time>\` - Mute
\`/unmute\` - Unmute

*Advanced:*
\`/warn <reason>\` - Warn
\`/promote\` - Make admin
\`/demote\` - Remove admin
\`/info\` - User info

*Group:*
\`/pin\` - Pin (reply)
\`/unpin\` - Unpin
\`/purge\` - Bulk delete

*Usage:*
1. Reply to message
2. Use ID: \`/ban 123456\`
3. Mention: \`/ban @user\`

*Examples:*
\`/ban 123456 Spam\`
\`/mute 789012 2h\`
      `;
      await ctx.editMessageText(msg, { parse_mode: "Markdown" });
    });

    // Deletion Help
    bot.action("help_deletion", async (ctx: any) => {
      await ctx.answerCbQuery();
      const msg = `
🗑️ *MESSAGE DELETION*

*Delete Messages:*
\`/delmessages [id] [hours]\`
Delete tracked messages ≤48h

*Method 1:* Reply
\`/delmessages 48\`

*Method 2:* ID
\`/delmessages 123456 48\`

*Scan:*
\`/scandelete [id]\`
Find all messages

*Force Delete:*
\`/forcedelete [id]\`
Scan & delete (slow)

*Bulk:*
\`/purge\` - Range (reply)

⚠️ *Telegram Limit:*
Only ≤48h messages can be deleted

*Examples:*
\`/delmessages 5860242015 48\`
\`/scandelete 123456\`
\`/forcedelete 789012\`
      `;
      await ctx.editMessageText(msg, { parse_mode: "Markdown" });
    });

    // Settings Help
    bot.action("help_settings", async (ctx: any) => {
      await ctx.answerCbQuery();
      const msg = `
⚙️ *SETTINGS*

*Community:*
\`/settings\` - View
\`/communityinfo\` - Full info
\`/exportdata\` - Export JSON
\`/stats\` - Quick stats

*Permissions:*
\`/setperm <p> <yes/no>\`

*Available:*
• addgroups
• removegroups
• ban
• mute
• broadcast
• manageadmins

*Auto-Mod:*
\`/automod\` - Dashboard
\`/togglewords\` - Words on/off
\`/antispam_toggle\` - Spam on/off

*Example:*
Reply: \`/setperm ban yes\`
      `;
      await ctx.editMessageText(msg, { parse_mode: "Markdown" });
    });

    // Advanced Help
    bot.action("help_advanced", async (ctx: any) => {
      await ctx.answerCbQuery();
      const msg = `
📊 *ADVANCED*

*Statistics:*
\`/stats\` - Quick stats
\`/communityinfo\` - Detailed
\`/finduser <id>\` - Find user

*Multi-Group:*
\`/cgban <id> <reason>\` - Global ban
\`/cunban <id>\` - Global unban
\`/cbroadcast\` - Broadcast

*Batch:*
\`/delmessages <id> 48\`
\`/forcedelete <id>\`
\`/scandelete <id>\`

*Data:*
\`/exportdata\` - Export
\`/deletecommunity\` - Delete

*Automation:*
Auto-mod runs 24/7:
• Banned words
• Spam prevention
• Flood control
• Media filtering
• Warning system

*Limits:*
• 48h message deletion
• Rate limits apply
      `;
      await ctx.editMessageText(msg, { parse_mode: "Markdown" });
    });

    // Guide
    bot.action("help_guide", async (ctx: any) => {
      await ctx.answerCbQuery();
      const msg = `
📖 *SETUP GUIDE*

*STEP 1: CREATE*
\`/createcommunity MyNetwork\`

*STEP 2: ADD GROUPS*
1. Add bot as admin
2. In group: \`/addgroup\`
3. Repeat for all

*STEP 3: AUTO-MOD*
\`/automod\`
\`/addword spam scam\`
\`/wordaction ban\`
\`/togglewords\`

*STEP 4: ANTI-SPAM*
\`/antispam_limit 5\`
\`/antispam_window 10\`
\`/antispam_action mute\`
\`/antispam_toggle\`

*STEP 5: ADMINS*
Reply: \`/addadmin\`
\`/setperm ban yes\`

*STEP 6: TEST*
Send "spam" → Should delete

*TASKS:*
Ban: \`/cgban 123456 Spam\`
Delete: \`/delmessages 123456 48\`
Broadcast: Reply \`/cbroadcast\`
Stats: \`/dashboard\`

Use \`/help\` anytime!
      `;
      await ctx.editMessageText(msg, { parse_mode: "Markdown" });
    });

    // Quick Start
    bot.action("help_quick", async (ctx: any) => {
      await ctx.answerCbQuery();
      const msg = `
⚡ *QUICK START*

*1. CREATE (30s)*
\`/createcommunity MyNetwork\`

*2. ADD GROUPS (2m)*
• Add bot as admin
• \`/addgroup\` in each

*3. AUTO-MOD (2m)*
\`/automod\`
\`/addword spam\`
\`/togglewords\`

*4. TEST (30s)*
Send "spam" → Deletes

*DONE! 🎉*

*Common:*
\`/cgban <id>\` - Ban all
\`/delmessages <id> 48\`
\`/cbroadcast\` - Send all
\`/dashboard\` - Panel

*Full:* \`/guide\`
      `;
      await ctx.editMessageText(msg, { parse_mode: "Markdown" });
    });
  }

  // ============================================
  // HELPER
  // ============================================
  private static async getActiveCommunity(userId: number) {
    try {
      const UserCommunity = mongoose.model('UserCommunity');
      const Community = mongoose.model('Community');
      
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
