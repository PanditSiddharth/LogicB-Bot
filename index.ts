// ============================================
// UPDATED MAIN INDEX FILE
// index.ts
// ============================================


import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { initializeMultiCommunityBot } from "./functions/bot/multi_community";
// import { DashboardCallbacks } from "./functions/bot/utility_commands";
import { UtilityPart1 } from "./functions/bot/utility_commands_part1";
import { UtilityPart2 } from "./functions/bot/utility_commands_part2";
import { AutoModerationSystem } from "./functions/bot/auto_moderation";
dotenv.config();


const bot = new Telegraf(process.env.BOT_TOKEN!);
mongoose.connect(process.env.MONGODB_URI!).then(() => {
new AutoModerationSystem(bot);
UtilityPart1.initialize(bot);
UtilityPart2.initialize(bot);
initializeMultiCommunityBot(bot)
// UtilityCommands.initialize(bot);
  console.log("Connected to MongoDB");
}).catch(err => {
  console.error("Failed to connect to MongoDB", err);
  process.exit(1);
});
// Initialize


bot.launch();

// ============================================
// ADMIN PERMISSION MANAGEMENT
// ============================================

// export class PermissionManager {
//   static async setPermission(
//     communityId: string,
//     adminId: number,
//     permission: string,
//     value: boolean
//   ) {
//     const community = await Community.findOne({ communityId });
//     if (!community) throw new Error("Community not found");

//     const admin = community.admins.find((a: any) => a.userId === adminId);
//     if (!admin) throw new Error("Admin not found");

//     admin.permissions[permission] = value;
//     await community.save();
    
//     return true;
//   }

//   static async getPermissions(communityId: string, userId: number) {
//     const community = await Community.findOne({ communityId });
//     if (!community) return null;

//     if (community.ownerId === userId) {
//       return {
//         isOwner: true,
//         canAddGroups: true,
//         canRemoveGroups: true,
//         canBan: true,
//         canMute: true,
//         canBroadcast: true,
//         canManageAdmins: true
//       };
//     }

//     const admin = community.admins.find((a: any) => a.userId === userId);
//     return admin ? { isOwner: false, ...admin.permissions } : null;
//   }
// }
