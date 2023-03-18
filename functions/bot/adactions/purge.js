const purge = async (bot, ctx) => {
    try {
        const sleep = t => new Promise(r => setTimeout(r, t));
        if(!ctx.message.reply_to_message)
          return ctx.reply('please reply to user for purge those messages');
      let deld = 0
      return console.log(await bot.telegram.forwardMessage(-1001492591072 ,ctx.chat.id, ctx.message.message_id))
      let frommsg = ctx.message.reply_to_message.message_id - 1000
        for(let i = frommsg; i< frommsg + 1000; i++){
          deld++;
          ctx.deleteMessage(i)
          .catch((err)=> {deld--;})
          // await sleep(20)
          if(deld % 100 == 0){
            await sleep(3000)
          }
        }

    ctx.reply(deld + ' messages deleted');
    } catch (err) {
        console.log(err)
    }
}

module.exports = purge