// ============================================
// OPTIMIZED AUTO-MODERATION UI
// functions/bot/auto_moderation_ui.ts
// ============================================

import { Telegraf } from 'telegraf';
import { AutoModSettings, Group, MultiJoinTracker } from '../../mongo';
import { AutoModUIComponents } from './automod_ui_components';
import { BotHelpers } from '../utils/helpers';
import { MessageManager } from '../utils/messageManager';

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

  // Action options for punishment settings
  private static readonly ACTION_OPTIONS = {
    spam: ['warn', 'mute', 'kick', 'ban'],
    flood: ['warn', 'mute', 'kick', 'ban'],
    multijoin: ['warn', 'kick', 'ban', 'report'],
    warnings: ['mute', 'kick', 'ban']
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
    this.initializeActionCallbacks(bot);
    this.initializeCommandHandlers(bot);
    this.initializeMultiJoinDetection(bot);
    console.log("✅ Auto-Mod UI Loaded!");
  }



  private static initializeMultiJoinDetection(bot: any) {
    // Listen for new members joining
    bot.on('new_chat_members', async (ctx: any) => {
      try {
        const newMembers = ctx.message.new_chat_members;

        for (const member of newMembers) {
          // Skip bots
          if (member.is_bot) continue;

          await this.handleUserJoin(ctx, member);
        }
      } catch (error) {
        console.error('Error in new_chat_members handler:', error);
      }
    });
  }

  private static async handleUserJoin(ctx: any, user: any) {
    try {
      // Get community for this chat
      const group = await Group.findOne({ chatId: ctx.chat.id, isActive: true });
      if (!group) return;

      const settings = await AutoModSettings.findOne({
        communityId: group.communityId
      });

      // Check if multi-join detection is enabled
      if (!settings?.multiJoinDetection?.enabled) return;

      // Find or create tracker for this user
      let tracker = await MultiJoinTracker.findOne({
        userId: user.id,
        communityId: group.communityId
      });

      if (!tracker) {
        tracker = await MultiJoinTracker.create({
          userId: user.id,
          communityId: group.communityId,
          joins: [],
          isReported: false,
          isSuspicious: false
        });
      }

      // Add this join to the tracker
      tracker.joins.push({
        groupId: ctx.chat.id,
        groupName: ctx.chat.title || 'Unknown',
        timestamp: new Date()
      });

      // Clean old joins outside the time window
      const timeWindow = settings.multiJoinDetection.timeWindow || 3600;
      const cutoffTime = new Date(Date.now() - (timeWindow * 1000));

      tracker?.joins?.forEach((join: any) => {
        if (join.timestamp <= cutoffTime) {
          tracker.joins.pull(join);
        }
      });


      await tracker.save();

      // Check if threshold exceeded
      const maxGroups = settings.multiJoinDetection.maxGroupsInTime || 5;

      if (tracker.joins.length >= maxGroups && !tracker.isReported) {
        tracker.isSuspicious = true;
        tracker.isReported = true;
        await tracker.save();

        // Take action
        await this.handleMultiJoinViolation(
          ctx,
          user,
          tracker,
          settings,
          group.communityId
        );
      }
    } catch (error) {
      console.error('Error handling user join:', error);
    }
  }

  private static async handleMultiJoinViolation(
    ctx: any,
    user: any,
    tracker: any,
    settings: any,
    communityId: string
  ) {
    const action = settings.multiJoinDetection.action || 'report';
    const groupsList = tracker.joins
      .map((j: any) => `• ${j.groupName}`)
      .join('\n');

    // Report to channel
    if (settings.multiJoinDetection.autoReport && settings.reportSettings?.reportChannel) {
      const reportMsg = `
🚨 *Multi-Join Detection Alert*

*User:* ${user.first_name} (${user.id})
*Username:* ${user.username ? '@' + user.username : 'None'}

*Joined ${tracker.joins.length} groups in ${BotHelpers.formatDuration(settings.multiJoinDetection.timeWindow)}:*
${groupsList}

*Action Taken:* ${action.toUpperCase()}
*Time:* ${new Date().toLocaleString()}
      `;

      try {
        await ctx.telegram.sendMessage(
          settings.reportSettings.reportChannel,
          reportMsg,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Error sending multi-join report:', error);
      }
    }

    // Take action based on settings
    try {
      switch (action) {
        case 'warn':
          await ctx.reply(
            `⚠️ Warning: ${user.first_name} joined multiple groups rapidly.`,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'kick':
          await ctx.kickChatMember(user.id);
          await ctx.unbanChatMember(user.id); // Unban so they can rejoin
          await ctx.reply(
            `🚫 ${user.first_name} was kicked for joining multiple groups rapidly.`,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'ban':
          await ctx.kickChatMember(user.id);
          await ctx.reply(
            `🔨 ${user.first_name} was banned for joining multiple groups rapidly.`,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'report':
          // Just report, no action in chat
          break;
      }
    } catch (error) {
      console.error('Error executing multi-join action:', error);
    }
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

        await MessageManager.updateUI(ctx, 'automod_dashboard', component);
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
  // ACTION AND DURATION SELECTION CALLBACKS
  // ============================================
  private static initializeActionCallbacks(bot: Telegraf) {
    // Handle action selection
    bot.action(/^set_action_(\w+)_(\w+)$/, async (ctx: any) => {
      try {
        const [feature, action] = [ctx.match[1], ctx.match[2]];

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.answerCbQuery("❌ No active community", true);
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        const field = this.FIELD_MAP[feature];

        if (!settings[field]) {
          return ctx.answerCbQuery("❌ Invalid feature", true);
        }

        // Special handling for autoreport action
        if (action === 'autoreport') {
          settings[field].autoReport = !settings[field].autoReport;
          const status = settings[field].autoReport ? 'enabled' : 'disabled';
          await ctx.answerCbQuery(`✅ Auto-Report ${status}`);
        } else {
          settings[field].action = action;
          await ctx.answerCbQuery(`✅ Action set to: ${action.toUpperCase()}`);
        }

        await settings.save();
        await AutoModUIComponents.updateUI(ctx, settings, `automod_${feature}`);
      } catch (error) {
        await ctx.answerCbQuery("❌ Error setting action", true);
      }
    });

    // Handle duration selection
    bot.action(/^set_duration_(\w+)_(\d+)$/, async (ctx: any) => {
      try {
        const [feature, duration] = [ctx.match[1], parseInt(ctx.match[2])];

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.answerCbQuery("❌ No active community", true);
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        const field = this.FIELD_MAP[feature];

        if (!settings[field]) {
          return ctx.answerCbQuery("❌ Invalid feature", true);
        }

        if (feature === 'antispam') {
          settings[field].muteDuration = duration;
        } else if (feature === 'newusers') {
          settings[field].restrictDuration = duration;
        }

        await settings.save();

        await ctx.answerCbQuery(`✅ Duration set to: ${BotHelpers.formatDuration(duration)}`);

        // Update UI
        const uiSection = `automod_${feature}`;
        await AutoModUIComponents.updateUI(ctx, settings, uiSection);
      } catch (error) {
        await ctx.answerCbQuery("❌ Error setting duration", true);
      }
    });
  }

  // ============================================
  // COMMAND HANDLERS
  // ============================================
  private static initializeCommandHandlers(bot: Telegraf) {
    // Anti-Spam Commands
    bot.command("antispam_limit", async (ctx: any) => {
      try {
        const limit = parseInt(ctx.message.text.split(' ')[1]);
        if (!limit || isNaN(limit)) {
          return ctx.reply("❌ Usage: /antispam_limit <number>");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community");
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        settings.antiSpam.maxMessages = limit;
        await settings.save();

        await ctx.reply(`✅ Anti-spam message limit set to: ${limit}`);

        // Update UI
        await AutoModUIComponents.updateUI(ctx, settings, 'automod_spam');
      } catch (error) {
        await ctx.reply("❌ Error setting limit");
      }
    });

    bot.command("antispam_window", async (ctx: any) => {
      try {
        const input = ctx.message.text.split(' ')[1];
        if (!input) {
          return ctx.reply("❌ Usage: /antispam_window <time> (e.g. 30s, 1m, 1h)");
        }

        const duration = BotHelpers.parseDuration(input);
        if (!duration) {
          return ctx.reply("❌ Invalid duration format. Use s/m/h/d/y for time units");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community");
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        settings.antiSpam.timeWindow = duration;
        await settings.save();

        await ctx.reply(`✅ Anti-spam time window set to: ${BotHelpers.formatDuration(duration)}`);

        // Update UI
        await AutoModUIComponents.updateUI(ctx, settings, 'automod_spam');
      } catch (error) {
        await ctx.reply("❌ Error setting time window");
      }
    });

    // Anti-Flood Commands
    bot.command("antiflood_limit", async (ctx: any) => {
      try {
        const limit = parseInt(ctx.message.text.split(' ')[1]);
        if (!limit || isNaN(limit)) {
          return ctx.reply("❌ Usage: /antiflood_limit <number>");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community");
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        settings.antiFlood.maxRepeats = limit;
        await settings.save();

        await ctx.reply(`✅ Anti-flood repeat limit set to: ${limit}`);

        // Update UI
        await AutoModUIComponents.updateUI(ctx, settings, 'automod_flood');
      } catch (error) {
        await ctx.reply("❌ Error setting limit");
      }
    });

    // Warning System Commands
    bot.command("warning_max", async (ctx: any) => {
      try {
        const max = parseInt(ctx.message.text.split(' ')[1]);
        if (!max || isNaN(max)) {
          return ctx.reply("❌ Usage: /warning_max <number>");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community");
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        settings.warningSystem.maxWarnings = max;
        await settings.save();

        await ctx.reply(`✅ Maximum warnings set to: ${max}`);

        // Update UI
        await AutoModUIComponents.updateUI(ctx, settings, 'automod_warnings');
      } catch (error) {
        await ctx.reply("❌ Error setting max warnings");
      }
    });

    bot.command("warning_expiry", async (ctx: any) => {
      try {
        const input = ctx.message.text.split(' ')[1];
        if (!input) {
          return ctx.reply("❌ Usage: /warning_expiry <time> (e.g. 7d, 1m, 1y)");
        }

        const duration = BotHelpers.parseDuration(input);
        if (!duration) {
          return ctx.reply("❌ Invalid duration format. Use s/m/h/d/y for time units");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community");
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        settings.warningSystem.warningExpiry = duration;
        await settings.save();

        await ctx.reply(`✅ Warning expiry set to: ${BotHelpers.formatDuration(duration)}`);

        // Update UI
        await AutoModUIComponents.updateUI(ctx, settings, 'automod_warnings');
      } catch (error) {
        await ctx.reply("❌ Error setting warning expiry");
      }
    });

    // AutoDelete Commands
    bot.command("autodelete_time", async (ctx: any) => {
      try {
        const input = ctx.message.text.split(' ')[1];
        if (!input) {
          return ctx.reply("❌ Usage: /autodelete_time <time> (e.g. 24h, 2d)");
        }

        const duration = BotHelpers.parseDuration(input);
        if (!duration) {
          return ctx.reply("❌ Invalid duration format. Use s/m/h/d/y for time units");
        }

        // Validate range (1 minute to 48 hours)
        const minutesValue = duration / 60;
        if (minutesValue < 1 || minutesValue > 48 * 60) {
          return ctx.reply("❌ Duration must be between 1 minutes and 48 hours");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community");
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        settings.autoDelete.deleteAfter = duration;
        await settings.save();

        await ctx.reply(`✅ Auto-delete time set to: ${BotHelpers.formatDuration(duration)}`);

        // Update UI
        await AutoModUIComponents.updateUI(ctx, settings, 'automod_autodelete');
      } catch (error) {
        await ctx.reply("❌ Error setting auto-delete time");
      }
    });

    bot.command("autodelete_exclude", async (ctx: any) => {
      try {
        const value = ctx.message.text.split(' ')[1]?.toLowerCase();
        if (!value || !['yes', 'no'].includes(value)) {
          return ctx.reply("❌ Usage: /autodelete_exclude <yes/no>");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community");
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        settings.autoDelete.excludeAdmins = value === 'yes';
        await settings.save();

        await ctx.reply(`✅ Admin exclusion ${value === 'yes' ? 'enabled' : 'disabled'}`);

        // Update UI
        await AutoModUIComponents.updateUI(ctx, settings, 'automod_autodelete');
      } catch (error) {
        await ctx.reply("❌ Error setting admin exclusion");
      }
    });

    // Multi-Join Commands
    bot.command("multijoin_limit", async (ctx: any) => {
      try {
        const limit = parseInt(ctx.message.text.split(' ')[1]);
        if (!limit || isNaN(limit)) {
          return ctx.reply("❌ Usage: /multijoin_limit <number>");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community");
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        settings.multiJoinDetection.maxGroupsInTime = limit;
        await settings.save();

        // Update UI with success message included in the UI
        await AutoModUIComponents.updateUI(ctx, settings, 'automod_multijoin');
      } catch (error) {
        await ctx.reply("❌ Error setting group limit");
      }
    });

    bot.command("multijoin_window", async (ctx: any) => {
      try {
        const input = ctx.message.text.split(' ')[1];
        if (!input) {
          return ctx.reply("❌ Usage: /multijoin_window <time> (e.g. 1h, 30m)");
        }

        const duration = BotHelpers.parseDuration(input);
        if (!duration) {
          return ctx.reply("❌ Invalid duration format. Use h for hours, m for minutes.");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community");
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        settings.multiJoinDetection.timeWindow = duration;
        await settings.save();

        await ctx.reply(`✅ Multi-join time window set to: ${BotHelpers.formatDuration(duration)}`);

        // Update UI
        await AutoModUIComponents.updateUI(ctx, settings, 'automod_multijoin');
      } catch (error) {
        await ctx.reply("❌ Error setting time window");
      }
    });

    // New User Restrictions Commands
    bot.command("newuser_duration", async (ctx: any) => {
      try {
        const input = ctx.message.text.split(' ')[1];
        if (!input) {
          return ctx.reply("❌ Usage: /newuser_duration <time> (e.g. 30m, 1h, 1d)");
        }

        const duration = BotHelpers.parseDuration(input);
        if (!duration) {
          return ctx.reply("❌ Invalid duration format. Use s/m/h/d/y for time units");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community");
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        settings.newUserRestrictions.restrictDuration = duration;
        await settings.save();

        await ctx.reply(`✅ New user restriction duration set to: ${BotHelpers.formatDuration(duration)}`);

        // Update UI
        await AutoModUIComponents.updateUI(ctx, settings, 'automod_newusers');
      } catch (error) {
        await ctx.reply("❌ Error setting duration");
      }
    });

    bot.command("newuser_messages", async (ctx: any) => {
      try {
        const value = ctx.message.text.split(' ')[1]?.toLowerCase();
        if (!value || !['yes', 'no'].includes(value)) {
          return ctx.reply("❌ Usage: /newuser_messages <yes/no>");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community");
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        settings.newUserRestrictions.canSendMessages = value === 'yes';
        await settings.save();

        await ctx.reply(`✅ New users can ${value === 'yes' ? 'now' : 'no longer'} send messages`);

        // Update UI
        await AutoModUIComponents.updateUI(ctx, settings, 'automod_newusers');
      } catch (error) {
        await ctx.reply("❌ Error updating setting");
      }
    });

    bot.command("newuser_media", async (ctx: any) => {
      try {
        const value = ctx.message.text.split(' ')[1]?.toLowerCase();
        if (!value || !['yes', 'no'].includes(value)) {
          return ctx.reply("❌ Usage: /newuser_media <yes/no>");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community");
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        settings.newUserRestrictions.canSendMedia = value === 'yes';
        settings.newUserRestrictions.canSendStickers = value === 'yes';
        settings.newUserRestrictions.canSendPolls = value === 'yes';
        await settings.save();

        await ctx.reply(`✅ New users can ${value === 'yes' ? 'now' : 'no longer'} send media`);

        // Update UI
        await AutoModUIComponents.updateUI(ctx, settings, 'automod_newusers');
      } catch (error) {
        await ctx.reply("❌ Error updating setting");
      }
    });

    // Banned Words Commands
    bot.command("wordwarnings", async (ctx: any) => {
      try {
        const warnings = parseInt(ctx.message.text.split(' ')[1]);
        if (!warnings || isNaN(warnings)) {
          return ctx.reply("❌ Usage: /wordwarnings <number>");
        }

        const community = await BotHelpers.getActiveCommunity(ctx.from.id);
        if (!community) {
          return ctx.reply("❌ No active community");
        }

        const settings = await this.getOrCreateSettings(community.communityId);
        settings.bannedWords.warningsBeforePunish = warnings;
        await settings.save();

        await ctx.reply(`✅ Warnings before punishment set to: ${warnings}`);

        // Update UI
        await AutoModUIComponents.updateUI(ctx, settings, 'automod_words');
      } catch (error) {
        await ctx.reply("❌ Error setting warnings");
      }
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
