import { Context, Telegraf } from "telegraf";
import { Group, MultiJoinTracker, AutoModSettings } from "../../mongo";
import { BotHelpers } from "../utils/helpers";
import { Update } from "telegraf/types";

export class MultiJoinDetection {
    public static initializeMultiJoinDetection(bot: Telegraf) {
        bot.on("chat_member", async (ctx: Context<Update.ChatMemberUpdate>) => {
            try {
                const update = ctx.update.chat_member;
                const { old_chat_member, new_chat_member } = update;

                // 🟢 User joined
                if (
                    old_chat_member.status === "left" &&
                    ["member", "administrator"].includes(new_chat_member.status)
                ) {
                    const user = new_chat_member.user;
                    if (!user.is_bot) await this.handleUserJoin(ctx, user);
                }

                // 🔴 User left
                if (
                    ["member", "administrator"].includes(old_chat_member.status) &&
                    new_chat_member.status === "left"
                ) {
                    const user = old_chat_member.user;
                    if (!user.is_bot) await this.handleUserLeave(ctx, user);
                }
            } catch (err) {
                console.error("Error in chat_member handler:", err);
            }
        });
    }

    // =========================
    // 🟢 When user joins
    // =========================
    private static async handleUserJoin(ctx: any, user: any) {
        try {
            const chat = ctx.chat;
            const group = await Group.findOne({ chatId: chat.id, isActive: true });
            if (!group) return;

            const settings = await AutoModSettings.findOne({
                communityId: group.communityId,
            });
            if (!settings?.multiJoinDetection?.enabled) return;

            let tracker = await MultiJoinTracker.findOne({
                userId: user.id,
                communityId: group.communityId,
            });

            // Create if not exist
            if (!tracker) {
                tracker = await MultiJoinTracker.create({
                    userId: user.id,
                    communityId: group.communityId,
                    joins: [],
                    isReported: false,
                    isSuspicious: false,
                });
            }

            // Avoid duplicate joins
            const alreadyJoined = tracker.joins.some((j: any) => j.groupId === chat.id);
            if (!alreadyJoined) {
                tracker.joins.push({
                    groupId: chat.id,
                    groupName: chat.title || "Unknown",
                    timestamp: new Date(),
                });
            }

            // Clean up old joins outside window
            const timeWindow = settings.multiJoinDetection.timeWindow || 3600;
            const cutoff = new Date(Date.now() - timeWindow * 1000);

            // Iterate safely and remove old entries
            for (const j of tracker.joins) {
                if (j.timestamp <= cutoff) {
                    tracker.joins.pull(j._id); // or tracker.joins.id(j._id)?.remove()
                }
            }
            await tracker.save();

            // Check threshold
            const maxGroups = settings.multiJoinDetection.maxGroupsInTime || 5;
            if (tracker.joins.length >= maxGroups && !tracker.isReported) {
                tracker.isReported = true;
                tracker.isSuspicious = true;
                await tracker.save();
                await this.handleMultiJoinViolation(ctx, user, tracker, settings, group.communityId);
            }

            console.log(`✅ ${user.first_name} joined ${chat.title}`);
        } catch (err) {
            console.error("Error handling user join:", err);
        }
    }

    // =========================
    // 🔴 When user leaves
    // =========================
    private static async handleUserLeave(ctx: any, user: any) {
        try {
            const chat = ctx.chat;
            const group = await Group.findOne({ chatId: chat.id, isActive: true });
            if (!group) return;

            const tracker = await MultiJoinTracker.findOne({
                userId: user.id,
                communityId: group.communityId,
            });
            if (!tracker) return;

            // Remove group from joins list
            tracker.joins.pull({ groupId: chat.id });

            if (tracker.joins.length === 0) {
                // 🧹 Auto-delete empty tracker
                await MultiJoinTracker.deleteOne({ _id: tracker._id });
                console.log(`🗑️ Tracker deleted for ${user.first_name} (no active groups left)`);
            } else {
                await tracker.save();
            }

            console.log(`👋 ${user.first_name} left ${chat.title}`);
        } catch (err) {
            console.error("Error handling user leave:", err);
        }
    }

    // =========================
    // 🚨 Multi-Join Violation
    // =========================
    private static async handleMultiJoinViolation(
        ctx: any,
        user: any,
        tracker: any,
        settings: any,
        communityId: string
    ) {
        const action = settings.multiJoinDetection.action || "report";
        const groupsList = tracker.joins.map((j: any) => `• ${j.groupName}`).join("\n");

        // --- Reporting ---
        if (settings.multiJoinDetection.autoReport && settings.reportSettings?.reportChannel) {
            const reportMsg = `
🚨 *Multi-Join Detection Alert*

*User:* ${user.first_name} (${user.id})
*Username:* ${user.username ? "@" + user.username : "None"}

*Joined ${tracker.joins.length} groups in ${BotHelpers.formatDuration(
                settings.multiJoinDetection.timeWindow
            )}:*
${groupsList}

*Action Taken:* ${action.toUpperCase()}
*Time:* ${new Date().toLocaleString()}
      `;

            try {
                await ctx.telegram.sendMessage(settings.reportSettings.reportChannel, reportMsg, {
                    parse_mode: "Markdown",
                });
            } catch (err) {
                console.error("Error sending multi-join report:", err);
            }
        }

        // --- Apply Action ---
        try {
            switch (action) {
                case "warn":
                    await ctx.reply(`⚠️ ${user.first_name} joined multiple groups rapidly.`);
                    break;
                case "kick":
                    await ctx.kickChatMember(user.id);
                    await ctx.unbanChatMember(user.id);
                    await ctx.reply(`🚫 ${user.first_name} was kicked for rapid group joins.`);
                    break;
                case "ban":
                    await ctx.kickChatMember(user.id);
                    await ctx.reply(`🔨 ${user.first_name} was banned for rapid group joins.`);
                    break;
                case "report":
                default:
                    break;
            }
        } catch (err) {
            console.error("Error executing multi-join action:", err);
        }
    }
}
