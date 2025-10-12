const { Telegraf, Composer } = require("telegraf");

const bot = new Telegraf(process.env.TOKEN, { handlerTimeout: 5000 * 1000 })
import allaction from "./functions/bot/allaction"
const { message } = require('telegraf/filters');
const rateLimit = require('telegraf-ratelimit');
bot.use(rateLimit({
  window: 1000, // 1 second
  limit: 10, // limit each IP to 5 requests per windowMs
  onLimitExceeded: (ctx: any, next: any) => {
    // // return ctx.reply('Too many requests, please try again later.');
  },
}));

bot.on('channel_post', async (ctx: any) => {
 // ctx.reply('hi');
let cp:any = ctx.update.channel_post
if(cp.reply_to_message && cp.text == "/dl"){
  try{
await ctx.deleteMessage(cp.reply_to_message.message_id)
 await ctx.deleteMessage();
  } catch (er:any){}
}
})


try {
  allaction(bot);
  console.log('running')
} catch (error: any) {
 // console.log(error.message);
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
  dropPendingUpdates: true, // Don't activate this
})


