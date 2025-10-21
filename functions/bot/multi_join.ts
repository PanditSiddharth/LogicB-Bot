import { Context, Telegraf } from "telegraf";
import { Group, MultiJoinTracker, AutoModSettings } from "../../mongo";
import { BotHelpers } from "../utils/helpers";
import { Update } from "telegraf/types";

export class MultiJoinDetection {
    public static initializeMultiJoinDetection(bot: Telegraf) {
        let lock: { [key: string]: boolean } = {};
        // Clean lock map periodically
        setInterval(() => {
            const keys = Object.keys(lock);
            if (keys.length > 5000) lock = {}; // reset if too large (avoid memory leak)
        }, 60000); // every 1 min

        bot.on("chat_member", async (ctx: Context<Update.ChatMemberUpdate>) => {

            const update = ctx.update.chat_member;
            const { old_chat_member, new_chat_member, chat } = update;

            const user = new_chat_member.user
            // 🔹 1️⃣ First-level lock (chat + user)
            const groupLockKey = `${chat.id}_${user.id}`;
            if (lock[groupLockKey]) {
                console.log(`🔒 Group-level lock active for user ${user.id} in chat ${chat.id}`);
                return;
            }
            lock[groupLockKey] = true;

            // 🔹 2️⃣ Fetch group (read only, fast)
            const group = await Group.findOne({ chatId: chat.id, isActive: true })
                .catch(console.error);
            if (!group) {
                delete lock[groupLockKey];
                return;
            }

            // 🔹 3️⃣ Second-level lock (community + user)
            const commLockKey = `${group.communityId}_${user.id}`;
            if (lock[commLockKey]) {
                console.log(`🔒 Community-level lock active for user ${user.id} in community ${group.communityId}`);
                delete lock[groupLockKey];
                return;
            }
            lock[commLockKey] = true;
            try {
                // 🟢 User joined
                if (
                    old_chat_member.status === "left" &&
                    ["member", "administrator"].includes(new_chat_member.status)
                ) {
                    const user = new_chat_member.user;
                    if (!user.is_bot) await this.handleUserJoin(ctx, user, chat, group);
                }

                // 🔴 User left (or was kicked)
                if (
                    ["member", "administrator"].includes(old_chat_member.status) &&
                    ["left", "kicked"].includes(new_chat_member.status) // <--- FIX 1: Added "kicked" status
                ) {
                    const user = old_chat_member.user;
                    if (!user.is_bot) await this.handleUserLeave(ctx, user, chat, group);
                }

            } catch (err) {
                console.error("Error in chat_member handler:", err);
            } finally {
                // 🔓 Release locks
                delete lock[groupLockKey];
                delete lock[commLockKey];
            }
        });
    }

    // =========================
    // 🟢 When user joins
    // =========================
    private static async handleUserJoin(ctx: any, user: any, chat: any, group: any) {
        try {
            console.log(`➡️ User ${user.first_name} joined group ${chat.title}`);

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
                tracker = new MultiJoinTracker({
                    userId: user.id,
                    communityId: group.communityId,
                    joins: [],
                    isReported: false,
                    isSuspicious: false,
                });
            }

            // Clean up old joins outside window FIRST
            const timeWindow = settings.multiJoinDetection.timeWindow || 3600;
            const cutoffTime = Date.now() - (timeWindow * 1000);

            // Remove old entries - iterate backwards to safely remove items
            for (let i = tracker.joins.length - 1; i >= 0; i--) {
                if (tracker.joins[i].timestamp.getTime() <= cutoffTime) {
                    tracker.joins.splice(i, 1);
                }
            }

            // console.log(tracker.joins, chat) // (Optional: can be removed)

            // Check if already joined this group (avoid duplicates)
            const alreadyJoined = tracker.joins.some((j: any) => j.groupId === chat.id);
            // console.log("Already joined this group?", alreadyJoined); // (Optional: can be removed)

            if (!alreadyJoined) {
                tracker.joins.push({
                    groupId: chat.id,
                    groupName: chat.title || "Unknown",
                    timestamp: new Date(),
                });
            }

            // Check threshold BEFORE saving
            const maxGroups = settings.multiJoinDetection.maxGroupsInTime || 5;
            const shouldTrigger = tracker.joins.length >= maxGroups && !tracker.isReported;

            if (shouldTrigger) {
                tracker.isReported = true;
                tracker.isSuspicious = true;
            }

            await tracker.save().catch(console.error);

            // Handle violation AFTER saving
            if (shouldTrigger) {
                await this.handleMultiJoinViolation(ctx, user, tracker, settings, group.communityId, chat);
            }

            console.log(`✅ ${user.first_name} joined ${chat.title} (${tracker.joins.length} groups in window)`);
        } catch (err) {
            console.error("Error handling user join:", err);
        }
    }

    // =========================
    // 🔴 When user leaves
    // =========================
    private static async handleUserLeave(ctx: any, user: any, chat: any, group: any) {
        try {

            const tracker = await MultiJoinTracker.findOne({
                userId: user.id,
                communityId: group.communityId,
            });
            if (!tracker) return;

            // Remove this group from joins list (removes ALL instances)
            for (let i = tracker.joins.length - 1; i >= 0; i--) {
                if (tracker.joins[i].groupId === chat.id) {
                    tracker.joins.splice(i, 1);
                    // <--- FIX 2: Removed 'break;' to ensure all duplicates are removed
                }
            }

            if (tracker.joins.length === 0) {
                // 🧹 Auto-delete empty tracker
                await MultiJoinTracker.deleteOne({ _id: tracker._id });
                console.log(`🗑️ Tracker deleted for ${user.first_name} (no active groups left)`);
            } else {
                // Reset flags if joins are below threshold now
                // (Note: You may want to keep 'isSuspicious' true for your own logic,
                // but resetting 'isReported' is good so they can be reported again)
                tracker.isReported = false;
                tracker.isSuspicious = false; // Reset suspicion if they are no longer in violation
                await tracker.save().catch(console.error);
                console.log(`👋 ${user.first_name} left ${chat.title} (${tracker.joins.length} groups remaining)`);
            }
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
        communityId: string,
        chat: any
    ) {
        const action = settings.multiJoinDetection.action || "report";
        const groupsList = tracker.joins.map((j: any) => `• ${j.groupName}`).join("\n");

        // --- Reporting ---
        if (settings.multiJoinDetection.autoReport && settings.reportSettings?.reportChannel) {
            const reportMsg = `
🚨 *Multi-Join Detection Alert*

*User:* ${user.first_name} (\`${user.id}\`)
*Username:* ${user.username ? "@" + user.username : "None"}

*Joined ${tracker.joins.length} groups in ${BotHelpers.formatDuration(
                settings.multiJoinDetection.timeWindow
            )}:*
${groupsList}

*Action Taken:* ${action.toUpperCase()}
*Community:* ${communityId}
*Time:* ${new Date().toLocaleString()}
    `;

            try {
                await ctx.telegram.sendMessage(settings.reportSettings.reportChannel, reportMsg, {
                    parse_mode: "Markdown",
                });
                console.log(`📨 Multi-join report sent for user ${user.id}`);
            } catch (err) {
                console.error("Error sending multi-join report:", err);
            }
        }

        // --- Apply Action ---
        try {
            switch (action) {
                case "warn":
                    await ctx.telegram.sendMessage(
                        chat.id,
                        `⚠️ Warning: ${user.first_name} joined multiple groups rapidly and is being monitored.`
                    );
                    console.log(`⚠️ Warned user ${user.id} in group ${chat.id}`);
                    break;
                case "mute":
                    for (let i = 0; i < tracker.joins.length; i++) {

                        await ctx.restrictChatMember(user.id, {
                            permissions: {
                                can_send_messages: false,
                                can_send_media_messages: false,
                                can_send_polls: false,
                                can_send_other_messages: false,
                                can_add_web_page_previews: false,
                                can_change_info: false,
                                can_invite_users: false,
                                can_pin_messages: false
                            },
                            until_date: 1000 * 60 * 60 * 24 * 20 // 20 days mute
                        });
                        await BotHelpers.sleep(1000); // Wait 1 seconds to ensure message is sent before next
                    }
                    await BotHelpers.send(ctx,
                        `⚠️ Mute: ${user.first_name} joined multiple groups rapidly and is being monitored.
                        Admin will unmute (request unmute) (or unmute after 20 days automatically).`
                        , { type: "warnings" });
                    console.log(`⚠️ Muted user ${user.id} in group ${chat.id}`);
                    break;
                case "kick":
                    for (let i = 0; i < tracker.joins.length; i++) {
                        console.log(tracker.joins[i]);
                        await ctx.telegram.banChatMember(tracker.joins[i].groupId, user.id);
                        await ctx.telegram.unbanChatMember(tracker.joins[i].groupId, user.id);
                        await BotHelpers.sleep(2000); // Wait 2 seconds to ensure message is sent before kick
                    }
                    await MultiJoinTracker.deleteOne({ _id: tracker._id }); // Clean up tracker after kick
                    console.log(`👢 Kicked user ${user.id} from group ${chat.id}`);
                    break;
                case "ban":
                    for (let i = 0; i < tracker.joins.length; i++) {
                        await ctx.telegram.banChatMember(tracker.joins[i].groupId, user.id);
                        await BotHelpers.sleep(2000); // Wait 2 seconds to ensure message is sent before kick
                    }
                    await MultiJoinTracker.deleteOne({ _id: tracker._id }); // Clean up tracker after kick
                    console.log(`👢 Kicked user ${user.id} from group ${chat.id}`);
                    break;


                case "report":
                default:
                    // Just report, no action in group
                    console.log(`📊 Reported user ${user.id} for multi-join (no action taken)`);
                    break;
            }
        } catch (err) {
            console.error(`Error executing multi-join action "${action}":`, err);
        }
    }
}