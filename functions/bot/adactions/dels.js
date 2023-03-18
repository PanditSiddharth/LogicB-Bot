const dels = async (bot, ctx) => {
    try {
        const sleep = t => new Promise(r => setTimeout(r, t));
        if(!ctx.message.reply_to_message)
          return ctx.reply('please reply to user for purge those messages');
      let deld = 0
      // return console.log()
      let frommsg = ctx.message.message_id - 300
        for(let i = frommsg; i< frommsg + 300; i++){
          deld++;
          bot.telegram.forwardMessage(-1001644783199 , ctx.chat.id, i)
          .then((fctx)=> {
            // console.log(fctx.message_id + " vs ")
          if(fctx.forward_from.id == ctx.message.reply_to_message.from.id)
          ctx.deleteMessage(i).catch((err)=> { deld--;  })
          ctx.deleteMessage(fctx.message_id).catch((err)=>  {})
          })
          .catch((err)=> {deld--;})
          // await sleep(20)
          if(deld % 100 == 0){
            await sleep(3000)
          }
        }
    
    await sleep(1000)
    ctx.reply(deld + ' messages deleted');
    } catch (err) {
        console.log(err)
    }
}

module.exports = dels