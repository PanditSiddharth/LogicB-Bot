const axios = require('axios');
// let allaction = require('./allaction')
import allaction from './allaction'
import cbactions from './cbactions'
import yt from './adactions/yt'
import compiler from './adactions/compiler'

async function strt(bot: any) {
  try {
              bot.command('yt', async (ctx: any, next: any) => {
          await yt(bot, ctx)
               await next()
      })

      bot.command("cmp", async (ctx: any, next: any) => {
      await compiler(bot, ctx)
    await next(ctx)
  })
     cbactions(bot)
    allaction(bot)

  } catch (e: any) {
    console.log('Some error' + e.message)
    await bot.telegram.sendMessage('@shabdt', 'starting error: ' + e.message)
  }
}
export default strt 
