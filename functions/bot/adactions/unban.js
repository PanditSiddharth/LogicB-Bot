const unban = async (bot, ctxx) => {

  try {

      if (ctxx.message.entities[1] && ctxx.message.entities[1].type == "text_mention") {
          const userId = ctxx.message.entities[1].user.id
          const name = ctxx.message.entities[1].user.first_name
          await unmt(bot, ctxx, userId, name)
      }

      /* ************************************************************************************** */

      else if (ctxx.message.entities[1] && ctxx.message.entities[1].type == 'phone_number') {
          const t = ctxx.message.entities[1]
          const userId = ctxx.message.text.substring(t.offset, t.length + t.offset)
          const name = ctxx.message.text.substring(t.offset, t.length + t.offset)
          return await unmt(bot, ctxx, userId, name)
      }

      /* ************************************************************************************** */

      else if (ctxx.message.reply_to_message) {
          const name = ctxx.message.reply_to_message.from.first_name;
          const userId = ctxx.message.reply_to_message.from.id;
          await unmt(bot, ctxx, userId, name)

      }

      else if (ctxx.message.entities && ctxx.message.text.search(/[0-9]/) != -1 && ctxx.message.text.length < 16) {
        const t = ctxx.message.entities[0]
        const userId = ctxx.message.text.substring(t.length + 1)
        const name = userId
        await unmt(bot, ctxx, userId, name)
    }

      /* ************************************************************************************** */

      else if (ctxx.message.entities[1] && ctxx.message.entities[1].type == 'mention') {
          const t = ctxx.message.entities[1]
          const userId = ctxx.message.text.substring(t.offset, t.length + t.offset)
          const name = ctxx.message.text.substring(t.offset, t.length + t.offset)
          return await ctxx.reply('Sorry ' + userId + ' any action by mentioning not available now \nYou can do this action only for non-username members')
      }

      /* ************************************************************************************** */

      else {
          return ctxx.reply('No user found');
      }

      /* ************************************************************************************** */


  } catch (error) {
      ctxx.reply('this' + error.message)
      console.log(error)
  }

}

module.exports = unban

/* ************************************************************************************** */
/* ************************************************************************************** */

const unmt = async (bot, ctxx, userId, name) => {

  try {
      ctxx.state.rmem = await bot.telegram.getChatMember(ctxx.message.chat.id, userId)
      await ctxx.state.sleep(1)
      name = ctxx.state.rmem.user.first_name;
  } catch (err) {
      return await ctxx.reply('here' + err.message)
  }

  /* ************************************************************************************** */

  if (ctxx.state.rmem.status == 'creator') {
      let k = await bot.telegram.sendMessage(ctxx.chat.id, `[${name}](tg://user?id=${userId}) is Owner and can speak already`, { parse_mode: "Markdown" });
      await ctxx.state.sleep(1)
      return await bot.telegram.editMessageText(ctxx.chat.id, k.message_id, undefined, `${name} is Owner and can speak already`);
  }

  /* ************************************************************************************** */

  let m = await bot.telegram.getMe()
  if (userId == m.id)
      return await ctxx.reply("I'm unbanned already")

  /* ************************************************************************************** */


  if (ctxx.state.rmem.status == 'administrator') {
      let k = await bot.telegram.sendMessage(ctxx.chat.id, `[${name}](tg://user?id=${userId}) is admin and unbanned already`, { parse_mode: "Markdown" });
      await ctxx.state.sleep(1)
      return await bot.telegram.editMessageText(ctxx.chat.id, k.message_id, undefined, `${name} is admin and unbanned already`);
  }

  /* ************************************************************************************** */

  if (ctxx.state.rmem.status != 'kicked')
      return await ctxx.reply(name + " is already not banned")

  /* ************************************************************************************** */

  try {
      let n = await bot.telegram.unbanChatMember(ctxx.chat.id, userId)

      /* ************************************************************************************** */

      await ctxx.state.sleep(2)

      if (n == true) {
          let k = await bot.telegram.sendMessage(ctxx.chat.id, `[${name}](tg://user?id=${userId}) is unbanned`, { parse_mode: "Markdown" });
          await ctxx.state.sleep(2)
          return await bot.telegram.editMessageText(ctxx.chat.id, k.message_id, undefined, `${name} is unbanned`);
      }

      /* ************************************************************************************** */


  } catch (err) {
      return ctxx.reply(err.message)
  };

}