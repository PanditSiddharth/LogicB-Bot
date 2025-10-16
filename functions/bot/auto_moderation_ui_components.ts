import { AutoModSettings, UserCommunity, Community } from '../../mongo';
import { Markup } from 'telegraf';

export interface UIComponent {
  message: string;
  keyboard: any;
}

export class AutoModUIComponents {
  static async updateUI(ctx: any, settings: any, section: string) {
    const component = await this.getComponent(settings, section);
    await ctx.editMessageText(component.message, {
      parse_mode: "Markdown",
      reply_markup: component.keyboard
    });
  }

  static async getComponent(settings: any, section: string): Promise<UIComponent> {
    switch (section) {
      case 'automod_words':
        return this.getBannedWordsComponent(settings);
      case 'automod_spam':
        return this.getAntiSpamComponent(settings);
      case 'automod_flood':
        return this.getAntiFloodComponent(settings);
      case 'automod_media':
        return this.getMediaFilterComponent(settings);
      case 'automod_multijoin':
        return this.getMultiJoinComponent(settings);
      case 'automod_warnings':
        return this.getWarningSystemComponent(settings);
      case 'automod_autodelete':
        return this.getAutoDeleteComponent(settings);
      case 'automod_reports':
        return this.getReportSystemComponent(settings);
      case 'automod_newusers':
        return this.getNewUserRestrictionsComponent(settings);
      case 'back_automod':
        return this.getMainDashboardComponent(settings);
      default:
        return this.getMainDashboardComponent(settings);
    }
  }

  private static getBannedWordsComponent(settings: any): UIComponent {
    const message = `
🚫 *Banned Words*

*Status:* ${settings?.bannedWords?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Configuration:*
• Words: ${settings?.bannedWords?.words?.length || 0} words
• Action: ${settings?.bannedWords?.action || 'warn'}
• Warnings: ${settings?.bannedWords?.warningsBeforePunish || 3}

*Commands:*
\`/addword <word>\` - Add word
\`/removeword <word>\` - Remove word
\`/listwords\` - List words
\`/wordaction warn|mute|kick|ban\`
\`/wordwarnings 3\` - Set warnings

*Actions:* warn | mute | kick | ban
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: settings?.bannedWords?.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_words" }
        ],
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" }
        ]
      ]
    };

    return { message, keyboard };
  }

  private static getAntiSpamComponent(settings: any): UIComponent {
    const message = `
📊 *Anti-Spam Protection*

*Status:* ${settings?.antiSpam?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Configuration:*
• Max Messages: ${settings?.antiSpam?.maxMessages || 5}
• Time Window: ${settings?.antiSpam?.timeWindow || 10} seconds
• Action: ${settings?.antiSpam?.action || 'mute'}
• Mute Duration: ${(settings?.antiSpam?.muteDuration || 3600) / 60} minutes

*Commands:*
\`/antispam_toggle\` - Enable/Disable
\`/antispam_limit 5\` - Set max messages
\`/antispam_window 10\` - Set time window
\`/antispam_action mute\` - Set action
\`/antispam_duration 3600\` - Mute duration (seconds)

*Actions:* warn | mute | kick | ban
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: settings?.antiSpam?.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_antispam" }
        ],
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" }
        ]
      ]
    };

    return { message, keyboard };
  }

  private static getAntiFloodComponent(settings: any): UIComponent {
    const message = `
🌊 *Anti-Flood Protection*

*Status:* ${settings?.antiFlood?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Configuration:*
• Max Repeats: ${settings?.antiFlood?.maxRepeats || 3}
• Action: ${settings?.antiFlood?.action || 'mute'}

*Commands:*
\`/antiflood_toggle\` - Enable/Disable
\`/antiflood_limit 3\` - Set max repeats
\`/antiflood_action mute\` - Set action

*Actions:* warn | mute | kick | ban
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: settings?.antiFlood?.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_antiflood" }
        ],
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" }
        ]
      ]
    };

    return { message, keyboard };
  }

  private static getMediaFilterComponent(settings: any): UIComponent {
    const message = `
🎬 *Media Restrictions*

*Status:* ${settings?.mediaRestrictions?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Currently Blocked:*
${settings?.mediaRestrictions?.blockPhotos ? '✅' : '❌'} Photos
${settings?.mediaRestrictions?.blockVideos ? '✅' : '❌'} Videos
${settings?.mediaRestrictions?.blockStickers ? '✅' : '❌'} Stickers
${settings?.mediaRestrictions?.blockGifs ? '✅' : '❌'} GIFs/Animations
${settings?.mediaRestrictions?.blockDocuments ? '✅' : '❌'} Documents
${settings?.mediaRestrictions?.blockLinks ? '✅' : '❌'} Links

*Commands:*
\`/media_toggle\` - Enable/Disable
\`/media_block photos\` - Block type
\`/media_allow photos\` - Allow type

*Types:* photos | videos | stickers | gifs | documents | links
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: settings?.mediaRestrictions?.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_media" }
        ],
        ...(settings?.mediaRestrictions?.enabled ? [
          [
            { text: `${settings?.mediaRestrictions?.blockPhotos ? '❌' : '✅'} Photos`,
              callback_data: "toggle_media_photos" },
            { text: `${settings?.mediaRestrictions?.blockVideos ? '❌' : '✅'} Videos`,
              callback_data: "toggle_media_videos" }
          ],
          [
            { text: `${settings?.mediaRestrictions?.blockStickers ? '❌' : '✅'} Stickers`,
              callback_data: "toggle_media_stickers" },
            { text: `${settings?.mediaRestrictions?.blockGifs ? '❌' : '✅'} GIFs`,
              callback_data: "toggle_media_gifs" }
          ],
          [
            { text: `${settings?.mediaRestrictions?.blockDocuments ? '❌' : '✅'} Documents`,
              callback_data: "toggle_media_docs" },
            { text: `${settings?.mediaRestrictions?.blockLinks ? '❌' : '✅'} Links`,
              callback_data: "toggle_media_links" }
          ]
        ] : []),
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" }
        ]
      ]
    };

    return { message, keyboard };
  }

  private static getMultiJoinComponent(settings: any): UIComponent {
    const message = `
👥 *Multi-Join Detection*

*Status:* ${settings?.multiJoinDetection?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Configuration:*
• Max Groups: ${settings?.multiJoinDetection?.maxGroupsInTime || 5}
• Time Window: ${(settings?.multiJoinDetection?.timeWindow || 3600) / 60} minutes
• Action: ${settings?.multiJoinDetection?.action || 'report'}
• Auto Report: ${settings?.multiJoinDetection?.autoReport ? 'Yes ✅' : 'No ❌'}

*Commands:*
\`/multijoin_toggle\` - Enable/Disable
\`/multijoin_limit 5\` - Set max groups
\`/multijoin_window 1d or 1h\` - Time window
\`/multijoin_action report\` - Set action

*Actions:* warn | kick | ban | report
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: settings?.multiJoinDetection?.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_multijoin" }
        ],
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" }
        ]
      ]
    };

    return { message, keyboard };
  }

  private static getWarningSystemComponent(settings: any): UIComponent {
    const message = `
⚠️ *Warning System*

*Status:* ${settings?.warningSystem?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Configuration:*
• Max Warnings: ${settings?.warningSystem?.maxWarnings || 3}
• Warning Expiry: ${(settings?.warningSystem?.warningExpiry || 604800) / 86400} days
• Action on Max: ${settings?.warningSystem?.actionOnMax || 'ban'}

*Commands:*
\`/warn\` - Warn user (reply)
\`/warnings\` - View warnings (reply)
\`/clearwarnings\` - Clear (reply)

*Settings:*
\`/warning_toggle\` - Enable/Disable
\`/warning_max 3\` - Set max warnings
\`/warning_expiry 7\` - Expiry (days)
\`/warning_action ban\` - Action

*Actions:* mute | kick | ban
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: settings?.warningSystem?.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_warnings" }
        ],
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" }
        ]
      ]
    };

    return { message, keyboard };
  }

  private static getAutoDeleteComponent(settings: any): UIComponent {
    const message = `
🗑️ *Auto-Delete Messages*

*Status:* ${settings?.autoDelete?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Configuration:*
• Delete After: ${(settings?.autoDelete?.deleteAfter || 86400) / 3600} hours
• Exclude Admins: ${settings?.autoDelete?.excludeAdmins ? 'Yes ✅' : 'No ❌'}
• Specific Users: ${settings?.autoDelete?.specificUsers?.length || 0} users

*Commands:*
\`/autodelete_toggle\` - Enable/Disable
\`/autodelete_time 24\` - Hours (1-48)
\`/autodelete_exclude yes\` - Exclude admins

⚠️ *Note:* Bot can only delete messages ≤48 hours old due to Telegram limitation.
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: settings?.autoDelete?.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_autodelete" }
        ],
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" }
        ]
      ]
    };

    return { message, keyboard };
  }

  private static getReportSystemComponent(settings: any): UIComponent {
    const message = `
📢 *Report System*

*Status:* ${settings?.reportSettings?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Configuration:*
• Report Channel: ${settings?.reportSettings?.reportChannel || 'Not set'}
• Auto Report Spam: ${settings?.reportSettings?.autoReportSpam ? 'Yes ✅' : 'No ❌'}
• Auto Report Banned Words: ${settings?.reportSettings?.autoReportBannedWords ? 'Yes ✅' : 'No ❌'}
• Notify Admins: ${settings?.reportSettings?.notifyAdmins ? 'Yes ✅' : 'No ❌'}

*Commands:*
\`/report_toggle\` - Enable/Disable
\`/report_channel @channel\` - Set channel
\`/report_spam yes\` - Auto report spam

*Setup:*
1. Create private channel
2. Add bot as admin
3. Use \`/report_channel @yourchannel\`
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: settings?.reportSettings?.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_reports" }
        ],
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" }
        ]
      ]
    };

    return { message, keyboard };
  }

  private static getNewUserRestrictionsComponent(settings: any): UIComponent {
    const message = `
🆕 *New User Restrictions*

*Status:* ${settings?.newUserRestrictions?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Configuration:*
• Restrict Duration: ${(settings?.newUserRestrictions?.restrictDuration || 3600) / 60} minutes

*Permissions for New Users:*
${settings?.newUserRestrictions?.canSendMessages ? '✅' : '❌'} Send Messages
${settings?.newUserRestrictions?.canSendMedia ? '✅' : '❌'} Send Media
${settings?.newUserRestrictions?.canSendStickers ? '✅' : '❌'} Send Stickers
${settings?.newUserRestrictions?.canSendPolls ? '✅' : '❌'} Send Polls

*Commands:*
\`/newuser_toggle\` - Enable/Disable
\`/newuser_duration 60\` - Duration (minutes)
\`/newuser_messages yes\` - Allow messages
\`/newuser_media no\` - Block media
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: settings?.newUserRestrictions?.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_newusers" }
        ],
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" }
        ]
      ]
    };

    return { message, keyboard };
  }

  private static getMainDashboardComponent(settings: any): UIComponent {
    const message = `
⚙️ *Auto-Moderation Dashboard*

*Current Status:*
${settings?.bannedWords?.enabled ? '✅' : '❌'} Banned Words (${settings?.bannedWords?.words?.length || 0} words)
${settings?.antiSpam?.enabled ? '✅' : '❌'} Anti-Spam
${settings?.antiFlood?.enabled ? '✅' : '❌'} Anti-Flood
${settings?.mediaRestrictions?.enabled ? '✅' : '❌'} Media Restrictions
${settings?.multiJoinDetection?.enabled ? '✅' : '❌'} Multi-Join Detection
${settings?.warningSystem?.enabled ? '✅' : '❌'} Warning System
${settings?.autoDelete?.enabled ? '✅' : '❌'} Auto-Delete
${settings?.reportSettings?.enabled ? '✅' : '❌'} Reports

*Click buttons to configure:*
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🚫 Banned Words", callback_data: "automod_words" },
          { text: "📊 Anti-Spam", callback_data: "automod_spam" }
        ],
        [
          { text: "🌊 Anti-Flood", callback_data: "automod_flood" },
          { text: "🎬 Media Filter", callback_data: "automod_media" }
        ],
        [
          { text: "👥 Multi-Join", callback_data: "automod_multijoin" },
          { text: "⚠️ Warnings", callback_data: "automod_warnings" }
        ],
        [
          { text: "🗑️ Auto-Delete", callback_data: "automod_autodelete" },
          { text: "📢 Reports", callback_data: "automod_reports" }
        ],
        [
          { text: "🆕 New Users", callback_data: "automod_newusers" }
        ]
      ]
    };

    return { message, keyboard };
  }
}
