// ============================================
// OPTIMIZED MAIN INDEX
// index.ts
// ============================================

import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { initializeMultiCommunityBot } from "./functions/bot/multi_community";
import { UtilityPart1 } from "./functions/bot/utility_commands_part1";
import { UtilityPart2 } from "./functions/bot/utility_commands_part2";
import { AutoModerationSystem } from "./functions/bot/auto_moderation";
import { AutoModUI } from "./functions/bot/auto_moderation_ui";
import { MessageCleanupService } from "./functions/services/messageCleanup";
import { MessageManagerUI } from './functions/bot/message_manager_ui';
import { initializeLocalModeration } from "./functions/bot/local_moderation";
import { MultiJoinTracker } from "./mongo";
import { MultiJoinDetection } from "./functions/bot/multi_join";

// Load environment variables
dotenv.config();

// Validate environment variables
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is required");
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI is required");
  process.exit(1);
}

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: {
    apiRoot: process.env.API_ROOT || 'https://api.telegram.org',
  }
});

// MongoDB connection with better error handling
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB");

    // Initialize bot modules
    console.log("🚀 Initializing bot modules...");

    try {
      // Initialize in order of dependency
      new AutoModerationSystem(bot);
      console.log("✅ Auto-Moderation System initialized");

      AutoModUI.initialize(bot);
      console.log("✅ Auto-Mod UI initialized");

      UtilityPart1.initialize(bot);
      console.log("✅ Utility Commands Part 1 initialized");

      UtilityPart2.initialize(bot);
      console.log("✅ Utility Commands Part 2 initialized");

      await initializeMultiCommunityBot(bot);
      console.log("✅ Multi-Community System initialized");

      const cleanupService = new MessageCleanupService(bot);
      cleanupService.start();

      // In your bot initialization
      MessageManagerUI.initialize(bot);
      initializeLocalModeration(bot)
      MultiJoinDetection.initializeMultiJoinDetection(bot)
      console.log("🎉 All modules loaded successfully");
    } catch (error) {
      console.error("❌ Error initializing modules:", error);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });

// MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Error handlers
bot.catch((err: any, ctx: any) => {
  console.error('Bot error:', err);
  ctx.reply('❌ An error occurred. Please try again.').catch(() => { });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  bot.stop('SIGINT');
  mongoose.connection.close().then(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

process.once('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
  bot.stop('SIGTERM');
  mongoose.connection.close().then(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

// Launch bot
bot.launch({
  dropPendingUpdates: true,
  allowedUpdates: [
    'message',
    'edited_message',
    'channel_post',
    'edited_channel_post',
    'inline_query',
    'chosen_inline_result',
    'callback_query',
    'shipping_query',
    'pre_checkout_query',
    'poll',
    'poll_answer',
    'my_chat_member',
    'chat_member',
    'chat_join_request'

  ]
})
  .then(() => {
    console.log('🤖 Bot started successfully!');
    console.log(`📅 ${new Date().toLocaleString()}`);
  })
  .catch(err => {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
  });

export { bot };