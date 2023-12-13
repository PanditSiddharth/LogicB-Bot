const axios = require('axios');
// let allaction = require('./allaction')
import allaction from './allaction'

async function strt(bot: any) {
  try {

    allaction(bot)

  } catch (e: any) {
    console.log('Some error' + e.message)
    await bot.telegram.sendMessage('@shabdt', 'starting error: ' + e.message)
  }
}
export default strt 
