const uri = process.env.URI + "lbbot"; // Your MongoDB connection string
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
// Connect to MongoDB using a connection pool
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // Specify the maximum number of connections in the pool
});

const UserMessage = new mongoose.Schema({
  messageId: {
    type: Number,
    required: true,
  },
  userId: {
    type: Number,
    required: true,
  },
  chatId: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 48, // Set to expire after 48 hours (in seconds)
  },
});

const chatSchema = new mongoose.Schema({
  chatId: {
    type: Number,
    required: true
  },
  username: String, // Optional, if available
  groupName: String,
  isPrivate: {
    type: Boolean,
    default: false, // Default to false for public groups
  },
  sentId: {
    type: Number,
    default: 0
  },
  rc: {
    type: Boolean,
    default: false
  }
});


const chatMessageSchema = new mongoose.Schema({
  hid: {
    type: Number,
    required: true,
  },
  messages: [
    {
      ChatId: {
        type: Number,
        required: true,
      },
      MessageId: {
        type: Number,
        required: true
      },
    },
  ],
  message: {
    type: String,
    default: "it's other thing"
  },
  time: {
    type: String,
    default: Date.now,
  },
  isRC: {
    type: Boolean,
    default: false,
  },
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
// Create a model based on the schema
const um = mongoose.model('um', UserMessage);
const Chat = mongoose.model('Chat', chatSchema);

async function insert(data: any) {
  try {
    const chat = await Chat.create(data);
    console.log('Chat created successfully:', chat);
    return chat;
  } catch (error: any) {
    return { "err": error.message }
    console.error('Error creating chat:', error);
  }
}

async function getArrayOf(value: string) {
  try {
    const chatIds = await Chat.find({}, value);
    // Extract the id values into an array
    const idList = chatIds.map((chat: any) => chat[value]);
    console.log(idList)
    return idList;
  } catch (error) {
    console.error('Error fetching chat ids:', error);
    return [];
  }
}

async function find(conditions: any) {
  try {
    const result = await Chat.find(conditions);
    console.log('Found chat(s):', result);
    return result;
  } catch (error: any) {
    return { "err": error.message }
    console.error('Error finding chat(s):', error);
  }
}

async function update(conditions: any, updateData: any) {
  try {
    const result = await Chat.updateOne(conditions, updateData);
    console.log('Updated chat:', result);
    return result;
  } catch (error: any) {
    let dt: any = { "err": error.message }
    return dt;
    console.error('Error updating chat:', error);
  }
}



// updateRcFields()

async function get3(value: string) {
  try {
    const usernamesAndRc = await Chat.find({}, 'chatId username ' + value + " -_id");
    return usernamesAndRc;
  } catch (error: any) {
    console.error('Error retrieving "username" and "rc" fields:', error);
    return [{ err: error }];
  }
}


async function remove(conditions: any) {
  try {
    const result = await Chat.deleteOne(conditions);
    console.log('Deleted chat:', result);
    return result;
  } catch (error) {
    console.error('Error deleting chat:', error);
  }
}

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
let updateMany = Chat.updateMany;

module.exports = { gps, insert, find, update, remove, getArrayOf, updateMany, get3, ChatMessage, um }

export default { gps, insert, find, update, remove, getArrayOf, updateMany, get3, ChatMessage, um }