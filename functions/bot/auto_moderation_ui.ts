import { Telegraf } from 'telegraf';
import { AutoModSettings, UserCommunity, Community } from '../../mongo';
import { AutoModUIComponents } from './automod_ui_components';

// Helper to parse time strings like 15d, 6d, 1d, 1h, 1m, 1s
function parseDuration(str: string): number | null {
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


export class AutoModUI {
  static async getActiveCommunity(userId: number) {
    const userComm = await UserCommunity.findOne({ userId });
    if (!userComm || !userComm.activeCommunity) return null;
    return await Community.findOne({ communityId: userComm.activeCommunity });
  }

  static initialize(bot: Telegraf) {
    console.log("🔧 Loading Auto-Mod UI...");
    this.initializeAutoModCommand(bot);
    this.initializeAutoModCallbacks(bot);
    this.initializeQuickToggles(bot);
    console.log("✅ Auto-Mod UI Loaded!");
  }

  private static async initializeAutoModCommand(bot: Telegraf) {
    bot.command("automod", async (ctx: any) => {
      try {
        const community = await AutoModUI.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community set. Use /community first.");
        }

        const settings = await AutoModSettings.findOne({ 
          communityId: community.communityId 
        });

        if (!settings) return;

        const component = await AutoModUIComponents.getComponent(settings, 'back_automod');
        await ctx.reply(component.message, {
          parse_mode: "Markdown",
          reply_markup: component.keyboard
        });
      } catch (error: any) {
        await ctx.reply(`❌ Error: ${error.message}`);
      }
    });
  }

  private static initializeAutoModCallbacks(bot: Telegraf) {
    // Initialize all menu buttons to use components
    const menuButtons = [
      'automod_words',
      'automod_spam', 
      'automod_flood',
      'automod_media',
      'automod_multijoin',
      'automod_warnings',
      'automod_autodelete',
      'automod_reports',
      'automod_newusers',
      'back_automod'
    ];

    menuButtons.forEach(button => {
      bot.action(button, async (ctx: any) => {
        try {
          await ctx.answerCbQuery();
          const community = await AutoModUI.getActiveCommunity(ctx.from.id);
          if (!community) {
            await ctx.answerCbQuery("❌ No active community");
            return;
          }
          const settings = await AutoModSettings.findOne({
            communityId: community.communityId
          });
          if (!settings) {
            await ctx.answerCbQuery("❌ Settings not found");
            return;
          }
          await AutoModUIComponents.updateUI(ctx, settings, button);
        } catch (error: any) {
          console.error('Menu button error:', error);
          await ctx.answerCbQuery("Error updating menu");
        }
      });
    });

    // Feature toggle handlers
    bot.action(/^toggle_(\w+)$/, async (ctx: any) => {
      try {
        await ctx.answerCbQuery();
        const community = await AutoModUI.getActiveCommunity(ctx.from.id);
        if (!community) {
          await ctx.answerCbQuery("❌ No active community");
          return;
        }

        const type = ctx.match[1];
        const settings = await AutoModSettings.findOne({
          communityId: community.communityId
        });

        if (!settings) {
          await ctx.answerCbQuery("❌ Settings not found");
          return;
        }

        const fieldMap: any = {
          'words': 'bannedWords',
          'antispam': 'antiSpam',
          'antiflood': 'antiFlood', 
          'media': 'mediaRestrictions',
          'multijoin': 'multiJoinDetection',
          'warnings': 'warningSystem',
          'autodelete': 'autoDelete',
          'reports': 'reportSettings',
          'newusers': 'newUserRestrictions'
        };

        const field = fieldMap[type];
        if (field) {
          // Toggle enabled state
          if (!settings[field]) settings[field] = {};
          settings[field].enabled = !settings[field].enabled;
          await settings.save();

          // Update UI based on which section we're in
          const uiSection = ctx.callbackQuery?.data?.replace('toggle_', 'automod_') || 'back_automod';
          await AutoModUIComponents.updateUI(ctx, settings, uiSection);
        }
      } catch (error: any) {
        await ctx.answerCbQuery("Error toggling setting");
      }
    });

    // Media toggle handlers  
    bot.action(/^toggle_media_(\w+)$/, async (ctx: any) => {
      try {
        const community = await AutoModUI.getActiveCommunity(ctx.from.id);
        if (!community) {
          await ctx.answerCbQuery("❌ No active community set");
          return;
        }

        const mediaType = ctx.match[1];
        const settings = await AutoModSettings.findOne({
          communityId: community.communityId
        });

        if (!settings) {
          await ctx.answerCbQuery("❌ Settings not found");
          return;
        }

        // Map callback data to settings field
        const fieldMap: any = {
          'photos': 'blockPhotos',
          'videos': 'blockVideos', 
          'stickers': 'blockStickers',
          'gifs': 'blockGifs',
          'docs': 'blockDocuments',
          'links': 'blockLinks'
        };

        const field = fieldMap[mediaType];
        if (field && settings.mediaRestrictions) {
          // Toggle the specific media restriction
          settings.mediaRestrictions[field] = !settings.mediaRestrictions[field];
          await settings.save();

          // Show success message in callback query
          const status = settings.mediaRestrictions[field] ? '🚫 Blocked' : '✅ Allowed';
          const mediaName = mediaType.charAt(0).toUpperCase() + mediaType.slice(1);
          await ctx.answerCbQuery(`${status} ${mediaName}`);

          // Update the UI using the standard updateUI method
          await AutoModUIComponents.updateUI(ctx, settings, 'automod_media');
        } else {
          await ctx.answerCbQuery("❌ Invalid media type");
        }
      } catch (error: any) {
        console.error('Media toggle error:', error);
        await ctx.answerCbQuery("❌ Error toggling media setting");
      }
    });
  }

  private static initializeQuickToggles(bot: Telegraf) {
    // Quick toggle commands for easy access
    const toggleCommands = [
      { command: 'media_toggle', field: 'mediaRestrictions' },
      { command: 'antispam_toggle', field: 'antiSpam' },
      { command: 'antiflood_toggle', field: 'antiFlood' },
      { command: 'warning_toggle', field: 'warningSystem' },
      { command: 'report_toggle', field: 'reportSettings' },
      { command: 'newuser_toggle', field: 'newUserRestrictions' },
      { command: 'multijoin_toggle', field: 'multiJoinDetection' },
      { command: 'autodelete_toggle', field: 'autoDelete' }
    ];

    toggleCommands.forEach(({ command, field }) => {
      bot.command(command, async (ctx: any) => {
        try {
          const community = await AutoModUI.getActiveCommunity(ctx.from.id);
          if (!community) {
            return ctx.reply("❌ No active community set. Use /community first.");
          }

          const settings = await AutoModSettings.findOne({
            communityId: community.communityId
          });

          if (!settings) return;

          // Toggle enabled state
          if (!settings[field]) settings[field] = {};
          settings[field].enabled = !settings[field].enabled;
          await settings.save();

          // Reply with new status
          await ctx.reply(
            `✅ ${field} ${settings[field].enabled ? 'enabled' : 'disabled'}`
          );
        } catch (error: any) {
          await ctx.reply(`❌ Error: ${error.message}`);
        }
      });
    });
  }
}