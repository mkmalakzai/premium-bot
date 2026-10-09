
(function () {
"use strict";
var tg = window.Telegram && window.Telegram.WebApp;
var icons = {
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 crown:'<path d="m2 8 5 4 5-8 5 8 5-4-2 12H4L2 8z"/><path d="M5 17h14"/>',
 profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 arrow:'<path d="m9 18 6-6-6-6"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 gift:'<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M12 9c-3-6-9-5-7-1 1 2 7 1 7 1zm0 0c3-6 9-5 7-1-1 2-7 1-7 1z"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.6 6.6-4.2m-6.6 7 6.6 4.1"/>',
 copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/>',
 shield:'<path d="m12 22 7-4V6l-7-4-7 4v12z"/><path d="m9 12 2 2 4-4"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
 wallet:'<rect x="2" y="5" width="20" height="15" rx="3"/><path d="M2 9h20M16 15h3"/>',
 settings:'<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M20 12a8 8 0 0 0-.2-1.8l2-1.4-2-3.4-2.3 1a8 8 0 0 0-3.1-1.8L14 2h-4l-.4 2.6a8 8 0 0 0-3.1 1.8l-2.3-1-2 3.4 2 1.4A8 8 0 0 0 4 12c0 .6.1 1.2.2 1.8l-2 1.4 2 3.4 2.3-1a8 8 0 0 0 3.1 1.8L10 22h4l.4-2.6a8 8 0 0 0 3.1-1.8l2.3 1 2-3.4-2-1.4c.1-.6.2-1.2.2-1.8z"/>',
 logout:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>',
 star:'<path d="m12 2 3.1 6.4L22 9.4l-5 4.9 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5-4.9 6.9-1z"/>',
 edit:'<path d="M12 20h9M4 16.5l11-11 4 4-11 11H4v-4zM16 4.5l4 4"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 refresh:'<path d="M21 11a9 9 0 0 0-16-5L2 9m0-6v6h6M3 13a9 9 0 0 0 16 5l3-3m0 6v-6h-6"/>',
 bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
 external:'<path d="M14 3h7v7M21 3l-10 10"/><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/>'
};
function icon(n){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[n]||icons.spark)+'</svg>';}
function esc(s){return String(s == null ? '' : s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function n(v){return Number(v||0).toLocaleString('en-US',{maximumFractionDigits:0});}
function fmtDate(ms){return ms ? new Date(ms).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—';}
function avatar(user,cls){var name=(user.name||user.firstName||'G').trim();return '<div class="'+(cls||'user-avatar')+'">'+(user.photoUrl ? '<img src="'+esc(user.photoUrl)+'" alt="">' : esc(name.charAt(0).toUpperCase()))+'</div>';}
var state={theme:(function(){try{return localStorage.getItem('afglion_theme')==='light'?'light':'dark';}catch(_){return 'dark';}})(),adminNavOpen:false,gate:null,page:'home',data:null,token:sessionStorage.getItem('afglion_session')||'',demo:!tg || !tg.initData,loading:false,admin:null,adminTab:'overview',configMissing:false};
var demoUser={id:'000000000',name:'Guest Member',username:'',photoUrl:'',balance:0,totalEarned:0,totalDeposited:0,totalWithdrawn:0,pendingWithdraw:0,vipActivatedAt:0,vipDaysClaimed:0,vipLastClaimSlot:0,referralCount:0,referralEarned:0,vipTier:'free',vipUntil:0,joinedAt:Date.now(),claimStreak:0,lastClaimAt:0,isAdmin:false};
var demoData={user:demoUser,referrals:[],transactions:[],settings:{appName:'AFGLION',dailyBonus:0,dailyEnabled:false,referralPercent:10,forceJoinChannel:'https://t.me/geminipromtshub',homeChannelUrl:'https://t.me/geminipromtshub',depositNumber:'',depositContact:'Mk_Malakzai',minDeposit:50,minWithdraw:100,botUsername:'Afglionbot',announcement:'Welcome to AFGLION.',depositInstructions:'Deposit requests are reviewed manually.',payoutInstructions:'Withdrawals are reviewed manually.',plans:{gold:{name:'Gold VIP',price:500,dailyReward:50,days:30},elite:{name:'Elite VIP',price:1000,dailyReward:110,days:30}}},vipRequest:null,activity:[]};
var root=document.getElementById('app');
function toast(message){var el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(function(){el.classList.remove('show');},2900);try{tg&&tg.HapticFeedback&&tg.HapticFeedback.notificationOccurred('success');}catch(e){}}
function user(){return (state.data||demoData).user;}
function data(){return state.data||demoData;}
function goldTitle(title,desc){return '<div class="page-intro"><div class="eyebrow">AFGLION EXCLUSIVE</div><h1 class="page-title">'+title+'</h1><p class="body-sub">'+desc+'</p></div>';}
function section(t,action,label){return '<div class="section-head"><h2>'+t+'</h2>'+(action?'<button class="text-button" data-action="'+action+'">'+(label||'View all')+icon('arrow')+'</button>':'')+'</div>';}

function logoMark(extraClass){return '<span class="brand-logo-frame '+(extraClass||'')+'"><img src="/afglion-logo.svg" width="46" height="46" alt="AFGLION lion logo" loading="eager"></span>';}
var splashStarted=Date.now(),splashProgress=8,splashInterval=null,splashWatchdog=null,splashFinished=false;
function splashElements(){return {loader:document.getElementById('afg-loader'),fill:document.getElementById('afg-loading-fill'),percent:document.getElementById('afg-loading-percent'),status:document.getElementById('afg-loading-status')};}
function splashStage(label,target){
 var elements=splashElements();
 if(label&&elements.status)elements.status.textContent=label;
 if(typeof target==='number')splashProgress=Math.max(splashProgress,Math.min(target,92));
 if(elements.fill)elements.fill.style.width=splashProgress+'%';
 if(elements.percent)elements.percent.textContent=Math.round(splashProgress)+'%';
}
function startSplash(){
 splashStarted=Date.now();splashFinished=false;
 splashStage('Preparing your experience',8);
 splashInterval=setInterval(function(){
  if(splashFinished)return;
  if(splashProgress<86){splashProgress+=splashProgress<42?3:splashProgress<70?1.4:.4;splashStage('',splashProgress);}
 },160);
 splashWatchdog=setTimeout(function(){finishSplash();},14000);
}
function finishSplash(){
 if(splashFinished)return;
 splashFinished=true;
 clearInterval(splashInterval);clearTimeout(splashWatchdog);
 var elements=splashElements();
 if(elements.status)elements.status.textContent='Ready to explore';
 if(elements.percent)elements.percent.textContent='100%';
 if(elements.fill)elements.fill.style.width='100%';
 var delay=Math.max(180,1530-(Date.now()-splashStarted));
 setTimeout(function(){
  if(!elements.loader)return;
  elements.loader.classList.add('afg-loader-hide');
  elements.loader.setAttribute('aria-hidden','true');
  setTimeout(function(){if(elements.loader&&elements.loader.parentNode)elements.loader.parentNode.removeChild(elements.loader);},550);
 },delay);
}

function header(){var u=user(),picture='<span class="profile-header-fallback">'+esc((u.name||'A').charAt(0).toUpperCase())+'</span>'+(u.photoUrl?'<img class="profile-header-image" src="'+esc(u.photoUrl)+'" alt="Profile image" loading="lazy" onerror="this.remove()">':'');return '<header class="topbar"><div class="brand-wrap">'+logoMark()+'<div><div class="brand-name">AFGLION</div><div class="brand-kicker">MEMBERS CLUB</div></div></div><div class="header-tools"><button class="round-button" data-action="notification" aria-label="Notifications">'+icon('bell')+'</button><button class="avatar-button" data-page="profile" aria-label="Open profile">'+picture+'</button></div></header>';}
function nav(){return '<nav class="bottom-nav" aria-label="Main navigation">'+[
 ['home','home','Home'],['vip','crown','VIP'],['referral','users','Referral'],['profile','profile','Profile']
].map(function(v){return '<button class="nav-item '+(state.page===v[0]?'active':'')+'" data-page="'+v[0]+'" aria-label="'+v[2]+'">'+icon(v[1])+'<span>'+v[2]+'</span></button>';}).join('')+'</nav>';}

function currency(v){return n(v)+' AFN';}
function vipName(u){u=u||user();if(!u.vipTier||u.vipTier==='free')return 'Free';var p=u.vipPlanSnapshot||((data().settings.vipPackages||data().settings.plans||{})[u.vipTier]);if(p&&p.name)return p.name;return /^vip_/.test(u.vipTier)?'VIP Member':u.vipTier.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});}
function setTheme(){document.documentElement.setAttribute('data-theme',state.theme);try{if(tg){tg.setHeaderColor(state.theme==='light'?'#f2f4f8':'#090c12');tg.setBackgroundColor(state.theme==='light'?'#f2f4f8':'#090c12');}}catch(e){}}
function toggleTheme(){state.theme=state.theme==='dark'?'light':'dark';try{localStorage.setItem('afglion_theme',state.theme);}catch(e){}setTheme();render();toast(state.theme==='light'?'Light mode on':'Dark mode on');}
function activePlan(){var u=user(),p=u.vipPlanSnapshot||(data().settings.vipPackages||data().settings.plans||{})[u.vipTier];return p&&u.vipUntil>Date.now()-86400000?p:null;}
function vipSlot(){var u=user(),p=activePlan();return p&&u.vipActivatedAt?Math.min(p.days,Math.floor((Date.now()-u.vipActivatedAt)/86400000)):0;}
function vipCanClaim(){var u=user(),p=activePlan(),slot=vipSlot();return !!(p&&slot>=1&&slot>(u.vipLastClaimSlot||0)&&(u.vipDaysClaimed||0)<p.days&&Date.now()<=u.vipUntil+86400000);}
function hero(){var u=user();return '<div class="hero"><div class="hero-label">AVAILABLE BALANCE</div><div class="hero-amount">'+n(u.balance)+' <span class="hero-unit">AFN</span></div><div style="font-size:11px;opacity:.78;font-weight:700">Your secure in-app wallet</div><div class="hero-foot"><div class="hero-tag"><span></span> MANUAL PAYMENTS</div><div class="hero-stamp">'+esc(vipName(u).toUpperCase())+' MEMBER</div></div></div>';}
function earningsCard(){var u=user(),s=data().settings,p=activePlan();return '<div class="earning-card"><div class="earning-top"><div><span class="eyebrow">VIP EARNINGS</span><h3>'+(p?currency(p.dailyReward)+' / day':'Activate VIP rewards')+'</h3><p>'+(p?'Claim each eligible day · '+n(u.vipDaysClaimed||0)+' claimed / '+n(p.days)+' days':'Choose your VIP plan from the membership page')+'</p></div><div class="round-icon">'+icon('crown')+'</div></div>'+(p?'<button class="btn btn-primary btn-block" data-action="vip-claim" '+(!vipCanClaim()?'disabled':'')+'>'+(vipCanClaim()?'Claim VIP reward':'Next reward not ready')+'</button>':'<button class="btn btn-outline btn-block" data-page="vip">View VIP plans '+icon('arrow')+'</button>')+'</div>';}
function home(){var u=user(),s=data().settings,available=Date.now()-(u.lastClaimAt||0)>=86400000,remaining=Math.max(0,Math.ceil((86400000-(Date.now()-(u.lastClaimAt||0)))/3600000));
return '<div class="view"><div class="greeting">Welcome back, <b>'+esc((u.name||'Member').split(' ')[0])+' ✨</b></div><h1 class="page-title" style="font-size:25px;margin:6px 0 22px">Build your future.</h1>'+hero()+
'<div class="wallet-actions"><button class="wallet-action" data-action="deposit"><span>'+icon('arrow')+'</span><b>Deposit</b><small>Manual top up</small></button><button class="wallet-action" data-action="withdraw"><span>'+icon('wallet')+'</span><b>Withdraw</b><small>Request payout</small></button><button class="wallet-action" data-page="wallet"><span>'+icon('clock')+'</span><b>History</b><small>My wallet</small></button></div>'+
'<div class="stats-row"><div class="stat-small"><div class="label">Rewards earned</div><div class="value">'+n(u.totalEarned)+'</div></div><div class="stat-small"><div class="label">Invited</div><div class="value">'+n(u.referralCount)+'</div></div><div class="stat-small"><div class="label">VIP plan</div><div class="value gold" style="text-transform:capitalize;font-size:17px">'+esc(vipName(u))+'</div></div></div>'+
(s.dailyEnabled?section('Free earning · Daily check-in')+'<div class="daily-card"><div class="daily-left"><div class="daily-icon">'+icon('gift')+'</div><div><div class="daily-title">Daily check-in</div><div class="daily-sub">'+(available?'Claim '+currency(s.dailyBonus)+' today':'Next claim in ~'+remaining+'h')+'</div></div></div><button class="btn btn-primary btn-small" data-action="claim" '+(!available?'disabled':'')+'>'+(available?'Claim':'Claimed')+'</button></div>':'')+
section('Official Telegram channel')+'<button class="channel-banner" data-action="open-link" data-url="'+esc(s.homeChannelUrl||'https://t.me/geminipromtshub')+'"><span class="channel-icon">'+icon('users')+'</span><span><strong>Our Telegram community</strong><small>Updates, announcements and news</small></span>'+icon('external')+'</button>'+

section('Explore AFGLION')+'<div class="action-grid"><button class="action-tile" data-page="referral"><span class="action-icon">'+icon('users')+'</span><div><div class="action-title">Referral commissions</div><div class="action-desc">Earn '+n(s.referralPercent)+'% when friends purchase VIP.</div></div></button><button class="action-tile" data-page="vip"><span class="action-icon blue">'+icon('crown')+'</span><div><div class="action-title">VIP plans</div><div class="action-desc">Flexible rates and durations, admin managed.</div></div></button></div>'+
section('Latest updates')+'<div class="notice"><div class="notice-icon">'+icon('bell')+'</div><div><h3>AFGLION updates</h3><p>'+esc(s.announcement||'Welcome to AFGLION.')+'</p></div></div>'+footer()+'</div>';}
function referral(){var u=user(),s=data().settings,invitation=link(),pct=s.referralPercent||0,example=((s.plans||{}).gold||{}).price||500;return '<div class="view">'+goldTitle('Refer & earn.','Invite friends to AFGLION and receive a commission when their VIP purchase is approved.')+
'<div class="ref-visual"><div class="ref-symbol">'+icon('share')+'</div><h2>'+n(pct)+'% Referral Commission</h2><p>Commission applies to an approved, paid VIP purchase—not to an account signup.</p><div class="invite-pill">'+icon('spark')+' Example: '+n(Math.floor(example*pct/100))+' AFN on a '+n(example)+' AFN VIP purchase</div></div>'+
'<div class="stats-row"><div class="stat-small"><div class="label">Invited</div><div class="value">'+n(u.referralCount)+'</div></div><div class="stat-small"><div class="label">Commission</div><div class="value gold">'+n(u.referralEarned)+'</div></div><div class="stat-small"><div class="label">Rate</div><div class="value">'+n(pct)+'%</div></div></div>'+
section('Your invitation link')+'<div class="ref-linkbox"><span class="ref-url">'+esc(invitation||'Referral link available after bot setup')+'</span><button class="btn btn-primary btn-small" data-action="copy-ref" '+(!invitation?'disabled':'')+'>'+icon('copy')+' Copy</button></div>'+
'<button class="btn btn-outline btn-block" style="margin-top:10px" data-action="share-ref" '+(!invitation?'disabled':'')+'>'+icon('share')+' Invite via Telegram</button>'+
section('How referrals work')+'<div class="ref-steps"><div class="step"><span class="step-num">01</span><div><div class="step-title">Share your link</div><div class="step-desc">Your friend opens AFGLION through Telegram.</div></div></div><div class="step"><span class="step-num">02</span><div><div class="step-title">Friend joins and buys VIP</div><div class="step-desc">Their wallet is funded and the administrator approves their VIP purchase.</div></div></div><div class="step"><span class="step-num">03</span><div><div class="step-title">Commission credited</div><div class="step-desc">Your AFN wallet receives the configured commission once.</div></div></div></div>'+
section('Your referrals')+(data().referrals.length?'<div class="user-list">'+data().referrals.map(function(r){return '<div class="user-row">'+avatar(r)+'<div class="user-main"><strong>'+esc(r.name)+'</strong><small>Joined '+fmtDate(r.joinedAt)+'</small></div><div class="user-end">'+icon('check')+'</div></div>';}).join('')+'</div>':empty('users','No referrals yet','Friends who register through your link will appear here.'))+footer()+'</div>';}
function vip(){var u=user(),st=data().settings,plans=st.vipPackages||st.plans||{},p=activePlan();return '<div class="view">'+goldTitle('VIP membership.','Custom VIP packages controlled by the administrator.')+
'<div class="vip-hero"><div class="eyebrow">YOUR MEMBERSHIP</div><h2>Member.<br>Premium.</h2><p>Choose the VIP package that fits you.</p><div class="vip-current"><i></i>'+esc(vipName(u))+(u.vipUntil&&u.vipTier!=='free'?' · Until '+fmtDate(u.vipUntil):'')+'</div></div>'+
(p?'<div class="vip-progress">'+section('Your VIP rewards')+'<div class="plan-progress"><b>'+currency(p.dailyReward)+' / eligible day</b><small>'+n(u.vipDaysClaimed||0)+' claimed · '+n(p.days)+' scheduled days</small><button class="btn btn-primary btn-block" data-action="vip-claim" '+(!vipCanClaim()?'disabled':'')+'>'+(vipCanClaim()?'Claim VIP reward':'Next reward not ready')+'</button></div></div>':'')+
section('Available VIP packages')+'<div class="tier-list">'+Object.keys(plans).filter(function(id){return plans[id].enabled!==false;}).map(function(tier){var v=plans[tier],mine=u.vipTier===tier&&u.vipUntil>Date.now(),otherActive=u.vipTier!=='free'&&u.vipUntil>Date.now();
return '<div class="tier '+(mine?'premium':'')+'"><div class="tier-top"><div class="tier-title"><span class="action-icon">'+icon('crown')+'</span><span>'+esc(v.name||tier.toUpperCase())+'</span></div><div class="tier-price">'+currency(v.price)+'<small>'+n(v.days)+'-day membership</small></div></div><div class="plan-big"><b>'+currency(v.dailyReward)+'</b><span>per eligible day</span></div><div class="tier-benefits"><div class="tier-feature">'+icon('check')+' '+n(v.days)+'-day schedule</div><div class="tier-feature">'+icon('check')+' Total scheduled: '+currency((v.dailyReward||0)*(v.days||0))+'</div><div class="tier-feature">'+icon('check')+' Instant VIP activation after wallet payment</div></div><button class="btn '+(mine?'btn-ghost':'btn-primary')+' btn-block" '+(otherActive?'disabled':'data-action="vip-request" data-tier="'+esc(tier)+'"')+'>'+(mine?'Current package':otherActive?'Current VIP still active':'Activate '+esc(v.name))+'</button></div>';}).join('')+'</div>'+
'<div class="alert">'+icon('info')+' VIP rewards are subject to an eligibility schedule. Returns are not guaranteed.</div>'+footer()+'</div>';}
function wallet(){var u=user(),s=data().settings,items=data().transactions||[];return '<div class="view">'+goldTitle('Your wallet.','Track available AFN funds, submitted payments and payouts.')+hero()+
'<div class="wallet-actions"><button class="wallet-action" data-action="deposit"><span>'+icon('arrow')+'</span><b>Deposit</b><small>Manual approval</small></button><button class="wallet-action" data-action="withdraw"><span>'+icon('wallet')+'</span><b>Withdraw</b><small>Manual payout</small></button><button class="wallet-action" data-action="refresh"><span>'+icon('refresh')+'</span><b>Refresh</b><small>Get latest status</small></button></div>'+
'<div class="stats-row"><div class="stat-small"><div class="label">Deposited</div><div class="value">'+n(u.totalDeposited)+'</div></div><div class="stat-small"><div class="label">Withdrawn</div><div class="value">'+n(u.totalWithdrawn)+'</div></div><div class="stat-small"><div class="label">On hold</div><div class="value gold">'+n(u.pendingWithdraw)+'</div></div></div>'+
section('Manual payment history')+(items.length?'<div class="transaction-list">'+items.map(function(t){return '<div class="transaction-row"><div class="transaction-icon">'+icon(t.type==='deposit'?'arrow':'wallet')+'</div><div class="transaction-main"><strong>'+esc(t.type==='deposit'?'Deposit':'Withdrawal')+' · '+currency(t.amount)+'</strong><small>'+esc(t.method)+' · '+fmtDate(t.createdAt)+'</small><small>'+esc(t.status||'pending')+'</small></div><span class="badge '+(t.status==='rejected'?'red':'')+'">'+esc(t.status||'pending')+'</span>'+(t.type==='withdraw'&&t.status==='pending'?'<button class="mini-cancel" data-action="cancel-withdraw" data-id="'+esc(t.id)+'">Cancel</button>':'')+'</div>';}).join('')+'</div>':empty('wallet','No wallet activity','Deposits and withdrawals will show here once you submit a request.'))+
'<div class="alert">'+icon('shield')+' Deposits are credited only after verified manual approval. Withdrawals reserve available funds until approved, rejected or cancelled.</div>'+footer()+'</div>';}
function empty(ic,title,desc){return '<div class="blank-state"><div class="round-icon">'+icon(ic)+'</div><h3>'+esc(title)+'</h3><p>'+esc(desc)+'</p></div>';}
function profile(){var u=user();return '<div class="view">'+goldTitle('Your profile.','Your AFGLION account and wallet settings.')+
'<div class="profile-top">'+avatar(u,'profile-pic')+'<div><h2 class="profile-name">'+esc(u.name)+'</h2><div class="profile-handle">'+esc(u.username?'@'+u.username:'AFGLION Member')+'</div><div class="profile-id">ID '+esc(u.id)+'</div></div></div>'+
'<div class="profile-stats"><div class="profile-stat"><div class="value">'+n(u.balance)+'</div><div class="label">AFN balance</div></div><div class="profile-stat"><div class="value">'+n(u.referralCount)+'</div><div class="label">Referrals</div></div></div>'+
section('Account')+'<div class="settings-list"><button class="settings-item" data-action="edit-name"><span class="settings-icon">'+icon('edit')+'</span><span class="settings-text">Display name</span><span class="settings-trail">'+icon('arrow')+'</span></button><button class="settings-item" data-page="wallet"><span class="settings-icon">'+icon('wallet')+'</span><span class="settings-text">Wallet · Deposit / Withdraw</span><span class="settings-trail">'+icon('arrow')+'</span></button><button class="settings-item" data-page="vip"><span class="settings-icon">'+icon('crown')+'</span><span class="settings-text">VIP status</span><span class="settings-trail"><span class="badge">'+esc(vipName(u).toUpperCase())+'</span>'+icon('arrow')+'</span></button><button class="settings-item" data-action="history"><span class="settings-icon">'+icon('clock')+'</span><span class="settings-text">Earnings history</span><span class="settings-trail">'+icon('arrow')+'</span></button></div>'+
section('Appearance & more')+'<div class="settings-list"><button class="settings-item" data-action="theme-toggle"><span class="settings-icon">'+icon('settings')+'</span><span class="settings-text">'+(state.theme==='dark'?'Switch to light mode':'Switch to dark mode')+'</span><span class="settings-trail">'+icon('arrow')+'</span></button><button class="settings-item" data-action="help"><span class="settings-icon">'+icon('info')+'</span><span class="settings-text">Help & information</span><span class="settings-trail">'+icon('arrow')+'</span></button><button class="settings-item" data-action="refresh"><span class="settings-icon">'+icon('refresh')+'</span><span class="settings-text">Refresh account</span><span class="settings-trail">'+icon('arrow')+'</span></button>'+(u.isAdmin?'<button class="settings-item" data-action="open-admin"><span class="settings-icon">'+icon('shield')+'</span><span class="settings-text">Admin console</span><span class="settings-trail">'+icon('arrow')+'</span></button>':'')+'</div>'+
'<div class="muted-note" style="text-align:center;margin-top:20px">Member since '+fmtDate(u.joinedAt)+'</div>'+footer()+'</div>';}
function footer(){return '<div class="footer-sign"><img src="/afglion-logo.svg" width="23" height="23" alt="AFGLION"><span>AFGLION MEMBERS CLUB</span></div>';}

function joinGate(){setTheme();var gate=state.gate||{joinUrl:'https://t.me/geminipromtshub'};root.className='app-shell';root.innerHTML='<header class="topbar"><div class="brand-wrap">'+logoMark()+'<div><div class="brand-name">AFGLION</div><div class="brand-kicker">MEMBERS CLUB</div></div></div></header><div class="join-screen"><div class="join-art">'+icon('users')+'</div><span class="eyebrow">ONE QUICK STEP</span><h1>Join our channel<br>to continue.</h1><p>Membership is verified through Telegram. Join the required channel to unlock AFGLION.</p><button class="btn btn-primary btn-block join-primary" data-action="open-link" data-url="'+esc(gate.joinUrl)+'">'+icon('external')+' Join channel</button><button class="btn btn-outline btn-block" data-action="check-join">'+icon('check')+' Check Joined</button><div class="alert">'+icon('shield')+' '+esc(gate.joinIssue||'After joining, tap Check Joined. The bot must be a channel administrator for reliable checks.')+'</div></div>';}
function render(){if(state.gate){joinGate();return;}if(!state.data)state.data=demoData;var body=state.page==='home'?home():state.page==='referral'?referral():state.page==='vip'?vip():state.page==='wallet'?wallet():profile();root.className='app-shell'+(state.page==='admin'?' admin-shell':'');if(state.page==='admin'){renderAdmin();return;}setTheme();root.innerHTML=header()+(state.demo?'<div class="alert" style="margin-top:0">Preview mode · Open through Telegram for live data.</div>':'')+body+nav();}
function go(page){if(page==='admin'){if(!user().isAdmin){toast('Admin only');return;}state.page='admin';loadAdmin();return;}if(!['home','referral','vip','profile','wallet'].includes(page))return;state.page=page;render();window.scrollTo({top:0,behavior:'smooth'});try{tg&&tg.HapticFeedback&&tg.HapticFeedback.selectionChanged();}catch(e){}}
async function api(action,payload){var res=await fetch('/api/index?action='+encodeURIComponent(action),{method:payload?'POST':'GET',headers:{'Content-Type':'application/json','Authorization':state.token?'Bearer '+state.token:''},body:payload?JSON.stringify(payload):undefined});var json=await res.json().catch(function(){return {error:'Server unavailable'};});if(!res.ok)throw new Error(json.error||'Request failed');return json;}
async function refresh(){if(state.demo)return;splashStage('Loading your account',71);var response=await api('me');if(response.joinRequired){state.gate=response;state.data=null;render();return;}state.gate=null;state.data=response;render();}
async function telegramLogin(){if(!tg||!tg.initData)return;splashStage('Verifying your membership',53);var response=await api('auth',{initData:tg.initData});if(response.joinRequired){state.gate=response;render();return;}state.gate=null;state.token=response.token;sessionStorage.setItem('afglion_session',state.token);await refresh();}
async function init(){
 startSplash();setTheme();
 try{if(tg){tg.ready();tg.expand();}}catch(e){}
 if(!tg||!tg.initData){state.demo=true;render();splashStage('Preview is ready',90);finishSplash();return;}
 state.demo=false;splashStage('Securing your Telegram sign-in',44);
 try{await telegramLogin();splashStage('Your AFGLION experience is ready',93);}
 catch(e){state.data=demoData;state.demo=true;render();var alert=document.querySelector('.alert');if(alert)alert.textContent='Sign-in failed: '+e.message+'. Open from Telegram to retry.';splashStage('Check your connection',93);}
 finally{finishSplash();}
}
async function run(action,payload,success){if(state.demo){toast('Preview mode · Live features require Telegram and Firebase setup');return null;}if(state.loading)return null;state.loading=true;try{var out=await api(action,payload);if(success)toast(success);await refresh();return out;}catch(e){toast(e.message);return null;}finally{state.loading=false;}}
function link(){var s=data().settings;return !state.demo&&s.botUsername?'https://t.me/'+s.botUsername+'?startapp=ref_'+user().id:'';}
async function copyValue(value){try{await navigator.clipboard.writeText(value);toast('Copied to clipboard');}catch(e){var box=document.createElement('textarea');box.value=value;document.body.appendChild(box);box.select();document.execCommand('copy');box.remove();toast('Copied');}}
function modal(title,inner){closeModal();var el=document.createElement('div');el.className='modal-backdrop';el.id='modal-layer';el.innerHTML='<div class="modal" role="dialog" aria-modal="true"><div class="modal-header"><h2>'+title+'</h2><button class="close-modal" data-action="close-modal" aria-label="Close">×</button></div>'+inner+'</div>';document.body.appendChild(el);el.addEventListener('click',function(e){if(e.target===el)closeModal();});}
function closeModal(){var el=document.getElementById('modal-layer');if(el)el.remove();}
function historyModal(){var acts=data().activity||[];modal('Activity history',acts.length?'<div class="user-list" style="margin-top:18px">'+acts.map(function(a){return '<div class="user-row"><div class="action-icon">'+icon('bolt')+'</div><div class="user-main"><strong>'+esc(a.label)+'</strong><small>'+fmtDate(a.at)+'</small></div><div class="user-end">'+(a.amount>=0?'+':'')+n(a.amount)+' AFN</div></div>';}).join('')+'</div>':empty('clock','No activity yet','Your rewards and account changes will appear here.'));}
document.addEventListener('click',async function(e){var target=e.target.closest('[data-action],[data-page]');if(!target)return;if(target.dataset.page){go(target.dataset.page);return;}var action=target.dataset.action;
switch(action){

case 'open-link':var targetUrl=target.dataset.url;if(/^https:\/\/t\.me\/[A-Za-z0-9_]{5,32}\/?$/.test(targetUrl||'')){if(tg&&tg.openTelegramLink)tg.openTelegramLink(targetUrl);else window.open(targetUrl,'_blank','noopener,noreferrer');}break;
case 'check-join':try{await telegramLogin();if(state.gate)toast('Join the channel, then check again');else toast('Membership verified!');}catch(e){toast(e.message);}break;
case 'copy-deposit':var m=selectedMethod();if(m&&m.number)await copyValue(m.number);break;
case 'theme-toggle':toggleTheme();break;
case 'deposit':paymentModal('deposit');break;
case 'withdraw':paymentModal('withdraw');break;
case 'vip-claim':await run('vipClaim',{},'VIP daily reward credited!');break;
case 'cancel-withdraw':if(confirm('Cancel this pending withdrawal and release the reserved AFN?'))await run('cancelWithdrawal',{requestId:target.dataset.id},'Withdrawal cancelled');break;
case 'admin-money-approve':if(confirm('Approve this manual payment request? Verify the real-world payment or payout first.'))await adminAction('reviewMoney',{requestId:target.dataset.id,approve:true});break;
case 'admin-money-reject':if(confirm('Reject this payment request?'))await adminAction('reviewMoney',{requestId:target.dataset.id,approve:false});break;
case 'claim':await run('claim',{},'Your daily reward has arrived!');break;
case 'notification':modal('Announcements','<div class="notice" style="margin-top:16px"><div class="notice-icon">'+icon('bell')+'</div><div><h3>Latest announcement</h3><p>'+esc(data().settings.announcement||'Welcome to AFGLION!')+'</p></div></div>');break;
case 'copy-ref':if(link())await copyValue(link());break;
case 'share-ref':if(link()){var url='https://t.me/share/url?url='+encodeURIComponent(link())+'&text='+encodeURIComponent('Join me on AFGLION!');if(tg&&tg.openTelegramLink)tg.openTelegramLink(url);else window.open(url,'_blank','noopener,noreferrer');}break;
case 'vip-request':var tier=target.dataset.tier,p=(data().settings.vipPackages||data().settings.plans||{})[tier];if(!p)return toast('Package not available');modal('Activate VIP now','<p class="body-sub"><b>'+esc(p.name)+'</b> costs <b>'+currency(p.price)+'</b> from your available AFN balance. Your VIP becomes active immediately after payment, with no approval needed.</p><div class="alert">Scheduled reward: '+currency(p.dailyReward)+' per eligible claim day for '+n(p.days)+' days. VIP returns are not guaranteed.</div><button class="btn btn-primary btn-block" data-action="confirm-vip" data-tier="'+esc(tier)+'">Pay '+currency(p.price)+' & activate</button>');break;
case 'confirm-vip':var vip=target.dataset.tier;closeModal();await run('vipPurchase',{tier:vip},'VIP successfully activated!');break;
case 'edit-name':modal('Edit display name','<form id="name-form"><label class="form-label">Your name</label><input class="field" id="new-name" maxlength="48" minlength="2" value="'+esc(user().name)+'" required><button class="btn btn-primary btn-block" style="margin-top:16px">Save changes</button></form>');break;
case 'history':historyModal();break;
case 'help':modal('Help & information','<p class="body-sub">AFGLION offers free daily check-ins, VIP reward claims, referral commission and an AFN wallet with manually reviewed deposits and payouts.</p><div class="alert">Deposits and withdrawals require administrator approval; paid VIP activates automatically. Daily VIP rewards are eligibility-based and are not guaranteed income. For support, contact @Afglionbot.</div>');break;
case 'refresh':try{await refresh();toast('Account refreshed');}catch(ex){toast(ex.message);}break;
case 'open-admin':go('admin');break;
case 'close-modal':closeModal();break;
case 'back-admin':state.page='profile';render();break;
case 'admin-toggle-nav':state.adminNavOpen=!state.adminNavOpen;renderAdmin();break;
case 'admin-tab':state.adminTab=target.dataset.tab;state.adminNavOpen=false;renderAdmin();window.scrollTo({top:0,behavior:'smooth'});break;
case 'admin-user':openUserModal(target.dataset.id);break;

case 'brand-download':downloadBrandPng(target.dataset.type);break;
case 'brand-copy':await copyValue(location.origin+'/afglion-brand.svg');break;
case 'admin-add-method':methodModal('');break;
case 'admin-edit-method':methodModal(target.dataset.id);break;
case 'admin-delete-method':if(confirm('Delete this receiving method? Existing transaction history is preserved.'))await adminAction('deletePaymentMethod',{methodId:target.dataset.id});break;
case 'admin-add-package':packageModal('');break;
case 'admin-edit-package':packageModal(target.dataset.id);break;
case 'admin-delete-package':if(confirm('Delete this package? Active members keep their current reward terms.'))await adminAction('deleteVipPackage',{packageId:target.dataset.id});break;
case 'admin-save-settings':saveAdminSettings();break;
case 'admin-save-user':saveAdminUser();break;
}});



function downloadBrandPng(kind){
 var isWordmark=kind==='wordmark',asset=isWordmark?'/afglion-brand.svg':'/afglion-logo.svg';
 var img=new Image();
 img.onload=function(){
  var canvas=document.createElement('canvas');
  canvas.width=isWordmark?1720:1024;canvas.height=isWordmark?480:1024;
  var ctx=canvas.getContext('2d');
  if(!ctx){toast('Unable to export PNG here');return;}
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  canvas.toBlob(function(blob){
   if(!blob){toast('PNG export unavailable');return;}
   var url=URL.createObjectURL(blob),linkEl=document.createElement('a');
   linkEl.href=url;linkEl.download=isWordmark?'AFGLION-Official-Brand.png':'AFGLION-App-Icon.png';
   linkEl.style.display='none';document.body.appendChild(linkEl);linkEl.click();linkEl.remove();
   setTimeout(function(){URL.revokeObjectURL(url);},15000);
   toast('Your AFGLION logo is ready');
  },'image/png');
 };
 img.onerror=function(){toast('Logo could not be loaded. Try again.');};
 img.src=asset;
}

function availableMethods(forDeposit){return (data().settings.paymentMethods||[{id:'manual',name:'Manual Transfer',number:data().settings.depositNumber||'',enabled:true}]).filter(function(m){return m.enabled!==false&&(!forDeposit||!!m.number);});}
function selectedMethod(){var el=document.getElementById('money-method');return availableMethods(!!(document.getElementById('money-form')&&document.getElementById('money-form').dataset.type==='deposit')).find(function(m){return m.id===(el&&el.value);})||null;}
function showMethodDestination(){var m=selectedMethod(),target=document.getElementById('payment-dest-number'),copy=document.getElementById('payment-copy'),submit=document.getElementById('money-submit');
 if(!target)return;
 target.textContent=m&&m.number?m.number:'This payment method has no receiving number yet';
 if(copy)copy.disabled=!(m&&m.number);
 if(submit)submit.disabled=!(m&&m.number);
}
function paymentModal(type){var st=data().settings,deposit=type==='deposit',methods=availableMethods(type==='deposit'),contact=st.depositContact||'Mk_Malakzai',valid=methods.filter(function(m){return !deposit||m.number;});
modal(deposit?'Manual deposit':'Manual withdrawal',
'<div class="payment-intro">'+icon('wallet')+'<span>'+esc(deposit?st.depositInstructions:st.payoutInstructions)+'</span></div>'+
'<form id="money-form" data-type="'+type+'">'+
'<label class="form-label">Payment method</label><select class="field" id="money-method" required>'+
(methods.length?methods.map(function(m){return '<option value="'+esc(m.id)+'">'+esc(m.name)+(deposit&&!m.number?' (Not configured)':'')+'</option>';}).join(''):'<option value="">No methods configured</option>')+'</select>'+
(deposit?'<div class="deposit-destination"><small>Send your AFN payment to this number</small><strong id="payment-dest-number">'+esc(methods[0]&&methods[0].number||'Please select a configured payment method')+'</strong><button type="button" class="btn btn-outline btn-small" id="payment-copy" data-action="copy-deposit" '+(!(methods[0]&&methods[0].number)?'disabled':'')+'>'+icon('copy')+' Copy number</button></div>'+
'<div class="deposit-steps"><b>Send payment screenshot</b><p>After your transfer, send the receipt or screenshot to the administrator and then submit the request below.</p><button type="button" class="btn btn-primary btn-block" data-action="open-link" data-url="https://t.me/'+esc(contact)+'">'+icon('external')+' Message @'+esc(contact)+'</button></div>':'')+
'<label class="form-label">Amount in AFN (minimum '+n(deposit?st.minDeposit:st.minWithdraw)+')</label><input class="field" id="money-amount" type="number" min="'+(deposit?st.minDeposit:st.minWithdraw)+'" max="1000000" step="1" placeholder="Amount" required>'+
'<label class="form-label">'+(deposit?'Transaction reference / sender details':'Payout phone, account or recipient details')+'</label><textarea class="field" id="money-details" minlength="5" maxlength="300" placeholder="'+(deposit?'Receipt number and sender name':'Your recipient account details')+'" required></textarea>'+
'<div class="alert">'+(deposit?'The administrator checks your screenshot and transfer before your wallet receives funds.':'Withdrawal funds are held until admin approval or rejection.')+'</div>'+
'<button class="btn btn-primary btn-block" id="money-submit" style="margin-top:14px" '+(deposit&&!valid.length?'disabled':'')+'>Submit '+(deposit?'deposit':'withdrawal')+' request</button></form>');}
document.addEventListener('change',function(e){if(e.target&&e.target.id==='money-method')showMethodDestination();});

document.addEventListener('submit',async function(e){if(e.target.id==='staff-form'){e.preventDefault();if(!confirm('Update role for this Telegram user?'))return;await adminAction('setRole',{userId:document.getElementById('staff-id').value.trim(),role:document.getElementById('staff-role').value});return;}
if(e.target.id==='method-form'){e.preventDefault();await adminAction('savePaymentMethod',{methodId:e.target.dataset.id,method:{name:document.getElementById('method-name').value.trim(),number:document.getElementById('method-number').value.trim(),enabled:document.getElementById('method-enabled').value==='yes'}});return;}
if(e.target.id==='package-form'){e.preventDefault();var key=e.target.dataset.id;await adminAction('saveVipPackage',{packageId:key,package:{name:document.getElementById('package-name').value,price:getNum('package-price'),dailyReward:getNum('package-daily'),days:getNum('package-days'),enabled:document.getElementById('package-enabled').value==='yes'}});return;}if(e.target.id==='money-form'){e.preventDefault();var type=e.target.dataset.type;var amount=Number(document.getElementById('money-amount').value);var methodId=document.getElementById('money-method').value;var details=document.getElementById('money-details').value.trim();closeModal();await run('moneyRequest',{type:type,amount:amount,methodId:methodId,details:details},'Request submitted for manual review');state.page='wallet';render();return;}if(e.target.id==='name-form'){e.preventDefault();var name=document.getElementById('new-name').value.trim();if(name.length<2)return toast('Name is too short');closeModal();await run('profileUpdate',{name:name},'Name updated');}});
async function loadAdmin(){if(state.demo){toast('Admin requires verified Telegram sign-in');state.page='profile';render();return;}try{state.admin=await api('adminData');renderAdmin();window.scrollTo({top:0,behavior:'smooth'});}catch(e){toast(e.message);state.page='profile';render();}}


var adminNavigation=[
 {group:'Main',items:[['overview','Dashboard','home'],['users','Members','users']]},
 {group:'Money',items:[['money','Transactions','wallet'],['methods','Payment methods','settings'],['notices','Channel notifications','bell']]},
 {group:'Subscriptions',items:[['packages','VIP packages','crown']]},
 {group:'Configuration',items:[['settings','Settings','settings'],['branding','Official brand kit','spark'],['staff','Staff & owners','shield']]}
];
function adminLabel(key){
 for(var i=0;i<adminNavigation.length;i++){var item=adminNavigation[i].items.find(function(x){return x[0]===key});if(item)return item[1];}
 return 'Dashboard';
}
function adminTabs(){
 var onlyOwner=state.admin&&state.admin.callerRole==='owner';
 var content=adminNavigation.map(function(section){
 var buttons=section.items.filter(function(i){return i[0]!=='staff'||onlyOwner;}).map(function(i){
 return '<button class="admin-side-link '+(state.adminTab===i[0]?'active':'')+'" data-action="admin-tab" data-tab="'+i[0]+'">'+icon(i[2])+'<span>'+esc(i[1])+'</span>'+(state.adminTab===i[0]?'<span class="admin-link-current"></span>':'')+'</button>';}).join('');
 return '<div class="admin-nav-group"><div class="admin-nav-group-title">'+esc(section.group)+'</div>'+buttons+'</div>';
 }).join('');
 return (state.adminNavOpen?'<div class="admin-drawer-shade" data-action="admin-toggle-nav"></div><aside class="admin-drawer" aria-label="Administrator menu"><div class="admin-drawer-top"><div><span class="eyebrow">AFGLION</span><h3>Control Center</h3></div><button class="round-button" data-action="admin-toggle-nav" aria-label="Close menu">×</button></div>'+content+'<button class="admin-side-link" data-action="theme-toggle">'+icon('settings')+'<span>'+(state.theme==='dark'?'Light appearance':'Dark appearance')+'</span></button><div class="admin-drawer-foot">Role: '+esc((state.admin.callerRole||'admin').toUpperCase())+'</div></aside>':'');
}
function adminUserRows(users){
 var plans=state.admin.settings.vipPackages||state.admin.settings.plans||{};
 return users.length?users.map(function(u){
 var title=u.vipPlanSnapshot&&u.vipPlanSnapshot.name||plans[u.vipTier]&&plans[u.vipTier].name||(/vip_/.test(u.vipTier||'')?'VIP':u.vipTier||'free');
 var staff=state.admin.staffRoles.find(function(x){return x.id===u.id;});
 var isRoot=(state.admin.rootOwners||[]).includes(u.id);
 return '<div class="admin-row"><div class="admin-row-person"><strong>'+esc(u.name||'Member')+'</strong> '+(u.banned?'<span class="badge red">BANNED</span>':'')+(staff||isRoot?'<span class="badge">'+esc(isRoot?'OWNER':staff.role.toUpperCase())+'</span>':'')+'<small>ID '+esc(u.id)+' · '+currency(u.balance)+' · '+esc(title)+'</small></div><button class="btn btn-ghost btn-small" data-action="admin-user" data-id="'+esc(u.id)+'">Manage</button></div>';
 }).join(''):empty('users','No members found','No matching members.');
}
function adminNumber(label,id,value,min,max){return '<div><label class="form-label">'+esc(label)+'</label><input class="field" id="'+id+'" type="number" min="'+min+'" max="'+max+'" step="1" value="'+n(value).replace(/,/g,'')+'"></div>';}
function adminShortcut(tab,title,description,ic){
 return '<button class="admin-shortcut" data-action="admin-tab" data-tab="'+tab+'"><span class="action-icon">'+icon(ic)+'</span><div><strong>'+esc(title)+'</strong><small>'+esc(description)+'</small></div>'+icon('arrow')+'</button>';
}
function renderAdmin(){var a=state.admin;if(!a){root.innerHTML=header()+'<div class="body-sub">Loading admin...</div>';return;}setTheme();
 var tab=state.adminTab;
 var html='<header class="topbar admin-main-header"><button class="admin-menu-trigger" data-action="admin-toggle-nav" aria-label="Open admin menu">'+icon('menu')+'</button>'+logoMark('admin-brand-logo')+'<div class="admin-heading"><div class="brand-name">AFGLION ADMIN</div><div class="brand-kicker">CONTROL CENTER</div></div><button class="round-button" data-action="back-admin" aria-label="Exit admin">'+icon('logout')+'</button></header>'+
 '<div class="view admin-view"><div class="admin-context"><div><span class="eyebrow">'+esc((a.callerRole||'admin').toUpperCase())+' CONTROL</span><h1>'+esc(adminLabel(tab))+'</h1></div><span class="admin-context-icon">'+icon(tab==='overview'?'shield':'settings')+'</span></div>';
 if(tab==='overview'){
 html+='<div class="admin-quick"><div class="admin-card"><b>'+n(a.stats.members)+'</b><small>Total members</small></div><div class="admin-card"><b>'+n(a.stats.vip)+'</b><small>Active VIP</small></div><div class="admin-card"><b>'+n(a.stats.pending)+'</b><small>Waiting requests</small></div><div class="admin-card"><b>'+n(a.stats.points)+'</b><small>AFN circulation (sample)</small></div></div>'+
 section('Quick actions')+'<div class="admin-shortcuts">'+
 adminShortcut('money','Payments','Approve deposits & withdrawals','wallet')+
 adminShortcut('users','Member accounts','Balances and status','users')+
 adminShortcut('packages','VIP packages','Instant activation plans','crown')+
 adminShortcut('settings','Bot settings','Rules and channels','settings')+'</div>'+
 section('New members')+adminUserRows(a.users.slice(0,5));
 }
 if(tab==='users'){
 html+='<div class="admin-callout">All balances are stored per Telegram account. Use Manage to add or deduct funds and control VIP or account status.</div>'+
 '<input id="admin-search" class="field" placeholder="Search name, username or ID" aria-label="Search members" autocomplete="off">'+
 '<div id="admin-users">'+adminUserRows(a.users)+'</div>';
 }

 if(tab==='money'){
 html+=(a.moneyRequests||[]).length?a.moneyRequests.map(function(req){
 return '<div class="payment-review"><div class="review-header"><b>'+esc(req.type==='deposit'?'↓ Deposit':'↑ Withdrawal')+' · '+currency(req.amount)+'</b><span class="badge">PENDING</span></div>'+
 '<p><b>'+esc(req.name)+'</b> · ID '+esc(req.userId)+'</p><p>Method: '+esc(req.method)+'</p>'+
 (req.receivingNumber?'<p>Receiving number: '+esc(req.receivingNumber)+'</p>':'')+
 '<p>Reference/details: '+esc(req.details)+'</p><small>'+fmtDate(req.createdAt)+'</small>'+
 '<div class="review-actions"><button class="btn btn-primary btn-small" data-action="admin-money-approve" data-id="'+esc(req.id)+'">Approve</button><button class="btn btn-ghost btn-small" data-action="admin-money-reject" data-id="'+esc(req.id)+'">Reject</button></div></div>';
 }).join(''):empty('check','No pending payments','New deposit and withdrawal requests will show here.');
 }
 if(tab==='methods'){
 var methods=a.settings.paymentMethods||[];
 html+='<div class="admin-callout">Add receiving methods such as Hawala, bank or mobile wallet. The chosen number appears to customers on Deposit with a Copy button.</div>'+
 '<button class="btn btn-primary btn-block" data-action="admin-add-method">'+icon('wallet')+' Add payment method</button>'+
 (methods.length?methods.map(function(m){
 return '<div class="package-manage"><div class="package-manage-top"><div><b>'+esc(m.name)+'</b><small>'+esc(m.number||'No receiving number')+'</small></div><span class="badge '+(m.enabled===false?'red':'green')+'">'+(m.enabled===false?'HIDDEN':'ACTIVE')+'</span></div>'+
 '<div class="package-manage-actions"><button class="btn btn-outline btn-small" data-action="admin-edit-method" data-id="'+esc(m.id)+'">'+icon('edit')+' Edit</button><button class="btn btn-ghost btn-small" data-action="admin-delete-method" data-id="'+esc(m.id)+'">Delete</button></div></div>';
 }).join(''):empty('wallet','No methods available','Add your first receiving method above.'));
 }
 if(tab==='packages'){
 var packages=a.settings.vipPackages||a.settings.plans||{};
 html+='<div class="admin-callout">Add or edit VIP subscriptions. Plans already approved keep their original schedule. Maximum 20 packages.</div><button class="btn btn-primary btn-block" data-action="admin-add-package">'+icon('crown')+' Create VIP package</button>'+
 Object.keys(packages).map(function(key){var p=packages[key];return '<div class="package-manage"><div class="package-manage-top"><div><b>'+esc(p.name)+'</b><small>'+currency(p.price)+' · '+currency(p.dailyReward)+'/day · '+n(p.days)+' days</small></div><span class="badge '+(p.enabled===false?'red':'green')+'">'+(p.enabled===false?'HIDDEN':'ACTIVE')+'</span></div><div class="package-manage-actions"><button class="btn btn-outline btn-small" data-action="admin-edit-package" data-id="'+esc(key)+'">'+icon('edit')+' Edit</button><button class="btn btn-ghost btn-small" data-action="admin-delete-package" data-id="'+esc(key)+'">Delete</button></div></div>';}).join('');
 }
 if(tab==='staff'){
 if(a.callerRole!=='owner')html+=empty('shield','Owner access required','Only project owners can manage staff roles.');
 else{
 html+='<div class="admin-callout">Owners can add or remove admins and appoint additional owners. Environment-defined owners cannot be demoted. Appointments require the user to open the Mini App once.</div>'+
 '<form id="staff-form"><label class="form-label">Member numeric Telegram ID</label><input class="field" id="staff-id" inputmode="numeric" pattern="[0-9]{3,20}" placeholder="e.g. 123456789" required>'+
 '<label class="form-label">Access role</label><select class="field" id="staff-role"><option value="admin">Administrator</option><option value="owner">Owner</option><option value="user">Normal user (revoke access)</option></select>'+
 '<button class="btn btn-primary btn-block" style="margin-top:16px">Save staff role</button></form>'+
 section('Assigned staff')+
 (a.rootOwners||[]).map(function(id){return '<div class="admin-row"><b>ID '+esc(id)+'</b><span class="badge">ROOT OWNER</span></div>';}).join('')+
 (a.staffRoles||[]).map(function(staff){return '<div class="admin-row"><b>ID '+esc(staff.id)+'</b><span class="badge">'+esc(staff.role.toUpperCase())+'</span></div>';}).join('');
 }
 }
 if(tab==='branding'){
 html+='<div class="admin-callout">The same official AFGLION lion logo is used in the Mini App, loading screen, and public brand artwork. Save it as PNG or share the crisp SVG vector.</div>'+
 '<div class="brand-kit-preview"><img src="/afglion-brand.svg" alt="Official AFGLION brand logo"></div>'+
 '<div class="brand-kit-actions"><button class="btn btn-primary btn-block" data-action="brand-download" data-type="wordmark">Download full logo PNG</button><button class="btn btn-outline btn-block" data-action="brand-download" data-type="icon">Download app icon PNG</button>'+
 '<button class="btn btn-ghost btn-block" data-action="brand-copy">Copy public logo link</button></div>'+
 '<div class="brand-kit-small"><img src="/afglion-logo.svg" width="100" height="100" alt="Official AFGLION crest"><p>One official symbol. App icon, website, social media, watermark.</p></div>';
 }
 if(tab==='settings'){
 var st=a.settings;
 html+='<div class="admin-callout">Settings are grouped below. Expand only the section you need, then tap Save all settings once.</div><div class="admin-setting-groups">'+
 '<details class="admin-section" open><summary>'+icon('users')+' Channels & access <span>⌄</span></summary><div class="admin-section-body">'+
 '<label class="check-row"><input type="checkbox" id="admin-force-enabled" '+(st.forceJoinEnabled?'checked':'')+'> Require joining a channel</label>'+
 '<label class="form-label">Force-join channel</label><input class="field" id="admin-force-channel" value="'+esc(st.forceJoinChannel||'https://t.me/geminipromtshub')+'">'+
 '<p class="muted-note">Add the Telegram bot as administrator of the channel to verify membership.</p>'+
 '<label class="form-label">Home channel link</label><input class="field" id="admin-home-channel" value="'+esc(st.homeChannelUrl||'https://t.me/geminipromtshub')+'"></div></details>'+
 '<details class="admin-section"><summary>'+icon('gift')+' Earnings & commission <span>⌄</span></summary><div class="admin-section-body">'+
 '<label class="check-row"><input type="checkbox" id="admin-daily-enabled" '+(st.dailyEnabled?'checked':'')+'> Enable free daily check-in</label>'+
 '<div class="inline-fields">'+adminNumber('Daily reward (AFN)','admin-daily',st.dailyBonus,0,1000)+adminNumber('VIP referral %','admin-referral',st.referralPercent,0,50)+'</div></div></details>'+
 '<details class="admin-section"><summary>'+icon('wallet')+' Deposit & withdrawals <span>⌄</span></summary><div class="admin-section-body">'+
 '<div class="inline-fields">'+adminNumber('Min deposit','admin-min-deposit',st.minDeposit,1,100000)+adminNumber('Min withdraw','admin-min-withdraw',st.minWithdraw,1,100000)+'</div>'+
 '<label class="form-label">Screenshot receiver (Telegram username)</label><input class="field" id="admin-deposit-contact" value="'+esc(st.depositContact||'Mk_Malakzai')+'">'+
 '<label class="form-label">Deposit instructions</label><textarea id="admin-deposit-inst" class="field" maxlength="500">'+esc(st.depositInstructions||'')+'</textarea>'+
 '<label class="form-label">Withdrawal instructions</label><textarea id="admin-payout-inst" class="field" maxlength="500">'+esc(st.payoutInstructions||'')+'</textarea>'+
 '<label class="form-label">Legacy default receiving number (optional)</label><input class="field" id="admin-deposit-number" value="'+esc(st.depositNumber||'')+'"><p class="muted-note">For multiple methods, use Payment methods in the menu.</p></div></details>'+
 '<details class="admin-section"><summary>'+icon('settings')+' Branding & announcement <span>⌄</span></summary><div class="admin-section-body">'+
 '<label class="form-label">Announcement</label><textarea id="admin-announcement" class="field" maxlength="350">'+esc(st.announcement||'')+'</textarea>'+
 '<label class="form-label">Telegram bot username</label><input class="field" id="admin-bot" value="'+esc(st.botUsername||'Afglionbot')+'"></div></details>'+
 '</div><div class="admin-save-dock"><button class="btn btn-primary btn-block" data-action="admin-save-settings">'+icon('check')+' Save all settings</button></div>';
 }
 root.className='app-shell admin-shell';root.innerHTML=html+footer()+'</div>'+adminTabs();
 var search=document.getElementById('admin-search');
 if(search)search.addEventListener('input',function(){var q=search.value.toLowerCase().trim();document.getElementById('admin-users').innerHTML=adminUserRows(a.users.filter(function(u){return ((u.name||'')+' '+(u.username||'')+' '+u.id).toLowerCase().includes(q);}));});
}

function openUserModal(id){var u=state.admin.users.find(function(x){return x.id===id;});if(!u)return;
 var packages=state.admin.settings.vipPackages||state.admin.settings.plans||{};
 var tierOptions='<option value="free" '+(u.vipTier==='free'?'selected':'')+'>Free</option>'+
 Object.keys(packages).map(function(key){return '<option value="'+esc(key)+'" '+(u.vipTier===key?'selected':'')+'>'+esc(packages[key].name)+'</option>';}).join('');
 if(u.vipTier!=='free'&&!packages[u.vipTier])tierOptions+='<option value="'+esc(u.vipTier)+'" selected>Legacy · '+esc(u.vipTier)+'</option>';
 var staff=(state.admin.staffRoles||[]).find(function(s){return s.id===id;});
 var isRoot=(state.admin.rootOwners||[]).includes(id);
 var roleLabel=isRoot?'Root owner':staff?staff.role:'Member';
 modal('Manage member','<div class="user-row" style="margin-top:16px">'+avatar(u)+'<div class="user-main"><strong>'+esc(u.name)+'</strong><small>ID '+esc(u.id)+' · '+esc(roleLabel)+'</small></div></div>'+
 '<div class="admin-balance-overview"><small>Available balance</small><strong>'+currency(u.balance)+'</strong></div>'+
 '<div class="inline-fields"><div><label class="form-label">Add balance (AFN)</label><input class="field" id="user-credit" type="number" min="0" max="100000" step="1" value="0"></div>'+
 '<div><label class="form-label">Deduct balance (AFN)</label><input class="field" id="user-deduct" type="number" min="0" max="100000" step="1" value="0"></div></div>'+
 '<div class="admin-callout">Only one balance adjustment at a time. Deductions cannot make the balance negative.</div>'+
 '<label class="form-label">VIP membership</label><select class="field" id="user-tier">'+tierOptions+'</select>'+
 '<label class="form-label">Account status</label><select class="field" id="user-ban"><option value="false" '+(!u.banned?'selected':'')+'>Active</option><option value="true" '+(u.banned?'selected':'')+'>Banned</option></select>'+
 '<button class="btn btn-primary btn-block" style="margin-top:20px" data-action="admin-save-user" data-id="'+esc(u.id)+'">Save changes</button>');}

async function saveAdminUser(){var el=document.querySelector('[data-action="admin-save-user"]');if(!el)return;
 var credit=Number(document.getElementById('user-credit').value),deduction=Number(document.getElementById('user-deduct').value);
 if(!Number.isSafeInteger(credit)||!Number.isSafeInteger(deduction)||credit<0||deduction<0)return toast('Enter valid whole AFN amounts');
 if(credit&&deduction)return toast('Use either Add or Deduct, not both');
 if(deduction&&!confirm('Confirm manual deduction of '+currency(deduction)+' from this member?'))return;
 await adminAction('updateUser',{userId:el.dataset.id,tier:document.getElementById('user-tier').value,balanceDelta:credit-deduction,banned:document.getElementById('user-ban').value==='true'});}
function getNum(id){return Number(document.getElementById(id).value);}
async function saveAdminSettings(){await adminAction('saveSettings',{
 announcement:document.getElementById('admin-announcement').value,
 dailyBonus:getNum('admin-daily'),dailyEnabled:document.getElementById('admin-daily-enabled').checked,
 referralPercent:getNum('admin-referral'),
 forceJoinEnabled:document.getElementById('admin-force-enabled').checked,
 forceJoinChannel:document.getElementById('admin-force-channel').value.trim(),
 homeChannelUrl:document.getElementById('admin-home-channel').value.trim(),
 depositNumber:document.getElementById('admin-deposit-number').value.trim(),
 depositContact:document.getElementById('admin-deposit-contact').value.trim(),
 minDeposit:getNum('admin-min-deposit'),minWithdraw:getNum('admin-min-withdraw'),
 botUsername:document.getElementById('admin-bot').value.trim().replace(/^@/,''),
 depositInstructions:document.getElementById('admin-deposit-inst').value,
 payoutInstructions:document.getElementById('admin-payout-inst').value
});}

function methodModal(key){var list=state.admin.settings.paymentMethods||[],m=key?list.find(function(v){return v.id===key;}):null;
 if(key&&!m){toast('Payment method not found');return;}
 modal(key?'Edit payment method':'Add payment method',
 '<form id="method-form" data-id="'+esc(key||'')+'">'+
 '<label class="form-label">Payment method name</label><input class="field" id="method-name" maxlength="45" minlength="3" value="'+esc(m&&m.name||'')+'" placeholder="e.g. Hawala · Roshan" required>'+
 '<label class="form-label">Receiving number / account</label><input class="field" id="method-number" maxlength="40" value="'+esc(m&&m.number||'')+'" placeholder="Enter phone or bank account number" required>'+
 '<label class="form-label">Status</label><select class="field" id="method-enabled"><option value="yes" '+(!m||m.enabled!==false?'selected':'')+'>Visible to customers</option><option value="no" '+(m&&m.enabled===false?'selected':'')+'>Hidden</option></select>'+
 '<div class="alert">The user will see the selected receiving number with a Copy button. Verify transfers manually before approving deposits.</div>'+
 '<button class="btn btn-primary btn-block" style="margin-top:17px">Save payment method</button></form>');}

function packageModal(key){var packages=state.admin.settings.vipPackages||state.admin.settings.plans||{},p=key?packages[key]:null;
if(key&&!p)return toast('VIP package not found');
modal(key?'Edit VIP package':'Create VIP package',
 '<form id="package-form" data-id="'+esc(key||'')+'"><label class="form-label">Package name</label><input class="field" id="package-name" maxlength="45" minlength="3" value="'+esc(p&&p.name||'')+'" placeholder="e.g. Diamond VIP" required>'+
 '<div class="inline-fields"><div><label class="form-label">Price (AFN)</label><input class="field" id="package-price" type="number" min="1" max="1000000" step="1" value="'+(p?p.price:500)+'" required></div><div><label class="form-label">Daily reward (AFN)</label><input class="field" id="package-daily" type="number" min="0" max="100000" step="1" value="'+(p?p.dailyReward:50)+'" required></div></div>'+
 '<label class="form-label">Duration in days</label><input class="field" id="package-days" type="number" min="1" max="365" step="1" value="'+(p?p.days:30)+'" required>'+
 '<label class="form-label">Visibility</label><select class="field" id="package-enabled"><option value="yes" '+(!p||p.enabled!==false?'selected':'')+'>Visible to users</option><option value="no" '+(p&&p.enabled===false?'selected':'')+'>Hidden</option></select>'+
 '<div class="alert">Changing a package will not change rewards already approved for existing members.</div>'+
 '<button class="btn btn-primary btn-block" style="margin-top:20px">Save VIP package</button></form>');
}

async function adminAction(type,payload){if(state.loading)return;state.loading=true;try{await api('adminAction',Object.assign({type:type},payload));closeModal();state.admin=await api('adminData');await refresh();state.page='admin';renderAdmin();toast('Changes saved');}catch(e){toast(e.message);}finally{state.loading=false;}}

init();
})();
