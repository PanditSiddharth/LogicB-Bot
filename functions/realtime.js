const { um } = require('../mongo');

// Create an array to store real-time data
const realTimeData = [];

// Function to add chat messages to the array
function addChatMessage(messageId, userId, chatId) {
  try {
    realTimeData.push({ messageId, userId, chatId });
  } catch (err) { }
}
async function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
async function getUM(userId) {
  try {
    const userMessages = await um.find({ userId }).exec();
    return userMessages;
  } catch (error) {
    console.error('Error retrieving user chat messages:', error);
    throw error;
  }
}

function saveRealTimeDataToDB() {
  try {
    if (realTimeData.length > 0) {
      um.insertMany(realTimeData)
        .then(() => {
          console.log('Data saved to the database.');
          realTimeData.length = 0; // Clear the array after successful insertion
        })
        .catch((err) => { console.log(err.message) })

    }
  } catch (err) {

  }
}

let realtime = async (bot) => {

  bot.hears(/^\/(dlss)/i, async (ctx, next) => {
    try {

let arr = [1791106582, 1580821417]
      if (!arr.includes(ctx.message.from.id))
        return

      next()
      let userid = ctx.message.text.match(/(\/dlss\s*)(\d*)/)[2]
      let mes = await getUM(userid)
      if (mes.length < 1)
        return ctx.reply('No chat messages found.')

      let mm = await ctx.reply('Ok! deleting this users messages from all groups..')
      let data = {
        chats: 0,
        total: 0
      }
      for (let i = 0; i < mes.length; i++) {
        bot.telegram.deleteMessage(mes[i].chatId, mes[i].messageId)
          .then((res) => {
            data.total++;
            if (data["" + mes[i].chatId] != 1) {
              data["" + mes[i].chatId] = 1;
              data.chats = data.chats + 1;
            }

            if (data.total % 10 == 0) {

              ctx.telegram.editMessageText(ctx.message.chat.id, mm.message_id, undefined, "Deleting:Deleted " + data.total + " messages in " + data.chats + " chats.")
                .catch(async (er) => { mm = await ctx.reply("Deleting:Deleted " + data.total + " messages in " + data.chats + " chats.") })
            }
          })
          .catch((err) => {

          })

        await sleep(500)
      }

      let ids = mes.map((document) => document._id);

      // Define a query to match documents with the specified _id values
      const deleteQuery = { _id: { $in: ids } };
      ctx.telegram.editMessageText(ctx.message.chat.id, mm.message_id, undefined, "Done:Deleted " + data.total + " messages in " + data.chats + " chats.")
        .catch(async (er) => { mm = await ctx.reply("Done:Deleted " + data.total + " messages in " + data.chats + " chats.") })
      // Use the deleteMany method to delete the documents that match the query
      um.deleteMany(deleteQuery)
        .then((result) => {
          ctx.reply(`Deleted ${result.deletedCount} documents.`);
        })
        .catch((error) => {
          ctx.reply('Error deleting documents:', error.message);
        });
    } catch (err) {
      ctx.repl('Error: ' + err.message)
    }
  })

  bot.on('message', async (ctx, next) => {
    try {
      let m = ctx.message;
      addChatMessage(m.message_id, m.from.id, m.chat.id);
      next()
    } catch (rr) { }
  })



  abc()
}

async function abc() {
  setInterval(saveRealTimeDataToDB, 10 * 1000);
}

module.exports = realtime