export const start = async (ctx: any) => {
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
    }

export const help = async (ctx: any) => {
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
            { text: "📖 Full Guide", callback_data: "help_guide" },
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
    }

export const guide = async (ctx: any) => {
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
    }

export const examples = async (ctx: any) => {
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
    }

export const about =  async (ctx: any) => {
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
    }

export const ping = async (ctx: any) => {
      const start = Date.now();
      const msg = await ctx.reply("🏓 Pinging...");
      const ping = Date.now() - start;

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        msg.message_id,
        undefined,
        `🏓 Pong!\n\n⚡ ${ping}ms\n✅ Bot online!`
      );
    }

export const version =  async (ctx: any) => {
      await ctx.reply(
        `📦 *Version 2.0.0*\n\n` +
        `*Features:*\n` +
        `• Multi-community\n` +
        `• Auto-moderation\n` +
        `• Message tracking\n` +
        `• Interactive dashboard`,
        { parse_mode: "Markdown" }
      );
    }