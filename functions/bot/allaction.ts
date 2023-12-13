const ban = require('./adactions/ban')
const unban = require('./adactions/unban')
import dban from './adactions/dban'
const kick = require('./adactions/kick')
const del = require('./adactions/del')
const delgp = require('./adactions/delgp')
const dels = require('./adactions/dels')
const restrict = require('./adactions/restrict')
const purge = require('./adactions/purge')
const mute = require('./adactions/mute')
const unmute = require('./adactions/unmute')
const promote = require('./adactions/promote')
const demote = require('./adactions/demote')
const help = require('./adactions/help')
const info = require('./adactions/info')
import undban from './adactions/undban'
import settings from "./settings"

let allaction = async (bot: any) => {

  console.log('allactions')
  try {
    settings(bot)
    bot.use(
      async (ctx: any, next: any) => {
        // console.log(ctx.message)
        if (ctx.message) {
          try {
            ctx.state.sleep = async (t: any) => new Promise(r => setTimeout(r, t))
            ctx.state.mem = await bot.telegram.getChatMember(ctx.message.chat.id, ctx.message.from.id)
            await ctx.state.sleep(2)
          } catch (err: any) {
            ctx.state.err = true
            return ctx.reply('Error getChatMember' + err.message)
          }
          // ctx.state.err = true
          if (ctx.state.err == true)
            return

          if (ctx.state.mem.status == 'creator' || ctx.state.mem.status == 'administrator') {
            ctx.state.adm = true
          } else {
            ctx.state.adm = false
          }

          await next(ctx)
        }

        else
          return
      })


    // bot.on('message', (ctx:any, next: any) => { console.log('yo'); next(ctx: any)})
    try {

      // bot.hears('toggle', async (ctx: any) => {
      //   await toggle(bot, ctx)
      // })

      bot.command('mention', async (ctx: any) => {
        // Get user information from user ID
        const user = await ctx.telegram.getChatMember(ctx.chat.id, 5329005022)

        let k = await bot.telegram.sendMessage(ctx.chat.id, `[.](tg://user?id=5329005022) this user is mentioned`, { parse_mode: "Markdown" });
        await ctx.state.sleep(1)
        bot.telegram.editMessageText(ctx.chat.id, k.message_id, undefined, `user this user is mentioned`);

      })

      bot.command('dl', async (ctx: any, next: any) => {
        if (ctx.state.adm)
           del(bot, ctx)
        // next(ctx: any)
      })

      bot.command('dls', async (ctx: any, next: any) => {
        if (ctx.state.adm)
           dels(bot, ctx)
        // next(ctx: any)
      })

      bot.command('dlgp', async (ctx: any, next: any) => {
        if (ctx.state.adm)
           delgp(bot, ctx)
        // next(ctx: any)
      })

      bot.command('umt', async (ctx: any, next: any) => {
        if (ctx.state.adm)
          unmute(bot, ctx)
        // next(ctx: any)
      })

      bot.command('mt', async (ctx: any, next: any) => {
        if (ctx.state.adm)
           mute(bot, ctx)
        // next(ctx: any)
      })

      bot.command('prg', async (ctx: any, next: any) => {
        if (ctx.state.adm)
          purge(bot, ctx)
        // next(ctx: any)
      })

      bot.command('rst', async (ctx: any, next: any) => {
        if (ctx.state.adm)
          restrict(bot, ctx)
        // next(ctx: any)
      })

      bot.command('kk', async (ctx: any, next: any) => {
        if (ctx.state.adm)
           kick(bot, ctx)
        // next(ctx: any)
      })
      bot.command('dbn', async (ctx: any, next: any) => {
        if (ctx.state.adm)
          dban(bot, ctx)
        // next(ctx: any)
      })
      bot.command('pmt', async (ctx: any, next: any) => {
        if (ctx.state.adm)
           promote(bot, ctx)
        // next(ctx: any)
      })

      bot.command('dmt', async (ctx: any) => {
        if (ctx.state.adm)
          demote(bot, ctx)
      })

      bot.command('inf', async (ctx: any) => {
        if (ctx.state.adm)
           info(bot, ctx)
      })

      bot.command('bn', async (ctx: any, next: any) => {
        if (ctx.state.adm)
          ban(bot, ctx)
      })

      bot.command('ubn', async (ctx: any, next: any) => {
        if (ctx.state.adm)
          unban(bot, ctx)
      })

      bot.command('hlp', async (ctx: any, next: any) => {
        if (ctx.state.adm)
          help(bot, ctx)
      })


      bot.command("gban", async (ctx: any, next: any) => {
         dban(bot, ctx)
         next(ctx)
      })

      bot.command("ungban", async (ctx: any, next: any) => {
         undban(bot, ctx)
         next(ctx)
      })


    } catch (errr: any) {
      // ctx.reply("error " + errr.message)
    }

  } catch (error: any) {
    console.log(error)
    await bot.telegram.sendMessage('@LogicB_Support', error.message)
  }
}

export default allaction


