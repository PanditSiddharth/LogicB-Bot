const delgp = async (bot, ctx) => {
    try {
        if(!ctx.message || !ctx.message.reply_to_message)
         return ctx.reply(`Please reply to the user which messages you want to delete in all groups`)

      return;
        const sleep = t => new Promise(r => setTimeout(r, t));
       if(ctx.message.from.id != 1791106582)
         return ctx.reply(`you can't give this command its harmfull`)
      let deld = 0
     // await sleep(100000)
      // return console.log('done')
      for (let j = 0; j < gps.length; j++) {
      bot.telegram.sendMessage(gps[j], 'y')
      .then(async (fctx) => {
        
      await sleep(1000)

        // forword each message and delete 
      let frommsg = fctx.message_id

        // return console.log(fctx.message_id)
      for(let i = frommsg; i > frommsg - 50; i--){
                  try {
                    
       let fcctx = await bot.telegram.forwardMessage(-1001644783199 , gps[j], i)
          if(fcctx.forward_from.id == ctx.message.reply_to_message.from.id){
         let d = await bot.telegram.deleteMessage(gps[j], i).catch((err)=>  {})  
          if(d){
            deld++ 
            d = false
          }
          }
    await sleep(7000)
            
          } catch (error) {
            console.log("Error " + error.message)
          }
      } // i for loop
    // await sleep(5000)

      }); // then after sending message
  } // j for loop

let mess = await ctx.reply('deld mess in 83 gps: ' + deld) 
        await sleep(3000)

      for (let i = 0; i < 30; i++) {
        bot.telegram.editMessageText(ctx.chat.id, mess.message_id, null, 'deld mess in 83 gps: ' + deld).catch((err)=> {})
        await sleep(3000)
      }
      
    } catch (err) {
        console.log(err)
    }
}

module.exports = delgp

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
