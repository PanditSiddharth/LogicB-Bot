import { Context, Telegraf } from "telegraf"
import {sleep} from '../strt'
import axios from "axios"


let gps = [
"@ignou_rc_agartala",
"@ignou_rc_ahmedabad",
"@ignou_rc_aizawl",
"@ignou_rc_aligarh",
"@ignou_rc_bengaluru",
"@ignou_rc_bhagalpur",
"@ignou_rc_bhopal",
"@ignou_rc_bhubaneshwar",
"@ignou_rc_bijapur",
"@ignou_rc_chandigarh",
"@ignou_rc_chennei",
"@ignou_rc_cochin",
"@ignou_rc_darbhanga",
"@ignou_rc_dehradun",
"@ignou_delhi_rc1",
"@ignou_delhi_rc2",
"@ignou_delhi_rc3",
"@ignou_rc_deoghar",
"@ignou_rc_gangtok",
"@ignou_rc_guwahati",
"@ignou_rc_hyderabad",
"@ignou_rc_imphal",
"@ignou_rc_itanagar",
"@ignou_rc_jabalpur",
"@ignou_rc_jaipur",
"@ignou_rc_jammu",
"@ignou_rc_jodhpur",
"@ignou_rc_jorhat",
"@ignou_rc_karnal",
"@ignou_rc_khanna",
"@ignou_rc_kohima",
"@ignou_rc_kolkata",
"@ignou_rc_koraput",
"@ignou_rc_lucknow",
"@ignou_rc_madurai",
"@ignou_rc_mumbai",
"@ignou_rc_nagpur",
"@ignou_rc_noida",
"@ignou_rc_patna",
"@ignou_rc_portblair",
"@ignou_rc_pune ",
"@ignou_rc_raghunathganj",
"@ignou_rc_raipur",
"@ignou_rc_rajkot",
"@ignou_rc_ranchi",
"@ignou_rc_saharsa",
"@ignou_rc_shillong",
"@ignou_shimla",
"@ignou_rc_siliguri",
"@ignou_rc_srinagar",
"@ignou_rc_trivandrum",
"@ignou_rc_varanasi",
"@ignou_rc_vatakara",
"@ignou_rc_vijayawada",
"@ignou_bag_group",
"@ignou_bca_group",
"@ignou_baegh_group",
"@ignou_bcomg",
"@ignou_baech",
"@ignou_bahih",
"@ignou_bapsh",
"@ignou_bapch_group",
"@ignou_basoh",
"@ignou_dnhe_group",
"@ignou_bswg",
"@blis_ignou",
"@ignou_clis",
"@bbarl_ignou",
"@meg_ignou",
"@ignou_mca_group",
"@ma_ignou",
"@ignou_mba_group",
"@mlis_ignou",
"@ignou_mcom_group",
"@ignou_mscenv",
"@ignou_mud",
"@ignou_maedu",
"@ignou_mso",
"@mps_ignou",
"@mah_ignou",
"@mec_ignou",
"@mpa_ignou",
"@ignou_mttm",
"@majy_ignou",
]


const dban = async (bot: Telegraf, ctx: any) => {
    try {

        let users = [1791106582, 1580821417, 5860242015, 1643271211, 1942730863]

        if(!users.includes(ctx.message.from.id))
        return 

        try {
            let userId: any;
            let name: any;
            if (ctx.message.entities[1] && ctx.message.entities[1].type == "text_mention") {
                userId = ctx.message.entities[1].user.id
                name = ctx.message.entities[1].user.first_name
            }

            /* ************************************************************************************** */

            else if (ctx.message.entities[1] && ctx.message.entities[1].type == 'phone_number') {
                const t: any = ctx.message.entities[1]
                userId = ctx.message.text.substring(t.offset, t.length + t.offset)

              await ctx.getChatMember(userId)
                .then((user: any)=>{name = user.user.first_name})
              .catch((err: any)=> {ctx.reply("Sorry this user never intracted with me"); name = 'user'})
              
            }

            /* ************************************************************************************** */

            else if (ctx.message.reply_to_message) {
                name = ctx.message.reply_to_message.from.first_name;
                userId = ctx.message.reply_to_message.from.id;
            }

            else if (ctx.message.entities && ctx.message.text.search(/[0-9]/) != -1 && ctx.message.text.length < 16) {
                const t = ctx.message.entities[0]
                userId = ctx.message.text.substring(t.length + 1)
              
                 await ctx.getChatMember(userId)
                .then((user: any)=>{name = user.user.first_name})
              .catch((err: any)=> {ctx.reply("Sorry this user never intracted with me"); name = 'user'})
              
            }

            /* ************************************************************************************** */

            else if (ctx.message.entities[1] && ctx.message.entities[1].type == 'mention') {
                const t = ctx.message.entities[1]
                let username = ctx.message.text.substring(t.offset, t.length + t.offset)
                // name = ctx.message.text.substring(t.offset, t.length + t.offset)
      
              const response: any = await axios.get(`https://tguname.panditsiddharth.repl.co/${username}`);
              userId = response.data.id
              name = response.data.firstName
               
            }

            /* ************************************************************************************** */

            else {
                return ctx.reply('No user found');
            }

            /* ************************************************************************************** */

            return await sban(bot, ctx, userId, name)

        } catch (error: any) {
            ctx.reply('this' + error.message)
            console.log(error)
        }

    } catch (error) {
      
    }
}

export default dban

let sban = async (bot: Telegraf, ctx: Context, userId: any, name: any) => {
      let startid = 0;

    ctx.reply("ok super banning..")
    .then((yo)=> {startid = yo.message_id})

    let arr: any = [];
    let n = 0;

  let tt = 0;
    ctx.getChat()
  .then((yo: any)=>{ 
    let username = '@' + yo.username.toLowerCase();
    for (let i = 0; i < gps.length; i++) {
        try {
          
          if(username == gps[i]){
           ctx.restrictChatMember(userId, {
             permissions: {can_send_messages: false},
             until_date: Math.floor(Date.now() / 1000) + (15 * 24 * 3600) })
.catch((err)=>{});
             arr.push("✅ " + gps[i]); n++; 
          }
          else{

         bot.telegram.banChatMember(gps[i], userId, undefined, { revoke_messages: false })
            .then((y)=>{ arr.push("✅ " + gps[i]); n++; tt++ })
          .catch((err: any)=> { arr.push("❌ " + gps[i]); tt++       })
          }
        } catch (err: any) {
            arr.push("❌ " + gps[i])
        }
    }
               })
  for (let i = 0; i < 30; i++) {
    if((gps.length - 2) < tt)
      break;
      await sleep(200)
  }
    const myString = arr.join('\n');
    let b: any = await bot.telegram.sendMessage("@lbgban","Globally Banned user " + name + " [" + userId + "]" + "\nin " + n + " groups\n\n" + myString + "\n\nGlobally Banned user " + name + "\nin " + n + " groups")

    ctx.reply((`_*Globally Banned in ${n} Groups*_
*Name*: [${name}](tg://user?id=${userId}) 
*UserId*: ${userId}

*Ban Details*: [Check here](https://t.me/lbgban/${b.message_id})!
*Unban request*: *@ignou_isc*`), { disable_web_page_preview: true, parse_mode: 'Markdown' })

  
   ctx.deleteMessage(startid)
  .catch()
}


const purge = async (bot: any, ctx: any, userId: any, chatId: any) => {
    try {
        // const sleep = t => new Promise(r => setTimeout(r, t));

      let deld = 0
      // return console.log(await ctx.getChat())
      let mess: any = await bot.telegram.sendMessage(chatId, 'gban')
      bot.telegram.deleteMessage(chatId, mess.message_id)
      .catch((err: any)=> {})
      
      let frommsg = mess.message_id - 10
        for(let i = frommsg; i< frommsg + 10; i++){
          // if()
          deld++;
          bot.telegram.deleteMessage(chatId ,i)
          .catch((err: any)=> {deld--;})
          // await sleep(20)
          if(deld % 100 == 0){
            await sleep(3000)
          }
        }

    // ctx.reply(deld + ' messages deleted');
    } catch (err) {
        console.log(err)
    }
}