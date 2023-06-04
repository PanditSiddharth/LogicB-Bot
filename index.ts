// const { Telegraf } = require("telegraf")
import keep_alive from "./keep_alive"
const { Telegraf, Composer } = require("telegraf");

const bot = new Telegraf(process.env.TOKEN, { handlerTimeout: 5000 * 1000 })
import strt from './functions/bot/start'
const { message } = require('telegraf/filters');
const rateLimit = require('telegraf-ratelimit')
keep_alive()
bot.use(rateLimit({
  window: 1000, // 1 second
  limit: 10, // limit each IP to 5 requests per windowMs
  onLimitExceeded: (ctx: any, next: any) => {
      // // return ctx.reply('Too many requests, please try again later.');
  },
}));

bot.on('channel_post', (ctx: any)=> {
  ctx.reply('hi');
  // console.log(ctx.update)
  // ctx.deleteMessage()
  
})


try {
strt(bot);
console.log('running')
} catch (error: any) {
  console.log(error.message);
}


// bot.launch()

bot.launch({
    allowedUpdates: [
        'update_id',
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
    ],
    dropPendingUpdates: false, // Don't activate this
})


