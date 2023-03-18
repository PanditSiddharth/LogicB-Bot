const axios = require("axios");
import * as fs from 'fs'
import { Input, Context, Telegraf } from "telegraf";

async function getVideoInfo(videoUrl: any) {
  const response = await axios.get("https://ytdl.panditsiddharth.repl.co/dl", {
    params: {
      url: videoUrl
    }
  });
  return response.data;
}
async function surl(longUrl: string): Promise<string> {
  const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
  const shortUrl = response.data;
  return shortUrl;
}
function exyt(inputString: any) {
  const pattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|watch\?.+&v=|)([a-zA-Z0-9_-]{11})/;

  const match = inputString.match(pattern);

  if (match) {
    const fullURL = `https://www.youtube.com/watch?v=${match[1]}`;
    return fullURL;
  } else {
    return null;
  }
}

export const ytcb = async (bot: Telegraf, ctx: Context, cb: any) => {
try {
  
  let data: any = JSON.parse(cb.data)

  if(data.type == "vid"){
                              try {

  let mes: any = await bot.telegram.editMessageText(cb.message.chat.id,
          cb.message.message_id,
          undefined,
          'Downloading your video..');
                              console.log(mes)  
                await ctx.sendVideo(Input.fromURLStream(data.url));

 bot.telegram.deleteMessage(cb.message.chat.id, cb.message.message_id);
                          } catch (err: any) {
                            ctx.reply(err.message)
                          }
  } else  if(data.type == "aud"){
                              try {

          await bot.telegram.editMessageText(cb.message.chat.id,
          cb.message.message_id,
          undefined,
          'Downloading your Audio..');
                await ctx.sendAudio(Input.fromURLStream(data.url));
          //  await ctx.replyWithAudio({ source: data.url });

           bot.telegram.deleteMessage(cb.message.chat.id, cb.message.message_id);
                               
                          } catch (err: any) {
                            ctx.reply(err.message)
                          }
  }

  } catch (error) {
  console.log(error)
}

}

const yt = async (bot: Telegraf, ctx: Context) => {
try {
  

  let quality: any = [];

  let yturl: any;

  if (ctx.message) {
    let msg: any = ctx.message;
    if (!msg.reply_to_message && !msg.from.is_bot) {
      yturl = exyt(msg.text)
      console.log(yturl)
    }
    else if (msg.reply_to_message) {
      yturl = exyt(msg.reply_to_message.text)
      // return console.log(yturl)
    }
  }

  let li: any = await ctx.reply("Your Link found and processing..");
  console.log(yturl)
  try {
    await getVideoInfo(yturl).then(async (data) => {
      // await ctx.reply('wait i am sending video ')
      let res = "720p"
      // console.log(data)
      let j: any = true;
      for (let i = 0; i < data.length; i++) {

        if (data[i].url && data[i].fps != false && data[i].aud == true && data[i].fps > 24) {
          let url1: any = await surl(data[i].url)
          await quality.push([
            {
              text: "Video [" + data[i].res + "]",
              callback_data: JSON.stringify({"url" : url1, "type": "vid", "res": data[i].res})
            }, { text: "Link [" + data[i].res + "]", url: url1 }
          ])
        } else if (data[i].mime_type == "audio/webm" && j) {
          let url1: any = await surl(data[i].url)
          j = false;
          await quality.push([
            {
              text: "Audio",
              callback_data: JSON.stringify({"url" : url1, "type": "aud", "res": false})
            }, { text: "Link", url: url1 }
          ])
        }

      }

      try {
        // console.log(li);

        await bot.telegram.editMessageText(li.chat.id,
          li.message_id,
          undefined,
          'Select quality: ' + data[0].title, {
          reply_markup: {
            inline_keyboard: quality
          }
        });

      } catch (error) {
        console.log(error)
      }

    })
      .catch((err: any) => { ctx.reply(err.message) })
  } catch (error: any) {
    await ctx.reply('Error on download: ' + error.message)

  }

  } catch (error) {
  console.log(error)
}
}

export default yt
