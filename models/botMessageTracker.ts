import mongoose, { Schema } from 'mongoose';

interface IBotMessageTracker {
  communityId: string;
  chatId: number;
  messageId: number;
  messageType: string;
  createdAt: Date;
}

const botMessageTrackerSchema = new Schema<IBotMessageTracker>({
  communityId: { type: String, required: true, index: true },
  chatId: { type: Number, required: true, index: true },
  messageId: { type: Number, required: true },
  messageType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-delete after 24h
}, { 
  timestamps: true 
});

// Compound index for faster lookups
botMessageTrackerSchema.index({ communityId: 1, chatId: 1, messageType: 1 });

export const BotMessageTracker = mongoose.model<IBotMessageTracker>('BotMessageTracker', botMessageTrackerSchema);
