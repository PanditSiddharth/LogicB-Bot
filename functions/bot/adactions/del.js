const del = async (bot, ctxx, cn = -1, op1 = -1, op2 = -1, op3 = -3) => {
    console.log('running')
    try{
    if(ctxx.message.reply_to_message){
    const sleep = t => new Promise(r => setTimeout(r, t));

    bot.telegram.deleteMessage(ctxx.chat.id, ctxx.message.reply_to_message.message_id)
    .catch(async (err) => {
    await sleep(1000)
    bot.telegram.deleteMessage(ctxx.chat.id, ctxx.message.reply_to_message.message_id)
    .catch(err => {})
    })

    bot.telegram.deleteMessage(ctxx.chat.id, ctxx.message.message_id)
    .catch(async (err) => {
        await sleep(1000)
        bot.telegram.deleteMessage(ctxx.chat.id, ctxx.message.reply_to_message.message_id)
        .catch(err => {})
        })

    }
    else
    console.log('not replied')
    } catch(err){
        console.log(err)
    }
}

module.exports = del