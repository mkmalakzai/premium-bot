/**
 * AFGLION Mini App — verified Telegram identity + Firestore server authority.
 * All balances, VIP claims, referrals and manual payouts are server-side.
 * The Firestore collection prefix isolates this app from any other AFGLION project.
 */
'use strict';
const crypto = require('node:crypto');
const admin = require('firebase-admin');
const DAY = 86400000;
const C = {
 users:'veloraUsers', settings:'veloraSettings', requests:'veloraVipRequests',
 money:'veloraMoneyRequests', awards:'veloraReferralAwards', roles:'veloraStaffRoles', audits:'veloraAdminAudit', notices:'veloraApprovalNotices', broadcasts:'veloraBroadcasts', adEvents:'veloraAdEvents'
};
const DEFAULTS = {
 appName:'AFGLION', botUsername:'Afglionbot',
 announcement:'Welcome to AFGLION. Deposit and withdrawal requests are reviewed manually.',
 adsEnabled:false, adsBlockId:'52925', adsReward:0, adsDailyLimit:5,
 dailyBonus:0, dailyEnabled:false, referralPercent:10, minDeposit:50, minWithdraw:100,
 forceJoinEnabled:true,forceJoinChannel:'https://t.me/geminipromtshub',homeChannelUrl:'https://t.me/geminipromtshub',
 depositNumber:'',depositContact:'Mk_Malakzai',
 notifyApprovals:true,notificationChannel:'https://t.me/AFGlionpayouts',
 depositInstructions:'Send payment using the method agreed with support. Enter a genuine transaction reference; approval is manual.',
 payoutInstructions:'Withdrawals are reviewed manually. Enter a correct payment method and recipient details.',
 plans:{
  gold:{name:'Gold VIP',price:500,dailyReward:50,days:30},
  elite:{name:'Elite VIP',price:1000,dailyReward:110,days:30}
 }
};
function fail(status,msg){const e=new Error(msg);e.status=status;throw e;}
function ready(){return !!(process.env.TELEGRAM_BOT_TOKEN&&process.env.FIREBASE_SERVICE_ACCOUNT_JSON);}
function db(){
 if(!ready())fail(503,'Backend not configured: set Firebase service account and Telegram bot token in Vercel.');
 if(!admin.apps.length){
  let key;
  try{key=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);}catch(e){fail(503,'Invalid Firebase service account JSON');}
  if(key.project_id!=='afglion-47b07')fail(503,'Firebase project mismatch: expected afglion-47b07');
  if(key.private_key)key.private_key=key.private_key.replace(/\\n/g,'\n');
  admin.initializeApp({credential:admin.credential.cert(key)});
 }
 return admin.firestore();
}
function admins(){return new Set((process.env.ADMIN_TELEGRAM_IDS||'').split(',').map(x=>x.trim()).filter(Boolean));}
function secureString(x,max){return typeof x==='string'?x.trim().slice(0,max):'';}
async function roleOf(id,store){
 if(admins().has(String(id)))return 'owner';
 const record=await store.collection(C.roles).doc(String(id)).get();
 return record.exists&&['admin','owner'].includes(record.data().role)?record.data().role:'user';
}
function roleRank(role){return role==='owner'?2:role==='admin'?1:0;}
function numericId(x){return /^\d{3,20}$/.test(String(x||''));}
function whole(x,min,max){return typeof x==='number'&&Number.isSafeInteger(x)&&x>=min&&x<=max;}
function checkAmount(x,min,max){if(!whole(x,min,max))fail(400,'Invalid AFN amount');return x;}
function settings(s){
 const data=s&&s.exists?s.data():{};
 const plans={...DEFAULTS.plans,...(data.plans||{})};
 const vipPackages=data.vipPackages===undefined?plans:data.vipPackages;
 const paymentMethods=data.paymentMethods===undefined?[{id:'manual',name:'Manual Transfer',number:data.depositNumber||'',enabled:true}]:data.paymentMethods;
 return {...DEFAULTS,...data,plans,vipPackages,paymentMethods};
}
function channelUrl(value){
 const x=secureString(value,100).replace(/^@/,'https://t.me/');
 const match=/^https:\/\/t\.me\/([A-Za-z0-9_]{5,32})\/?$/.exec(x);
 if(!match)fail(400,'Use a public Telegram channel link (https://t.me/channelname)');
 return 'https://t.me/'+match[1];
}
function botContact(value){
 const x=secureString(value,34).replace(/^@/,'');
 if(!/^[A-Za-z0-9_]{5,32}$/.test(x))fail(400,'Enter a valid Telegram username');
 return x;
}
function safePackage(value){
 if(!value||typeof value!=='object')fail(400,'Invalid package');
 const name=secureString(value.name,45);
 if(name.length<3)fail(400,'VIP package name should have at least three characters');
 return {name,price:checkAmount(value.price,1,1000000),
  dailyReward:checkAmount(value.dailyReward,0,100000),days:checkAmount(value.days,1,365),enabled:value.enabled!==false};
}
async function memberStatus(id,config,role='user'){
 const url=channelUrl(config.forceJoinChannel);
 if(!config.forceJoinEnabled||roleRank(role)>0||admins().has(id))return {joined:true,url};
 const userName=url.split('/').pop();
 let response,answer;
 try{
  response=await fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/getChatMember',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({chat_id:'@'+userName,user_id:Number(id)}),
   signal:AbortSignal.timeout(7500)
  });
  answer=await response.json();
 }catch(e){return {joined:false,url,issue:'Unable to verify membership right now. Try again.'};}
 if(!answer.ok)return {joined:false,url,issue:'Channel verification unavailable. Add the bot as channel admin.'};
 const m=answer.result||{};
 const joined=['creator','administrator','member'].includes(m.status)||(m.status==='restricted'&&m.is_member===true);
 return {joined,url,issue:joined?'':'Join the channel and tap Check Joined.'};
}

function notificationText(entry){
 const stamp=new Date(entry.createdAt||Date.now()).toISOString().slice(0,16).replace('T',' ')+' UTC';
 const type=entry.type==='deposit'?'DEPOSIT CONFIRMED':'WITHDRAWAL COMPLETED';
 const icon=entry.type==='deposit'?'💳':'💸';
 const safeAmount=Number.isSafeInteger(entry.amount)?entry.amount.toLocaleString('en-US'):'0';
 const id=String(entry.userId||''),masked=id?'•••• '+id.slice(-4):'AFGLION member';
 return ['🦁 <b>AFGLION · MEMBERS CLUB</b>','━━━━━━━━━━━━━━━━',
 icon+' <b>'+type+'</b>','',
 '✅ <b>Status:</b> Approved','💰 <b>Amount:</b> '+safeAmount+' AFN',
 '👤 <b>Member:</b> '+masked,'🕒 <b>Time:</b> '+stamp,
 '━━━━━━━━━━━━━━━━','✨ <i>Trusted service. Premium experience.</i>'].join('\n');
}
async function deliverNotice(store,noticeId){
 const doc=store.collection(C.notices).doc(noticeId),now=Date.now();
 const claimed=await store.runTransaction(async tx=>{
  const snapshot=await tx.get(doc);
  if(!snapshot.exists)fail(404,'Notification was not found');
  const message=snapshot.data();
  if(message.status==='sent')return {alreadySent:true};
  if(message.status==='sending'&&now-(message.claimedAt||0)<60000)fail(409,'Message delivery is in progress');
  tx.update(doc,{status:'sending',claimedAt:now,attempts:(message.attempts||0)+1});
  return message;
 });
 if(claimed.alreadySent)return {sent:true,alreadySent:true};
 try{
  const channel=channelUrl(claimed.channel),chatId='@'+channel.split('/').pop();
  const resp=await fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/sendMessage',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({chat_id:chatId,text:notificationText(claimed),parse_mode:'HTML',disable_web_page_preview:true}),
   signal:AbortSignal.timeout(9000)
  });
  const result=await resp.json();
  if(!result.ok)throw new Error(result.description||'Telegram rejected the message');
  await doc.update({status:'sent',sentAt:Date.now(),messageId:result.result&&result.result.message_id||null,lastError:''});
  return {sent:true};
 }catch(e){
  const message=secureString(e.message||'Telegram error',220);
  await doc.update({status:'failed',lastError:message,failedAt:Date.now()});
  return {sent:false,error:message};
 }
}

function sessionKey(){return crypto.createHash('sha256').update('afglion-auth-1:'+process.env.TELEGRAM_BOT_TOKEN).digest();}
function signSession(id){
 const head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
 const time=Math.floor(Date.now()/1000);
 const payload=Buffer.from(JSON.stringify({sub:id,iat:time,exp:time+7*86400})).toString('base64url');
 const value=head+'.'+payload;
 return value+'.'+crypto.createHmac('sha256',sessionKey()).update(value).digest('base64url');
}
function verifySession(req){
 const h=req.headers.authorization||'';
 if(!h.startsWith('Bearer '))fail(401,'Open the app using Telegram');
 const p=h.slice(7).split('.');
 if(p.length!==3)fail(401,'Session invalid');
 const expected=crypto.createHmac('sha256',sessionKey()).update(p[0]+'.'+p[1]).digest();
 let received;
 try{received=Buffer.from(p[2],'base64url');}catch(e){fail(401,'Session invalid');}
 if(received.length!==expected.length||!crypto.timingSafeEqual(received,expected))fail(401,'Session invalid');
 let head,payload;
 try{head=JSON.parse(Buffer.from(p[0],'base64url'));payload=JSON.parse(Buffer.from(p[1],'base64url'));}catch(e){fail(401,'Session invalid');}
 if(head.alg!=='HS256'||!numericId(payload.sub)||!Number.isFinite(payload.exp)||Date.now()/1000>payload.exp)fail(401,'Session expired');
 return String(payload.sub);
}
function telegramIdentity(raw){
 if(typeof raw!=='string'||raw.length>10000||!raw)fail(401,'Open the Mini App from Telegram');
 const qs=new URLSearchParams(raw), seen=new Set();
 for(const [key] of qs){if(seen.has(key))fail(401,'Duplicate Telegram data');seen.add(key);}
 const hash=qs.get('hash'),authTime=Number(qs.get('auth_date'));
 if(!hash||!/^[0-9a-f]{64}$/i.test(hash)||!Number.isFinite(authTime)||Math.abs(Date.now()/1000-authTime)>600)fail(401,'Telegram sign-in expired. Reopen the app.');
 const check=[...qs.entries()].filter(([key])=>key!=='hash').sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(process.env.TELEGRAM_BOT_TOKEN).digest();
 const expected=crypto.createHmac('sha256',secret).update(check).digest();
 const received=Buffer.from(hash,'hex');
 if(received.length!==expected.length||!crypto.timingSafeEqual(received,expected))fail(401,'Telegram authentication failed');
 let u;
 try{u=JSON.parse(qs.get('user')||'{}');}catch(e){fail(401,'Invalid Telegram user');}
 if(!Number.isSafeInteger(u.id)||u.id<=0)fail(401,'Invalid Telegram user');
 return {id:String(u.id),user:u,startParam:qs.get('start_param')||''};
}
function visibleUser(value,id,role='user'){
 const user={...value,id:String(id),isAdmin:roleRank(role)>0,adminRole:role};
 if((user.vipUntil||0)+DAY<Date.now()){user.vipTier='free';}
 return user;
}
async function signedIn(req,store){
 const id=verifySession(req),ref=store.collection(C.users).doc(id);
 const [snap,role]=await Promise.all([ref.get(),roleOf(id,store)]);
 if(!snap.exists)fail(401,'User not found');
 if(snap.data().banned)fail(403,'Account restricted');
 return {id,ref,snap,role};
}
function planFor(s,tier){const p=s.vipPackages[tier];if(!p||p.enabled===false||!whole(p.price,1,1000000)||!whole(p.dailyReward,0,100000)||!whole(p.days,1,365))fail(400,'VIP package is unavailable');return p;}
function isAdmin(id){return admins().has(id);}
async function route(req){
 const action=String(req.query.action||'');
 if(action==='health')return {ok:true,backendConfigured:ready(),expectedFirebaseProject:'afglion-47b07'};
 if(!ready())fail(503,'Backend not configured. Add TELEGRAM_BOT_TOKEN and FIREBASE_SERVICE_ACCOUNT_JSON on Vercel.');
 const store=db(),users=store.collection(C.users),settingRef=store.collection(C.settings).doc('global');
 const body=req.body||{};
 if(action==='adsgramCallback'){
  if(req.method!=='GET')fail(405,'GET required');
  const userId=String(req.query.userId||''),provided=String(req.query.key||'');
  const expected=crypto.createHmac('sha256',process.env.TELEGRAM_BOT_TOKEN).update('afglion-adsgram-callback-v1').digest('hex');
  if(!/^\d{3,20}$/.test(userId)||provided.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(provided),Buffer.from(expected)))fail(403,'Unauthorized callback');
  const ref=users.doc(userId),now=Date.now(),ss=settings(await settingRef.get());
  if(!ss.adsEnabled||ss.adsBlockId!=='52925'||!ss.adsReward)return {ok:true,credited:false};
  return await store.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists||snap.data().banned)return {ok:true,credited:false};
   const u=snap.data(),pending=u.adsPending||{},day=new Date(now).toISOString().slice(0,10);
   if(!pending.id||pending.expiresAt<now||pending.createdAt>now||pending.createdAt<now-600000||pending.day!==day)return {ok:true,credited:false};
   const count=u.adsDay===day?(u.adsToday||0):0;
   if(count>=ss.adsDailyLimit)return {ok:true,credited:false};
   const reward=ss.adsReward;
   tx.update(ref,{earningsBalance:admin.firestore.FieldValue.increment(reward),earningsTotal:admin.firestore.FieldValue.increment(reward),adsToday:count+1,adsDay:day,adsPending:admin.firestore.FieldValue.delete(),adsLastRewardAt:now});
   tx.set(ref.collection('activity').doc(),{label:'AdsGram rewarded ad',amount:reward,wallet:'earnings',at:now});
   return {ok:true,credited:true};
  });
 }
 if(action==='auth'){
  if(req.method!=='POST')fail(405,'POST required');
  const tele=telegramIdentity(body.initData),id=tele.id,userRef=users.doc(id);
  const st=settings(await settingRef.get());
  const membership=await memberStatus(id,st,await roleOf(id,store));
  if(!membership.joined)return {joinRequired:true,joinUrl:membership.url,joinIssue:membership.issue};
  const match=/^ref_(\d{3,20})$/.exec(tele.startParam);
  const inviter=match&&match[1]!==id?match[1]:null;
  await store.runTransaction(async tx=>{
   const existing=await tx.get(userRef);
   if(existing.exists)return;
   const parentRef=inviter?users.doc(inviter):null;
   const parent=parentRef?await tx.get(parentRef):null;
   const eligible=parent&&parent.exists&&!parent.data().banned;
   const now=Date.now(),who=tele.user;
   tx.set(userRef,{
    telegramId:id, name:secureString([who.first_name,who.last_name].filter(Boolean).join(' '),48)||'Member',
    firstName:secureString(who.first_name,64),username:secureString(who.username,32),
    photoUrl:typeof who.photo_url==='string'&&who.photo_url.startsWith('https://')?who.photo_url.slice(0,800):'',
    referrerId:eligible?inviter:null, balance:0, totalEarned:0,totalDeposited:0,totalWithdrawn:0,pendingWithdraw:0,
    referralCount:0,referralEarned:0,vipTier:'free',vipUntil:0,vipActivatedAt:0,
    vipDaysClaimed:0,vipLastClaimSlot:0,vipPlanSnapshot:null,lastClaimAt:0,claimStreak:0,joinedAt:now,banned:false
   });
   if(eligible){
    tx.update(parentRef,{referralCount:admin.firestore.FieldValue.increment(1)});
    tx.set(store.collection('veloraReferralEvents').doc(id),{referrerId:inviter,refereeId:id,bonus:0,createdAt:now});
   }
  });
  const snapshot=await userRef.get();
  if(snapshot.data().banned)fail(403,'Account restricted');
  return {token:signSession(id)};
 }
 const {id,ref,role}=await signedIn(req,store);
 const currentSettings=settings(await settingRef.get());
 const membership=await memberStatus(id,currentSettings,role);
 if(action==='joinStatus')return {joined:membership.joined,joinRequired:!membership.joined,joinUrl:membership.url,joinIssue:membership.issue};
 if(!membership.joined){
  if(action==='me')return {joinRequired:true,joinUrl:membership.url,joinIssue:membership.issue};
  fail(403,'Join the required Telegram channel to continue');
 }
 if(action==='adBegin'){
  if(req.method!=='POST')fail(405,'POST required');
  const now=Date.now(),day=new Date(now).toISOString().slice(0,10),ss=settings(await settingRef.get());
  if(!ss.adsEnabled||ss.adsBlockId!=='52925'||ss.adsReward<=0)fail(403,'Watch & Earn is not enabled yet');
  return store.runTransaction(async tx=>{
   const u=await tx.get(ref);
   if(!u.exists||u.data().banned)fail(403,'Account restricted');
   const count=u.data().adsDay===day?(u.data().adsToday||0):0;
   if(count>=ss.adsDailyLimit)fail(429,'Daily ad limit reached');
   const pending=u.data().adsPending||{};
   if(pending.expiresAt>now)fail(429,'An ad session is already active. Wait a moment.');
   const session={id:crypto.randomUUID(),createdAt:now,expiresAt:now+300000,day};
   tx.update(ref,{adsPending:session});
   return {ok:true,blockId:ss.adsBlockId,expiresAt:session.expiresAt};
  });
 }
 if(action==='adStatus'){
  const [u,ss]=await Promise.all([ref.get(),settingRef.get()]);
  const d=u.data(),config=settings(ss),day=new Date().toISOString().slice(0,10);
  return {ok:true,enabled:!!config.adsEnabled,blockId:config.adsBlockId,reward:config.adsReward,dailyLimit:config.adsDailyLimit,today:d.adsDay===day?(d.adsToday||0):0,earningsBalance:d.earningsBalance||0,earningsTotal:d.earningsTotal||0,pendingUntil:d.adsPending?.expiresAt||0};
 }
 if(action==='me'){
  const [u,s,r,v,m,a]=await Promise.all([
   ref.get(),settingRef.get(),users.where('referrerId','==',id).limit(100).get(),
   store.collection(C.requests).doc(id).get(),
   store.collection(C.money).where('userId','==',id).limit(80).get(),
   ref.collection('activity').orderBy('at','desc').limit(30).get()
  ]);
  const ss=settings(s);
  return {user:visibleUser(u.data(),id,role),settings:ss,
   referrals:r.docs.map(d=>({id:d.id,name:d.data().name||'Member',photoUrl:d.data().photoUrl||'',joinedAt:d.data().joinedAt||0})).sort((x,y)=>y.joinedAt-x.joinedAt),
   vipRequest:v.exists?v.data():null,
   transactions:m.docs.map(d=>({...d.data(),id:d.id})).sort((x,y)=>y.createdAt-x.createdAt),
   activity:a.docs.map(d=>d.data())
  };
 }
 if(action==='claim'){
  if(req.method!=='POST')fail(405,'POST required');
  const now=Date.now();
  return await store.runTransaction(async tx=>{
   const [u,s]=await Promise.all([tx.get(ref),tx.get(settingRef)]);
   if(!u.exists||u.data().banned)fail(403,'Account restricted');
   const last=u.data().lastClaimAt||0;
   if(now-last<DAY)fail(429,'Daily check-in is available every 24 hours');
   const config=settings(s);
   if(!config.dailyEnabled)fail(403,'Free daily check-in is disabled');
   const bonus=config.dailyBonus;
   checkAmount(bonus,0,1000);
   const streak=now-last<DAY*2?(u.data().claimStreak||0)+1:1;
   tx.update(ref,{balance:admin.firestore.FieldValue.increment(bonus),totalEarned:admin.firestore.FieldValue.increment(bonus),lastClaimAt:now,claimStreak:streak});
   tx.set(ref.collection('activity').doc(),{label:'Free daily check-in',amount:bonus,at:now});
   return {ok:true,bonus,streak};
  });
 }
 if(action==='vipClaim'){
  if(req.method!=='POST')fail(405,'POST required');
  const now=Date.now();
  return await store.runTransaction(async tx=>{
   const [u,s]=await Promise.all([tx.get(ref),tx.get(settingRef)]);
   if(!u.exists||u.data().banned)fail(403,'Account restricted');
   const usr=u.data(),p=usr.vipPlanSnapshot||planFor(settings(s),usr.vipTier);
   const began=usr.vipActivatedAt||0, until=usr.vipUntil||0;
   const slot=Math.min(p.days,Math.floor((now-began)/DAY));
   if(!began||!until||now>until+DAY||slot<1||slot<=(usr.vipLastClaimSlot||0))fail(409,'Next VIP reward is not available yet');
   if((usr.vipDaysClaimed||0)>=p.days)fail(409,'VIP rewards completed');
   const amount=p.dailyReward;
   tx.update(ref,{balance:admin.firestore.FieldValue.increment(amount),totalEarned:admin.firestore.FieldValue.increment(amount),
    vipLastClaimSlot:slot,vipDaysClaimed:admin.firestore.FieldValue.increment(1)});
   tx.set(ref.collection('activity').doc(),{label:usr.vipTier.toUpperCase()+' VIP daily reward',amount,at:now});
   return {ok:true,amount,slot};
  });
 }
 if(action==='profileUpdate'){
  if(req.method!=='POST')fail(405,'POST required');
  const name=secureString(body.name,48);
  if(name.length<2)fail(400,'Name must contain 2-48 characters');
  await ref.update({name});return {ok:true};
 }
 if(action==='moneyRequest'){
  if(req.method!=='POST')fail(405,'POST required');
  const type=body.type;
  if(!['deposit','withdraw'].includes(type))fail(400,'Invalid transaction type');
  const amount=checkAmount(body.amount,1,1000000);
  const paymentReference=type==='deposit'?secureString(body.reference||body.details,300):'';
  const payoutRecipient=type==='withdraw'?secureString(body.recipient||body.details,300):'';
  const details=type==='deposit'?paymentReference:payoutRecipient;
  if(details.length<5)fail(400,type==='deposit'?'Provide your deposit transfer reference':'Provide the withdrawal recipient phone or account');
  const submittedMethod=secureString(body.methodId||body.method,70);
  const current=settings(await settingRef.get());
  const selected=current.paymentMethods.find(m=>m.enabled!==false&&(m.id===submittedMethod||m.name===submittedMethod));
  if(!selected)fail(400,'Choose an available payment method');
  if(type==='deposit'&&!selected.number)fail(503,'The administrator has not configured a receiving number for this method');
  const method=selected.name;
  const reqRef=store.collection(C.money).doc(),now=Date.now();
  return await store.runTransaction(async tx=>{
   const [u,s]=await Promise.all([tx.get(ref),tx.get(settingRef)]);
   if(!u.exists||u.data().banned)fail(403,'Account restricted');
   const setting=settings(s);
   if(amount<(type==='deposit'?setting.minDeposit:setting.minWithdraw))fail(400,'Amount is below the current minimum');
   const confirmed=(setting.paymentMethods||[]).find(m=>m.id===selected.id&&m.enabled!==false);
   if(!confirmed||(type==='deposit'&&!confirmed.number))fail(409,'Payment method was changed. Reload the app.');
   if(type==='withdraw'&&(u.data().balance||0)<amount)fail(409,'Insufficient available AFN balance');
   if(type==='withdraw')tx.update(ref,{balance:admin.firestore.FieldValue.increment(-amount),pendingWithdraw:admin.firestore.FieldValue.increment(amount)});
   tx.set(reqRef,{userId:id,name:u.data().name||'Member',type,amount,method,methodId:selected.id,receivingNumber:type==='deposit'?selected.number:'',paymentReference,payoutRecipient,details,status:'pending',createdAt:now,reviewedAt:0});
   tx.set(ref.collection('activity').doc(),{label:(type==='deposit'?'Deposit':'Withdrawal')+' request submitted',amount:0,at:now});
   return {ok:true,requestId:reqRef.id};
  });
 }
 if(action==='cancelWithdrawal'){
  if(req.method!=='POST')fail(405,'POST required');
  const requestId=secureString(body.requestId,100),requestRef=store.collection(C.money).doc(requestId);
  return await store.runTransaction(async tx=>{
   const [r,u]=await Promise.all([tx.get(requestRef),tx.get(ref)]);
   if(!r.exists||r.data().userId!==id||r.data().type!=='withdraw'||r.data().status!=='pending')fail(409,'Pending withdrawal not found');
   tx.update(requestRef,{status:'cancelled',reviewedAt:Date.now()});
   tx.update(ref,{balance:admin.firestore.FieldValue.increment(r.data().amount),pendingWithdraw:admin.firestore.FieldValue.increment(-r.data().amount)});
   return {ok:true};
  });
 }
 if(action==='vipRequest'||action==='vipPurchase'){
  if(req.method!=='POST')fail(405,'POST required');
  const tier=secureString(body.tier,32);
  if(!/^[a-z0-9_-]{2,32}$/.test(tier))fail(400,'Invalid VIP package');
  const now=Date.now();
  return await store.runTransaction(async tx=>{
   const [u,s]=await Promise.all([tx.get(ref),tx.get(settingRef)]);
   if(!u.exists||u.data().banned)fail(403,'Account restricted');
   const who=u.data(),config=settings(s),packageInfo=planFor(config,tier);
   if((who.vipUntil||0)>now&&who.vipTier&&who.vipTier!=='free')fail(409,'Finish your active VIP membership before buying another package');
   if((who.balance||0)<packageInfo.price)fail(409,'Insufficient AFN balance. Deposit first and wait for deposit approval.');
   const parentId=who.referrerId,linkedRef=parentId&&parentId!==id?users.doc(parentId):null;
   const linked=linkedRef?await tx.get(linkedRef):null;
   const purchasedPackage={name:packageInfo.name,price:packageInfo.price,dailyReward:packageInfo.dailyReward,days:packageInfo.days,enabled:true};
   tx.update(ref,{balance:admin.firestore.FieldValue.increment(-packageInfo.price),vipTier:tier,
    vipActivatedAt:now,vipUntil:now+packageInfo.days*DAY,vipPlanSnapshot:purchasedPackage,
    vipDaysClaimed:0,vipLastClaimSlot:0});
   tx.set(ref.collection('activity').doc(),{label:packageInfo.name+' VIP purchase',amount:-packageInfo.price,at:now});
   const referralPct=config.referralPercent||0;
   const award=Math.floor(packageInfo.price*referralPct/100);
   if(linked&&linked.exists&&!linked.data().banned&&award>0){
    tx.update(linkedRef,{balance:admin.firestore.FieldValue.increment(award),totalEarned:admin.firestore.FieldValue.increment(award),
     referralEarned:admin.firestore.FieldValue.increment(award)});
    tx.set(linkedRef.collection('activity').doc(),{label:'VIP referral commission',amount:award,at:now});
    tx.set(store.collection(C.awards).doc(),{parentId,memberId:id,vipTier:tier,amount:award,percent:referralPct,at:now});
   }
   return {ok:true,tier,planName:packageInfo.name,charged:packageInfo.price,vipUntil:now+packageInfo.days*DAY,referralAward:linked&&linked.exists?award:0,approvalRequired:false};
  });
 }

 if(roleRank(role)===0)fail(403,'Administrator access required');
 if(action==='adminData'){
  const [us,m,ss,total,staffSnap,noticeSnap]=await Promise.all([
   users.orderBy('joinedAt','desc').limit(500).get(),
   store.collection(C.money).where('status','==','pending').limit(200).get(),settingRef.get(),users.count().get(),store.collection(C.roles).limit(100).get(),
   store.collection(C.notices).orderBy('createdAt','desc').limit(60).get()
  ]);
  const members=us.docs.map(d=>({...d.data(),id:d.id})), moneyRequests=m.docs.map(d=>({...d.data(),id:d.id})).sort((x,y)=>x.createdAt-y.createdAt);
  const notices=noticeSnap.docs.filter(d=>d.data().status!=='sent').map(d=>({...d.data(),id:d.id}));
  return {callerRole:role,staffRoles:staffSnap.docs.map(d=>({id:d.id,role:d.data().role})),rootOwners:role==='owner'?[...admins()]:[],users:members,moneyRequests,notices,settings:settings(ss),
   stats:{members:total.data().count,vip:members.filter(u=>u.vipUntil>Date.now()).length,pending:moneyRequests.length,points:members.reduce((sum,u)=>sum+(u.balance||0),0)},sampled:members.length<total.data().count};
 }
 if(action==='adminAction'){
  if(req.method!=='POST')fail(405,'POST required');
  const type=String(body.type||''),now=Date.now();
  if(type==='saveSettings'){
   const announcement=secureString(body.announcement,350),botUsername=botContact(body.botUsername||'Afglionbot');
   const dailyBonus=checkAmount(body.dailyBonus,0,1000),referralPercent=checkAmount(body.referralPercent,0,50);
   const minDeposit=checkAmount(body.minDeposit,1,100000),minWithdraw=checkAmount(body.minWithdraw,1,100000);
   const forceJoinChannel=channelUrl(body.forceJoinChannel),homeChannelUrl=channelUrl(body.homeChannelUrl);
   const depositNumber=secureString(body.depositNumber,40).replace(/[^\d+\-\s()]/g,'');
   const depositContact=botContact(body.depositContact);
   const notifyApprovals=body.notifyApprovals===true;
   const notificationChannel=body.notificationChannel?channelUrl(body.notificationChannel):'';
   if(notifyApprovals&&!notificationChannel)fail(400,'Set a notification channel first');
   if(typeof body.dailyEnabled!=='boolean'||typeof body.forceJoinEnabled!=='boolean')fail(400,'Invalid reward or force-join settings');
   await settingRef.set({appName:'AFGLION',botUsername,announcement,dailyBonus,dailyEnabled:body.dailyEnabled,
    referralPercent,minDeposit,minWithdraw,forceJoinChannel,forceJoinEnabled:body.forceJoinEnabled,
    homeChannelUrl,depositNumber,depositContact,notifyApprovals,notificationChannel,
    depositInstructions:secureString(body.depositInstructions,500),
    payoutInstructions:secureString(body.payoutInstructions,500)},{merge:true});
   return {ok:true};
  }
  if(type==='saveVipPackage'||type==='deleteVipPackage'){
   const key=secureString(body.packageId,32);
   if(key&&!/^[a-z0-9_-]{2,32}$/.test(key))fail(400,'Invalid package identifier');
   return await store.runTransaction(async tx=>{
    const snapshot=await tx.get(settingRef),ss=settings(snapshot),packages={...ss.vipPackages};
    if(type==='deleteVipPackage'){
     if(!key||!packages[key])fail(404,'VIP package not found');
     delete packages[key];
    }else{
     const p=safePackage(body.package);
     const identifier=key||'vip_'+crypto.randomBytes(6).toString('hex');
     if(!packages[identifier]&&Object.keys(packages).length>=20)fail(400,'Maximum 20 VIP packages');
     packages[identifier]=p;
    }
    tx.set(settingRef,{...(snapshot.exists?snapshot.data():{}),vipPackages:packages});
    return {ok:true};
   });
  }
  if(type==='setRole'){
   if(role!=='owner')fail(403,'Only owners can appoint or remove administrators and owners');
   const targetId=String(body.userId||''),newRole=String(body.role||'');
   if(!numericId(targetId)||!['user','admin','owner'].includes(newRole))fail(400,'Invalid role assignment');
   if(admins().has(targetId)&&newRole!=='owner')fail(403,'Environment owner cannot be demoted');
   const targetRef=users.doc(targetId),roleRef=store.collection(C.roles).doc(targetId);
   await store.runTransaction(async tx=>{
    const target=await tx.get(targetRef);
    if(!target.exists)fail(404,'Account has not signed into the Mini App yet');
    if(target.data().banned&&newRole!=='user')fail(409,'Unban the account before granting staff role');
    if(newRole==='user')tx.delete(roleRef);
    else tx.set(roleRef,{role:newRole,appointedBy:id,updatedAt:now});
    tx.set(store.collection(C.audits).doc(),{actor:id,kind:'role',target:targetId,role:newRole,at:now});
   });
   return {ok:true};
  }
  if(type==='savePaymentMethod'||type==='deletePaymentMethod'){
   const paymentId=secureString(body.methodId,32);
   if(paymentId&&!/^[a-z0-9_-]{2,32}$/.test(paymentId))fail(400,'Invalid payment method ID');
   return await store.runTransaction(async tx=>{
    const snap=await tx.get(settingRef),config=settings(snap),methods=[...config.paymentMethods];
    if(type==='deletePaymentMethod'){
     const i=methods.findIndex(m=>m.id===paymentId);
     if(i===-1)fail(404,'Payment method not found');
     methods.splice(i,1);
    }else{
     const m=body.method||{},name=secureString(m.name,45),number=secureString(m.number,40).replace(/[^\d+\-\s()]/g,'');
     if(name.length<3)fail(400,'Payment method name must have three or more characters');
     const idForMethod=paymentId||'pay_'+crypto.randomBytes(5).toString('hex');
     const existingIndex=methods.findIndex(x=>x.id===idForMethod);
     if(existingIndex<0&&methods.length>=12)fail(400,'Maximum 12 payment methods');
     const value={id:idForMethod,name,number,enabled:m.enabled!==false};
     if(existingIndex>=0)methods[existingIndex]=value;else methods.push(value);
    }
    tx.set(settingRef,{...(snap.exists?snap.data():{}),paymentMethods:methods});
    tx.set(store.collection(C.audits).doc(),{actor:id,kind:'payment_methods',at:now,methodId:paymentId||'new'});
    return {ok:true};
   });
  }
  if(type==='updateUser'){
   const targetId=String(body.userId||'');
   if(!numericId(targetId)||!(body.tier==='free'||/^[a-z0-9_-]{2,32}$/.test(body.tier))||!whole(body.balanceDelta===undefined?body.addPoints:body.balanceDelta,-100000,100000)||typeof body.banned!=='boolean')fail(400,'Invalid member changes');
   const targetRole=await roleOf(targetId,store);
   if(roleRank(targetRole)>0&&role!=='owner')fail(403,'Owner approval required for staff accounts');
   if(roleRank(targetRole)>0&&body.banned)fail(400,'Staff accounts cannot be banned');
   const userRef=users.doc(targetId);
   await store.runTransaction(async tx=>{
    const u=await tx.get(userRef);
    if(!u.exists)fail(404,'Member not found');
    const update={banned:body.banned};
    const delta=body.balanceDelta===undefined?body.addPoints:body.balanceDelta;
    if(delta<0&&(u.data().balance||0)<-delta)fail(409,'Cannot deduct more than available balance');
    if(u.data().vipTier!==body.tier||(body.tier!=='free'&&(u.data().vipUntil||0)<now)){
     const p=body.tier==='free'?null:planFor(settings(await tx.get(settingRef)),body.tier);
     update.vipTier=body.tier;update.vipActivatedAt=p?now:0;
     update.vipUntil=p?now+p.days*DAY:0;update.vipPlanSnapshot=p||null;update.vipLastClaimSlot=0;update.vipDaysClaimed=0;
    }
    if(delta!==0){
     update.balance=admin.firestore.FieldValue.increment(delta);
     tx.set(userRef.collection('activity').doc(),{label:delta>0?'Admin credit':'Admin deduction',amount:delta,at:now});
     tx.set(store.collection(C.audits).doc(),{actor:id,kind:delta>0?'credit':'deduction',target:targetId,amount:delta,at:now});
    }
    tx.update(userRef,update);
   });return {ok:true};
  }
  // VIP purchases are automatically activated in one Firestore transaction; no manual VIP approvals.

  if(type==='saveAdsSettings'){
   if(role!=='owner')fail(403,'Owner only');
   const adsEnabled=body.adsEnabled===true,adsReward=Number(body.adsReward),adsDailyLimit=Number(body.adsDailyLimit);
   if(!Number.isFinite(adsReward)||adsReward<0||adsReward>10||Math.round(adsReward*100)!==adsReward*100)fail(400,'Invalid ad reward');
   if(!Number.isInteger(adsDailyLimit)||adsDailyLimit<1||adsDailyLimit>20)fail(400,'Invalid daily limit');
   await settingRef.set({adsEnabled,adsBlockId:'52925',adsReward,adsDailyLimit},{merge:true});
   return {ok:true};
  }
  if(type==='adsCallbackUrl'){
   if(role!=='owner')fail(403,'Owner only');
   const key=crypto.createHmac('sha256',process.env.TELEGRAM_BOT_TOKEN).update('afglion-adsgram-callback-v1').digest('hex');
   return {ok:true,url:'https://velora-members-club.vercel.app/api/index?action=adsgramCallback&userId=[userId]&key='+key};
  }
  if(type==='broadcastCreate'){
   if(role!=='owner')fail(403,'Only owners can start broadcasts');
   const message=secureString(body.message,1600);
   if(message.length<10)fail(400,'Broadcast must be at least 10 characters');
   const campaign=store.collection(C.broadcasts).doc();
   await campaign.set({message,createdBy:id,createdAt:now,status:'running',cursor:'',processed:0,sent:0,failed:0,lockedUntil:0,doneAt:0});
   return {ok:true,campaignId:campaign.id,processed:0,sent:0,failed:0,status:'running'};
  }
  if(type==='broadcastStatus'){
   const campaignId=secureString(body.campaignId,100);
   if(!/^[A-Za-z0-9_-]{10,100}$/.test(campaignId))fail(400,'Invalid campaign');
   const campaign=await store.collection(C.broadcasts).doc(campaignId).get();
   if(!campaign.exists)fail(404,'Broadcast not found');
   return {ok:true,campaignId,...campaign.data()};
  }
  if(type==='broadcastStep'){
   if(role!=='owner')fail(403,'Only owners can send broadcasts');
   const campaignId=secureString(body.campaignId,100);
   if(!/^[A-Za-z0-9_-]{10,100}$/.test(campaignId))fail(400,'Invalid campaign');
   const campaignRef=store.collection(C.broadcasts).doc(campaignId);
   const lease=await store.runTransaction(async tx=>{
    const snap=await tx.get(campaignRef);
    if(!snap.exists)fail(404,'Broadcast not found');
    const c=snap.data();
    if(c.status==='completed')return {done:true,...c};
    if(c.lockedUntil>now)fail(409,'Another broadcast batch is in progress. Retry in 20 seconds.');
    tx.update(campaignRef,{lockedUntil:now+45000});
    return {done:false,...c};
   });
   if(lease.done)return {ok:true,status:'completed',processed:lease.processed,sent:lease.sent,failed:lease.failed,campaignId};
   let sent=0,failed=0,processed=0,cursor=lease.cursor||'',finished=false;
   try{
    let query=users.orderBy(admin.firestore.FieldPath.documentId()).limit(12);
    if(cursor)query=query.startAfter(cursor);
    const page=await query.get();
    for(const doc of page.docs){
     const userId=doc.id;
     cursor=userId;processed++;
     try{
      const response=await fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/sendMessage',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({chat_id:userId,text:'🦁 <b>AFGLION | MEMBERS CLUB</b>\n━━━━━━━━━━━━━━━━━━━━\n\n'+lease.message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'\n\n━━━━━━━━━━━━━━━━━━━━\n✦ <i>Official AFGLION announcement</i>',parse_mode:'HTML',disable_web_page_preview:true}),
       signal:AbortSignal.timeout(4500)
      });
      const answer=await response.json();
      if(answer.ok)sent++;else failed++;
     }catch(e){failed++;}
    }
    finished=page.size<12;
   }finally{
    await campaignRef.update({cursor,processed:admin.firestore.FieldValue.increment(processed),sent:admin.firestore.FieldValue.increment(sent),failed:admin.firestore.FieldValue.increment(failed),lockedUntil:0,status:finished?'completed':'running',...(finished?{doneAt:Date.now()}:{})});
   }
   return {ok:true,campaignId,status:finished?'completed':'running',processed:lease.processed+processed,sent:lease.sent+sent,failed:lease.failed+failed};
  }
  if(type==='testNotification'){
   const ss=settings(await settingRef.get()),channel=channelUrl(ss.notificationChannel);
   const chatId='@'+channel.split('/').pop();
   let payload;
   try{
    const response=await fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/sendMessage',{
     method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({chat_id:chatId,text:'🦁 <b>AFGLION · MEMBERS CLUB</b>\n━━━━━━━━━━━━━━━━\n🧪 <b>CHANNEL TEST</b>\n✅ Your payout notification channel is connected.\n💳 Approved deposits and withdrawals will appear here when notifications are enabled.\n━━━━━━━━━━━━━━━━\n✨ <i>Official AFGLION notifications</i>',parse_mode:'HTML',disable_web_page_preview:true}),
     signal:AbortSignal.timeout(9000)
    });
    payload=await response.json();
   }catch(e){fail(502,'Telegram connection error. Check your bot and network.');}
   if(!payload.ok)fail(502,'Telegram: '+secureString(payload.description||'Unable to post to channel',180));
   return {ok:true,channel,noticeSent:true};
  }
  if(type==='setupWelcomeWebhook'){
   if(role!=='owner')fail(403,'Only owners can activate the bot webhook');
   const base='https://velora-members-club.vercel.app';
   const secret=crypto.createHash('sha256').update('afglion-webhook-v1:'+process.env.TELEGRAM_BOT_TOKEN).digest('hex');
   let response,payload;
   try{
    response=await fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/setWebhook',{
     method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({url:base+'/api/telegram',secret_token:secret,allowed_updates:['message'],drop_pending_updates:false}),
     signal:AbortSignal.timeout(9000)
    });
    payload=await response.json();
   }catch(e){fail(502,'Could not connect to Telegram to set the welcome webhook');}
   if(!payload.ok)fail(502,'Telegram webhook failed: '+secureString(payload.description||'Unknown error',190));
   return {ok:true,webhookUrl:base+'/api/telegram',channel:'https://t.me/AFGlionpayouts'};
  }
  if(type==='checkWelcomeWebhook'){
   if(role!=='owner')fail(403,'Only owners can inspect the bot webhook');
   let result;
   try{
    const response=await fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/getWebhookInfo',{signal:AbortSignal.timeout(9000)});
    const resultJson=await response.json();
    if(!resultJson.ok)fail(502,'Telegram failed to read the bot webhook');
    result=resultJson.result;
   }catch(e){if(e.status)throw e;fail(502,'Telegram could not fetch webhook status');}
   return {ok:true,webhookUrl:result.url||'',pendingUpdates:result.pending_update_count||0,error:secureString(result.last_error_message,160),isAfglionWebhook:result.url==='https://velora-members-club.vercel.app/api/telegram'};
  }
  if(type==='retryNotification'){
   const noticeId=secureString(body.noticeId,100);
   if(!/^[A-Za-z0-9_-]{10,100}$/.test(noticeId))fail(400,'Invalid notification ID');
   return {ok:true,...await deliverNotice(store,noticeId)};
  }
  if(type==='reviewMoney'){
   const requestId=secureString(body.requestId,100),approve=body.approve;
   if(typeof approve!=='boolean'||!/^[A-Za-z0-9_-]{10,100}$/.test(requestId))fail(400,'Invalid payment review');
   const moneyRef=store.collection(C.money).doc(requestId);
   const record=await store.runTransaction(async tx=>{
    const r=await tx.get(moneyRef);
    if(!r.exists||r.data().status!=='pending')fail(409,'Transaction already reviewed');
    const item=r.data(),target=users.doc(item.userId);
    const [u,current]=await Promise.all([tx.get(target),tx.get(settingRef)]);
    if(!u.exists)fail(404,'Account not found');
    const amount=item.amount;
    if(!whole(amount,1,1000000)||!['deposit','withdraw'].includes(item.type))fail(400,'Invalid transaction record');
    const update={};
    if(item.type==='deposit'&&approve){
     update.balance=admin.firestore.FieldValue.increment(amount);
     update.totalDeposited=admin.firestore.FieldValue.increment(amount);
    }
    if(item.type==='withdraw'){
     update.pendingWithdraw=admin.firestore.FieldValue.increment(-amount);
     if(approve)update.totalWithdrawn=admin.firestore.FieldValue.increment(amount);
     else update.balance=admin.firestore.FieldValue.increment(amount);
    }
    tx.update(target,update);
    tx.update(moneyRef,{status:approve?'approved':'rejected',reviewedAt:now,reviewedBy:id});
    tx.set(target.collection('activity').doc(),{label:item.type+' '+(approve?'approved':'rejected'),amount:item.type==='deposit'&&approve?amount:item.type==='withdraw'&&!approve?amount:0,at:now});
    const rules=settings(current),channel=rules.notificationChannel;
    const notify=approve&&rules.notifyApprovals&&!!channel;
    if(notify){
     const noticeRef=store.collection(C.notices).doc(requestId);
     tx.set(noticeRef,{type:item.type,amount,userId:item.userId,channel,status:'pending',createdAt:now,attempts:0,reviewedBy:id,lastError:''});
    }
    return {ok:true,notificationQueued:notify};
   });
   if(!record.notificationQueued)return {...record,notificationSent:null};
   const delivery=await deliverNotice(store,requestId);
   return {...record,notificationSent:delivery.sent,notificationError:delivery.error||''};
  }

  fail(400,'Unknown administrator action');
 }
 fail(404,'API endpoint not found');
}
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(!['GET','POST'].includes(req.method))fail(405,'Unsupported HTTP method');
  if(req.method==='POST'&&JSON.stringify(req.body||{}).length>12000)fail(413,'Request too large');
  const output=await route(req);res.status(200).json(output);
 }catch(err){
  if(!err.status)console.error('AFGLION API error',err.message);
  res.status(err.status||500).json({error:err.status?err.message:'Internal server error'});
 }
};