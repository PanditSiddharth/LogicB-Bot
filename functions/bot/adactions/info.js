const info = async (bot, ctx) => {

    try {

        if (ctx.message.entities[1] && ctx.message.entities[1].type == "text_mention") {
            const userId = ctx.message.entities[1].user.id
            const name = ctx.message.entities[1].user.first_name
            await unmt(bot, ctx, userId, name)
        }

        /* ************************************************************************************** */

        else if (ctx.message.entities[1] && ctx.message.entities[1].type == 'phone_number') {
            const t = ctx.message.entities[1]
            const userId = ctx.message.text.substring(t.offset, t.length + t.offset)
            const name = ctx.message.text.substring(t.offset, t.length + t.offset)
            return await unmt(bot, ctx, userId, name)
        }

        /* ************************************************************************************** */

        else if (ctx.message.reply_to_message) {
            const name = ctx.message.reply_to_message.from.first_name;
            const userId = ctx.message.reply_to_message.from.id;
            await unmt(bot, ctx, userId, name)
        }
        
        else if (ctxx.message.entities && ctxx.message.text.search(/[0-9]/) != -1 && ctxx.message.text.length < 16) {
            const t = ctxx.message.entities[0]
            const userId = ctxx.message.text.substring(t.length + 1)
            const name = userId
            await unmt(bot, ctxx, userId, name)
        }

        /* ************************************************************************************** */

        else if (ctx.message.entities[1] && ctx.message.entities[1].type == 'mention') {
            const t = ctx.message.entities[1]
            const userId = ctx.message.text.substring(t.offset, t.length + t.offset)
            const name = ctx.message.text.substring(t.offset, t.length + t.offset)
            return await ctx.reply('Sorry ' + userId + ' any action by mentioning not available now \nYou can do this action only for non-username members')
        }

        /* ************************************************************************************** */

        else {
            return ctx.reply('No user found');
        }

        /* ************************************************************************************** */


    } catch (error) {
        ctx.reply('this' + error.message)
        console.log(error)
    }

}

module.exports = info

const unmt = async (bot, ctx, userId, name) => {
    try {
        ctx.state.rmem = await bot.telegram.getChatMember(ctx.message.chat.id, userId)
        await ctx.state.sleep(1)
        name = ctx.state.rmem.user.first_name;
    } catch (err) {
        return await ctx.reply(err.message)
    }

    console.log(ctx.state.rmem)

    await bot.telegram.sendMessage(ctx.chat.id,
        `ID: ${userId}
name: [${name}](tg://user?id=${userId})
Status: ${ctx.state.rmem.status}
    `, {parse_mode: 'Markdown'})
}