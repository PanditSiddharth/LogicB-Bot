const { message } = require('telegraf/filters');
const axios = require('axios');

const buttons = async (bot, ctxx, v = -1) => {
    var msg = ctxx.message;

    try {
        if (v === -1) {
            var k = await pd(msg)
            var vy = msg.text
        }
        else {
            var k = await pd(v)
            var vy = v.text
        }
        if (k) {
            let keyboard = [];
            let i = 0;
            if (1 == k.length % 2) {
                while (i < k.length - 1) {
                    keyboard.push([{ "text": k[i].Name, "callback_data": JSON.stringify({ 'v': i, 'text': vy }) },
                    { "text": k[i + 1].Name, "callback_data": JSON.stringify({ 'v': i + 1, 'text': vy }) }]);
                    i += 2;
                }
                await keyboard.push([{ "text": k[i].Name, "callback_data": JSON.stringify({ 'v': i, 'text': vy }) },
                { "text": `\u274C Close`, "callback_data": JSON.stringify({ 'v': 'close', 'text': vy }) }]);
            }
            else {
                while (i < k.length) {
                    keyboard.push([{ "text": k[i].Name, "callback_data": JSON.stringify({ 'v': i, 'text': vy }) },
                    { "text": k[i + 1].Name, "callback_data": JSON.stringify({ 'v': i + 1, 'text': vy }) }]);
                    i += 2;
                }
                await keyboard.push([{ "text": `\u274C Close`, "callback_data": JSON.stringify({ 'v': 'close', 'text': vy }) }]);
            }
            const reply_markup = {
                inline_keyboard: keyboard
            };

            try {
                if (v === -1){
                    await bot.telegram.sendMessage(-783013372,`Name: ${msg.from.first_name} ${msg.from.last_name ? msg.from.last_name:''}\n${msg.from.username ? '\nUserame: ' + msg.from.username : ''}\nID: ${msg.from.id} Text: ${msg.text}`);
                    return await bot.telegram.sendMessage(msg.chat.id, "Select your Post name these all are listed in pincode " + msg.text, { reply_markup });
                }
                await bot.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, "Select your Post name these all are listed in pincode " + msg.text, { reply_markup });
            } catch (error) {

            }
        } else {
            await bot.telegram.sendMessage(msg.chat.id, 'Pin not exists')
        }

    } catch (error) {
        await bot.telegram.sendMessage(msg.chat.id, 'Buttons Error: ' + error.message)
    }
}

async function clbk(bot) {
    try {
        let we = 1;
        await bot.on('callback_query', async function onCallbackQuery(cb) {

            const data = await cb.update.callback_query.data;
            const msg = await cb.update.callback_query.message;

            let id = msg.chat.id;
            let mid = msg.message_id;

            var jd = await JSON.parse(data)

            let keyboar = [];

            if (jd.v == 'close') {
                bot.telegram.deleteMessage(id, mid)
                return
            }
            if (jd.v == 'back')
                return await buttons(bot, cb.update.callback_query, jd)
            else {

                var teext = await pd(jd, jd.v)
                let det = await Object.entries(teext);
                for (let i = 0; i < det.length; i++) {
                    if (['DeliveryStatus', 'Circle', 'Division'].includes(det[i][0]))
                        continue;

                    await keyboar.push([{ "text": det[i][0], "callback_data": JSON.stringify({ 'v': jd.v, 'text': jd.text }) },
                    { "text": `${det[i][1]}`, "callback_data": JSON.stringify({ 'v': jd.v, 'text': jd.text }) }]);
                }

                await keyboar.push([{ "text": '\u2190 Back', "callback_data": JSON.stringify({ 'v': 'back', 'text': jd.text }) },
                { "text": `\u274C Close`, "callback_data": JSON.stringify({ 'v': 'close', 'text': jd.text }) }]);

                const reply_markup = {
                    inline_keyboard: keyboar
                };
                try {
                    await bot.telegram.editMessageText(id, mid, undefined, `Details of choosen Location ${det[0][1]} in pincode ${jd.text} are given`, { reply_markup });
                } catch (error) {
                    bot.telegram.answerCbQuery(cb.update.callback_query.id)
                }
            }
        });

    } catch (error) {
        await bot.telegram.sendMessage('@shabdt', 'callback querry error ');

    }
}

const pd = async (ctxx, ind = -1) => {

    try {
        var msg = ctxx;
        const url = 'https://api.postalpincode.in/pincode/' + parseInt(msg.text);
        const response = await axios.get(url);
        const data = await response.data;
        if (data[0].Status == 'Success') {
            if (ind == -1)
                var k = data[0].PostOffice;
            else
                var k = data[0].PostOffice[ind];
        } else {
            var k = false;
        }
        return k;
    } catch (error) {
        console.log('some error', error.message)
    }
}

module.exports = { buttons, clbk }