const toggle = async (bot, ctx) =>{

    let toggle = false

    bot.hears('toggle', (ctx) => {
      toggle = !toggle
      if (toggle) {
        ctx.reply('Button is on', {
          reply_markup: {
            inline_keyboard: [[
              Telegraf.Markup.callbackButton('Turn off', 'toggle_off')
            ]]
          }
        })
      } else {
        ctx.reply('Button is off', {
          reply_markup: {
            inline_keyboard: [[
              Telegraf.Markup.callbackButton('Turn on', 'toggle_on')
            ]]
          }
        })
      }
    })
    
    bot.action('toggle_off', (ctx) => {
      toggle = false
      ctx.editMessageText('Button is off', {
        reply_markup: {
          inline_keyboard: [[
            Telegraf.Markup.callbackButton('Turn on', 'toggle_on')
          ]]
        }
      })
    })
    
    bot.action('toggle_on', (ctx) => {
      toggle = true
      ctx.editMessageText('Button is on', {
        reply_markup: {
          inline_keyboard: [[
            Telegraf.Markup.callbackButton('Turn off', 'toggle_off')
          ]]
        }
      })
    })

}
module.exports = toggle