import mongoose, { Schema } from 'mongoose';

interface IBotMessageSettings {
  communityId: string;
  messageTypes: {
    // Service messages (join/leave etc)
    service: {
      enabled: boolean;
      deleteAfter: number; // seconds
    };
    // Welcome messages
    welcome: {
      enabled: boolean;
      deleteAfter: number;
    };
    // Bot command responses
    commands: {
      enabled: boolean;
      deleteAfter: number;
    };
    // Punishment notifications
    punishments: {
      enabled: boolean;
      deleteAfter: number;
    };
    // Warning messages
    warnings: {
      enabled: boolean;
      deleteAfter: number;
    };
    // Help and info messages
    help: {
      enabled: boolean;
      deleteAfter: number;
    };
  };
  // Any custom message types
  customTypes: {
    name: string;
    deleteAfter: number;
  }[];
}

// Default settings
const defaultDeleteTimes = {
  service: 30,    // 30 seconds
  welcome: 300,   // 5 minutes
  commands: 60,   // 1 minute
  punishments: 600, // 10 minutes
  warnings: 300,  // 5 minutes
  help: 600,     // 10 minutes
};

const botMessageSettingsSchema = new Schema<IBotMessageSettings>({
  communityId: { type: String, required: true, unique: true, index: true },
  messageTypes: {
    service: {
      enabled: { type: Boolean, default: true },
      deleteAfter: { type: Number, default: defaultDeleteTimes.service }
    },
    welcome: {
      enabled: { type: Boolean, default: true },
      deleteAfter: { type: Number, default: defaultDeleteTimes.welcome }
    },
    commands: {
      enabled: { type: Boolean, default: true },
      deleteAfter: { type: Number, default: defaultDeleteTimes.commands }
    },
    punishments: {
      enabled: { type: Boolean, default: true },
      deleteAfter: { type: Number, default: defaultDeleteTimes.punishments }
    },
    warnings: {
      enabled: { type: Boolean, default: true },
      deleteAfter: { type: Number, default: defaultDeleteTimes.warnings }
    },
    help: {
      enabled: { type: Boolean, default: true },
      deleteAfter: { type: Number, default: defaultDeleteTimes.help }
    }
  },
  customTypes: [{
    name: String,
    deleteAfter: Number
  }]
}, { timestamps: true });

// Schema for tracking messages to be deleted
const botMessageQueueSchema = new Schema({
  messageId: { type: Number, required: true },
  chatId: { type: Number, required: true },
  communityId: { type: String, required: true },
  type: { type: String, required: true },
  deleteAt: { type: Date, required: true, index: true },
  isDeleted: { type: Boolean, default: false },
  isCustom: { type: Boolean, default: false },
  customType: String
}, { timestamps: true });

// Create indexes
botMessageQueueSchema.index({ deleteAt: 1, isDeleted: 1 });
botMessageQueueSchema.index({ chatId: 1, messageId: 1 }, { unique: true });

// Export models
export const BotMessageSettings = mongoose.model('BotMessageSettings', botMessageSettingsSchema);
export const BotMessageQueue = mongoose.model('BotMessageQueue', botMessageQueueSchema);

// Export types
export type MessageType = 'service' | 'welcome' | 'commands' | 'punishments' | 'warnings' | 'help' | 'custom';
