const { message } = require('telegraf/filters');
const btn = require('./buttons.js');

const getData = async (bot) => {
  try {

    await btn.clbk(bot)

    bot.on(message('text'), async ctxx => {
      if (!isNaN(parseInt(ctxx.message.text))) {

        await btn.buttons(bot, ctxx)
      }
      else if (ctxx.chat.type == 'private')
        ctxx.reply('Please enter any pincode to see details\nExample: send 226101')
    })

  } catch (error) {
    console.log(error);
  }
}

module.exports = { getData }