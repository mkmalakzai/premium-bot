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
 money:'veloraMoneyRequests', awards:'veloraReferralAwards'
};
const DEFAULTS = {
 appName:'AFGLION', botUsername:'Afglionbot',
 announcement:'Welcome to AFGLION. Deposit and withdrawal requests are reviewed manually.',
 dailyBonus:0, dailyEnabled:false, referralPercent:10, minDeposit:50, minWithdraw:100,
 forceJoinEnabled:true,forceJoinChannel:'https://t.me/geminipromtshub',homeChannelUrl:'https://t.me/geminipromtshub',
 depositNumber:'',depositContact:'Mk_Malakzai',
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
function numericId(x){return /^\d{3,20}$/.test(String(x||''));}
function whole(x,min,max){return typeof x==='number'&&Number.isSafeInteger(x)&&x>=min&&x<=max;}
function checkAmount(x,min,max){if(!whole(x,min,max))fail(400,'Invalid AFN amount');return x;}
function settings(s){
 const data=s&&s.exists?s.data():{};
 const plans={...DEFAULTS.plans,...(data.plans||{})};
 const vipPackages=data.vipPackages===undefined?plans:data.vipPackages;
 return {...DEFAULTS,...data,plans,vipPackages};
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
async function memberStatus(id,config){
 const url=channelUrl(config.forceJoinChannel);
 if(!config.forceJoinEnabled||isAdmin(id))return {joined:true,url};
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
function visibleUser(value,id){
 const user={...value,id:String(id),isAdmin:admins().has(String(id))};
 if((user.vipUntil||0)+DAY<Date.now()){user.vipTier='free';}
 return user;
}
async function signedIn(req,store){
 const id=verifySession(req),ref=store.collection(C.users).doc(id),snap=await ref.get();
 if(!snap.exists)fail(401,'User not found');
 if(snap.data().banned)fail(403,'Account restricted');
 return {id,ref,snap};
}
function planFor(s,tier){const p=s.vipPackages[tier];if(!p||p.enabled===false||!whole(p.price,1,1000000)||!whole(p.dailyReward,0,100000)||!whole(p.days,1,365))fail(400,'VIP package is unavailable');return p;}
function isAdmin(id){return admins().has(id);}
async function route(req){
 const action=String(req.query.action||'');
 if(action==='health')return {ok:true,backendConfigured:ready(),expectedFirebaseProject:'afglion-47b07'};
 if(!ready())fail(503,'Backend not configured. Add TELEGRAM_BOT_TOKEN and FIREBASE_SERVICE_ACCOUNT_JSON on Vercel.');
 const store=db(),users=store.collection(C.users),settingRef=store.collection(C.settings).doc('global');
 const body=req.body||{};
 if(action==='auth'){
  if(req.method!=='POST')fail(405,'POST required');
  const tele=telegramIdentity(body.initData),id=tele.id,userRef=users.doc(id);
  const st=settings(await settingRef.get());
  const membership=await memberStatus(id,st);
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
 const {id,ref}=await signedIn(req,store);
 const currentSettings=settings(await settingRef.get());
 const membership=await memberStatus(id,currentSettings);
 if(action==='joinStatus')return {joined:membership.joined,joinRequired:!membership.joined,joinUrl:membership.url,joinIssue:membership.issue};
 if(!membership.joined){
  if(action==='me')return {joinRequired:true,joinUrl:membership.url,joinIssue:membership.issue};
  fail(403,'Join the required Telegram channel to continue');
 }
 if(action==='me'){
  const [u,s,r,v,m,a]=await Promise.all([
   ref.get(),settingRef.get(),users.where('referrerId','==',id).limit(100).get(),
   store.collection(C.requests).doc(id).get(),
   store.collection(C.money).where('userId','==',id).limit(80).get(),
   ref.collection('activity').orderBy('at','desc').limit(30).get()
  ]);
  const ss=settings(s);
  return {user:visibleUser(u.data(),id),settings:ss,
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
  const amount=checkAmount(body.amount,1,1000000),method=secureString(body.method,70),
   details=secureString(body.details,300);
  if(method.length<2||details.length<5)fail(400,'Provide payment method and reference/recipient details');
  const reqRef=store.collection(C.money).doc(),now=Date.now();
  return await store.runTransaction(async tx=>{
   const [u,s]=await Promise.all([tx.get(ref),tx.get(settingRef)]);
   if(!u.exists||u.data().banned)fail(403,'Account restricted');
   const setting=settings(s);
   if(amount<(type==='deposit'?setting.minDeposit:setting.minWithdraw))fail(400,'Amount is below the current minimum');
   if(type==='deposit'&&!setting.depositNumber)fail(503,'Deposit number is not configured by admin');
   if(type==='withdraw'&&(u.data().balance||0)<amount)fail(409,'Insufficient available AFN balance');
   if(type==='withdraw')tx.update(ref,{balance:admin.firestore.FieldValue.increment(-amount),pendingWithdraw:admin.firestore.FieldValue.increment(amount)});
   tx.set(reqRef,{userId:id,name:u.data().name||'Member',type,amount,method,details,status:'pending',createdAt:now,reviewedAt:0});
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
 if(action==='vipRequest'){
  if(req.method!=='POST')fail(405,'POST required');
  const tier=String(body.tier||''),requestRef=store.collection(C.requests).doc(id);
  if(!/^[a-z0-9_-]{2,32}$/.test(tier))fail(400,'Invalid VIP package');
  return await store.runTransaction(async tx=>{
   const [u,r,s]=await Promise.all([tx.get(ref),tx.get(requestRef),tx.get(settingRef)]);
   if(!u.exists||u.data().banned)fail(403,'Account restricted');
   const p=planFor(settings(s),tier),now=Date.now();
   if((u.data().balance||0)<p.price)fail(409,'Insufficient balance. Deposit AFN and wait for admin approval first.');
   if(r.exists&&r.data().status==='pending')fail(409,'VIP request already pending');
   if(u.data().vipTier===tier&&(u.data().vipUntil||0)>now)fail(409,'This VIP plan is already active');
   tx.set(requestRef,{userId:id,name:u.data().name||'Member',tier,planSnapshot:p,price:p.price,status:'pending',createdAt:now,reviewedAt:0});
   return {ok:true};
  });
 }
 if(!isAdmin(id))fail(403,'Administrator access required');
 if(action==='adminData'){
  const [us,rs,m,ss,total]=await Promise.all([
   users.orderBy('joinedAt','desc').limit(500).get(),store.collection(C.requests).where('status','==','pending').limit(200).get(),
   store.collection(C.money).where('status','==','pending').limit(200).get(),settingRef.get(),users.count().get()
  ]);
  const members=us.docs.map(d=>({...d.data(),id:d.id})), moneyRequests=m.docs.map(d=>({...d.data(),id:d.id})).sort((x,y)=>x.createdAt-y.createdAt);
  return {users:members,requests:rs.docs.map(d=>({...d.data(),id:d.id})).sort((x,y)=>x.createdAt-y.createdAt),moneyRequests,settings:settings(ss),
   stats:{members:total.data().count,vip:members.filter(u=>u.vipUntil>Date.now()).length,pending:rs.size+moneyRequests.length,points:members.reduce((sum,u)=>sum+(u.balance||0),0)},sampled:members.length<total.data().count};
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
   if(typeof body.dailyEnabled!=='boolean'||typeof body.forceJoinEnabled!=='boolean')fail(400,'Invalid reward or force-join settings');
   await settingRef.set({appName:'AFGLION',botUsername,announcement,dailyBonus,dailyEnabled:body.dailyEnabled,
    referralPercent,minDeposit,minWithdraw,forceJoinChannel,forceJoinEnabled:body.forceJoinEnabled,
    homeChannelUrl,depositNumber,depositContact,
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
  if(type==='updateUser'){
   const targetId=String(body.userId||'');
   if(!numericId(targetId)||!(body.tier==='free'||/^[a-z0-9_-]{2,32}$/.test(body.tier))||!whole(body.addPoints,0,100000)||typeof body.banned!=='boolean')fail(400,'Invalid member changes');
   if(isAdmin(targetId)&&body.banned)fail(400,'Cannot ban an administrator');
   const userRef=users.doc(targetId);
   await store.runTransaction(async tx=>{
    const u=await tx.get(userRef);
    if(!u.exists)fail(404,'Member not found');
    const update={banned:body.banned};
    if(u.data().vipTier!==body.tier||(body.tier!=='free'&&(u.data().vipUntil||0)<now)){
     const p=body.tier==='free'?null:planFor(settings(await tx.get(settingRef)),body.tier);
     update.vipTier=body.tier;update.vipActivatedAt=p?now:0;
     update.vipUntil=p?now+p.days*DAY:0;update.vipPlanSnapshot=p||null;update.vipLastClaimSlot=0;update.vipDaysClaimed=0;
    }
    if(body.addPoints>0){
     update.balance=admin.firestore.FieldValue.increment(body.addPoints);
     tx.set(userRef.collection('activity').doc(),{label:'Admin credit',amount:body.addPoints,at:now});
    }
    tx.update(userRef,update);
   });return {ok:true};
  }
  if(type==='approveVip'||type==='rejectVip'){
   const requestId=String(body.requestId||'');
   if(!numericId(requestId))fail(400,'Invalid VIP request');
   const requestRef=store.collection(C.requests).doc(requestId),target=users.doc(requestId);
   return await store.runTransaction(async tx=>{
    const [r,u,s]=await Promise.all([tx.get(requestRef),tx.get(target),tx.get(settingRef)]);
    if(!r.exists||r.data().status!=='pending')fail(409,'Request already reviewed');
    if(!u.exists||u.data().banned)fail(403,'Member unavailable');
    if(type==='rejectVip'){
     tx.update(requestRef,{status:'rejected',reviewedAt:now,reviewedBy:id});return {ok:true};
    }
    const p=r.data().planSnapshot||planFor(settings(s),r.data().tier),charge=r.data().price;
    if(!whole(charge,1,1000000)||(u.data().balance||0)<charge)fail(409,'Insufficient member balance');
    const parentId=u.data().referrerId;
    const parentRef=parentId?users.doc(parentId):null,parent=parentRef?await tx.get(parentRef):null;
    tx.update(target,{balance:admin.firestore.FieldValue.increment(-charge),vipTier:r.data().tier,
     vipActivatedAt:now,vipUntil:now+p.days*DAY,vipPlanSnapshot:p,vipDaysClaimed:0,vipLastClaimSlot:0});
    tx.update(requestRef,{status:'approved',reviewedAt:now,reviewedBy:id,chargedAmount:charge});
    tx.set(target.collection('activity').doc(),{label:r.data().tier.toUpperCase()+' VIP purchase',amount:-charge,at:now});
    const pct=settings(s).referralPercent||0,award=Math.floor(charge*pct/100);
    if(parent&&parent.exists&&!parent.data().banned&&award>0){
     tx.update(parentRef,{balance:admin.firestore.FieldValue.increment(award),totalEarned:admin.firestore.FieldValue.increment(award),
       referralEarned:admin.firestore.FieldValue.increment(award)});
     tx.set(parentRef.collection('activity').doc(),{label:'VIP referral commission',amount:award,at:now});
     tx.set(store.collection(C.awards).doc(),{parentId,memberId:requestId,vipTier:r.data().tier,amount:award,percent:pct,at:now});
    }
    return {ok:true,chargedAmount:charge,referralAward:award};
   });
  }
  if(type==='reviewMoney'){
   const requestId=secureString(body.requestId,100),approve=body.approve;
   if(typeof approve!=='boolean'||!requestId)fail(400,'Invalid review request');
   const moneyRef=store.collection(C.money).doc(requestId);
   return await store.runTransaction(async tx=>{
    const r=await tx.get(moneyRef);
    if(!r.exists||r.data().status!=='pending')fail(409,'Transaction already reviewed');
    const item=r.data(),target=users.doc(item.userId),u=await tx.get(target);
    if(!u.exists)fail(404,'Account not found');
    const amount=item.amount;
    if(!whole(amount,1,1000000))fail(400,'Invalid stored amount');
    const update={};
    if(item.type==='deposit'&&approve){update.balance=admin.firestore.FieldValue.increment(amount);update.totalDeposited=admin.firestore.FieldValue.increment(amount);}
    if(item.type==='withdraw'){
     update.pendingWithdraw=admin.firestore.FieldValue.increment(-amount);
     if(approve)update.totalWithdrawn=admin.firestore.FieldValue.increment(amount);
     else update.balance=admin.firestore.FieldValue.increment(amount);
    }
    tx.update(target,update);
    tx.update(moneyRef,{status:approve?'approved':'rejected',reviewedAt:now,reviewedBy:id});
    tx.set(target.collection('activity').doc(),{label:item.type+' '+(approve?'approved':'rejected'),amount:item.type==='deposit'&&approve?amount:item.type==='withdraw'&&!approve?amount:0,at:now});
    return {ok:true};
   });
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