# AFGLION — Telegram Mini App

A mobile-first HTML/CSS/JavaScript Telegram Mini App deployed on Vercel with a Firebase Cloud Firestore backend. The visual public Firebase config references the existing **afglion-47b07** project, but **all accounts and AFN balances are accessed through authenticated Vercel functions using Firebase Admin SDK**. The public Firebase web config alone does **not** activate the backend.

## Features

- **Home:** AFN balance, free daily check-in with a 24-hour cooldown, announcements and VIP daily reward claims.
- **Referral:** Telegram `startapp=ref_<id>` invitations. Account association is signed and applied one time on onboarding; 10% default commission on an **approved paid VIP purchase** (not on signup), configurable by admin.
- **VIP:** Admin-configurable price, per-day claim amount and plan length. Defaults: Gold **500 AFN**, **50 AFN** per eligible day for **30 days**; Elite 1,000 AFN, 110 AFN per eligible day for 30 days. The admin approves requests and deducts the price from already-confirmed available wallet funds. Each plan snapshots its approved terms. Each daily reward requires a claim, starting after 24 hours. Missed days do not accumulate.
- **Wallet:** Manual deposit request (amount, method, reference) and manual withdrawal request (amount, method, recipient details), with request history. Deposits do not credit the wallet before approval. Withdrawals reserve the amount instantly and return it on rejection or user cancellation. Requests can be processed only once.
- **Profile:** Telegram identity, edit display name, member status and earnings history.
- **Admin:** Verified Telegram ID allowlist, member access, settings, prices, durations, referral %, free daily bonus, deposit/payout instructions, minimum amounts, and independent approve/reject queues for VIP/deposit/withdrawal.
- **Browser preview:** Public website shows design only; real data requires a Telegram Web App signed session and server credentials.

## Connect the AFGLION Firebase project securely

1. Open the existing Firebase project **afglion-47b07**. Enable **Cloud Firestore** if it is not enabled already.
2. In Firebase Project Settings → **Service accounts**, generate a service-account private key **for afglion-47b07**. **Never put its private key in GitHub, JavaScript, Telegram chat or a public screenshot.**
3. In Vercel → Project `velora-members-club` → Settings → Environment Variables, set:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete private service-account JSON, stored as encrypted/sensitive (Production).
   - `TELEGRAM_BOT_TOKEN`: the secret token for **@Afglionbot**, stored encrypted/sensitive (Production).
   - `ADMIN_TELEGRAM_IDS`: your numerical Telegram user ID (multiple IDs separated by commas). This is **not** a username.
4. Redeploy **Production** after setting the variables. `/api/index?action=health` should then report `backendConfigured:true`. This checks presence of configuration, not Firestore connectivity; sign in via Telegram to test actual operations.
5. Open **@BotFather** and configure **@Afglionbot** Main Mini App / menu URL as `https://velora-members-club.vercel.app`. Open the app from inside Telegram. Set the username in Admin → Settings to `Afglionbot` (the default is already provided).
6. Test with a second Telegram account: sign up → manual deposit → admin approves → VIP request → admin approves → 24-hour claim → referral bonus → withdrawal → admin review. Test rejection and cancellation too.

The frontend file `firebase-config.js` contains the public Web SDK config supplied by the project owner. It **does not include Firebase credentials** and is not used to authorize database writes.

## Existing Firebase project warning

**Do not replace the existing Firestore rules with this repository's example `firestore.rules`** without auditing them first: the existing AFGLION project may host another app, and replacing its rules could break that app. The new application uses namespaced collections (`veloraUsers`, `veloraSettings`, `veloraVipRequests`, `veloraMoneyRequests`, `veloraReferralEvents`, `veloraReferralAwards`) so it does not share member documents with earlier apps. Existing wildcard `allow read, write: if true` rules can still expose those collections; fix such rules or use a separate Firebase project. Firestore Admin SDK bypasses client security rules, so server-side validation and credentials are critical.

## Financial and operational cautions

- The example **500 AFN purchase / 50 AFN daily / 30 days** advertises **1,500 AFN** in scheduled rewards against a **500 AFN** purchase. It is a very high implied return, may be financially unsustainable, and must not be advertised as guaranteed profit. A 10% referral commission increases the operator's liabilities. Obtain appropriate local legal/financial advice before soliciting deposits or launching to real users.
- Admin approval is a recordkeeping action; **the program cannot verify external payments or automatically transfer money**. Inspect and match the real-world receipt before approving deposits and pay withdrawals through your external agreed method.
- AFN fields use integers. Do not treat manually editable balances as a banking ledger or audited payment system.
- Telegram `initData` is verified cryptographically on the server, each API session is HMAC-signed, and admin permissions are checked server-side.
- Referral signup association, VIP purchase/commission, daily claims, manual deposits and withdrawal reservation/release use Firestore transactions to avoid duplicate processing.
- The Admin overview lists the newest 500 users, with sampled VIP/balance statistics. Use aggregates/pagination for growth.
- For regulatory, security and accounting purposes, perform a professional review before a real-money launch.

## Development

```sh
npm install
npm run check
vercel dev
```

Live app: https://velora-members-club.vercel.app
Repository: https://github.com/mkmalakzai/premium-bot
