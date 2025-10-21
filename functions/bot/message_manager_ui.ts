import { Telegraf } from 'telegraf';
import { BotMessageSettings } from '../../models/messageManager';
import { BotHelpers } from '../utils/helpers';

export class MessageManagerUI {
  static async getMainUI(settings: any) {
    const message = `
⚙️ *Message Manager Settings*

Control how long bot messages stay in the group before auto-deletion.

*Current Settings:*
${settings?.messageTypes?.service?.enabled ? '✅' : '❌'} Service Messages (${settings?.messageTypes?.service?.deleteAfter || 30}s)
${settings?.messageTypes?.welcome?.enabled ? '✅' : '❌'} Welcome Messages (${settings?.messageTypes?.welcome?.deleteAfter || 300}s)
${settings?.messageTypes?.commands?.enabled ? '✅' : '❌'} Command Responses (${settings?.messageTypes?.commands?.deleteAfter || 60}s)
${settings?.messageTypes?.punishments?.enabled ? '✅' : '❌'} Punishment Msgs (${settings?.messageTypes?.punishments?.deleteAfter || 600}s)
${settings?.messageTypes?.warnings?.enabled ? '✅' : '❌'} Warning Messages (${settings?.messageTypes?.warnings?.deleteAfter || 300}s)
${settings?.messageTypes?.help?.enabled ? '✅' : '❌'} Help Messages (${settings?.messageTypes?.help?.deleteAfter || 600}s)

*Custom Types:* ${settings?.customTypes?.length || 0} configured

Use buttons below to configure each type:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🤖 Service Messages", callback_data: "msg_service" },
          { text: "👋 Welcome Messages", callback_data: "msg_welcome" }
        ],
        [
          { text: "💬 Command Responses", callback_data: "msg_commands" },
          { text: "⚠️ Punishments", callback_data: "msg_punishments" }
        ],
        [
          { text: "⚡ Warning Messages", callback_data: "msg_warnings" },
          { text: "❓ Help Messages", callback_data: "msg_help" }
        ],
        [
          { text: "🎯 Custom Types", callback_data: "msg_custom" }
        ],
        [
          { text: "❌ Close", callback_data: "close" }
        ]
      ]
    };

    return { message, keyboard };
  }

  static getTypeUI(settings: any, type: string) {
    const typeMap: any = {
      'service': { title: 'Service Messages', emoji: '🤖' },
      'welcome': { title: 'Welcome Messages', emoji: '👋' },
      'commands': { title: 'Command Responses', emoji: '💬' },
      'punishments': { title: 'Punishment Messages', emoji: '⚠️' },
      'warnings': { title: 'Warning Messages', emoji: '⚡' },
      'help': { title: 'Help Messages', emoji: '❓' }
    };

    const info = typeMap[type];
    const typeSettings = settings?.messageTypes?.[type];

    const message = `
${info.emoji} *${info.title} Settings*

*Status:* ${typeSettings?.enabled ? 'Enabled ✅' : 'Disabled ❌'}
*Delete After:* ${typeSettings?.deleteAfter || 'Not set'} seconds

*Commands:*
\`/msgtime ${type} 60\` - Set deletion time (seconds)
\`/msgtoggle ${type}\` - Enable/Disable

*Note:* Set time to 0 to keep messages permanently`;

    const keyboard = {
      inline_keyboard: [
        [
          { 
            text: typeSettings?.enabled ? "❌ Disable" : "✅ Enable",
            callback_data: `msgtoggle_${type}`
          }
        ],
        [
          { text: "30s", callback_data: `msgtime_${type}_30` },
          { text: "1m", callback_data: `msgtime_${type}_60` },
          { text: "5m", callback_data: `msgtime_${type}_300` },
          { text: "10m", callback_data: `msgtime_${type}_600` }
        ],
        [
          { text: "🔙 Back", callback_data: "msg_main" }
        ]
      ]
    };

    return { message, keyboard };
  }

  static getCustomTypesUI(settings: any) {
    const customTypes = settings?.customTypes || [];
    
    const message = `
🎯 *Custom Message Types*

*Current Types:* ${customTypes.length}/10 max

${customTypes.map((t: any) => 
  `• ${t.name}: ${t.deleteAfter}s`
).join('\n')}

*Commands:*
\`/msgaddtype name 60\` - Add type
\`/msgdeltype name\` - Delete type

*Example:*
\`/msgaddtype polls 300\``;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🔙 Back", callback_data: "msg_main" }
        ]
      ]
    };

    return { message, keyboard };
  }

  static initialize(bot: Telegraf) {
    console.log("🔧 Loading Message Manager UI...");
    this.initializeCommand(bot);
    this.initializeCallbacks(bot);
    this.initializeTimeCommands(bot);
    console.log("✅ Message Manager UI Loaded!");
  }

  private static async initializeCommand(bot: Telegraf) {
    bot.command("messages", async (ctx: any) => {
      try {
        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community set. Use /community first.");
        }

        let settings = await BotMessageSettings.findOne({ 
          communityId: community.communityId 
        });

        if (!settings) {
          settings = await BotMessageSettings.create({
            communityId: community.communityId
          });
        }

        const ui = await MessageManagerUI.getMainUI(settings);
        await BotHelpers.send(ctx, ui.message, {
          type: 'help',
          parse_mode: "Markdown",
          reply_markup: ui.keyboard
        });
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });
  }

  private static initializeCallbacks(bot: Telegraf) {
    // Main menu and type selection callbacks
    bot.action(/^msg_(main|service|welcome|commands|punishments|warnings|help|custom)$/, async (ctx: any) => {
      try {
        await ctx.answerCbQuery();
        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) return;

        const settings = await BotMessageSettings.findOne({
          communityId: community.communityId
        });

        if (!settings) return;

        const section = ctx.match[1];
        let ui;
        
        if (section === 'main') {
          ui = await MessageManagerUI.getMainUI(settings);
        } else if (section === 'custom') {
          ui = MessageManagerUI.getCustomTypesUI(settings);
        } else {
          ui = MessageManagerUI.getTypeUI(settings, section);
        }

        await ctx.editMessageText(ui.message, {
          parse_mode: "Markdown",
          reply_markup: ui.keyboard
        });
      } catch (error: any) {
        console.error('Menu callback error:', error);
        await ctx.answerCbQuery("Error updating menu");
      }
    });

    // Close action to delete message
    bot.action('close', async (ctx: any) => {
      try {
        await ctx.answerCbQuery('Closing...');
        await ctx.deleteMessage();
      } catch (error) {
        console.error('Close action error:', error);
        await ctx.answerCbQuery("Error closing message");
      }
    });

    // Toggle callbacks
    bot.action(/^msgtoggle_(\w+)$/, async (ctx: any) => {
      try {
        const type = ctx.match[1];
        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) return;

        const settings = await BotMessageSettings.findOne({
          communityId: community.communityId
        });

        if (!settings || !settings.messageTypes?.[type]) return;

        // Toggle enabled state
        settings.messageTypes[type].enabled = !settings.messageTypes[type].enabled;
        await settings.save();

        // Show success message
        const status = settings.messageTypes[type].enabled ? 'enabled' : 'disabled';
        await ctx.answerCbQuery(`✅ ${type} messages ${status}`);

        // Update UI
        const ui = MessageManagerUI.getTypeUI(settings, type);
        await ctx.editMessageText(ui.message, {
          parse_mode: "Markdown",
          reply_markup: ui.keyboard
        });
      } catch (error) {
        console.error('Toggle error:', error);
        await ctx.answerCbQuery("Error toggling setting");
      }
    });

    // Quick time set callbacks
    bot.action(/^msgtime_(\w+)_(\d+)$/, async (ctx: any) => {
      try {
        const [type, time] = [ctx.match[1], parseInt(ctx.match[2])];
        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) return;

        const settings = await BotMessageSettings.findOne({
          communityId: community.communityId
        });

        if (!settings || !settings.messageTypes?.[type]) return;

        // Update deletion time
        settings.messageTypes[type].deleteAfter = time;
        await settings.save();

        // Show success message
        await ctx.answerCbQuery(`✅ Set ${type} deletion time to ${time}s`);

        // Update UI
        const ui = MessageManagerUI.getTypeUI(settings, type);
        await ctx.editMessageText(ui.message, {
          parse_mode: "Markdown",
          reply_markup: ui.keyboard
        });
      } catch (error) {
        console.error('Time set error:', error);
        await ctx.answerCbQuery("Error setting time");
      }
    });
  }

  private static initializeTimeCommands(bot: Telegraf) {
    // Set message deletion time
    bot.command("msgtime", async (ctx: any) => {
      try {
        const [type, time] = ctx.message.text.split(' ').slice(1);
        if (!type || !time) {
          return ctx.reply("❌ Usage: /msgtime type seconds\nExample: /msgtime service 30");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community set");
        }

        let settings = await BotMessageSettings.findOne({
          communityId: community.communityId
        });

        if (!settings?.messageTypes?.[type]) {
          return ctx.reply("❌ Invalid message type");
        }

        const seconds = parseInt(time);
        if (isNaN(seconds) || seconds < 0) {
          return ctx.reply("❌ Invalid time value");
        }

        settings.messageTypes[type].deleteAfter = seconds;
        await settings.save();

        await ctx.reply(`✅ ${type} messages will be deleted after ${seconds} seconds`);
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Toggle message type
    bot.command("msgtoggle", async (ctx: any) => {
      try {
        const type = ctx.message.text.split(' ')[1];
        if (!type) {
          return ctx.reply("❌ Usage: /msgtoggle type\nExample: /msgtoggle service");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community set");
        }

        let settings = await BotMessageSettings.findOne({
          communityId: community.communityId
        });

        if (!settings?.messageTypes?.[type]) {
          return ctx.reply("❌ Invalid message type");
        }

        settings.messageTypes[type].enabled = !settings.messageTypes[type].enabled;
        await settings.save();

        const status = settings.messageTypes[type].enabled ? 'enabled' : 'disabled';
        await ctx.reply(`✅ ${type} message deletion ${status}`);
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Add custom message type
    bot.command("msgaddtype", async (ctx: any) => {
      try {
        const [name, time] = ctx.message.text.split(' ').slice(1);
        if (!name || !time) {
          return ctx.reply("❌ Usage: /msgaddtype name seconds\nExample: /msgaddtype polls 300");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community set");
        }

        let settings = await BotMessageSettings.findOne({
          communityId: community.communityId
        });

        if (!settings) {
          settings = await BotMessageSettings.create({
            communityId: community.communityId
          });
        }

        const seconds = parseInt(time);
        if (isNaN(seconds) || seconds < 0) {
          return ctx.reply("❌ Invalid time value");
        }

        if (settings.customTypes?.length >= 10) {
          return ctx.reply("❌ Maximum 10 custom types allowed");
        }

        // Add or update custom type
        const existingIndex = settings.customTypes?.findIndex(t => t.name === name) ?? -1;
        if (existingIndex >= 0) {
          settings.customTypes[existingIndex].deleteAfter = seconds;
        } else {
          settings.customTypes = [...(settings.customTypes || []), { name, deleteAfter: seconds }];
        }

        await settings.save();
        await ctx.reply(`✅ Custom type "${name}" will be deleted after ${seconds} seconds`);
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });

    // Delete custom message type
    bot.command("msgdeltype", async (ctx: any) => {
      try {
        const name = ctx.message.text.split(' ')[1];
        if (!name) {
          return ctx.reply("❌ Usage: /msgdeltype name\nExample: /msgdeltype polls");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community set");
        }

        let settings = await BotMessageSettings.findOne({
          communityId: community.communityId
        });

        if (!settings?.customTypes?.length) {
          return ctx.reply("❌ No custom types found");
        }

        settings.customTypes = settings.customTypes.filter(t => t.name !== name);
        await settings.save();

        await ctx.reply(`✅ Custom type "${name}" removed`);
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });
  }
}
