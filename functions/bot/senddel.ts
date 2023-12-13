

async function sleep(milliseconds: any) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
let jsfunc = (a: string, b: string) => {
  return { text: a, callback_data: b }
}

import { Telegraf } from "telegraf"
import a from "../../mongo"

function date() {
  const now: any = new Date();
  const options: any = { timeZone: 'Asia/Kolkata' };
  const formattedDate: any = now.toLocaleString('en-US', options);

  return formattedDate;
}


let sdel = async (bot: Telegraf) => {
  try {

    bot.hears(/^\/(snd|sdl|sdls|sdli|stat)/i, async (ctx: any) => {
      let cmd: any = ctx.message.text;

      if (ctx.message.from.id != 1791106582)
        return
      if (cmd.startsWith("/snd")) {
        let ct: any = cmd.match(/(\/snd\s*)(.*)/i)[2]
        if (!ct)
          return;
        ct = parseInt(ct)
        if (isNaN(ct))
          return ctx.reply("give number")

        let chatArr: Number[] = await a.getArrayOf("chatId")
        // let chatArr: Number[] = [-1001502657464, -1001786122972]
        if (chatArr.length == 0)
          return await ctx.reply("some error from getting chats");

        let replied: any = ctx.message.reply_to_message;
        if (!replied)
          return await ctx.reply("Please reply to message");
        let ret: any = await ctx.reply("Sending message to all groups...")
        let count = 0;
        let messages: { ChatId: Number, MessageId: Number }[] = [];

        for (let i = 0; i < chatArr.length; i++) {
          let mes: any = {};
          try {
            mes = await ctx.copyMessage(chatArr[i] as any, { message_id: replied.message_id })

          } catch (err: any) { count--; }

          messages.push({ ChatId: chatArr[i], MessageId: mes.message_id })
          count++;
          if (count % 10 == 0) {
            ctx.telegram.editMessageText(ret.chat.id as any, ret.message_id, undefined, "Sent Message in " + count + " chats")
              .catch((er: any) => { console.log(er.message) })
            await sleep(500)
          }
        }

        let data: any = {
          hid: ct,
          messages: messages,
          message: replied.text,
          time: date()
        }
        await sleep(3000)
        ctx.telegram.editMessageText(ret.chat.id as any, ret.message_id, undefined, "Sent Message in " + count + " chats")
          .catch((er: any) => { console.log(er.message) })

        try {
          let status: any = await a.ChatMessage.create(data);


          await sleep(2000)

          ctx.telegram.editMessageText(ret.chat.id as any, ret.message_id, undefined, "Sent Message in " + count + " chats and successfully inserted in db")
            .catch((er: any) => { console.log(er.message) })

        }
        catch (error: any) {
          ctx.reply(error.message)
          for (let i = 0; i < messages.length; i++) {
            bot.telegram.deleteMessage(messages[i].ChatId as any, messages[i].MessageId as any)
              .catch((e: any) => { console.log(e.message) })

            await sleep(2000)
          }
        }
      }

      else if (cmd.startsWith("/stat")) {
        try {

          let ct: any = cmd.match(/(\/stat\s*)(.*)/i)[2]
          ct = parseInt(ct)
          if (isNaN(ct))
            return ctx.reply("Give me number")

          let ao: any = await a.ChatMessage.findOne({ "hid": ct })
          // return console.log(ao)
          if (!ao)
            return ctx.reply("Sorry requested id \"" + ct + "\"not exists in my database")

          let str = "";
          for (let i = 0; i < ao.messages.length; i++) {
            str += `
Chat: ${ao.messages[i].ChatId}  Mid: ${ao.messages[i].MessageId}
 `}

          str += `
Text:
${ao.message}

Time: ${ao.time}`
          ctx.reply(str)
        } catch (err: any) {

        }
      }

      else if (cmd.startsWith("/sdl")) {
        try {
          let ctt: any = cmd.match(/(\/sdl\s*)(\d*\s*)(.*)/i)

          let ct: any = ctt[2];

          ct = parseInt(ct)
          if (isNaN(ct))
            return ctx.reply("Give me number")

          let ao: any = await a.ChatMessage.findOne({ "hid": ct })
          // return console.log(ao)
          if (!ao)
            return ctx.reply("Sorry requested id \"" + ct + "\"not exists in my database")

          let ret: any = await ctx.reply("Starting deletion operation...")
          let count = 0
          let force = true;
          if (!ctt[3] || ctt[3] == 'f') {

            for (let i = 0; i < ao.messages.length; i++) {
              bot.telegram.deleteMessage(ao.messages[i].ChatId as any, ao.messages[i].MessageId as any)
                .catch((e: any) => {
                  console.log(e.message); count--; force = false
                })
              count++;
              if (count % 10 == 0) {
                bot.telegram.editMessageText(ret.chat.id as any, ret.message_id, undefined, "Deleted Message in " + count + " chats")
                  .catch((er: any) => { console.log(er.message) })
              }
              await sleep(500)
            }
            await sleep(2000)
          }
          let res: any;

          if (force == true || ctt[3]) {
            res = await a.ChatMessage.deleteOne({ "hid": ct })
          }

          if (res && res.acknowledged)
            res = res.deletedCount
          else
            res = 0;

          ctx.telegram.editMessageText(ret.chat.id as any, ret.message_id, undefined, "Deleted in " + count + " chats")
            .catch((er: any) => { console.log(er.message) })
        } catch (error: any) {
          ctx.reply(error.message)
        }
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




  } catch (err: any) {

  }
}

export default sdel