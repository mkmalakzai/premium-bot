/**
 * VELORA Telegram Mini App API
 * Firebase Firestore is accessible ONLY here through the Admin SDK.
 * Never put service account credentials or the Telegram bot token in frontend files.
 */
const crypto = require('node:crypto');
const firebase = require('firebase-admin');

const DAY = 86400000;
const DEFAULTS = Object.freeze({
  appName: 'Velora',
  dailyBonus: 5,
  referralBonus: 10,
  announcement: 'Welcome to Velora. Your exclusive member experience starts here.',
  botUsername: ''
});

function failure(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function envReady() {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}
function db() {
  if (!envReady()) failure(503, 'Firebase / Telegram backend is not configured');
  if (!firebase.apps.length) {
    let serviceAccount;
    try { serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON); }
    catch (_) { failure(503, 'Invalid Firebase service account configuration'); }
    if (serviceAccount.private_key) serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    firebase.initializeApp({credential:firebase.credential.cert(serviceAccount)});
  }
  return firebase.firestore();
}
function admins() {
  return new Set((process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(x=>x.trim()).filter(Boolean));
}
function base64url(input) {
  return Buffer.from(input).toString('base64url');
}
function signKey() {
  return crypto.createHash('sha256').update('velora-session-v1:'+process.env.TELEGRAM_BOT_TOKEN).digest();
}
function signSession(id) {
  const header = base64url(JSON.stringify({alg:'HS256',typ:'JWT'}));
  const payload = base64url(JSON.stringify({sub:id,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+7*86400}));
  const part = header+'.'+payload;
  const sig = crypto.createHmac('sha256',signKey()).update(part).digest('base64url');
  return part+'.'+sig;
}
function verifySession(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) failure(401, 'Sign in using Telegram');
  const parts = auth.slice(7).split('.');
  if (parts.length!==3 || parts.some(x=>!x)) failure(401, 'Invalid session');
  const calculated = crypto.createHmac('sha256',signKey()).update(parts[0]+'.'+parts[1]).digest();
  let provided; try {provided=Buffer.from(parts[2],'base64url');}catch(_) {failure(401,'Invalid session');}
  if (provided.length!==calculated.length || !crypto.timingSafeEqual(provided,calculated)) failure(401,'Invalid session');
  let header, body;
  try {
    header=JSON.parse(Buffer.from(parts[0],'base64url').toString());
    body=JSON.parse(Buffer.from(parts[1],'base64url').toString());
  }catch(_) {failure(401,'Invalid session');}
  if (header.alg!=='HS256' || !/^\d{3,20}$/.test(String(body.sub||'')) || !Number.isFinite(body.exp) || Date.now()/1000>body.exp) failure(401,'Session expired');
  return String(body.sub);
}
function verifyTelegram(initData) {
  if (typeof initData!=='string' || initData.length>10000 || !initData) failure(401,'Open this app from your Telegram bot');
  const params=new URLSearchParams(initData);
  const seen=new Set();
  for (const [key] of params.entries()) {
    if (seen.has(key)) failure(401,'Invalid Telegram data');
    seen.add(key);
  }
  const received=params.get('hash');
  const date=Number(params.get('auth_date'));
  if (!received || !/^[0-9a-f]{64}$/i.test(received) || !Number.isFinite(date) || Math.abs(Date.now()/1000-date)>600) failure(401,'Telegram authentication expired: reopen from bot');
  const dataCheck = [...params.entries()].filter(([k])=>k!=='hash').sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(process.env.TELEGRAM_BOT_TOKEN).digest();
  const expected=crypto.createHmac('sha256',secret).update(dataCheck).digest();
  const incoming=Buffer.from(received,'hex');
  if (incoming.length!==expected.length || !crypto.timingSafeEqual(incoming,expected)) failure(401,'Telegram verification failed');
  let telegramUser;
  try {telegramUser=JSON.parse(params.get('user')||'{}');}catch(_) {failure(401,'Telegram user missing');}
  if (!Number.isSafeInteger(telegramUser.id) || telegramUser.id<=0) failure(401,'Telegram user invalid');
  return {id:String(telegramUser.id), telegramUser, startParam:params.get('start_param')||''};
}
function publicUser(obj,id) {
  const normalized={...obj,id:String(id)};
  if (normalized.vipUntil && normalized.vipUntil<Date.now()) {
    normalized.vipTier='free';normalized.vipUntil=0;
  }
  normalized.isAdmin=admins().has(String(id));
  return normalized;
}
function settingsDoc(snapshot) {return {...DEFAULTS,...(snapshot.exists?snapshot.data():{})};}
function valueInt(v,max) {return Number.isInteger(v) && v>=0 && v<=max;}
async function signedIn(req) {
  const id=verifySession(req);
  const ref=db().collection('users').doc(id);
  const snap=await ref.get();
  if (!snap.exists) failure(401,'Account not found');
  if (snap.data().banned) failure(403,'Account access restricted');
  return {id,ref,snap};
}
function asText(x,max) {return typeof x==='string'?x.trim().slice(0,max):'';}
async function route(req) {
  const action=String(req.query.action||'');
  if (action==='health') return {ok:true,backendConfigured:envReady()};
  if (!envReady()) failure(503,'Backend not configured. Set Telegram and Firebase credentials on Vercel.');
  const store=db(), users=store.collection('users'),settingsRef=store.collection('settings').doc('global');
  const body=req.body||{};
  if(action==='auth') {
    if(req.method!=='POST') failure(405,'POST required');
    const validated=verifyTelegram(body.initData);
    const id=validated.id;
    const tele=validated.telegramUser;
    const userRef=users.doc(id);
    const settingsSnapshot=await settingsRef.get();
    const settings=settingsDoc(settingsSnapshot);
    const match=/^ref_(\d{3,20})$/.exec(validated.startParam);
    const referrerId=match?match[1]:null;
    await store.runTransaction(async tx=>{
      const existing=await tx.get(userRef);
      if(existing.exists) return;
      let referrerRef=null,parentSnap=null;
      if(referrerId && referrerId!==id) {
        referrerRef=users.doc(referrerId);
        parentSnap=await tx.get(referrerRef);
      }
      const reward=Number.isInteger(settings.referralBonus)?settings.referralBonus:DEFAULTS.referralBonus;
      const eligible=parentSnap&&parentSnap.exists&&!parentSnap.data().banned;
      const now=Date.now();
      const username=asText(tele.username,32);
      const name=asText([tele.first_name,tele.last_name].filter(Boolean).join(' '),48)||'Member';
      tx.set(userRef,{
        telegramId:id, name,firstName:asText(tele.first_name,64),username,
        photoUrl: typeof tele.photo_url==='string'&&/^https:\/\//.test(tele.photo_url)?tele.photo_url.slice(0,800):'',
        referrerId:eligible?referrerId:null,
        balance:0,totalEarned:0,referralCount:0,referralEarned:0,
        vipTier:'free',vipUntil:0,lastClaimAt:0,claimStreak:0,joinedAt:now,banned:false
      });
      if(eligible) {
        tx.update(referrerRef,{
          balance:firebase.firestore.FieldValue.increment(reward),
          totalEarned:firebase.firestore.FieldValue.increment(reward),
          referralCount:firebase.firestore.FieldValue.increment(1),
          referralEarned:firebase.firestore.FieldValue.increment(reward)
        });
        tx.set(store.collection('referralEvents').doc(id),{referrerId,refereeId:id,bonus:reward,createdAt:now});
        tx.set(referrerRef.collection('activity').doc('ref_'+id),{label:'Referral reward',amount:reward,at:now});
      }
    });
    const existing=await userRef.get();
    if(existing.data().banned) failure(403,'Account restricted');
    return {token:signSession(id)};
  }
  const {id,ref,snap}=await signedIn(req);
  if(action==='me') {
    const [settingSnap,refSnap,requestSnap,actSnap] = await Promise.all([
      settingsRef.get(),
      users.where('referrerId','==',id).limit(100).get(),
      store.collection('vipRequests').doc(id).get(),
      ref.collection('activity').orderBy('at','desc').limit(30).get()
    ]);
    const refs=refSnap.docs.map(d=>({id:d.id,name:d.data().name||'Member',photoUrl:d.data().photoUrl||'',joinedAt:d.data().joinedAt||0,bonus:settingsDoc(settingSnap).referralBonus})).sort((a,b)=>b.joinedAt-a.joinedAt);
    return {user:publicUser(snap.data(),id),settings:settingsDoc(settingSnap),referrals:refs,vipRequest:requestSnap.exists?requestSnap.data():null,activity:actSnap.docs.map(d=>d.data())};
  }
  if(action==='claim') {
    if(req.method!=='POST') failure(405,'POST required');
    const now=Date.now();
    const result=await store.runTransaction(async tx=>{
      const [u,s]=await Promise.all([tx.get(ref),tx.get(settingsRef)]);
      if(!u.exists || u.data().banned) failure(403,'Account restricted');
      const last=u.data().lastClaimAt||0;
      if(now-last<DAY) failure(429,'Daily bonus already claimed. Try again tomorrow.');
      const bonus=settingsDoc(s).dailyBonus;
      if(!valueInt(bonus,10000)) failure(500,'Invalid daily reward configuration');
      const streak=now-last<DAY*2?(u.data().claimStreak||0)+1:1;
      tx.update(ref,{balance:firebase.firestore.FieldValue.increment(bonus),totalEarned:firebase.firestore.FieldValue.increment(bonus),lastClaimAt:now,claimStreak:streak});
      tx.set(ref.collection('activity').doc('daily_'+now),{label:'Daily check-in',amount:bonus,at:now});
      return {bonus,streak};
    });
    return {ok:true,...result};
  }
  if(action==='profileUpdate') {
    if(req.method!=='POST') failure(405,'POST required');
    const name=asText(body.name,48);
    if(name.length<2) failure(400,'Display name must be 2 to 48 characters');
    await ref.update({name});return {ok:true};
  }
  if(action==='vipRequest') {
    if(req.method!=='POST') failure(405,'POST required');
    const tier=String(body.tier||'');
    if(!['gold','elite'].includes(tier)) failure(400,'Invalid VIP tier');
    const requestRef=store.collection('vipRequests').doc(id);
    await store.runTransaction(async tx=>{
      const [u,r]=await Promise.all([tx.get(ref),tx.get(requestRef)]);
      if(!u.exists || u.data().banned) failure(403,'Account restricted');
      if(u.data().vipTier===tier && (u.data().vipUntil||0)>Date.now()) failure(409,'Your membership is already active');
      if(r.exists&&r.data().status==='pending') failure(409,'A VIP request is already pending');
      tx.set(requestRef,{userId:id,name:u.data().name,tier,status:'pending',createdAt:Date.now(),reviewedAt:null});
    });
    return {ok:true};
  }
  if(!admins().has(id)) failure(403,'Administrator access required');
  if(action==='adminData') {
    const [us,rs,ss,total]=await Promise.all([
      users.orderBy('joinedAt','desc').limit(500).get(),
      store.collection('vipRequests').where('status','==','pending').limit(200).get(),
      settingsRef.get(),
      users.count().get()
    ]);
    const members=us.docs.map(d=>({...d.data(),id:d.id}));
    return {users:members,requests:rs.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>a.createdAt-b.createdAt),
      settings:settingsDoc(ss),stats:{members:total.data().count,vip:members.filter(u=>u.vipTier!=='free'&&u.vipUntil>Date.now()).length,pending:rs.size,points:members.reduce((s,u)=>s+(u.balance||0),0)},sampled:members.length<total.data().count};
  }
  if(action==='adminAction') {
    if(req.method!=='POST') failure(405,'POST required');
    const type=String(body.type||'');
    if(type==='saveSettings') {
      const announcement=asText(body.announcement,350);
      if(!valueInt(body.dailyBonus,10000)||!valueInt(body.referralBonus,10000)) failure(400,'Rewards must be whole numbers from 0 to 10000');
      const botUsername=asText(body.botUsername,32).replace(/^@/,'');
      if(botUsername&&!/^[A-Za-z0-9_]{5,32}$/.test(botUsername)) failure(400,'Invalid Telegram bot username');
      await settingsRef.set({appName:'Velora',announcement,dailyBonus:body.dailyBonus,referralBonus:body.referralBonus,botUsername},{merge:true});
      return {ok:true};
    }
    if(type==='updateUser') {
      const targetId=String(body.userId||'');
      if(!/^\d{3,20}$/.test(targetId)) failure(400,'Invalid user ID');
      if(!['free','gold','elite'].includes(body.tier)) failure(400,'Invalid tier');
      if(!valueInt(body.addPoints,100000)) failure(400,'Invalid points amount');
      if(typeof body.banned!=='boolean') failure(400,'Invalid status');
      if(admins().has(targetId)&&body.banned) failure(400,'Cannot ban an administrator');
      const userRef=users.doc(targetId);
      await store.runTransaction(async tx=>{
        const doc=await tx.get(userRef);
        if(!doc.exists) failure(404,'User not found');
        const update={banned:body.banned};
        if(body.tier!==doc.data().vipTier || (body.tier!=='free'&&(doc.data().vipUntil||0)<Date.now())){
          update.vipTier=body.tier;
          update.vipUntil=body.tier==='free'?0:Date.now()+30*DAY;
        }
        if(body.addPoints>0){update.balance=firebase.firestore.FieldValue.increment(body.addPoints);update.totalEarned=firebase.firestore.FieldValue.increment(body.addPoints);
          tx.set(userRef.collection('activity').doc(),{label:'Admin points credit',amount:body.addPoints,at:Date.now()});}
        tx.update(userRef,update);
      });
      return {ok:true};
    }
    if(type==='approveVip'||type==='rejectVip') {
      const requestId=String(body.requestId||'');
      if(!/^\d{3,20}$/.test(requestId)) failure(400,'Invalid request');
      const requestRef=store.collection('vipRequests').doc(requestId), target=users.doc(requestId);
      await store.runTransaction(async tx=>{
        const [r,u]=await Promise.all([tx.get(requestRef),tx.get(target)]);
        if(!r.exists||r.data().status!=='pending') failure(409,'Request is no longer pending');
        if(!u.exists) failure(404,'User not found');
        const now=Date.now();
        if(type==='approveVip'){
          if(!['gold','elite'].includes(r.data().tier)) failure(400,'Invalid VIP tier');
          tx.update(target,{vipTier:r.data().tier,vipUntil:now+30*DAY});
          tx.set(target.collection('activity').doc(),{label:r.data().tier.toUpperCase()+' VIP activated',amount:0,at:now});
        }
        tx.update(requestRef,{status:type==='approveVip'?'approved':'rejected',reviewedAt:now,reviewedBy:id});
      });
      return {ok:true};
    }
    failure(400,'Unknown admin action');
  }
  failure(404,'Unknown API action');
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try {
    if(!['GET','POST'].includes(req.method)) failure(405,'Unsupported request method');
    const result=await route(req);
    res.status(200).json(result);
  }catch(error){
    if(!error.status)console.error('API failure',error.message);
    res.status(error.status||500).json({error:error.status?error.message:'An internal error occurred'});
  }
};