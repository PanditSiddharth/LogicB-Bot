
// ============================================
// DATABASE SCHEMAS FOR AUTO-MODERATION
// ============================================

import mongoose from "mongoose";

// Auto-Moderation Settings Schema
const autoModSettingsSchema = new mongoose.Schema({
  communityId: { type: String, required: true, unique: true },

  // Banned Words Filter
  bannedWords: {
    type: {
      enabled: { type: Boolean, default: false },
      words: [{ type: String, lowercase: true }],
      action: {
        type: String,
        enum: ['delete', 'warn', 'mute', 'kick', 'ban'],
        default: 'warn'
      },
      warningsBeforePunish: { type: Number, default: 3 }
    },
    required: true
  },

  // Anti-Spam Settings
  antiSpam: {
    type: {
      enabled: { type: Boolean, default: true },
      maxMessages: { type: Number, default: 5 },
      timeWindow: { type: Number, default: 10 }, // seconds
      action: {
        type: String,
        enum: ['warn', 'mute', 'kick', 'ban'],
        default: 'mute'
      },
      muteDuration: { type: Number, default: 3600 } // seconds
    },
    required: true
  },

  // Anti-Flood (same message repeated)
  antiFlood: {
    type: {
      enabled: { type: Boolean, default: true },
      maxRepeats: { type: Number, default: 3 },
      action: { type: String, default: 'mute' }
    },
    required: true
  },

  // Media Restrictions
  mediaRestrictions: {
    type: {
      enabled: { type: Boolean, default: false },
      blockPhotos: { type: Boolean, default: false },
      blockVideos: { type: Boolean, default: false },
      blockStickers: { type: Boolean, default: false },
      blockGifs: { type: Boolean, default: false },
      blockDocuments: { type: Boolean, default: false },
      blockLinks: { type: Boolean, default: false },
      action: { type: String, default: 'delete' }
    },
    required: true
  },

  // Multi-Group Join Detection
  multiJoinDetection: {
    type: {
      enabled: { type: Boolean, default: true },
      maxGroupsInTime: { type: Number, default: 5 },
      timeWindow: { type: Number, default: 3600 }, // 1 hour
      action: {
        type: String,
        enum: ['warn', 'kick', 'ban', 'report'],
        default: 'report'
      },
      autoReport: { type: Boolean, default: true }
    },
    required: true
  },

  // Warning System
  warningSystem: {
    type: {
      enabled: { type: Boolean, default: true },
      maxWarnings: { type: Number, default: 3 },
      warningExpiry: { type: Number, default: 86400 * 7 }, // 7 days
      actionOnMax: {
        type: String,
        enum: ['mute', 'kick', 'ban'],
        default: 'ban'
      }
    },
    required: true
  },

  // Auto-Delete Settings
  autoDelete: {
    type: {
      enabled: { type: Boolean, default: false },
      deleteAfter: { type: Number, default: 86400 }, // 24 hours
      excludeAdmins: { type: Boolean, default: true },
      specificUsers: [Number] // User IDs to target
    },
    required: true
  },

  // Report Settings
  reportSettings: {
    type: {
      enabled: { type: Boolean, default: true },
      reportChannel: { type: String, default: "" }, // Channel ID for reports
      autoReportSpam: { type: Boolean, default: true },
      autoReportBannedWords: { type: Boolean, default: true },
      notifyAdmins: { type: Boolean, default: true }
    },
    required: true
  },

  // New User Restrictions
  newUserRestrictions: {
    type: {
      enabled: { type: Boolean, default: false },
      restrictDuration: { type: Number, default: 3600 }, // 1 hour
      canSendMessages: { type: Boolean, default: true },
      canSendMedia: { type: Boolean, default: false },
      canSendStickers: { type: Boolean, default: false },
      canSendPolls: { type: Boolean, default: false }
    },
    required: true
  }
});

// User Warnings Schema
const userWarningSchema = new mongoose.Schema({
  communityId: { type: String, required: true },
  userId: { type: Number, required: true },
  userName: { type: String, default: "" },
  warnings: [{
    reason: String,
    timestamp: { type: Date, default: Date.now },
    issuedBy: Number,
    groupId: Number
  }],
  totalWarnings: { type: Number, default: 0 },
  lastWarning: { type: Date, default: null }
});

// Message Tracker (for spam/flood detection)
const messageTrackerSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  chatId: { type: Number, required: true },
  communityId: { type: String, required: true },
  messages: [{
    text: String,
    timestamp: { type: Date, default: Date.now },
    messageId: Number
  }],
  lastCleanup: { type: Date, default: Date.now }
});

// Multi-Join Tracker
const multiJoinTrackerSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  communityId: { type: String, required: true },
  joins: [{
    groupId: Number,
    groupName: String,
    timestamp: { type: Date, default: Date.now }
  }],
  isReported: { type: Boolean, default: false },
  isSuspicious: { type: Boolean, default: false }
});

// Auto-Delete Queue
const autoDeleteQueueSchema = new mongoose.Schema({
  communityId: { type: String, required: true },
  chatId: { type: Number, required: true },
  messageId: { type: Number, required: true },
  userId: { type: Number, required: true },
  deleteAt: { type: Date, required: true },
  processed: { type: Boolean, default: false }
});


const defaultSettings = {
  bannedWords: {
    enabled: false,
    words: [],
    action: 'warn',
    warningsBeforePunish: 3
  },
  antiSpam: {
    enabled: true,
    maxMessages: 5,
    timeWindow: 10,
    action: 'mute',
    muteDuration: 3600
  },
  antiFlood: {
    enabled: true,
    maxRepeats: 3,
    action: 'mute'
  },
  mediaRestrictions: {
    enabled: false,
    blockPhotos: false,
    blockVideos: false,
    blockStickers: false,
    blockGifs: false,
    blockDocuments: false,
    blockLinks: false,
    action: 'delete'
  },
  multiJoinDetection: {
    enabled: true,
    maxGroupsInTime: 5,
    timeWindow: 3600,
    action: 'report',
    autoReport: true
  },
  warningSystem: {
    enabled: true,
    maxWarnings: 3,
    warningExpiry: 86400 * 7,
    actionOnMax: 'ban'
  },
  autoDelete: {
    enabled: false,
    deleteAfter: 86400,
    excludeAdmins: true,
    specificUsers: []
  },
  reportSettings: {
    enabled: true,
    reportChannel: "",
    autoReportSpam: true,
    autoReportBannedWords: true,
    notifyAdmins: true
  },
  newUserRestrictions: {
    enabled: false,
    restrictDuration: 3600,
    canSendMessages: true,
    canSendMedia: false,
    canSendStickers: false,
    canSendPolls: false
  }
};

const AutoModSettings = mongoose.model('AutoModSettings', autoModSettingsSchema);

AutoModSettings.schema.path('bannedWords').default(() => defaultSettings.bannedWords);
AutoModSettings.schema.path('antiSpam').default(() => defaultSettings.antiSpam);
AutoModSettings.schema.path('antiFlood').default(() => defaultSettings.antiFlood);
AutoModSettings.schema.path('mediaRestrictions').default(() => defaultSettings.mediaRestrictions);
AutoModSettings.schema.path('multiJoinDetection').default(() => defaultSettings.multiJoinDetection);
AutoModSettings.schema.path('warningSystem').default(() => defaultSettings.warningSystem);
AutoModSettings.schema.path('autoDelete').default(() => defaultSettings.autoDelete);
AutoModSettings.schema.path('reportSettings').default(() => defaultSettings.reportSettings);
AutoModSettings.schema.path('newUserRestrictions').default(() => defaultSettings.newUserRestrictions);

export { AutoModSettings };
export const UserWarning = mongoose.model('UserWarning', userWarningSchema);
export const MessageTracker = mongoose.model('MessageTracker', messageTrackerSchema);
export const MultiJoinTracker = mongoose.model('MultiJoinTracker', multiJoinTrackerSchema);
export const AutoDeleteQueue = mongoose.model('AutoDeleteQueue', autoDeleteQueueSchema);



// ============================================
// DATABASE SCHEMAS
// ============================================

// Community Schema
const communitySchema = new mongoose.Schema({
  communityId: { type: String, required: true, unique: true },
  ownerId: { type: Number, required: true },
  ownerName: { type: String, required: true },
  communityName: { type: String, required: true },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  settings: {
    allowAutoModeration: { type: Boolean, default: true },
    logChannel: { type: String, default: "" },
    welcomeMessage: { type: String, default: "" },
    rules: { type: String, default: "" }
  },
  admins: [{
    userId: Number,
    userName: String,
    permissions: {
      canAddGroups: { type: Boolean, default: false },
      canRemoveGroups: { type: Boolean, default: false },
      canBan: { type: Boolean, default: true },
      canMute: { type: Boolean, default: true },
      canBroadcast: { type: Boolean, default: false },
      canManageAdmins: { type: Boolean, default: false }
    }
  }],
  stats: {
    totalGroups: { type: Number, default: 0 },
    totalMembers: { type: Number, default: 0 },
    totalBans: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 }
  }
});

// Group Schema (linked to communities)
const groupSchema = new mongoose.Schema({
  chatId: { type: Number, required: true },
  communityId: { type: String, required: true },
  username: { type: String, default: "" },
  groupName: { type: String, required: true },
  addedBy: { type: Number, required: true },
  addedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  settings: {
    antiSpam: { type: Boolean, default: true },
    antiFlood: { type: Boolean, default: true },
    welcomeEnabled: { type: Boolean, default: false },
    rulesEnabled: { type: Boolean, default: false }
  }
});

// Global Ban List (per community)
const globalBanSchema = new mongoose.Schema({
  communityId: { type: String, required: true },
  userId: { type: Number, required: true },
  userName: { type: String, default: "" },
  reason: { type: String, default: "" },
  bannedBy: { type: Number, required: true },
  bannedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

// User-Community Mapping
const userCommunitySchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  activeCommunity: { type: String, default: null },
  communities: [String]
});

const Community = mongoose.model('Community', communitySchema);
const Group = mongoose.model('Group', groupSchema);
const GlobalBan = mongoose.model('GlobalBan', globalBanSchema);
const UserCommunity = mongoose.model('UserCommunity', userCommunitySchema);

export { Community, Group, GlobalBan, UserCommunity };