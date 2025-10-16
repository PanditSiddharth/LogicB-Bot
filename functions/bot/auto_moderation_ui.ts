// ============================================
// OPTIMIZED AUTO-MODERATION UI
// functions/bot/auto_moderation_ui.ts
// ============================================

import { Telegraf } from 'telegraf';
import { AutoModSettings } from '../../mongo';
import { AutoModUIComponents } from './automod_ui_components';
import { BotHelpers } from '../utils/helpers';

export class AutoModUI {
  private static readonly TOGGLE_COMMANDS = [
    { command: 'media_toggle', field: 'mediaRestrictions' },
    { command: 'antispam_toggle', field: 'antiSpam' },
    { command: 'antiflood_toggle', field: 'antiFlood' },
    { command: 'warning_toggle', field: 'warningSystem' },
    { command: 'report_toggle', field: 'reportSettings' },
    { command: 'newuser_toggle', field: 'newUserRestrictions' },
    { command: 'multijoin_toggle', field: 'multiJoinDetection' },
    { command: 'autodelete_toggle', field: 'autoDelete' }
  ];

  private static readonly MENU_BUTTONS = [
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

  private static readonly FIELD_MAP: Record<string, string> = {
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

  private static readonly MEDIA_FIELD_MAP: Record<string, string> = {
    'photos': 'blockPhotos',
    'videos': 'blockVideos', 
    'stickers': 'blockStickers',
    'gifs': 'blockGifs',
    'docs': 'blockDocuments',
    'links': 'blockLinks'
  };

  static initialize(bot: Telegraf) {
    console.log("🔧 Loading Auto-Mod UI...");
    this.initializeAutoModCommand(bot);
    this.initializeMenuCallbacks(bot);
    this.initializeToggleCallbacks(bot);
    this.initializeMediaToggles(bot);
    this.initializeQuickToggles(bot);
    console.log("✅ Auto-Mod UI Loaded!");
  }

  // ============================================
  // MAIN COMMAND
  // ============================================
  private static initializeAutoModCommand(bot: Telegraf) {
    bot.command("automod", async (ctx: any) => {
      // Rate limit check
      if (!BotHelpers.checkRateLimit(`automod_${ctx.from.id}`, 2000)) {
        return;
      }

      try {
        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community. Use /mycommunities");
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        const component = await AutoModUIComponents.getComponent(settings, 'back_automod');
        
        await ctx.reply(component.message, {
          parse_mode: "Markdown",
          reply_markup: component.keyboard
        });
      } catch (error) {
        await BotHelpers.handleError(ctx, error);
      }
    });
  }

  // ============================================
  // MENU CALLBACKS
  // ============================================
  private static initializeMenuCallbacks(bot: Telegraf) {
    this.MENU_BUTTONS.forEach(button => {
      bot.action(button, async (ctx: any) => {
        try {
          await ctx.answerCbQuery();
          
          const community = await BotHelpers.getActiveCommunity(ctx.from.id);
          if (!community) {
            return ctx.answerCbQuery("❌ No active community", true);
          }

          const settings = await this.getOrCreateSettings(community.communityId);
          await AutoModUIComponents.updateUI(ctx, settings, button);
        } catch (error) {
          console.error('Menu button error:', error);
          await ctx.answerCbQuery("❌ Error updating menu", true);
        }
      });
    });
  }

  // ============================================
  // FEATURE TOGGLE CALLBACKS
  // ============================================
  private static initializeToggleCallbacks(bot: Telegraf) {
    bot.action(/^toggle_(\w+)$/, async (ctx: any) => {
      try {
        const typee = ctx.match[1];
        
        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.answerCbQuery("❌ No active community", true);
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        console.log(typee)
        const field = this.FIELD_MAP[typee];

        if (!field) {
          return ctx.answerCbQuery("❌ Invalid toggle", true);
        }

        // Toggle enabled state
        if (!settings[field]) {
          settings[field] = {};
        }
        settings[field].enabled = !settings[field].enabled;
        await settings.save();

        const status = settings[field].enabled ? '✅ Enabled' : '❌ Disabled';
        await ctx.answerCbQuery(status);

        // Update UI
        const uiSection = `automod_${typee}`;
        await AutoModUIComponents.updateUI(ctx, settings, uiSection);
      } catch (error) {
        await ctx.answerCbQuery("❌ Error toggling", true);
      }
    });
  }

  // ============================================
  // MEDIA TOGGLE CALLBACKS
  // ============================================
  private static initializeMediaToggles(bot: Telegraf) {
    bot.action(/^tm_(\w+)$/, async (ctx: any) => {
      try {
        const mediaType = ctx.match[1];
        
        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.answerCbQuery("❌ No active community", true);
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        const field = this.MEDIA_FIELD_MAP[mediaType];

        if (!field || !settings.mediaRestrictions) {
          return ctx.answerCbQuery("❌ Invalid media type", true);
        }

        // Toggle media restriction
        settings.mediaRestrictions[field] = !settings.mediaRestrictions[field];
        await settings.save();

        // Show feedback
        const status = settings.mediaRestrictions[field] ? '🚫 Blocked' : '✅ Allowed';
        const mediaName = this.capitalizeFirst(mediaType);
        await ctx.answerCbQuery(`${status} ${mediaName}`);

        // Update UI
        await AutoModUIComponents.updateUI(ctx, settings, 'automod_media');
      } catch (error) {
        console.error('Media toggle error:', error);
        await ctx.answerCbQuery("❌ Error toggling media", true);
      }
    });
  }

  // ============================================
  // QUICK TOGGLE COMMANDS
  // ============================================
  private static initializeQuickToggles(bot: Telegraf) {
    this.TOGGLE_COMMANDS.forEach(({ command, field }) => {
      bot.command(command, async (ctx: any) => {
        // Rate limit
        if (!BotHelpers.checkRateLimit(`toggle_${ctx.from.id}`, 2000)) {
          return;
        }

        try {
          const community = await BotHelpers.getActiveCommunity(ctx.from.id);
          if (!community) {
            return ctx.reply("❌ No active community. Use /mycommunities");
          }

          const settings = await this.getOrCreateSettings(community.communityId);

          // Toggle enabled state
          if (!settings[field]) {
            settings[field] = {};
          }
          settings[field].enabled = !settings[field].enabled;
          await settings.save();

          const status = settings[field].enabled ? 'enabled ✅' : 'disabled ❌';
          const featureName = field.replace(/([A-Z])/g, ' $1').toLowerCase();
          
          await ctx.reply(`✅ ${this.capitalizeFirst(featureName)} ${status}`);
        } catch (error) {
          await BotHelpers.handleError(ctx, error);
        }
      });
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  private static async getOrCreateSettings(communityId: string) {
    let settings = await AutoModSettings.findOne({ communityId });
    
    if (!settings) {
      settings = await AutoModSettings.create({ communityId });
    }
    
    return settings;
  }

  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}