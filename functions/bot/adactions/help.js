const help = (bot, ctxx, cn = -1, op1 = -1, op2 = -1, op3 = -3) => {

    ctxx.reply(
`Commands in bot

/hlp for help *
/dl for deletion *
/mt for mute *
/umt for unmute *
/bn for ban *
/ubn for unban *
/kk for kick *
/inf for info
/dbn for ban with del all msg
/pmt for promote
/dmt for demote
`
    )
}

module.exports = help