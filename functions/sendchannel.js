let sendChannel = (bot) => {
  bot.hears(/^\/post/i, async (ctx) => {
    // Get the message to be posted
    let replly = ctx.message.reply_to_message;
    if (!replly)
      return send(ctx, "Please reply to message which you want to send in @ignou_study_channel")
    // Check if user is admin, if not return
    try {
      mes = await ctx.copyMessage(-1001575233940, { message_id: replly.message_id });
      send(ctx, "Thanks " + ctx.message.from.first_name + "! Your post is submitted for review it will be posted in @ignou_study_channel under 1 hour if not then it means it is rejected\n\nReview time usually 10am to 9pm.", 400)
      await ctx.reply("Sent by: [" + ctx.message.from.first_name + "](tg://user?id=" + ctx.message.from.id + ")\nUser Id: " + ctx.message.from.id + "\nFrom Chat: " + ctx.message.chat.title + "\nChat id: " + ctx.chat.id, { parse_mode: "Markdown", chat_id: -1001575233940 });

    } catch (error) {
      send(ctx, "Some error occured" + error.message);
    }
  })

};

module.exports = sendChannel;

async function send(ctx, message, time = 10) {
  try {
    let mes = await ctx.reply(message);
    setTimeout(() => {
      ctx.deleteMessage(mes.message_id)
        .catch((er) => { })
    }, time * 1000);
    return mes;
  } catch (err) {
    return null;
  }
}