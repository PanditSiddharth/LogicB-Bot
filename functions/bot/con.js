const mongoose = require('mongoose');
// const mongooseRetry = require('mongoose-retry')

const con = async (bot) => {
    mongoose.set('strictQuery', true)

//connect to MongoDB
await mongoose.connect('mongodb+srv://Sid:hKvgP2FidWcYXENo@cluster0.uvybipk.mongodb.net/sidDB' , {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: false,
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
});

// mongoose.plugin(mongooseRetry);
console.log('connected')
const UserSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true }
});

const User = mongoose.model('SidCollection', UserSchema);

bot.start(async (ctx) => {
    const user = new User({
        telegramId: ctx.from.id,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name
    });
    console.log(user)
   await user.save()
        .then(() => ctx.reply(`Welcome ${ctx.from.first_name}!`))
        .catch(err => console.log(err));
});

bot.on('message', async (ctx) => {
    await User.findOne({ telegramId: ctx.from.id })
        .then((user) => {
            ctx.reply(`${user.firstName}, you said: ${ctx.message.text}`)
        })
        .catch(err => console.log(err));
});

}

module.exports = con