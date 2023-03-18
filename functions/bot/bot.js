const { Telegraf } = require("telegraf")
const st = require('./start.js')
require('dotenv').config
const bot = new Telegraf(process.env.LOGICBTOKEN)

try {
  st.strt(bot, process.env.MDB);
  
} catch (error) {
  bot.telegram.sendMessage('@LogicB_Support', 'Some error : ' + error.message)
}

exports.handler = async (event, context, callback) => {
  try {
    await bot.handleUpdate(JSON.parse(event.body))

    return { statusCode: 200, body: "" }
  } catch (e) {
    console.error("error in handler:", e)
    return { statusCode: 400, body: "This endpoint is meant for bot and telegram communication" }
  }
}
