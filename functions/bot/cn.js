const { MongoClient, ServerApiVersion } = require('mongodb');

async function f(bot, mdb) {
  const client = await new MongoClient(mdb, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
  try {
    await client.connect(async err => {
      const collection = await client.db("test").collection("devices");
      // perform actions on the collection object
      // collection.insertOne({"name: ": "sdid"}).then((res1) => console.log(res1))

      // collection.deleteOne({"name: ": "sdid"}).then((res1) => console.log(res1))

      // await collection.findOne({ "name: ": "sdid" }).then((res1) => {
      //   bot.telegram.sendMessage('@shabdt', JSON.stringify(res1));
      //   console.log(res1)
      // }
      // )
      await collection.findOne({ "name: ": "sdid" }).then(async (res1) => {
        console.log(res1)
    await bot.telegram.sendMessage('@shabdt', JSON.stringify(res1));
      }
      )
    })
  } finally {

    await client.close();
    console.log('connection Closed')
    bot.telegram.sendMessage('@shabdt', 'connection closed');
  }
}
module.exports = f