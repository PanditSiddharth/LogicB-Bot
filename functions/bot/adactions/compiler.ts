import { Telegraf, Context } from "telegraf";

const axios = require('axios');

let compiler = async (bot: Telegraf, ctx: Context) =>{
  try{
let code: any;
let ct : any = ctx.message;
  if(ctx.message && ct.reply_to_message)
    code = ct.reply_to_message.text;
  else {
    ctx.reply('default text compiled..\n\n');
    code = `
#include <stdio.h>
int main() {
    printf("Hello, world!"); 
    return 0;
}
`;
  }

axios.post('https://compilers.panditsiddharth.repl.co/', { code })
  .then((response: any) => {    
     ctx.reply("Output:\n" + response.data.output);

  })
  .catch((error: any) => {
    ctx.reply(error.response.data.error)
    .catch((errr: any)=> {
      if((errr.message as any).includes("empty")){
     return ctx.reply("main must return int");
      }
    ctx.reply(errr.message)
    })
    
  });
  }catch(err: any){
    
    ctx.reply(err.message)
    .catch((e:any)=>{})
  }
}
export default compiler;