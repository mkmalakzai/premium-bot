/**
 * AFGLION Telegram bot webhook.
 * Securely accepts only Bot API requests signed with Telegram's X-Telegram-Bot-Api-Secret-Token.
 * Activate from Admin -> Settings -> Welcome bot -> Activate.
 */
'use strict';
const crypto=require('node:crypto');
const URL='https://velora-members-club.vercel.app/';
const PAYOUTS='https://t.me/AFGlionpayouts';
function token(){return process.env.TELEGRAM_BOT_TOKEN||'';}
function secret(){return crypto.createHash('sha256').update('afglion-webhook-v1:'+token()).digest('hex');}
function check(req){
 const sent=String(req.headers['x-telegram-bot-api-secret-token']||'');
 const a=Buffer.from(sent),b=Buffer.from(secret());
 return token()&&a.length===b.length&&crypto.timingSafeEqual(a,b);
}
function welcome(message){
 const firstName=String(message.from&&message.from.first_name||'ملګري').replace(/[<>&"']/g,'').slice(0,40);
 const match=/^\/start(?:@\w+)?\s+(ref_\d{3,20})/.exec(String(message.text||''));
 const launch=match?'https://t.me/Afglionbot?startapp='+match[1]:URL;
 const keyboard=match?[[{text:'🚀 Start Now • AFGLION',url:launch}],[{text:'📢 AFGLION Payouts Channel',url:PAYOUTS}]]:
 [[{text:'🚀 Start Now • Open App',web_app:{url:launch}}],[{text:'📢 AFGLION Payouts Channel',url:PAYOUTS}]];
 return {
  chat_id:message.chat.id,
  text:'🦁 <b>AFGLION · MEMBERS CLUB</b>\n━━━━━━━━━━━━━━━━\n\n👋 ښه راغلاست، <b>'+firstName+'</b>!\n\nد AFGLION رسمي بوټ ته ښه راغلې. دلته خپل حساب، VIP پکیجونه، رفرلونه او والېټ په اسانه اداره کولای شې.\n\n✨ <b>Welcome to AFGLION!</b>\nYour premium member experience starts here.\n\n📢 د رسمي تادیاتو او خبرتیاوو چینل:\n'+PAYOUTS+'\n\n👇 <b>د پیل لپاره Open App ووهه.</b>',
  parse_mode:'HTML',
  disable_web_page_preview:true,
  reply_markup:{inline_keyboard:keyboard}
 };
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){return res.status(405).json({ok:false});}
 if(!check(req)){return res.status(403).json({ok:false});}
 const msg=req.body&&req.body.message;
 if(!msg||msg.chat&&msg.chat.type!=='private'||!/^\/start(?:@\w+)?(?:\s|$)/.test(String(msg.text||''))){return res.status(200).json({ok:true});}
 try{
  const result=await fetch('https://api.telegram.org/bot'+token()+'/sendMessage',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify(welcome(msg)),
   signal:AbortSignal.timeout(10000)
  });
  const data=await result.json();
  if(!data.ok){console.error('AFGLION bot welcome error:',String(data.description||'Telegram API error').slice(0,180));return res.status(502).json({ok:false});}
  return res.status(200).json({ok:true});
 }catch(err){
  console.error('AFGLION bot welcome connection error:',String(err.message||'network error').slice(0,120));
  return res.status(502).json({ok:false});
 }
};