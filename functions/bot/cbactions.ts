import {Telegraf} from "telegraf"
import {ytcb} from "./adactions/yt"

let cbactions = async (bot: Telegraf) => {
        bot.on('callback_query', (ctx: any, next: any) => {
    let cb: any = ctx.update.callback_query
    // console.log(cb)
    ytcb(bot, ctx, cb)
    // console.log(ctx)
  });
}

export default cbactions;