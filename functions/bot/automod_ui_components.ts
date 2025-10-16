// ============================================
// OPTIMIZED AUTO-MODERATION UI COMPONENTS
// functions/bot/automod_ui_components.ts
// ============================================

import { BotHelpers } from '../utils/helpers';

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
  // MAIN UPDATE METHOD
  // ============================================
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
      await ctx.answerCbQuery('❌ Error updating UI', true).catch(() => {});
    }
  }

  // ============================================
  // COMPONENT ROUTER
  // ============================================
  static async getComponent(settings: any, section: string): Promise<UIComponent> {
    const componentMap: Record<string, () => UIComponent> = {
      'automod_words': () => this.getBannedWordsUI(settings),
      'automod_spam': () => this.getAntiSpamUI(settings),
      'automod_flood': () => this.getAntiFloodUI(settings),
      'automod_media': () => this.getMediaFilterUI(settings),
      'automod_multijoin': () => this.getMultiJoinUI(settings),
      'automod_warnings': () => this.getWarningSystemUI(settings),
      'automod_autodelete': () => this.getAutoDeleteUI(settings),
      'automod_reports': () => this.getReportsUI(settings),
      'automod_newusers': () => this.getNewUsersUI(settings),
      'back_automod': () => this.getDashboardUI(settings, '')
    };

    const component = componentMap[section];
    return component ? component() : this.getDashboardUI(settings, '');
  }

  // ============================================
  // DASHBOARD
  // ============================================
  private static getDashboardUI(settings: any, communityName: string): UIComponent {
    const s = settings; // Shorthand
    const enabled = (field: any) => field?.enabled ? '✅' : '❌';
    
    const message = `
⚙️ *Auto-Moderation Dashboard*

*Current Status:*
${enabled(s.bannedWords)} Banned Words (${s.bannedWords?.words?.length || 0} words)
${enabled(s.antiSpam)} Anti-Spam
${enabled(s.antiFlood)} Anti-Flood
${enabled(s.mediaRestrictions)} Media Restrictions
${enabled(s.multiJoinDetection)} Multi-Join Detection
${enabled(s.warningSystem)} Warning System
${enabled(s.autoDelete)} Auto-Delete
${enabled(s.reportSettings)} Reports

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
          { text: "🆕 New Users", callback_data: "automod_newusers" },
          
        ]
      ]
    };

    return { message, keyboard };
  }

  // ============================================
  // BANNED WORDS
  // ============================================
  private static getBannedWordsUI(settings: any): UIComponent {
    const words = settings?.bannedWords?.words || [];
    const wordsList = words.length > 0 
      ? words.slice(0, 10).join(', ') + (words.length > 10 ? '...' : '')
      : 'No words added';

    const message = `
🚫 *Banned Words Filter*

*Status:* ${settings?.bannedWords?.enabled ? '✅ Enabled' : '❌ Disabled'}
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
            callback_data: "toggle_words" }
        ],
        [
          { text: "🔙 Back", callback_data: "back_automod" },
          { text: "❌ Close", callback_data: "close" }        
        ]
      ]
    };

    return { message, keyboard };
  }

  // ============================================
  // ANTI-SPAM
  // ============================================
  private static getAntiSpamUI(settings: any): UIComponent {
    const spam = settings?.antiSpam || {};
    
    const message = `
📊 *Anti-Spam Protection*

*Status:* ${spam.enabled ? '✅ Enabled' : '❌ Disabled'}

*Configuration:*
• Max Messages: ${spam.maxMessages || 5}
• Time Window: ${spam.timeWindow || 10} seconds
• Action: ${spam.action || 'mute'}
• Mute Duration: ${BotHelpers.formatDuration(spam.muteDuration || 3600)}

*How it Works:*
If user sends more than ${spam.maxMessages || 5} messages in ${spam.timeWindow || 10} seconds, they will be ${spam.action || 'muted'}.

*Commands:*
\`/antispam_toggle\` - Enable/Disable
\`/antispam_limit 5\` - Set max messages
\`/antispam_window 10\` - Set time window
\`/antispam_action mute\` - Set action
\`/antispam_duration 3600\` - Mute duration (seconds)

*Actions:* warn | mute | kick | ban`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: spam.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_antispam" }
        ],
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" },
          { text: "❌ Close", callback_data: "close" }
        ]
      ]
    };

    return { message, keyboard };
  }

  // ============================================
  // ANTI-FLOOD
  // ============================================
  private static getAntiFloodUI(settings: any): UIComponent {
    const flood = settings?.antiFlood || {};
    
    const message = `
🌊 *Anti-Flood Protection*

*Status:* ${flood.enabled ? '✅ Enabled' : '❌ Disabled'}

*Configuration:*
• Max Repeats: ${flood.maxRepeats || 3}
• Action: ${flood.action || 'mute'}

*How it Works:*
If user sends the same message ${flood.maxRepeats || 3} times, they will be ${flood.action || 'muted'}.

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
          { text: flood.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_antiflood" }
        ],
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" },
          { text: "❌ Close", callback_data: "close" }
        ]
      ]
    };

    return { message, keyboard };
  }

  // ============================================
  // MEDIA FILTER
  // ============================================
  private static getMediaFilterUI(settings: any): UIComponent {
    const media = settings?.mediaRestrictions || {};
    const icon = (blocked: boolean) => blocked ? '✅' : '❌';
    
    const message = `
🎬 *Media Restrictions*

*Status:* ${media.enabled ? '✅ Enabled' : '❌ Disabled'}

*Currently Blocked:*
${icon(media.blockPhotos)} Photos
${icon(media.blockVideos)} Videos
${icon(media.blockStickers)} Stickers
${icon(media.blockGifs)} GIFs/Animations
${icon(media.blockDocuments)} Documents
${icon(media.blockLinks)} Links

*Commands:*
\`/media_toggle\` - Enable/Disable
\`/media_block photos\` - Block type
\`/media_allow photos\` - Allow type

*Types:* photos | videos | stickers | gifs | documents | links`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: media.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_media" }
        ],
        ...(media.enabled ? [
          [
            { text: `${icon(media.blockPhotos)} Photos`,
              callback_data: "tm_photos" },
            { text: `${icon(media.blockVideos)} Videos`,
              callback_data: "tm_videos" }
          ],
          [
            { text: `${icon(media.blockStickers)} Stickers`,
              callback_data: "tm_stickers" },
            { text: `${icon(media.blockGifs)} GIFs`,
              callback_data: "tm_gifs" }
          ],
          [
            { text: `${icon(media.blockDocuments)} Documents`,
              callback_data: "tm_docs" },
            { text: `${icon(media.blockLinks)} Links`,
              callback_data: "tm_links" }
          ]
        ] : []),
        [
          { text: "🔙 Back", callback_data: "back_automod" },
          { text: "❌ Close", callback_data: "close" }
        ]
      ]
    };

    return { message, keyboard };
  }

  // ============================================
  // MULTI-JOIN
  // ============================================
  private static getMultiJoinUI(settings: any): UIComponent {
    const mj = settings?.multiJoinDetection || {};
    const timeWindow = BotHelpers.formatDuration(mj.timeWindow || 3600);
    
    const message = `
👥 *Multi-Join Detection*

*Status:* ${mj.enabled ? '✅ Enabled' : '❌ Disabled'}

*Configuration:*
• Max Groups: ${mj.maxGroupsInTime || 5}
• Time Window: ${timeWindow}
• Action: ${mj.action || 'report'}
• Auto Report: ${mj.autoReport ? 'Yes ✅' : 'No ❌'}

*How it Works:*
If user joins more than ${mj.maxGroupsInTime || 5} groups in ${timeWindow}, action is triggered.

*Use Case:*
Prevent spammers who join multiple groups quickly to advertise.

*Commands:*
\`/multijoin_toggle\` - Enable/Disable
\`/multijoin_limit 5\` - Set max groups
\`/multijoin_window 1h\` - Time window
\`/multijoin_action report\` - Set action

*Actions:* warn | kick | ban | report`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: mj.enabled ? "❌ Disable" : "✅ Enable", 
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
  // WARNING SYSTEM
  // ============================================
  private static getWarningSystemUI(settings: any): UIComponent {
    const warn = settings?.warningSystem || {};
    const expiry = BotHelpers.formatDuration(warn.warningExpiry || 604800);
    
    const message = `
⚠️ *Warning System*

*Status:* ${warn.enabled ? '✅ Enabled' : '❌ Disabled'}

*Configuration:*
• Max Warnings: ${warn.maxWarnings || 3}
• Warning Expiry: ${expiry}
• Action on Max: ${warn.actionOnMax || 'ban'}

*How it Works:*
1. Admin issues warning: \`/warn\`
2. User gets warned (1/${warn.maxWarnings || 3})
3. After ${warn.maxWarnings || 3} warnings → ${warn.actionOnMax || 'banned'}
4. Warnings expire after ${expiry}

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
          { text: warn.enabled ? "❌ Disable" : "✅ Enable", 
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
  // AUTO-DELETE
  // ============================================
  private static getAutoDeleteUI(settings: any): UIComponent {
    const del = settings?.autoDelete || {};
    const duration = BotHelpers.formatDuration(del.deleteAfter || 86400);
    
    const message = `
🗑️ *Auto-Delete Messages*

*Status:* ${del.enabled ? '✅ Enabled' : '❌ Disabled'}

*Configuration:*
• Delete After: ${duration}
• Exclude Admins: ${del.excludeAdmins ? 'Yes ✅' : 'No ❌'}
• Specific Users: ${del.specificUsers?.length || 0} users

*How it Works:*
Messages are automatically deleted after ${duration}.

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
          { text: del.enabled ? "❌ Disable" : "✅ Enable", 
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
  // REPORTS
  // ============================================
  private static getReportsUI(settings: any): UIComponent {
    const rep = settings?.reportSettings || {};
    
    const message = `
📢 *Report System*

*Status:* ${rep.enabled ? '✅ Enabled' : '❌ Disabled'}

*Configuration:*
• Report Channel: ${rep.reportChannel || 'Not set'}
• Auto Report Spam: ${rep.autoReportSpam ? 'Yes ✅' : 'No ❌'}
• Auto Report Banned Words: ${rep.autoReportBannedWords ? 'Yes ✅' : 'No ❌'}
• Notify Admins: ${rep.notifyAdmins ? 'Yes ✅' : 'No ❌'}

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
          { text: rep.enabled ? "❌ Disable" : "✅ Enable", 
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
  // NEW USERS
  // ============================================
  private static getNewUsersUI(settings: any): UIComponent {
    const newUser = settings?.newUserRestrictions || {};
    const duration = BotHelpers.formatDuration(newUser.restrictDuration || 3600);
    const icon = (enabled: boolean) => enabled ? '✅' : '❌';
    
    const message = `
🆕 *New User Restrictions*

*Status:* ${newUser.enabled ? '✅ Enabled' : '❌ Disabled'}

*Configuration:*
• Restrict Duration: ${duration}

*Permissions for New Users:*
${icon(newUser.canSendMessages)} Send Messages
${icon(newUser.canSendMedia)} Send Media
${icon(newUser.canSendStickers)} Send Stickers
${icon(newUser.canSendPolls)} Send Polls

*How it Works:*
When user joins, they are restricted for ${duration} with limited permissions.

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
          { text: newUser.enabled ? "❌ Disable" : "✅ Enable", 
            callback_data: "toggle_newusers" }
        ],
        [
          { text: "🔙 Back to Auto-Mod", callback_data: "back_automod" }
        ]
      ]
    };

    return { message, keyboard };
  }
}