const delgp = async (bot, ctx) => {
  try {
    if (!ctx.message || !ctx.message.reply_to_message)
      return ctx.reply(`Please reply to the user which messages you want to delete in all groups`)

    let {getArrayOf} = require("../../../mongo")
    let gps = await getArrayOf("username")

    /*  
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
  */
    let chats = [
      -1001644783199,
      -1004085679387,
      -1004057486686,
      -1004022524162,
      -1004049260580,
      -1004059964903]
    const sleep = t => new Promise(r => setTimeout(r, t));


    if (ctx.message.from.id != 1791106582)
      return ctx.reply(`you can't give this command its harmfull`)

    let mesn = ctx.message.text.match(/(\/dlgp\s*)(\d*)/i)[2]

    mesn = parseInt(mesn)
    let slp = 12000;
    if (mesn < 11) {
      slp = 5000;
    } else if (mesn < 25) {
      slp = 8000;
    } else if (mesn < 50) {
      slp = 12000;
    } else if (mesn < 100) {
      slp = 20000;
    } else {
      return;
    }
    let obj = { deld: 0 }
    obj.mesn = mesn;
    let mess = await ctx.reply("Starting deletion optration...")
    for (let j = 0; j < gps.length; j++) {
      if (!gps[j])
        break;
      delfrom(bot, ctx, chats[0], gps[j], sleep, obj)
      j++

      if (!gps[j])
        break;
      delfrom(bot, ctx, chats[0], gps[j], sleep, obj)
      j++

      //       if(!gps[j])
      //   break;
      // delfrom(bot, ctx, chats[2], gps[j], sleep, obj)
      // j++

      await sleep(slp);
      if (!gps[j])
        break;
      delfrom(bot, ctx, chats[0], gps[j], sleep, obj)
      j++

      //       if(!gps[j])
      //   break;
      // delfrom(bot, ctx, chats[4], gps[j], sleep, obj)
      // j++

      if (!gps[j])
        break;
      delfrom(bot, ctx, chats[0], gps[j], sleep, obj)

      try {
        await bot.telegram.editMessageText(ctx.chat.id, mess.message_id, null, "Deleting process: Chats: " + j + " messages: " + obj.deld)
      } catch (er) {
        mess = await ctx.reply("Deleting process: Chats: " + (j + 1) + " messages: " + obj.deld)
      }
      await sleep(slp);
    }

    try {
      await bot.telegram.editMessageText(ctx.chat.id, mess.message_id, null, "Deletion process done " + obj.deld + " messages deleted from " + j + " chats")
    } catch (er) {
      mess = await ctx.reply("Deletion process done " + obj.deld + " messages deleted from " + j + " chats")
    }

  } catch (err) {
    console.log(err)
  }
}

module.exports = delgp



async function delfrom(bot, ctx, chat, gps, sleep, obj) {
  try {
    let fctx;
    try {
      fctx = await bot.telegram.sendMessage(gps, 'y')
    } catch (error) {
      return "";
    }
    let frommsg = fctx.message_id
    bot.telegram.deleteMessage(fctx.chat.id, frommsg).catch((err) => { })

    // forword each message
    for (let i = frommsg - obj.mesn; i < frommsg; i++) {
      try {
        let fcctx;
        try {
          fcctx = await bot.telegram.forwardMessage(chat, gps, i)
        } catch (errorr) { console.log(errorr.message) }

        if (fcctx && fcctx.forward_from && fcctx.forward_from.id == ctx.message.reply_to_message.from.id) {
          let d = await bot.telegram.deleteMessage(gps, i)
          if (d)
            obj.deld += 1;
        }

      } catch (error) {
        console.log("Error " + error.message)
      }
    } // inner loop end
  } catch (err) {
    console.log(err)
  }
}