// const { Telegraf } = require("telegraf")
const { Telegraf, Composer } = require("telegraf");

const bot = new Telegraf('5971132807:AAED8ZMmTjbZxdgclJj954k2K-IBw6hMjUc')
const st = require('./start.js')
const { message } = require('telegraf/filters');
const rateLimit = require('telegraf-ratelimit')

bot.use(rateLimit({
  window: 1000, // 1 second
  limit: 100, // limit each IP to 5 requests per windowMs
  onLimitExceeded: (ctx, next) => ctx.reply('Too many requests, please try again later.'),
}));

// bot.use((ctx)=> { 
// })

try {
const mdb = 'mongodb+srv://sidusr:SidkaPasswordHai@sidclu.vfwkkyz.mongodb.net/?retryWrites=true&w=majority'
st.strt(bot, mdb);
console.log('running')
} catch (error) {
  console.log(error.message);
}

bot.launch()

// bot.launch({
//     allowedUpdates: [
//         'update_id',
//         'message',
//         'edited_message',
//         'channel_post',
//         'edited_channel_post',
//         'inline_query',
//         'chosen_inline_result',
//         'callback_query',
//         'shipping_query',
//         'pre_checkout_query',
//         'poll',
//         'poll_answer',
//         'my_chat_member',
//         'chat_member',
//         'chat_join_request'
//     ],
//     dropPendingUpdates: false, // Don't activate this
// })


