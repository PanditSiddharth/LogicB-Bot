const promote = async (bot, ctxx, cn = -1, op1 = -1, op2 = -1, op3 = -3) => {
  try {


    if (!ctxx.message.reply_to_message)
    return await ctxx.reply('Please reply the user')

      const name = ctxx.message.reply_to_message.from.first_name;
      const userId = ctxx.message.reply_to_message.from.id;
      const chatId = ctxx.chat.id;

      let done = await bot.telegram.promoteChatMember(chatId, userId, {
        can_change_info: true,
        can_post_messages: true,
        can_edit_messages: true,
        can_delete_messages: true,
        can_invite_users: true,
        can_restrict_members: true,
        can_pin_messages: true,
        can_manage_topics: false,
        can_promote_members: false,
        can_manage_video_chats: true
      })

      await ctxx.state.sleep(10)
      if (done == true)
        await ctxx.reply(name + " you are promoted")
    
  } catch (error) {
    if(error.message.includes('promote') && error.message.includes('self')){
    var subb = error.message.substr(19, error.message.length);
    await ctxx.reply('C' + subb)
    }
    else{
      await ctxx.reply(error.message)
    }
  }
}

module.exports = promote