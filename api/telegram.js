/**
 * AFGLION Telegram bot — premium user/admin panel prototype.
 * No database is used: demo values and requests reset on redeploy/restart.
 * Set TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_ID, and TELEGRAM_BOT_API_SECRET in Vercel.
 */
'use strict';
const crypto = require('node:crypto');
const APP_URL = 'https://velora-members-club.vercel.app/';
const PAYOUTS = 'https://t.me/AFGlionpayouts';
const token = () => process.env.TELEGRAM_BOT_TOKEN || '';
const secret = () => process.env.TELEGRAM_BOT_API_SECRET || crypto.createHash('sha256').update('afglion-webhook-v1:' + token()).digest('hex');
function valid(req) {
  const sent = String(req.headers['x-telegram-bot-api-secret-token'] || '');
  const expected = secret();
  const a = Buffer.from(sent), b = Buffer.from(expected);
  return Boolean(token() && sent && a.length === b.length && crypto.timingSafeEqual(a, b));
}
const homeText = (name) => '🦁 <b>AFGLION</b>  <i>MEMBERS CLUB</i>\n━━━━━━━━━━━━━━━━━━\nWelcome, <b>' + esc(name || 'Member') + '</b> ✨\n\nYour personal members space. Choose an option below.\n\n💳 Wallet  •  👑 VIP  •  🤝 Referrals\n━━━━━━━━━━━━━━━━━━\n<i>Prototype mode · no real payments are processed.</i>';
function esc(s) { return String(s || '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])); }
const btn = (text, callback_data) => ({ text, callback_data });
function userKeyboard() {
  return { inline_keyboard: [
    [btn('💳 My Wallet', 'user:wallet'), btn('👑 VIP Plans', 'user:vip')],
    [btn('🎁 Daily Earn', 'user:earn'), btn('🤝 Referrals', 'user:referrals')],
    [btn('👤 My Profile', 'user:profile'), btn('📜 Activity', 'user:activity')],
    [{ text: '🚀 Open Mini App', web_app: { url: APP_URL } }],
    [{ text: '📢 Official Payouts Channel', url: PAYOUTS }]
  ]};
}
function adminKeyboard() {
  return { inline_keyboard: [
    [btn('📊 Overview', 'admin:overview'), btn('👥 Members', 'admin:users')],
    [btn('💳 Deposit Requests', 'admin:deposits'), btn('📤 Withdraw Requests', 'admin:withdraws')],
    [btn('👑 VIP Settings', 'admin:vip'), btn('⚙️ Settings', 'admin:settings')],
    [btn('↩️ User Panel', 'panel:home')]
  ]};
}
function pageText(key, name) {
  const pages = {
    wallet: '💳 <b>MY WALLET</b>\n━━━━━━━━━━━━━━━━━━\nAvailable balance: <b>0.00 AFN</b>\nTotal earned: <b>0.00 AFN</b>\nPending requests: <b>0</b>\n\n<i>Demo display only. No balance is saved.</i>',
    vip: '👑 <b>VIP MEMBERSHIPS</b>\n━━━━━━━━━━━━━━━━━━\n🥉 <b>Starter</b> — 100 AFN / 6 days\n🥈 <b>Gold</b> — 300 AFN / 15 days\n🥇 <b>Elite</b> — 500 AFN / 25 days\n💎 <b>Premium</b> — 1,000 AFN / 35 days\n\nPackages are examples only. Purchases are disabled in prototype mode.',
    earn: '🎁 <b>DAILY EARN</b>\n━━━━━━━━━━━━━━━━━━\nDaily check-in reward: <b>2 AFN</b>\nStatus: <b>Demo preview</b>\n\nClaiming rewards is disabled until persistent storage and claim limits are configured.',
    referrals: '🤝 <b>REFERRAL CENTER</b>\n━━━━━━━━━━━━━━━━━━\nInvited members: <b>0</b>\nReferral earnings: <b>0.00 AFN</b>\nCommission: <b>Admin configurable</b>\n\nYour referral link will appear here when bot username and referral tracking are configured.',
    profile: '👤 <b>MY PROFILE</b>\n━━━━━━━━━━━━━━━━━━\nName: <b>' + esc(name || 'Member') + '</b>\nMembership: <b>Free</b>\nWallet: <b>0.00 AFN</b>\nAccount status: <b>Active · demo</b>',
    activity: '📜 <b>RECENT ACTIVITY</b>\n━━━━━━━━━━━━━━━━━━\nNo activity to display yet.\n\nThis prototype does not save transaction history.'
  };
  return pages[key] || homeText(name);
}
function adminText(key) {
  const pages = {
    overview: '🛡️ <b>ADMIN CONTROL CENTER</b>\n━━━━━━━━━━━━━━━━━━\n👥 Members: <b>0</b>\n💳 Pending deposits: <b>0</b>\n📤 Pending withdrawals: <b>0</b>\n👑 VIP requests: <b>0</b>\n\n<i>Prototype panel. Connect a database before handling real requests.</i>',
    users: '👥 <b>MEMBER MANAGEMENT</b>\n━━━━━━━━━━━━━━━━━━\nNo saved members are available in no-database mode.',
    deposits: '💳 <b>DEPOSIT REQUESTS</b>\n━━━━━━━━━━━━━━━━━━\nNo requests saved. Enable a database and payment-proof flow before approving deposits.',
    withdraws: '📤 <b>WITHDRAWAL REQUESTS</b>\n━━━━━━━━━━━━━━━━━━\nNo requests saved. No real payouts can be approved in this prototype.',
    vip: '👑 <b>VIP CONFIGURATION</b>\n━━━━━━━━━━━━━━━━━━\nExample packages: 100/6 · 300/15 · 500/25 · 1000/35\n\nSettings shown here are previews only; edits are not persisted.',
    settings: '⚙️ <b>ADMIN SETTINGS</b>\n━━━━━━━━━━━━━━━━━━\nCurrency: AFN\nDaily reward preview: 2 AFN\nReferral commission: not configured\nPayment review: manual (disabled)\nDatabase: not connected\n\nAdd secure admin ID and persistent storage before launch.'
  };
  return pages[key] || adminText('overview');
}
async function api(method, payload) {
  const r = await fetch('https://api.telegram.org/bot' + token() + '/' + method, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(10000)
  });
  const d = await r.json();
  if (!d.ok) throw new Error(String(d.description || 'Telegram API error').slice(0, 180));
  return d.result;
}
async function show(chatId, text, keyboard, messageId) {
  const payload = { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: keyboard };
  if (messageId) {
    try { await api('editMessageText', { ...payload, message_id: messageId }); return; }
    catch (e) { if (!String(e.message).includes('message is not modified')) throw e; return; }
  }
  await api('sendMessage', payload);
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!valid(req)) return res.status(403).json({ ok: false });
  const update = req.body || {};
  try {
    if (update.callback_query) {
      const q = update.callback_query, chatId = q.message && q.message.chat.id;
      if (!chatId || q.message.chat.type !== 'private') return res.status(200).json({ ok: true });
      const isAdmin = String(q.from.id) === String(process.env.TELEGRAM_ADMIN_ID || '');
      const [scope, key] = String(q.data || '').split(':');
      await api('answerCallbackQuery', { callback_query_id: q.id });
      if (scope === 'admin' && !isAdmin) {
        await show(chatId, '⛔ This panel is restricted to the bot administrator.', userKeyboard(), q.message.message_id);
      } else if (scope === 'admin') {
        await show(chatId, adminText(key), adminKeyboard(), q.message.message_id);
      } else if (scope === 'user' || q.data === 'panel:home') {
        const name = q.from.first_name || 'Member';
        await show(chatId, q.data === 'panel:home' ? homeText(name) : pageText(key, name), userKeyboard(), q.message.message_id);
      }
      return res.status(200).json({ ok: true });
    }
    const msg = update.message;
    if (!msg || !msg.chat || msg.chat.type !== 'private' || !/^\/(start|panel|admin)(?:@\w+)?(?:\s|$)/.test(String(msg.text || ''))) return res.status(200).json({ ok: true });
    const command = String(msg.text).split(/\s/)[0].split('@')[0];
    const isAdmin = String(msg.from && msg.from.id) === String(process.env.TELEGRAM_ADMIN_ID || '');
    if (command === '/admin') {
      if (!isAdmin) await show(msg.chat.id, '⛔ Admin access only.', userKeyboard());
      else await show(msg.chat.id, adminText('overview'), adminKeyboard());
    } else if (command === '/panel') {
      await show(msg.chat.id, homeText(msg.from && msg.from.first_name), userKeyboard());
    } else {
      await show(msg.chat.id, homeText(msg.from && msg.from.first_name), userKeyboard());
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('AFGLION Telegram handler error:', String(err.message || 'error').slice(0, 160));
    return res.status(502).json({ ok: false });
  }
};
