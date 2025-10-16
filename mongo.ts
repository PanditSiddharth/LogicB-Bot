// ============================================
// OPTIMIZED DATABASE SCHEMAS
// mongo.ts
// ============================================

import mongoose, { Schema, Model } from "mongoose";

// ============================================
// INTERFACES
// ============================================

interface IAutoModSettings {
  communityId: string;
  bannedWords: {
    enabled: boolean;
    words: string[];
    action: 'delete' | 'warn' | 'mute' | 'kick' | 'ban';
    warningsBeforePunish: number;
  };
  antiSpam: {
    enabled: boolean;
    maxMessages: number;
    timeWindow: number;
    action: 'warn' | 'mute' | 'kick' | 'ban';
    muteDuration: number;
  };
  antiFlood: {
    enabled: boolean;
    maxRepeats: number;
    action: string;
  };
  mediaRestrictions: {
    enabled: boolean;
    blockPhotos: boolean;
    blockVideos: boolean;
    blockStickers: boolean;
    blockGifs: boolean;
    blockDocuments: boolean;
    blockLinks: boolean;
    action: string;
  };
  multiJoinDetection: {
    enabled: boolean;
    maxGroupsInTime: number;
    timeWindow: number;
    action: 'warn' | 'kick' | 'ban' | 'report';
    autoReport: boolean;
  };
  warningSystem: {
    enabled: boolean;
    maxWarnings: number;
    warningExpiry: number;
    actionOnMax: 'mute' | 'kick' | 'ban';
  };
  autoDelete: {
    enabled: boolean;
    deleteAfter: number;
    excludeAdmins: boolean;
    specificUsers: number[];
  };
  reportSettings: {
    enabled: boolean;
    reportChannel: string;
    autoReportSpam: boolean;
    autoReportBannedWords: boolean;
    notifyAdmins: boolean;
  };
  newUserRestrictions: {
    enabled: boolean;
    restrictDuration: number;
    canSendMessages: boolean;
    canSendMedia: boolean;
    canSendStickers: boolean;
    canSendPolls: boolean;
  };
}

// ============================================
// DEFAULT SETTINGS
// ============================================

const defaultSettings = {
  bannedWords: {
    enabled: false,
    words: [],
    action: 'warn' as const,
    warningsBeforePunish: 3
  },
  antiSpam: {
    enabled: true,
    maxMessages: 5,
    timeWindow: 10,
    action: 'mute' as const,
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
    action: 'report' as const,
    autoReport: true
  },
  warningSystem: {
    enabled: true,
    maxWarnings: 3,
    warningExpiry: 86400 * 7,
    actionOnMax: 'ban' as const
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

// ============================================
// SCHEMAS
// ============================================

const autoModSettingsSchema = new Schema<IAutoModSettings>({
  communityId: { type: String, required: true, unique: true, index: true },
  bannedWords: {
    enabled: { type: Boolean, default: defaultSettings.bannedWords.enabled },
    words: [{ type: String, lowercase: true }],
    action: {
      type: String,
      enum: ['delete', 'warn', 'mute', 'kick', 'ban'],
      default: defaultSettings.bannedWords.action
    },
    warningsBeforePunish: { type: Number, default: defaultSettings.bannedWords.warningsBeforePunish }
  },
  antiSpam: {
    enabled: { type: Boolean, default: defaultSettings.antiSpam.enabled },
    maxMessages: { type: Number, default: defaultSettings.antiSpam.maxMessages },
    timeWindow: { type: Number, default: defaultSettings.antiSpam.timeWindow },
    action: {
      type: String,
      enum: ['warn', 'mute', 'kick', 'ban'],
      default: defaultSettings.antiSpam.action
    },
    muteDuration: { type: Number, default: defaultSettings.antiSpam.muteDuration }
  },
  antiFlood: {
    enabled: { type: Boolean, default: defaultSettings.antiFlood.enabled },
    maxRepeats: { type: Number, default: defaultSettings.antiFlood.maxRepeats },
    action: { type: String, default: defaultSettings.antiFlood.action }
  },
  mediaRestrictions: {
    enabled: { type: Boolean, default: defaultSettings.mediaRestrictions.enabled },
    blockPhotos: { type: Boolean, default: defaultSettings.mediaRestrictions.blockPhotos },
    blockVideos: { type: Boolean, default: defaultSettings.mediaRestrictions.blockVideos },
    blockStickers: { type: Boolean, default: defaultSettings.mediaRestrictions.blockStickers },
    blockGifs: { type: Boolean, default: defaultSettings.mediaRestrictions.blockGifs },
    blockDocuments: { type: Boolean, default: defaultSettings.mediaRestrictions.blockDocuments },
    blockLinks: { type: Boolean, default: defaultSettings.mediaRestrictions.blockLinks },
    action: { type: String, default: defaultSettings.mediaRestrictions.action }
  },
  multiJoinDetection: {
    enabled: { type: Boolean, default: defaultSettings.multiJoinDetection.enabled },
    maxGroupsInTime: { type: Number, default: defaultSettings.multiJoinDetection.maxGroupsInTime },
    timeWindow: { type: Number, default: defaultSettings.multiJoinDetection.timeWindow },
    action: {
      type: String,
      enum: ['warn', 'kick', 'ban', 'report'],
      default: defaultSettings.multiJoinDetection.action
    },
    autoReport: { type: Boolean, default: defaultSettings.multiJoinDetection.autoReport }
  },
  warningSystem: {
    enabled: { type: Boolean, default: defaultSettings.warningSystem.enabled },
    maxWarnings: { type: Number, default: defaultSettings.warningSystem.maxWarnings },
    warningExpiry: { type: Number, default: defaultSettings.warningSystem.warningExpiry },
    actionOnMax: {
      type: String,
      enum: ['mute', 'kick', 'ban'],
      default: defaultSettings.warningSystem.actionOnMax
    }
  },
  autoDelete: {
    enabled: { type: Boolean, default: defaultSettings.autoDelete.enabled },
    deleteAfter: { type: Number, default: defaultSettings.autoDelete.deleteAfter },
    excludeAdmins: { type: Boolean, default: defaultSettings.autoDelete.excludeAdmins },
    specificUsers: [Number]
  },
  reportSettings: {
    enabled: { type: Boolean, default: defaultSettings.reportSettings.enabled },
    reportChannel: { type: String, default: defaultSettings.reportSettings.reportChannel },
    autoReportSpam: { type: Boolean, default: defaultSettings.reportSettings.autoReportSpam },
    autoReportBannedWords: { type: Boolean, default: defaultSettings.reportSettings.autoReportBannedWords },
    notifyAdmins: { type: Boolean, default: defaultSettings.reportSettings.notifyAdmins }
  },
  newUserRestrictions: {
    enabled: { type: Boolean, default: defaultSettings.newUserRestrictions.enabled },
    restrictDuration: { type: Number, default: defaultSettings.newUserRestrictions.restrictDuration },
    canSendMessages: { type: Boolean, default: defaultSettings.newUserRestrictions.canSendMessages },
    canSendMedia: { type: Boolean, default: defaultSettings.newUserRestrictions.canSendMedia },
    canSendStickers: { type: Boolean, default: defaultSettings.newUserRestrictions.canSendStickers },
    canSendPolls: { type: Boolean, default: defaultSettings.newUserRestrictions.canSendPolls }
  }
}, { timestamps: true });

const userWarningSchema = new Schema({
  communityId: { type: String, required: true, index: true },
  userId: { type: Number, required: true, index: true },
  userName: { type: String, default: "" },
  warnings: [{
    reason: String,
    timestamp: { type: Date, default: Date.now },
    issuedBy: Number,
    groupId: Number
  }],
  totalWarnings: { type: Number, default: 0 },
  lastWarning: { type: Date, default: null }
}, { timestamps: true });

const messageTrackerSchema = new Schema({
  userId: { type: Number, required: true, index: true },
  chatId: { type: Number, required: true, index: true },
  communityId: { type: String, required: true, index: true },
  messages: [{
    text: String,
    timestamp: { type: Date, default: Date.now },
    messageId: Number
  }],
  lastCleanup: { type: Date, default: Date.now }
}, { timestamps: true });

const multiJoinTrackerSchema = new Schema({
  userId: { type: Number, required: true, index: true },
  communityId: { type: String, required: true, index: true },
  joins: [{
    groupId: Number,
    groupName: String,
    timestamp: { type: Date, default: Date.now }
  }],
  isReported: { type: Boolean, default: false },
  isSuspicious: { type: Boolean, default: false }
}, { timestamps: true });

const autoDeleteQueueSchema = new Schema({
  communityId: { type: String, required: true, index: true },
  chatId: { type: Number, required: true },
  messageId: { type: Number, required: true },
  userId: { type: Number, required: true },
  deleteAt: { type: Date, required: true, index: true },
  processed: { type: Boolean, default: false, index: true }
}, { timestamps: true });

const communitySchema = new Schema({
  communityId: { type: String, required: true, unique: true, index: true },
  ownerId: { type: Number, required: true, index: true },
  ownerName: { type: String, required: true },
  communityName: { type: String, required: true },
  description: { type: String, default: "" },
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
}, { timestamps: true });

const groupSchema = new Schema({
  chatId: { type: Number, required: true, index: true },
  communityId: { type: String, required: true, index: true },
  username: { type: String, default: "" },
  groupName: { type: String, required: true },
  addedBy: { type: Number, required: true },
  addedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true, index: true },
  settings: {
    antiSpam: { type: Boolean, default: true },
    antiFlood: { type: Boolean, default: true },
    welcomeEnabled: { type: Boolean, default: false },
    rulesEnabled: { type: Boolean, default: false }
  }
}, { timestamps: true });

const globalBanSchema = new Schema({
  communityId: { type: String, required: true, index: true },
  userId: { type: Number, required: true, index: true },
  userName: { type: String, default: "" },
  reason: { type: String, default: "" },
  bannedBy: { type: Number, required: true },
  bannedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

const userCommunitySchema = new Schema({
  userId: { type: Number, required: true, unique: true, index: true },
  activeCommunity: { type: String, default: null },
  communities: [String]
}, { timestamps: true });

// ============================================
// INDEXES
// ============================================

userWarningSchema.index({ communityId: 1, userId: 1 });
messageTrackerSchema.index({ userId: 1, chatId: 1, communityId: 1 });
multiJoinTrackerSchema.index({ userId: 1, communityId: 1 });
autoDeleteQueueSchema.index({ deleteAt: 1, processed: 1 });
groupSchema.index({ communityId: 1, isActive: 1 });
globalBanSchema.index({ communityId: 1, isActive: 1 });

// ============================================
// MODELS
// ============================================

export const AutoModSettings = mongoose.model<IAutoModSettings>('AutoModSettings', autoModSettingsSchema);
export const UserWarning = mongoose.model('UserWarning', userWarningSchema);
export const MessageTracker = mongoose.model('MessageTracker', messageTrackerSchema);
export const MultiJoinTracker = mongoose.model('MultiJoinTracker', multiJoinTrackerSchema);
export const AutoDeleteQueue = mongoose.model('AutoDeleteQueue', autoDeleteQueueSchema);
export const Community = mongoose.model('Community', communitySchema);
export const Group = mongoose.model('Group', groupSchema);
export const GlobalBan = mongoose.model('GlobalBan', globalBanSchema);
export const UserCommunity = mongoose.model('UserCommunity', userCommunitySchema);