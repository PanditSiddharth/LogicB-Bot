

async function sleep(milliseconds: any) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
let jsfunc = (a: string, b: string) => {
  return { text: a, callback_data: b }
}


import { Telegraf } from "telegraf"
import a from "../../mongo"
import sdel from './senddel'
let realtime = require('../realtime')
let sendChannel = require('../sendchannel')

let settings = async (bot: Telegraf) => {
  sdel(bot);
  realtime(bot);
  sendChannel(bot);
  bot.hears(/^\/(gp|dlc|inst|get)/i, async (ctx: any) => {
    let cmd: any = ctx.message.text;

    if (ctx.message.from.id != 1791106582)
      return

    if (cmd.startsWith("/gp")) {
      const buttons = [
        [
          jsfunc('ChatId', 'chatId'),
          jsfunc('Username', 'username'),
        ],
        [
          jsfunc('GroupName', 'groupName'),
          jsfunc('PrivOrPub', 'isPrivate')
        ],
        [
          jsfunc('Rc', 'rc'),
          jsfunc('All', 'all')
        ]
      ];

      // Send the message with buttons
      ctx.reply("Select Your which you want to see", {
        reply_markup: {
          inline_keyboard: buttons,
        },
      })

    }
    else if (cmd.startsWith("/dlc")) {
      try {

        let ct: any = cmd.match(/(\/dlc\s*)(.*)/i)[2]
        if (!ct)
          return;

        let st: any = parseInt(ct)
        let result: { acknowledged: boolean; deletedCount: Number };
        if (isNaN(st)) {
          ct = ct.replace("@", "").toLowerCase();
          result = await a.remove({ username: ct })

        } else {
          result = await a.remove({ chatId: st })

        }
        await ctx.reply(`
Acknowledgment: ${result.acknowledged}
DeletedCount: ${result.deletedCount}
      `)
      } catch (err: any) {
        console.log(err.message)
      }
    }
    else if (cmd.startsWith("/inst")) {
      try {
        let ct: any = cmd.match(/(\/inst\s*)(.*)/i)[2]
        let b: any = await bot.telegram.getChat(ct);

        let data: any = {
          chatId: b.id,
          username: b.username ? b.username.toLowerCase() : "",
          groupName: b.title,
          isPrivate: b.type == "supergroup" ? false : true,
        }
        let rdata: any = await a.insert(data)
        if (rdata.err)
          return ctx.reply(rdata.err)
        else {
          ctx.reply("inserted record successfully")
        }
      } catch (error: any) {
        console.log(error)
      }
    }
    else if (cmd.startsWith("/get")) {
      try {

        let ct: any = cmd.match(/(\/get\s*)(.*)/i)[2]
        let st: any = parseInt(ct)
        if (isNaN(st)) {
          ct = ct.replace("@", "").toLowerCase()
          let ao: any = (await a.find({ username: ct }))[0]
          if (!ao)
            ctx.reply("Sorry requested id \"@" + ct + "\"not exists in my database")
          let aostr = `
Name: ${ao.groupName}
Chatid: ${ao.chatId}
Username: @${ao.username}    
 `
          ctx.reply(aostr)
        }
        else {
          let ao: any = (await a.find({ "chatId": st }))[0]
          if (!ao)
            ctx.reply("Sorry requested id \"" + st + "\"not exists in my database")
          let aostr = `
Name: ${ao.groupName}
Chatid: ${ao.chatId}
Username: @${ao.username}    
 `
          ctx.reply(aostr)
        }
      } catch (err: any) {

      }
    }
    else if (cmd.startsWith) {

    }
  })




  let arrr: string[] = ["username", "chatId"]
  bot.action(arrr, async (ctx: any) => {
    try {

      let cb: any = ctx.callbackQuery;
      ctx.deleteMessage();
      let arr: string[] = await a.getArrayOf(cb.data)
      let str: string = "";
      if (cb.data == "username")
        str = "@" + await arr.join("\n@")
      else
        str = await arr.join("\n")

      await ctx.reply(str)
    } catch (error) {

    }

  })

  let arr1 = ["groupName", "rc", "isPrivate"]

  bot.action(arr1, async (ctx: any) => {
    try {

      let cb: any = ctx.callbackQuery;
      ctx.deleteMessage();
      let arr: any = await a.get3(cb.data)
      if (arr[0].err)
        return ctx.reply(arr[0].err)
      let str: string[] = [""];
      let ai = -1;
      for (let i = 0; i < arr.length; i++) {
        if (0 == i % 20 || ai == -1) {
          ai++
          str[ai] = ""
        }
        str[ai] += `
ChatId[${i}]: ${arr[i].chatId}
Username: @${arr[i].username}
${cb.data}: ${arr[i][cb.data]}\n\n`
      }
      // ai = 0;

      for (let i = 0; i < str.length; i++) {
        await ctx.reply(str[i])
        await sleep(5000)
      }
    } catch (error: any) {

      console.log(error.message)
    }

  })


  bot.action('all', async (ctx: any) => {
    try {

      let cb: any = ctx.callbackQuery;
      ctx.deleteMessage();
      let arr: any = await a.find({})
      if (arr[0].err)
        return ctx.reply(arr[0].err)
      let str: string[] = [""];
      let ai = -1;
      for (let i = 0; i < arr.length; i++) {
        if (0 == i % 20 || ai == -1) {
          ai++
          str[ai] = ""
        }
        str[ai] += `
Name: ${arr[i].groupName}
ChatId[${i}]: ${arr[i].chatId}
Username: @${arr[i].username}
isRC: ${arr[i].rc}
isPrivate: ${arr[i].isPrivate}\n`
      }
      for (let i = 0; i < str.length; i++) {
        await ctx.reply(str[i])
        await sleep(5000)
      }
    } catch (error) {
    }

  })



}

export default settings