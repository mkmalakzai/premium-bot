# VELORA — Telegram Mini App

Elegant, mobile-first, vanilla **HTML + CSS + JavaScript** Mini App. Firebase **Cloud Firestore** is the database, accessed exclusively from secure Vercel Node functions. The frontend never receives the Firebase service account, Telegram bot token, or database admin privileges.

## Features

- **Home:** Points balance, daily reward with a server-validated 24-hour cooldown, member summary, announcements.
- **Referral:** Unique Telegram startapp links, cryptographically verified Telegram onboarding, **one-time** referral reward in a Firestore transaction, invite list.
- **VIP:** Essential / Gold / Elite membership cards, VIP requests and admin approval; **no fake payment system**.
- **Profile:** Editable display name, rewards history, member information.
- **Admin:** Admin ID allowlist (server-side), overview, member search, grant/revoke Gold/Elite, credit points, ban/unban, approve/reject VIP requests, configure announcement and point rewards.
- **Preview:** Browser-only design preview when not opened from Telegram. Preview never writes user data.

## Connect your own Firebase project

1. Create a dedicated Firebase project at https://console.firebase.google.com/ . Enable **Cloud Firestore** (not Realtime Database).
2. Go to Project Settings → Service accounts → Generate new private key. Do not publish the JSON. Copy its JSON contents privately into a **Vercel encrypted environment variable** named `FIREBASE_SERVICE_ACCOUNT_JSON`.
3. In Firestore → Rules, paste `firestore.rules` and **publish**. Direct client reads/writes are denied; only the Admin SDK function has database access.
4. Create a Telegram bot via @BotFather. Add its token privately as Vercel environment variable `TELEGRAM_BOT_TOKEN`.
5. Find your numerical Telegram ID through a trusted ID bot or your own Telegram integration. Add it to `ADMIN_TELEGRAM_IDS` on Vercel (comma-separated for multiple admins). **Do not use public URL parameters as admin authorization.**
6. Set all three Vercel environment variables for **Production** (and Preview if needed), then redeploy from the Vercel dashboard to include them.
7. Open your Velora URL from the **Telegram bot's menu button / Main Mini App** configured in @BotFather. A normal browser intentionally displays preview mode because Telegram authentication is absent.
8. Open Profile → Admin console → Settings. Set **Telegram bot username** without @, so referral links can be generated.

## Important deployment and security notes

- `/api/index?action=auth` validates Telegram's signed `initData` hash and checks that `auth_date` is within 10 minutes. **Telegram initDataUnsafe is never trusted by the server.**
- Each authenticated session has a seven-day HMAC-signed token. API functions check ban status and admin IDs server-side.
- Referral bonuses and initial account creation happen in a single Firestore transaction. Refreshing or returning from Telegram cannot give the same referral twice. Changing referral URL does not affect an existing account's referrer.
- Daily claims, user VIP changes, user credits, and VIP approvals are Firestore transactions.
- Never store service account keys in GitHub, the frontend, Telegram chat, or client-visible Vercel environment variables.
- VIP is **manual**: the request creates a review item. The app does not charge users or accept real payment.
- Points are in-app rewards; no financial value, payout, or wallet implied.
- Admin overview lists the newest 500 accounts; its VIP/points totals are based on these 500 (the total members count is a Firestore count query). For production scale, replace the sampled totals with server-maintained aggregates.
- The latest 100 referrals are displayed. For larger-scale projects, add pagination.

## Run locally

```sh
npm install
npm run check
vercel dev
```

The site renders a polished preview without Firebase, but live Telegram functions require the Vercel environment variables.

## Structure

```
index.html              # Site shell
styles.css              # Responsive luxury theme
app.js                  # Four sections and admin UI
api/index.js            # Vercel serverless function + Firestore Admin SDK
firestore.rules         # Deny direct client database access
.env.example            # Environment variable names only
vercel.json             # Deployment settings
```

Built with care for a new, separate project.
