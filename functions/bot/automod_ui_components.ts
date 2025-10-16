// ============================================
// AUTO-MODERATION UI COMPONENTS
// functions/bot/automod_ui_components.ts
// Contains all UI messages and keyboard layouts
// ============================================

import { Markup } from 'telegraf';
import { AutoModSettings } from "../../mongo";

export interface UIComponent {
  message: string;
  keyboard: {
    inline_keyboard: Array<Array<{
      text: string;
      callback_data: string;
    }>>;
  };
}

export class AutoModUIComponents {
  // ============================================
  // MAIN DASHBOARD
  // ============================================
  static getDashboardUI(settings: any, communityName: string) {
    const message = `
⚙️ *Auto-Moderation Dashboard*

*Community:* ${communityName}

*Current Status:*
${settings.bannedWords?.enabled ? '✅' : '❌'} Banned Words (${settings.bannedWords?.words?.length || 0} words)
${settings.antiSpam?.enabled ? '✅' : '❌'} Anti-Spam
${settings.antiFlood?.enabled ? '✅' : '❌'} Anti-Flood
${settings.mediaRestrictions?.enabled ? '✅' : '❌'} Media Restrictions
${settings.multiJoinDetection?.enabled ? '✅' : '❌'} Multi-Join Detection
${settings.warningSystem?.enabled ? '✅' : '❌'} Warning System
${settings.autoDelete?.enabled ? '✅' : '❌'} Auto-Delete
${settings.reportSettings?.enabled ? '✅' : '❌'} Reports

*Click buttons below to configure:*
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

  // ============================================
  // MEDIA FILTER UI
  // ============================================
  static getMediaFilterUI(settings: any) {
    const message = `
🎬 *Media Restrictions*

*Status:* ${settings.mediaRestrictions?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Currently Blocked:*
${settings.mediaRestrictions?.blockPhotos ? '✅' : '❌'} Photos
${settings.mediaRestrictions?.blockVideos ? '✅' : '❌'} Videos
${settings.mediaRestrictions?.blockStickers ? '✅' : '❌'} Stickers
${settings.mediaRestrictions?.blockGifs ? '✅' : '❌'} GIFs/Animations
${settings.mediaRestrictions?.blockDocuments ? '✅' : '❌'} Documents
${settings.mediaRestrictions?.blockLinks ? '✅' : '❌'} Links

*Action:* ${settings.mediaRestrictions?.action || 'delete'}

*Commands:*
\`/media_toggle\` - Enable/Disable
\`/media_block photos\` - Block type
\`/media_allow photos\` - Allow type

*Types:* photos | videos | stickers | gifs | documents | links
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: settings.mediaRestrictions?.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_media" }
        ],
        ...(settings.mediaRestrictions?.enabled ? [
          [
            { text: `${settings.mediaRestrictions?.blockPhotos ? '❌' : '✅'} Photos`,
              callback_data: "toggle_media_photos" },
            { text: `${settings.mediaRestrictions?.blockVideos ? '❌' : '✅'} Videos`,
              callback_data: "toggle_media_videos" }
          ],
          [
            { text: `${settings.mediaRestrictions?.blockStickers ? '❌' : '✅'} Stickers`,
              callback_data: "toggle_media_stickers" },
            { text: `${settings.mediaRestrictions?.blockGifs ? '❌' : '✅'} GIFs`,
              callback_data: "toggle_media_gifs" }
          ],
          [
            { text: `${settings.mediaRestrictions?.blockDocuments ? '❌' : '✅'} Documents`,
              callback_data: "toggle_media_docs" },
            { text: `${settings.mediaRestrictions?.blockLinks ? '❌' : '✅'} Links`,
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

  // ============================================
  // ANTI-SPAM UI
  // ============================================
  static getAntiSpamUI(settings: any) {
    const message = `
📊 *Anti-Spam Protection*

*Status:* ${settings.antiSpam?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Configuration:*
• Max Messages: ${settings.antiSpam?.maxMessages || 5}
• Time Window: ${settings.antiSpam?.timeWindow || 10} seconds
• Action: ${settings.antiSpam?.action || 'mute'}
• Mute Duration: ${(settings.antiSpam?.muteDuration || 3600) / 60} minutes

*How it Works:*
If user sends more than ${settings.antiSpam?.maxMessages || 5} messages in ${settings.antiSpam?.timeWindow || 10} seconds, they will be ${settings.antiSpam?.action || 'muted'}.

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
          { text: settings.antiSpam?.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_antispam" }
        ],
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" }
        ]
      ]
    };

    return { message, keyboard };
  }

  // ============================================
  // BANNED WORDS UI
  // ============================================
  static getBannedWordsUI(settings: any): UIComponent {
    const words = settings?.bannedWords?.words || [];
    const wordsList = words.length > 0 
      ? words.slice(0, 10).join(', ') + (words.length > 10 ? '...' : '')
      : 'No words added';

    const message = `
🚫 *Banned Words Filter*

*Status:* ${settings?.bannedWords?.enabled ? 'Enabled ✅' : 'Disabled ❌'}
*Total Words:* ${words.length}
*Action:* ${settings?.bannedWords?.action || 'warn'}
*Warnings Before Punish:* ${settings?.bannedWords?.warningsBeforePunish || 3}

*Words:* ${wordsList}

*Commands:*
\`/addword spam scam\` - Add words
\`/removeword spam\` - Remove word
\`/listwords\` - View all words
\`/wordaction ban\` - Set action
\`/wordwarnings 3\` - Set warnings
\`/togglewords\` - Enable/Disable

*Actions:* delete | warn | mute | kick | ban`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: settings?.bannedWords?.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_words" },
          { text: "📝 View All Words", callback_data: "view_words" }
        ],
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" }
        ]
      ]
    };

    return { message, keyboard };
  }

  // ============================================
  // ANTI-FLOOD UI
  // ============================================
  static getAntiFloodUI(settings: any): UIComponent {
    const message = `
🌊 *Anti-Flood Protection*

*Status:* ${settings?.antiFlood?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Configuration:*
• Max Repeats: ${settings?.antiFlood?.maxRepeats || 3}
• Action: ${settings?.antiFlood?.action || 'mute'}

*How it Works:*
If user sends the same message ${settings?.antiFlood?.maxRepeats || 3} times, they will be ${settings?.antiFlood?.action || 'muted'}.

*Example:*
User sends "spam spam spam" → Action triggered

*Commands:*
\`/antiflood_toggle\` - Enable/Disable
\`/antiflood_limit 3\` - Set max repeats
\`/antiflood_action mute\` - Set action

*Actions:* warn | mute | kick | ban`;

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

  // ============================================
  // MULTI-JOIN UI
  // ============================================
  static getMultiJoinUI(settings: any): UIComponent {
    const message = `
👥 *Multi-Join Detection*

*Status:* ${settings?.multiJoinDetection?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Configuration:*
• Max Groups: ${settings?.multiJoinDetection?.maxGroupsInTime || 5}
• Time Window: ${(settings?.multiJoinDetection?.timeWindow || 3600) / 60} minutes
• Action: ${settings?.multiJoinDetection?.action || 'report'}
• Auto Report: ${settings?.multiJoinDetection?.autoReport ? 'Yes ✅' : 'No ❌'}

*How it Works:*
If user joins more than ${settings?.multiJoinDetection?.maxGroupsInTime || 5} groups in ${(settings?.multiJoinDetection?.timeWindow || 3600) / 60} minutes, action is triggered.

*Use Case:*
Prevent spammers who join multiple groups quickly to advertise.

*Commands:*
\`/multijoin_toggle\` - Enable/Disable
\`/multijoin_limit 5\` - Set max groups
\`/multijoin_window 1d or 1h\` - Time window
\`/multijoin_action report\` - Set action

*Actions:* warn | kick | ban | report`;

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

  // ============================================
  // WARNING SYSTEM UI
  // ============================================
  static getWarningSystemUI(settings: any): UIComponent {
    const message = `
⚠️ *Warning System*

*Status:* ${settings?.warningSystem?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Configuration:*
• Max Warnings: ${settings?.warningSystem?.maxWarnings || 3}
• Warning Expiry: ${(settings?.warningSystem?.warningExpiry || 604800) / 86400} days
• Action on Max: ${settings?.warningSystem?.actionOnMax || 'ban'}

*How it Works:*
1. Admin issues warning: \`/warn\`
2. User gets warned (1/${settings?.warningSystem?.maxWarnings || 3})
3. After ${settings?.warningSystem?.maxWarnings || 3} warnings → ${settings?.warningSystem?.actionOnMax || 'banned'}
4. Warnings expire after ${(settings?.warningSystem?.warningExpiry || 604800) / 86400} days

*Commands:*
\`/warn\` - Warn user (reply)
\`/warnings\` - View warnings (reply)
\`/clearwarnings\` - Clear (reply)

*Settings:*
\`/warning_toggle\` - Enable/Disable
\`/warning_max 3\` - Set max warnings
\`/warning_expiry 7\` - Expiry (days)
\`/warning_action ban\` - Action

*Actions:* mute | kick | ban`;

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

  // ============================================
  // AUTO-DELETE UI
  // ============================================
  static getAutoDeleteUI(settings: any): UIComponent {
    const message = `
🗑️ *Auto-Delete Messages*

*Status:* ${settings?.autoDelete?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Configuration:*
• Delete After: ${(settings?.autoDelete?.deleteAfter || 86400) / 3600} hours
• Exclude Admins: ${settings?.autoDelete?.excludeAdmins ? 'Yes ✅' : 'No ❌'}
• Specific Users: ${settings?.autoDelete?.specificUsers?.length || 0} users

*How it Works:*
Messages are automatically deleted after ${(settings?.autoDelete?.deleteAfter || 86400) / 3600} hours.

*Use Case:*
Keep group clean by auto-deleting old messages.

⚠️ *Note:* Bot can only delete messages ≤48 hours old due to Telegram limitation.

*Commands:*
\`/autodelete_toggle\` - Enable/Disable
\`/autodelete_time 24\` - Hours (1-48)
\`/autodelete_exclude yes\` - Exclude admins

*Warning:* Use carefully! Messages will be permanently deleted.`;

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

  // ============================================
  // REPORTS UI
  // ============================================
  static getReportsUI(settings: any): UIComponent {
    const message = `
📢 *Report System*

*Status:* ${settings?.reportSettings?.enabled ? 'Enabled ✅' : 'Disabled ❌'}

*Configuration:*
• Report Channel: ${settings?.reportSettings?.reportChannel || 'Not set'}
• Auto Report Spam: ${settings?.reportSettings?.autoReportSpam ? 'Yes ✅' : 'No ❌'}
• Auto Report Banned Words: ${settings?.reportSettings?.autoReportBannedWords ? 'Yes ✅' : 'No ❌'}
• Notify Admins: ${settings?.reportSettings?.notifyAdmins ? 'Yes ✅' : 'No ❌'}

*How it Works:*
1. Auto-mod detects violation
2. Report sent to channel
3. Admins notified
4. Action logged

*Report Includes:*
• User info
• Violation type
• Group name
• Timestamp
• Action taken

*Commands:*
\`/report_toggle\` - Enable/Disable
\`/report_channel @channel\` - Set channel
\`/report_spam yes\` - Auto report spam

*Setup:*
1. Create private channel
2. Add bot as admin
3. Use \`/report_channel @yourchannel\``;

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

  // ============================================
  // NEW USERS UI
  // ============================================
  static getNewUsersUI(settings: any): UIComponent {
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

*How it Works:*
When user joins, they are restricted for ${(settings?.newUserRestrictions?.restrictDuration || 3600) / 60} minutes with limited permissions.

*Use Case:*
Prevent new users from immediately spamming.

*Commands:*
\`/newuser_toggle\` - Enable/Disable
\`/newuser_duration 60\` - Duration (minutes)
\`/newuser_messages yes\` - Allow messages
\`/newuser_media no\` - Block media`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: settings?.newUserRestrictions?.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_newusers" },
          { text: `${settings?.newUserRestrictions?.canSendMessages ? '❌' : '✅'} Messages`,
            callback_data: "toggle_newuser_messages" }
        ],
        [
          { text: `${settings?.newUserRestrictions?.canSendMedia ? '❌' : '✅'} Media`,
            callback_data: "toggle_newuser_media" },
          { text: `${settings?.newUserRestrictions?.canSendStickers ? '❌' : '✅'} Stickers`,
            callback_data: "toggle_newuser_stickers" }
        ],
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" }
        ]
      ]
    };

    return { message, keyboard };
  }

  static async updateUI(ctx: any, settings: any, section: string) {
    try {
      const component = await this.getComponent(settings, section);
      await ctx.editMessageText(component.message, {
        parse_mode: "Markdown",
        reply_markup: component.keyboard,
        chat_id: ctx.chat?.id,
        message_id: ctx.callbackQuery?.message?.message_id
      });
    } catch (error) {
      console.error('UI Update Error:', error);
      await ctx.answerCbQuery('Error updating UI');
    }
  }

  static async getComponent(settings: any, section: string): Promise<UIComponent> {
    let ui: UIComponent;
    switch (section) {
      case 'automod_words':
        ui = this.getBannedWordsUI(settings);
        break;
      case 'automod_spam':
        ui = this.getAntiSpamUI(settings);
        break;
      case 'automod_flood':
        ui = this.getAntiFloodUI(settings);
        break;
      case 'automod_media':
        ui = this.getMediaFilterUI(settings);
        break;
      case 'automod_multijoin':
        ui = this.getMultiJoinUI(settings);
        break;
      case 'automod_warnings':
        ui = this.getWarningSystemUI(settings);
        break;
      case 'automod_autodelete':
        ui = this.getAutoDeleteUI(settings);
        break;
      case 'automod_reports':
        ui = this.getReportsUI(settings);
        break;
      case 'automod_newusers':
        ui = this.getNewUsersUI(settings);
        break;
      case 'back_automod':
      default:
        ui = this.getDashboardUI(settings, '');
    }
    return ui;
    }
  }
