<a id="english"></a>

# Travel Ops app

**English** · [မြန်မာဘာသာ (Burmese)](#myanmar)

One app for our company work: customers, bookings, trips, visas, passports and air tickets.
It works on a phone and on a computer, and it keeps working without internet.

---

## 1. Open the app

1. Open the app link in **Chrome** (Android or computer) or **Safari** (iPhone).
2. Install it like a normal app:
   - **Android / computer:** Chrome menu **⋮** → **Install app** (or **Add to Home screen**).
   - **iPhone:** **Share** button → **Add to Home Screen**.
3. Open it from your home screen from now on.

## 2. Sign in

The sign-in screen shows the options your company turned on:

- **Email + password** — always there.
- **Continue with Google** — one tap with your Gmail account.
- **Email me a sign-in link** — type your email, open the link we send, and you are in. No password.
- **Create account** — for new staff (if turned on).

1. Choose how you want to sign in. Use the **same email address** every time, so you stay one person.
2. The first sign-in needs internet. After that, the app also opens without internet.
3. A new account must be **approved by an admin**. Until then you see **"Waiting for approval"**. Ask your admin, then press **Check again**.
4. Forgot your password? Press **Forgot password?** and we email you a link.

## 3. The screens

| Screen | What it is for |
|---|---|
| **Overview** | Money and work at a glance: revenue, profit, sales, alerts. |
| **Revenue** | Money by service, country, trip length, destination or town. Compare two things. |
| **Packages** | Trip packages with price, cost and profit. You can change prices here. |
| **Visa** / **Passport** | Move each case step by step. See deadlines. |
| **Tickets** | Air tickets and commission. |
| **Trips** | Agenda and calendar of trips, deadlines and flights. **Add to calendar** puts them in Google Calendar or Apple Calendar. |
| **Heatmaps** | Maps of where customers travel and which towns they come from. |
| **Bookings** | Add, confirm, finish or cancel bookings. |
| **Customers** | Customer list. Passports that expire soon are shown in colour. |
| **Settings** | Your account, sync, currency, install, backup. |
| **Admin** | Only for admins: import data, staff accounts. |

All money is in **kyat (Ks)**. You can show US dollars with the currency menu at the top.

## 4. Offline work and sync

- Every change you make is **saved on your phone first**, then **sent to the company cloud** automatically.
- Changes from other staff **come to your phone** automatically.
- The badge at the top right tells you what is happening:

| Badge | Meaning |
|---|---|
| **Synced** | Everything is up to date. |
| **Syncing…** | Sending and receiving now. |
| **Offline · 3 waiting** | No internet. 3 changes will be sent when internet comes back. Keep working. |
| **Sync problem · retry** | Something went wrong. Tap the badge to try again. If it stays, tell your admin. |

- If two people change **the same record**, the change that reaches the cloud **last** is kept.
- **Do not sign out while changes are waiting.** Signing out removes the company data from this phone (it stays safe in the cloud). The app warns you first.

## 5. For admins

### Approve new people
1. When someone creates an account (or signs in with Google for the first time), a number appears next to **Admin** in the menu.
2. **Admin** → **Staff accounts**. People waiting are at the top, highlighted. You see their name, how they sign in, and when they signed up.
3. Change their role from **pending** to **staff** (or **admin**). Only approve people you know.

### Add someone yourself
**Way A — no email needed (easiest):**
1. **supabase.com** → our project → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Type their email and a **temporary password**. Tick **Auto Confirm User**. Click **Create user**.
3. Give them the temporary password in person. They sign in, then go to **Settings** → **Change password**.

**Way B — invite by email:**
1. **Authentication** → **Users** → **Add user** → **Send invitation**. Type their email.
2. They open the email **on the phone or computer they will use**, tap the link, and the app shows **Choose your password**.
3. The link works **once** and expires. If it fails, send a new invite (or they can use **Forgot password?**).

**Then, for both ways:** they see **"Waiting for approval"**. Approve them as described in **Approve new people** above.

| Role | Can do |
|---|---|
| **pending** | Nothing. Waiting for approval. |
| **staff** | See and change all business data. |
| **admin** | Everything staff can do, plus import data and change roles. |

To stop someone using the app, change their role back to **pending**. The company always keeps at least one admin.

### Import data from a backup file
1. **Admin** → **Import a backup (JSON)** → **Choose file…**
2. The app checks the file first. Nothing changes yet.
   - **Red box:** the file has problems. Fix them and try again.
   - **Yellow box:** please check these points, but you can still import.
3. Choose how to import:
   - **Add to current data** — keeps everything and adds the file's records.
   - **Replace all data** — removes all current data **for everyone**, then loads the file. Type **REPLACE** to confirm.
4. Press **Import**. The data goes to the cloud and to every phone.
5. **Import history** shows who imported what and when.

Backups from the old app version also work. If a phone still has data from the old version, an extra button **"Import data from the old app version on this device"** appears.

### Check the connection
**Admin** → **Connection check** shows how this copy of the app is set up: the app's address, the Supabase project, which sign-in options are on, who is signed in, the sync state, and the **app version**. It lists which settings were found (names only, never keys). Use it first when something does not work, and when a phone seems to run an old version.

## 6. Backups

- **Settings** → **Backup (JSON)** (admins also: **Admin** → **Download full backup**) saves a copy of all data as a file. Do this **every week**. The app reminds you when your last backup is 7 days old or more.
- The file has customer information. Keep it private. Do not post it or email it to people outside the company.

## 7. Privacy and safety rules

- Never share your password. Each person has their own account.
- Sign out on shared or borrowed phones.
- Customer data must never be put on GitHub or any public website.
- The database **service_role** key must never be put in the app or in Vercel. Only the **anon** key goes there.

## 8. One-time setup (for the IT person)

1. **Create the database:** go to **supabase.com** → **New project**. Region: **Southeast Asia (Singapore)**. Save the database password somewhere safe.
2. **Create the tables:** Supabase → **SQL Editor** → paste each file in `supabase/migrations/` in number order (`0001_init.sql`, then `0002_profiles_signin.sql`, …) and press **Run** for each.
3. **Choose who can sign up:** Supabase → **Authentication** → **Sign In / Providers** → "Allow new users to sign up".
   - **On (recommended):** staff create their own account (email, link or Google). They see nothing until an admin approves them. Also add `signup` to `VITE_AUTH_METHODS` (below) to show the **Create account** button.
   - **Off:** invite-only. Only people you add or invite can sign in, with any method.
4. **Set the app's address** (so email links and Google open the app, not `localhost:3000`): Supabase → **Authentication** → **URL Configuration**.
   - **Site URL:** your Vercel address, for example `https://your-app.vercel.app`
   - **Redirect URLs** → **Add URL:** `https://your-app.vercel.app/**`
   - To make sign-in work on Vercel **preview** sites too, also add `https://*-YOUR-VERCEL-TEAM.vercel.app/**`
5. **Create the first admin:**
   1. **Authentication** → **Users** → **Add user** → **Create new user** with the owner's email and a password. Tick **Auto Confirm User**.
   2. **SQL Editor** → run: `update public.profiles set role = 'admin' where email = 'owner@example.com';` (use the real email).
6. **Connect the app:** Supabase → **Project Settings** → **API**. Copy the **Project URL** and the **anon public** key.
   In **Vercel** → our project → **Settings** → **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon public key (the newer name "publishable key" works too)
   - `VITE_AUTH_METHODS` = the sign-in options to show (see below), for example `google,magiclink,signup`
7. **Redeploy:** Vercel → **Deployments** → **Redeploy**. The app now shows the sign-in screen.
8. **Load the first data** (optional): sign in as admin → **Admin** → import a backup file.

Without step 6 the app runs in **local-only mode**: no sign-in, no sync, data stays on each device.

**About emails (invites and "Forgot password?"):** Supabase's built-in email sender is only for testing. It sends very few emails per hour and may only deliver to your own Supabase team members. For staff emails, add your own email sender: Supabase → **Authentication** → **Emails** → **SMTP Settings** (for example a Gmail/Google Workspace, Brevo or Resend account). Until then, use **Way A** (no email) to add staff.

### Sign-in options and the Vercel connection

**Turn options on:** in Vercel → **Settings** → **Environment Variables**, set `VITE_AUTH_METHODS` to a comma list. Email + password is always on, so the admin can never be locked out.

| Value | What appears on the sign-in screen |
|---|---|
| `google` | **Continue with Google** |
| `magiclink` | **Email me a sign-in link** |
| `signup` | **Create account** |

Redeploy after changing it. Each option must also be switched on in Supabase (below). If it is not, the button says "This sign-in method isn't turned on yet".

**Google sign-in (one time):**
1. Google Cloud Console → create or choose a project → set up the **OAuth consent screen** (app name and your email).
2. **Credentials** → **Create credentials** → **OAuth client ID** → type **Web application**.
   - **Authorized JavaScript origins:** your Vercel address (`https://your-app.vercel.app`).
   - **Authorized redirect URIs:** `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` (Supabase shows this exact address on its Google provider page).
3. Copy the **Client ID** and **Client secret**.
4. Supabase → **Authentication** → **Sign In / Providers** → **Google** → turn it on, paste both, **Save**.
5. Add `google` to `VITE_AUTH_METHODS` and redeploy.

Menu names in Google Cloud and Supabase change from time to time. If they differ, follow Supabase's guide "Login with Google".

**Email sign-in link:** Supabase's **Email** provider is on by default. Keep **Confirm email** on. Add `magiclink` to `VITE_AUTH_METHODS`. These emails need a real email sender (see "About emails").

**The Vercel–Supabase integration (optional):** Vercel → **Integrations** (or **Storage**) → **Supabase** → connect the project. It adds variables such as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The app reads those names too, so you do not need to type the `VITE_SUPABASE_…` ones. The integration also adds secret keys (`SUPABASE_SECRET_KEY` and others). The app never reads them, and the build **stops with an error** if a secret key ever ends up in a `VITE_` or `NEXT_PUBLIC_` variable. After you redeploy, **Admin** → **Connection check** shows which names were found.

**Do not turn on CAPTCHA yet.** If you switch on Supabase's CAPTCHA protection, sign-in stops working, because the app does not send the CAPTCHA answer yet.

### Calendar link for Google and Apple Calendar (one time)

People can add the company trips to their own phone calendar. Trips → **Add to calendar** → **Create my link** gives a private link that Google Calendar and Apple Calendar keep up to date by themselves. For this to work, the IT person sets it up once:

1. Supabase → **SQL Editor** → run `supabase/migrations/0003_calendar_feeds.sql` (after 0001 and 0002).
2. Deploy the function in `supabase/functions/calendar` **with the login check switched off** (calendar apps cannot sign in):
   - With the Supabase command line: `supabase functions deploy calendar --no-verify-jwt`
   - Or in the dashboard: **Edge Functions** → **Deploy a new function** → name it `calendar`, create two files `index.ts` and `calendar.ts` with the same text as in the folder, turn **Verify JWT** off, deploy.
3. In the app: **Trips** → **Add to calendar** → choose what to include → **Create my link** → **Add to Google Calendar** or **Add to Apple Calendar**.

Good to know:
- **Keep the link private.** Anyone who has it can see customer names and trip dates. **Make a new link** replaces it (the old one stops working). **Turn off** removes it.
- A link stops working by itself when that person's access is removed in Admin.
- Apple Calendar refreshes about every hour. Google Calendar decides by itself, usually every 12 to 24 hours, so a new trip may take a while to appear. That is Google's rule, not a fault.
- Phone numbers, passport numbers and money are never put in a calendar.
- Without the one-time setup (or without sign-in), **Download .ics file** still works.

## 9. Problems?

| Problem | What to do |
|---|---|
| "You need internet to sign in the first time." | Connect to Wi-Fi or mobile data, then sign in. |
| The app looks old after an update. | Close the app and open it again. |
| **Sync problem** badge does not go away. | Tap it. Check internet. If it stays, tell the admin (they can see the error in **Settings**). |
| Someone left the company. | Admin → **Staff accounts** → set them to **pending**. |
| I deleted something by mistake. | Ask the admin. They can import your latest backup with **Add to current data**. |
| An email link opens `localhost:3000`. | The app's address is not set in Supabase. Do setup step 4, then send a new link. |
| "This email link has expired or was already used." | Links work once and expire. Send a new invite, or press **Forgot password?**. Some email apps open links by themselves, so open the newest email quickly. |
| The invite or reset email never arrives. | Check spam. Supabase's test email sender is very limited; see "About emails" above, or add the person with **Way A**. |
| **Continue with Google** says "This sign-in method isn't turned on yet". | Google is not switched on in Supabase, or not set up. Do the **Google sign-in** steps above. |
| The Google page shows `redirect_uri_mismatch`. | In Google Cloud, **Authorized redirect URIs** must be exactly the `…supabase.co/auth/v1/callback` address from Supabase. |
| I created an account but only see **Waiting for approval**. | That is normal. Ask an admin to approve you (they see a number next to **Admin**). |
| Sign-in works on the main site but not on a preview site. | Add the preview wildcard (`https://*-YOUR-VERCEL-TEAM.vercel.app/**`) to **Redirect URLs** (setup step 4). |
| The sign-in screen has no Google button. | `google` is not in `VITE_AUTH_METHODS`, or you did not redeploy after adding it. Check **Admin** → **Connection check**. |

## For developers

- The app is in `app/` (React + Vite + Dexie). `npm install`, `npm run dev`, `npm test`. The tests include the database access rules, run on an in-memory Postgres.
- The cloud database schema and its access rules are in `supabase/migrations/`.
- Sync design: every record has a UUID, local changes are queued and uploaded, and downloads follow the database's `updated_at` order. Deletes are soft (`deleted = true`). The last change to reach the cloud wins.
- Copy `app/.env.example` to `app/.env.local` to test against a Supabase project. Never commit `.env` files or customer data.

---

<a id="myanmar"></a>

# Travel Ops app (မြန်မာဘာသာ)

[English](#english) · **မြန်မာဘာသာ**

> ဤမြန်မာဘာသာပြန်ကို ဝန်ထမ်းများ အသုံးမပြုမီ မြန်မာစကား ကျွမ်းကျင်သူ တစ်ဦးက ပြန်စစ်ပေးပါ။

ကုမ္ပဏီ၏ အလုပ်များအတွက် app တစ်ခုတည်း ဖြစ်ပါသည် — ဖောက်သည်များ၊ booking များ၊ ခရီးစဉ်များ၊ ဗီဇာ၊ ပတ်စ်ပို့နှင့် လေယာဉ်လက်မှတ်များ။
ဖုန်းနှင့် ကွန်ပျူတာ နှစ်မျိုးလုံးတွင် သုံးနိုင်ပြီး အင်တာနက် မရှိလည်း ဆက်သုံးနိုင်ပါသည်။

---

## ၁။ App ကို ဖွင့်ခြင်း

1. App link ကို **Chrome** (Android သို့မဟုတ် ကွန်ပျူတာ) သို့မဟုတ် **Safari** (iPhone) ဖြင့် ဖွင့်ပါ။
2. သာမန် app ကဲ့သို့ install လုပ်ပါ —
   - **Android / ကွန်ပျူတာ:** Chrome menu **⋮** → **Install app** (သို့မဟုတ် **Add to Home screen**)။
   - **iPhone:** **Share** ခလုတ် → **Add to Home Screen**။
3. နောက်ပိုင်းတွင် home screen မှ ဖွင့်ပါ။

## ၂။ Sign in ဝင်ခြင်း

Sign-in စာမျက်နှာတွင် သင့်ကုမ္ပဏီ ဖွင့်ထားသော နည်းလမ်းများကို ပြပါသည် —

- **Email + password** — အမြဲ ရှိပါသည်။
- **Continue with Google** — Gmail account ဖြင့် တစ်ချက်နှိပ်ရုံ။
- **Email me a sign-in link** — email ရိုက်ပြီး ပို့လာသော link ကို ဖွင့်ပါ။ Password မလိုပါ။
- **Create account** — ဝန်ထမ်းအသစ်များအတွက် (ဖွင့်ထားလျှင်)။

1. Sign in ဝင်လိုသော နည်းလမ်းကို ရွေးပါ။ တစ်လူတည်း ဖြစ်စေရန် **email လိပ်စာ တူတူ**ကို အမြဲသုံးပါ။
2. ပထမဆုံးအကြိမ် sign in ဝင်ရန် အင်တာနက် လိုပါသည်။ ထို့နောက် အင်တာနက် မရှိလည်း app ပွင့်ပါသည်။
3. Account အသစ်ကို **admin က ခွင့်ပြုရပါမည်**။ ထိုအချိန်အထိ **"Waiting for approval"** ကို မြင်ရပါမည်။ Admin ကို ပြောပြီး **Check again** ကို နှိပ်ပါ။
4. Password မေ့သွားလျှင် **Forgot password?** ကို နှိပ်ပါ။ Link တစ်ခုကို email ဖြင့် ပို့ပေးပါမည်။

## ၃။ စာမျက်နှာများ

| စာမျက်နှာ | အသုံးဝင်ပုံ |
|---|---|
| **Overview** | ဝင်ငွေ၊ အမြတ်၊ အရောင်း၊ သတိပေးချက်များကို တစ်ချက်တည်း ကြည့်ရန်။ |
| **Revenue** | ဝန်ဆောင်မှု၊ နိုင်ငံ၊ ခရီးရက်၊ သွားမည့်နေရာ သို့မဟုတ် မြို့အလိုက် ဝင်ငွေ။ နှစ်ခုကို နှိုင်းယှဉ်နိုင်သည်။ |
| **Packages** | ခရီးစဉ် package များ၏ ဈေး၊ ကုန်ကျစရိတ်နှင့် အမြတ်။ ဈေးကို ဤနေရာတွင် ပြင်နိုင်သည်။ |
| **Visa** / **Passport** | Case တစ်ခုချင်းစီကို အဆင့်လိုက် ရွှေ့ရန်။ နောက်ဆုံးရက်များကို ကြည့်ရန်။ |
| **Tickets** | လေယာဉ်လက်မှတ်များနှင့် commission။ |
| **Trips** | ခရီးစဉ်၊ နောက်ဆုံးရက်နှင့် လေယာဉ်ခရီးများ၏ အစီအစဉ်နှင့် ပြက္ခဒိန်။ **Add to calendar** ဖြင့် Google Calendar သို့မဟုတ် Apple Calendar ထဲသို့ ထည့်နိုင်ပါသည်။ |
| **Heatmaps** | ဖောက်သည်များ ခရီးသွားသည့်နေရာနှင့် လာရာမြို့များကို မြေပုံဖြင့် ပြသည်။ |
| **Bookings** | Booking ထည့်ရန်၊ အတည်ပြုရန်၊ ပြီးဆုံးရန် သို့မဟုတ် ပယ်ဖျက်ရန်။ |
| **Customers** | ဖောက်သည်စာရင်း။ မကြာမီ သက်တမ်းကုန်မည့် ပတ်စ်ပို့များကို အရောင်ဖြင့် ပြသည်။ |
| **Settings** | သင့် account၊ sync၊ ငွေကြေး၊ install၊ backup။ |
| **Admin** | Admin များအတွက်သာ — data သွင်းရန်၊ ဝန်ထမ်း account များ။ |

ငွေပမာဏ အားလုံးကို **ကျပ် (Ks)** ဖြင့် သိမ်းပါသည်။ အပေါ်ရှိ ငွေကြေး menu ဖြင့် US ဒေါ်လာ ပြောင်းကြည့်နိုင်ပါသည်။

## ၄။ အင်တာနက်မဲ့ အလုပ်လုပ်ခြင်းနှင့် Sync

- သင် ပြင်ဆင်သမျှကို **ဖုန်းထဲတွင် အရင်သိမ်း**ပြီး **ကုမ္ပဏီ cloud သို့ အလိုအလျောက် ပို့**ပါသည်။
- အခြားဝန်ထမ်းများ ပြင်ဆင်ချက်များလည်း **သင့်ဖုန်းသို့ အလိုအလျောက် ရောက်လာ**ပါသည်။
- ညာဘက်အပေါ်ရှိ badge က ဖြစ်နေသည်ကို ပြပါသည် —

| Badge | အဓိပ္ပာယ် |
|---|---|
| **Synced** | အားလုံး နောက်ဆုံးအခြေအနေ ဖြစ်နေသည်။ |
| **Syncing…** | ယခု ပို့နေ၊ လက်ခံနေသည်။ |
| **Offline · 3 waiting** | အင်တာနက် မရှိပါ။ အင်တာနက် ပြန်ရလျှင် ပြင်ဆင်ချက် ၃ ခု ပို့ပါမည်။ ဆက်လုပ်နိုင်သည်။ |
| **Sync problem · retry** | အမှားတစ်ခု ဖြစ်နေသည်။ Badge ကို နှိပ်ပြီး ထပ်ကြိုးစားပါ။ ဆက်ဖြစ်နေလျှင် admin ကို ပြောပါ။ |

- လူနှစ်ယောက်က **record တစ်ခုတည်း**ကို ပြင်လျှင် cloud သို့ **နောက်ဆုံးရောက်သော** ပြင်ဆင်ချက်ကို သိမ်းပါသည်။
- **ပို့ရန် ကျန်နေသော ပြင်ဆင်ချက်များ ရှိနေစဉ် sign out မလုပ်ပါနှင့်။** Sign out လုပ်လျှင် ဤဖုန်းမှ ကုမ္ပဏီ data များကို ဖယ်ရှားပါသည် (cloud ထဲတွင် ဘေးကင်းစွာ ကျန်ပါသည်)။ App က အရင် သတိပေးပါမည်။

## ၅။ Admin များအတွက်

### လူသစ်များကို ခွင့်ပြုခြင်း
1. တစ်စုံတစ်ယောက်က account ဖန်တီးလျှင် (သို့မဟုတ် Google ဖြင့် ပထမဆုံး sign in ဝင်လျှင်) menu ရှိ **Admin** ဘေးတွင် ဂဏန်းတစ်ခု ပေါ်လာပါမည်။
2. **Admin** → **Staff accounts**။ စောင့်နေသူများကို အပေါ်ဆုံးတွင် အရောင်ထင်ပြပါသည်။ ၎င်းတို့၏ အမည်၊ sign in ဝင်ပုံနှင့် စာရင်းသွင်းသည့်ရက်ကို မြင်ရပါမည်။
3. Role ကို **pending** မှ **staff** (သို့မဟုတ် **admin**) သို့ ပြောင်းပါ။ သင်သိသော လူများကိုသာ ခွင့်ပြုပါ။

### ကိုယ်တိုင် လူထည့်ခြင်း
**နည်းလမ်း A — email မလိုပါ (အလွယ်ဆုံး):**
1. **supabase.com** → ကုမ္ပဏီ project → **Authentication** → **Users** → **Add user** → **Create new user**။
2. ၎င်း၏ email နှင့် **ယာယီ password** တစ်ခု ရိုက်ပါ။ **Auto Confirm User** ကို အမှန်ခြစ်ပါ။ **Create user** ကို နှိပ်ပါ။
3. ယာယီ password ကို ၎င်းကို လူကိုယ်တိုင် ပေးပါ။ ၎င်းက sign in ဝင်ပြီး **Settings** → **Change password** ဖြင့် ပြောင်းပါ။

**နည်းလမ်း B — email ဖြင့် ဖိတ်ခြင်း:**
1. **Authentication** → **Users** → **Add user** → **Send invitation**။ ၎င်း၏ email ကို ရိုက်ပါ။
2. ၎င်းက **အသုံးပြုမည့် ဖုန်း သို့မဟုတ် ကွန်ပျူတာ** တွင် email ကို ဖွင့်ပြီး link ကို နှိပ်ပါ။ App တွင် **Choose your password** ပေါ်လာပါမည်။
3. Link သည် **တစ်ကြိမ်သာ** အလုပ်လုပ်ပြီး သက်တမ်းကုန်ပါသည်။ မအောင်မြင်လျှင် invite အသစ် ပို့ပါ (သို့မဟုတ် **Forgot password?** ကို သုံးပါ)။

**ထို့နောက် နည်းလမ်း နှစ်ခုလုံးအတွက်:** ၎င်းက **"Waiting for approval"** ကို မြင်ရပါမည်။ အထက်ပါ **လူသစ်များကို ခွင့်ပြုခြင်း** အတိုင်း ခွင့်ပြုပါ။

| Role | လုပ်နိုင်သည် |
|---|---|
| **pending** | ဘာမျှ မလုပ်နိုင်ပါ။ ခွင့်ပြုချက် စောင့်နေသည်။ |
| **staff** | လုပ်ငန်း data အားလုံးကို ကြည့်ပြီး ပြင်နိုင်သည်။ |
| **admin** | Staff လုပ်နိုင်သမျှ အပြင် data သွင်းခြင်းနှင့် role ပြောင်းခြင်း။ |

တစ်စုံတစ်ယောက်ကို app မသုံးစေလိုလျှင် ၎င်း၏ role ကို **pending** သို့ ပြန်ပြောင်းပါ။ ကုမ္ပဏီတွင် admin အနည်းဆုံး တစ်ဦး အမြဲရှိရပါမည်။

### Backup ဖိုင်မှ data သွင်းခြင်း
1. **Admin** → **Import a backup (JSON)** → **Choose file…**
2. App က ဖိုင်ကို အရင် စစ်ဆေးပါသည်။ ဘာမျှ မပြောင်းသေးပါ။
   - **အနီရောင်ကွက်:** ဖိုင်တွင် ပြဿနာ ရှိသည်။ ပြင်ပြီး ထပ်ကြိုးစားပါ။
   - **အဝါရောင်ကွက်:** ဤအချက်များကို စစ်ပါ၊ သို့သော် သွင်းနိုင်ပါသည်။
3. သွင်းပုံကို ရွေးပါ —
   - **Add to current data** — ရှိပြီးသား data အားလုံး ထားပြီး ဖိုင်ထဲမှ record များကို ထပ်ထည့်သည်။
   - **Replace all data** — **လူတိုင်းအတွက်** လက်ရှိ data အားလုံးကို ဖယ်ပြီး ဖိုင်ကို သွင်းသည်။ အတည်ပြုရန် **REPLACE** ဟု ရိုက်ပါ။
4. **Import** ကို နှိပ်ပါ။ Data များ cloud နှင့် ဖုန်းတိုင်းသို့ ရောက်ပါမည်။
5. **Import history** တွင် မည်သူက မည်သည့်အချိန်တွင် ဘာသွင်းခဲ့သည်ကို ပြပါသည်။

App ဗားရှင်းဟောင်းမှ backup များလည်း သုံးနိုင်ပါသည်။ ဖုန်းတစ်လုံးတွင် ဗားရှင်းဟောင်း data ကျန်နေလျှင် **"Import data from the old app version on this device"** ခလုတ် ပေါ်လာပါမည်။

### ချိတ်ဆက်မှု စစ်ဆေးခြင်း
**Admin** → **Connection check** တွင် ဤ app ကို မည်သို့ ပြင်ဆင်ထားသည်ကို ပြပါသည် — app ၏ လိပ်စာ၊ Supabase project၊ ဖွင့်ထားသော sign-in နည်းလမ်းများ၊ sign in ဝင်ထားသူ၊ sync အခြေအနေနှင့် **app ဗားရှင်း**။ တွေ့ရှိသော setting များ၏ အမည်များကိုသာ ပြပါသည် (key များကို ဘယ်တော့မှ မပြပါ)။ တစ်ခုခု အလုပ်မလုပ်လျှင်၊ ဖုန်းတစ်လုံးက ဗားရှင်းဟောင်း သုံးနေဟန်ရှိလျှင် ဤနေရာကို အရင်ကြည့်ပါ။

## ၆။ Backup များ

- **Settings** → **Backup (JSON)** (admin များက **Admin** → **Download full backup** ကိုလည်း သုံးနိုင်သည်) ဖြင့် data အားလုံးကို ဖိုင်အဖြစ် သိမ်းနိုင်ပါသည်။ **အပတ်တိုင်း** လုပ်ပါ။ နောက်ဆုံး backup မှ ရက် ၇ ရက် သို့မဟုတ် ပိုကြာလျှင် app က သတိပေးပါမည်။
- ဖိုင်ထဲတွင် ဖောက်သည် အချက်အလက်များ ပါပါသည်။ လျှို့ဝှက်စွာ ထားပါ။ ကုမ္ပဏီပြင်ပ လူများထံ မတင်ပါနှင့်၊ email မပို့ပါနှင့်။

## ၇။ ကိုယ်ရေးအချက်အလက်နှင့် လုံခြုံရေး စည်းကမ်းများ

- သင့် password ကို ဘယ်သူ့ကိုမှ မပေးပါနှင့်။ လူတိုင်း ကိုယ်ပိုင် account ရှိရပါမည်။
- မျှဝေသုံးသော သို့မဟုတ် ငှားထားသော ဖုန်းများတွင် sign out လုပ်ပါ။
- ဖောက်သည် data ကို GitHub သို့မဟုတ် အများသုံး website တွင် ဘယ်တော့မှ မတင်ရပါ။
- Database ၏ **service_role** key ကို app ထဲ သို့မဟုတ် Vercel ထဲ ဘယ်တော့မှ မထည့်ရပါ။ **anon** key ကိုသာ ထည့်ပါ။

## ၈။ တစ်ကြိမ်တည်း setup (IT တာဝန်ခံအတွက်)

1. **Database ဖန်တီးရန်:** **supabase.com** → **New project**။ Region: **Southeast Asia (Singapore)**။ Database password ကို လုံခြုံသောနေရာတွင် သိမ်းပါ။
2. **Table များ ဖန်တီးရန်:** Supabase → **SQL Editor** → `supabase/migrations/` ထဲရှိ ဖိုင်များကို နံပါတ်စဉ်အတိုင်း (`0001_init.sql`၊ ထို့နောက် `0002_profiles_signin.sql`၊ …) တစ်ဖိုင်ချင်း paste လုပ်ပြီး တစ်ခုချင်း **Run** ပါ။
3. **Sign-up ကို ဘယ်သူ လုပ်နိုင်မလဲ ရွေးရန်:** Supabase → **Authentication** → **Sign In / Providers** → "Allow new users to sign up"။
   - **ဖွင့်ထားခြင်း (အကြံပြု):** ဝန်ထမ်းများက ကိုယ်တိုင် account ဖန်တီးနိုင်သည် (email၊ link သို့မဟုတ် Google ဖြင့်)။ Admin ခွင့်မပြုမချင်း ဘာမျှ မမြင်ရပါ။ **Create account** ခလုတ် ပေါ်စေရန် `VITE_AUTH_METHODS` (အောက်တွင်) ထဲသို့ `signup` ကိုလည်း ထည့်ပါ။
   - **ပိတ်ထားခြင်း:** ဖိတ်ခေါ်မှုဖြင့်သာ။ သင်ထည့်ထားသော သို့မဟုတ် ဖိတ်ထားသော လူများသာ နည်းလမ်းမည်သို့ပင်ဖြစ်စေ sign in ဝင်နိုင်ပါသည်။
4. **App ၏ လိပ်စာ သတ်မှတ်ရန်** (email link နှင့် Google က `localhost:3000` မဟုတ်ဘဲ app ကို ဖွင့်စေရန်): Supabase → **Authentication** → **URL Configuration**။
   - **Site URL:** သင့် Vercel လိပ်စာ၊ ဥပမာ `https://your-app.vercel.app`
   - **Redirect URLs** → **Add URL:** `https://your-app.vercel.app/**`
   - Vercel **preview** website များတွင်ပါ sign in အလုပ်လုပ်စေရန် `https://*-YOUR-VERCEL-TEAM.vercel.app/**` ကိုလည်း ထည့်ပါ။
5. **ပထမ admin ဖန်တီးရန်:**
   1. **Authentication** → **Users** → **Add user** → **Create new user** ဖြင့် ပိုင်ရှင်၏ email နှင့် password ကို ထည့်ပါ။ **Auto Confirm User** ကို အမှန်ခြစ်ပါ။
   2. **SQL Editor** တွင် run ပါ: `update public.profiles set role = 'admin' where email = 'owner@example.com';` (email အစစ်ကို သုံးပါ)။
6. **App ကို ချိတ်ရန်:** Supabase → **Project Settings** → **API**။ **Project URL** နှင့် **anon public** key ကို copy ယူပါ။
   **Vercel** → ကုမ္ပဏီ project → **Settings** → **Environment Variables** တွင် ထည့်ပါ —
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key ("publishable key" ဟူသော အမည်အသစ်ကိုလည်း သုံးနိုင်သည်)
   - `VITE_AUTH_METHODS` = ပြသလိုသော sign-in နည်းလမ်းများ (အောက်တွင်ကြည့်ပါ)၊ ဥပမာ `google,magiclink,signup`
7. **ပြန် deploy လုပ်ရန်:** Vercel → **Deployments** → **Redeploy**။ ယခု app တွင် sign-in စာမျက်နှာ ပေါ်လာပါမည်။
8. **ပထမ data သွင်းရန်** (မဖြစ်မနေ မဟုတ်): admin အဖြစ် sign in ဝင် → **Admin** → backup ဖိုင် သွင်းပါ။

အဆင့် ၆ မလုပ်ရသေးလျှင် app သည် **local-only mode** ဖြင့် အလုပ်လုပ်ပါသည် — sign in မလို၊ sync မရှိ၊ data သည် စက်တစ်လုံးချင်းစီတွင်သာ ရှိပါသည်။

**Email များအကြောင်း (invite နှင့် "Forgot password?"):** Supabase ၏ မူလ email ပို့စနစ်သည် စမ်းသပ်ရန်သာ ဖြစ်ပါသည်။ တစ်နာရီလျှင် email အနည်းငယ်သာ ပို့နိုင်ပြီး သင့် Supabase team အဖွဲ့ဝင်များထံသာ ပို့နိုင်နိုင်ပါသည်။ ဝန်ထမ်းများအတွက် ကိုယ်ပိုင် email ပို့စနစ် ထည့်ပါ: Supabase → **Authentication** → **Emails** → **SMTP Settings** (ဥပမာ Gmail/Google Workspace၊ Brevo သို့မဟုတ် Resend account)။ ထိုအချိန်အထိ ဝန်ထမ်းများကို **နည်းလမ်း A** (email မလို) ဖြင့် ထည့်ပါ။

### Sign-in နည်းလမ်းများနှင့် Vercel ချိတ်ဆက်မှု

**နည်းလမ်းများ ဖွင့်ရန်:** Vercel → **Settings** → **Environment Variables** တွင် `VITE_AUTH_METHODS` ကို comma ခံ စာရင်းတစ်ခုအဖြစ် သတ်မှတ်ပါ။ Email + password သည် အမြဲ ဖွင့်ထားသဖြင့် admin သည် ဘယ်တော့မှ ဝင်မရတော့မည့်အဖြစ် မရောက်ပါ။

| တန်ဖိုး | Sign-in စာမျက်နှာတွင် ပေါ်လာသည့်အရာ |
|---|---|
| `google` | **Continue with Google** |
| `magiclink` | **Email me a sign-in link** |
| `signup` | **Create account** |

ပြောင်းပြီးနောက် ပြန် deploy လုပ်ပါ။ နည်းလမ်းတိုင်းကို Supabase တွင်လည်း ဖွင့်ထားရပါမည် (အောက်တွင်)။ မဖွင့်ထားလျှင် ခလုတ်က "This sign-in method isn't turned on yet" ဟု ပြပါမည်။

**Google sign-in (တစ်ကြိမ်တည်း):**
1. Google Cloud Console → project တစ်ခု ဖန်တီးပါ သို့မဟုတ် ရွေးပါ → **OAuth consent screen** ကို ပြင်ဆင်ပါ (app အမည်နှင့် သင့် email)။
2. **Credentials** → **Create credentials** → **OAuth client ID** → အမျိုးအစား **Web application**။
   - **Authorized JavaScript origins:** သင့် Vercel လိပ်စာ (`https://your-app.vercel.app`)။
   - **Authorized redirect URIs:** `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` (Supabase ၏ Google provider စာမျက်နှာတွင် ဤလိပ်စာအတိအကျကို ပြပါသည်)။
3. **Client ID** နှင့် **Client secret** ကို copy ယူပါ။
4. Supabase → **Authentication** → **Sign In / Providers** → **Google** → ဖွင့်ပြီး နှစ်ခုလုံး paste လုပ်ကာ **Save** ပါ။
5. `VITE_AUTH_METHODS` ထဲသို့ `google` ထည့်ပြီး ပြန် deploy လုပ်ပါ။

Google Cloud နှင့် Supabase ၏ menu အမည်များသည် အချိန်အလိုက် ပြောင်းတတ်ပါသည်။ ကွဲပြားလျှင် Supabase ၏ "Login with Google" လမ်းညွှန်ကို လိုက်နာပါ။

**Email sign-in link:** Supabase ၏ **Email** provider သည် မူလအတိုင်း ဖွင့်ထားပါသည်။ **Confirm email** ကို ဖွင့်ထားပါ။ `VITE_AUTH_METHODS` ထဲသို့ `magiclink` ထည့်ပါ။ ဤ email များ ပို့ရန် အစစ်အမှန် email ပို့စနစ် လိုအပ်ပါသည် ("Email များအကြောင်း" ကိုကြည့်ပါ)။

**Vercel–Supabase integration (မဖြစ်မနေ မဟုတ်):** Vercel → **Integrations** (သို့မဟုတ် **Storage**) → **Supabase** → project ကို ချိတ်ပါ။ ၎င်းက `NEXT_PUBLIC_SUPABASE_URL` နှင့် `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ကဲ့သို့ variable များ ထည့်ပေးပါသည်။ App က ထိုအမည်များကိုလည်း ဖတ်သဖြင့် `VITE_SUPABASE_…` များကို ကိုယ်တိုင် ရိုက်ရန် မလိုပါ။ Integration က secret key များ (`SUPABASE_SECRET_KEY` စသည်) ကိုလည်း ထည့်ပါသည်။ App က ၎င်းတို့ကို ဘယ်တော့မှ မဖတ်ပါ၊ secret key တစ်ခုခု `VITE_` သို့မဟုတ် `NEXT_PUBLIC_` variable ထဲ ရောက်နေလျှင် build က error ပြပြီး **ရပ်သွားပါမည်**။ ပြန် deploy လုပ်ပြီးနောက် **Admin** → **Connection check** တွင် မည်သည့်အမည်များ တွေ့ရှိသည်ကို ကြည့်နိုင်ပါသည်။

**CAPTCHA ကို ယခု မဖွင့်ပါနှင့်။** Supabase ၏ CAPTCHA ကာကွယ်မှုကို ဖွင့်လျှင် app က CAPTCHA အဖြေကို မပို့သေးသဖြင့် sign in ဝင်၍ မရတော့ပါ။

### Google နှင့် Apple Calendar အတွက် calendar link (တစ်ကြိမ်တည်း)

ကုမ္ပဏီ၏ ခရီးစဉ်များကို မိမိဖုန်း calendar ထဲသို့ ထည့်နိုင်ပါသည်။ Trips → **Add to calendar** → **Create my link** ကိုနှိပ်လျှင် Google Calendar နှင့် Apple Calendar က ကိုယ်တိုင် ပြန်ပြန်စစ်ပေးသည့် ကိုယ်ပိုင် link ရပါမည်။ ဤအတွက် IT တာဝန်ခံက တစ်ကြိမ်တည်း setup လုပ်ပေးရပါမည်-

1. Supabase → **SQL Editor** → `supabase/migrations/0003_calendar_feeds.sql` ကို run ပါ (0001 နှင့် 0002 ပြီးမှ)။
2. `supabase/functions/calendar` ထဲက function ကို **login စစ်ဆေးမှု ပိတ်ပြီး** deploy လုပ်ပါ (calendar app များက sign in မဝင်နိုင်၍)-
   - Supabase command line ဖြင့်- `supabase functions deploy calendar --no-verify-jwt`
   - သို့မဟုတ် dashboard တွင်- **Edge Functions** → **Deploy a new function** → အမည် `calendar` ပေးပါ၊ folder ထဲက စာသားအတိုင်း ဖိုင်နှစ်ခု `index.ts` နှင့် `calendar.ts` ဖန်တီးပါ၊ **Verify JWT** ကို ပိတ်ပြီး deploy လုပ်ပါ။
3. App တွင်- **Trips** → **Add to calendar** → ထည့်လိုသည့်အရာများ ရွေးပါ → **Create my link** → **Add to Google Calendar** သို့မဟုတ် **Add to Apple Calendar**။

သိထားသင့်သည်များ-
- **Link ကို လျှို့ဝှက်ထားပါ။** Link ရှိသူတိုင်း ဖောက်သည်အမည်နှင့် ခရီးစဉ်ရက်များကို မြင်နိုင်ပါသည်။ **Make a new link** က အသစ်လဲပေးပြီး အဟောင်း ရပ်သွားပါမည်။ **Turn off** က ဖယ်ရှားပါသည်။
- Admin တွင် ထိုသူ၏ ဝင်ခွင့်ကို ဖယ်လိုက်လျှင် သူ၏ link သည် အလိုအလျောက် ရပ်သွားပါမည်။
- Apple Calendar သည် တစ်နာရီခန့်တစ်ကြိမ် ပြန်စစ်ပါသည်။ Google Calendar သည် ကိုယ်ပိုင်စည်းမျဉ်းဖြင့် များသောအားဖြင့် ၁၂ နာရီမှ ၂၄ နာရီအတွင်း ပြန်စစ်သဖြင့် ခရီးစဉ်အသစ် ပေါ်လာရန် အချိန်ယူနိုင်ပါသည်။ ၎င်းသည် Google ၏ စည်းမျဉ်းဖြစ်ပြီး အမှားမဟုတ်ပါ။
- ဖုန်းနံပါတ်၊ passport နံပါတ်နှင့် ငွေကြေးကို calendar ထဲ ဘယ်တော့မှ မထည့်ပါ။
- တစ်ကြိမ်တည်း setup မလုပ်ရသေးလျှင် (သို့မဟုတ် sign in မဝင်ထားလျှင်) **Download .ics file** က ဆက်လက် အသုံးပြုနိုင်ပါသည်။

## ၉။ ပြဿနာ ရှိပါသလား

| ပြဿနာ | လုပ်ရမည့်အရာ |
|---|---|
| "You need internet to sign in the first time." | Wi-Fi သို့မဟုတ် mobile data ချိတ်ပြီး sign in ဝင်ပါ။ |
| Update ပြီးနောက် app ဟောင်းပုံ ပေါ်နေသည်။ | App ကို ပိတ်ပြီး ပြန်ဖွင့်ပါ။ |
| **Sync problem** badge မပျောက်ပါ။ | ၎င်းကို နှိပ်ပါ။ အင်တာနက် စစ်ပါ။ ဆက်ဖြစ်နေလျှင် admin ကို ပြောပါ (admin က **Settings** တွင် အမှားကို မြင်နိုင်သည်)။ |
| တစ်စုံတစ်ယောက် ကုမ္ပဏီမှ ထွက်သွားသည်။ | Admin → **Staff accounts** → ၎င်းကို **pending** သို့ ပြောင်းပါ။ |
| မှားပြီး တစ်ခုခု ဖျက်မိသည်။ | Admin ကို ပြောပါ။ နောက်ဆုံး backup ကို **Add to current data** ဖြင့် ပြန်သွင်းနိုင်ပါသည်။ |
| Email link က `localhost:3000` ကို ဖွင့်သည်။ | Supabase တွင် app ၏ လိပ်စာ မသတ်မှတ်ရသေးပါ။ Setup အဆင့် ၄ ကို လုပ်ပြီး link အသစ် ပို့ပါ။ |
| "This email link has expired or was already used." | Link များ တစ်ကြိမ်သာ အလုပ်လုပ်ပြီး သက်တမ်းကုန်ပါသည်။ Invite အသစ် ပို့ပါ သို့မဟုတ် **Forgot password?** ကို နှိပ်ပါ။ Email app အချို့က link များကို အလိုအလျောက် ဖွင့်တတ်သဖြင့် နောက်ဆုံး email ကို မြန်မြန် ဖွင့်ပါ။ |
| Invite သို့မဟုတ် reset email မရောက်ပါ။ | Spam ကို စစ်ပါ။ Supabase ၏ စမ်းသပ် email စနစ်သည် အလွန် ကန့်သတ်ထားပါသည်။ အထက်ပါ "Email များအကြောင်း" ကို ကြည့်ပါ သို့မဟုတ် **နည်းလမ်း A** ဖြင့် ထည့်ပါ။ |
| **Continue with Google** က "This sign-in method isn't turned on yet" ဟု ပြသည်။ | Supabase တွင် Google ကို မဖွင့်ရသေးပါ သို့မဟုတ် မပြင်ဆင်ရသေးပါ။ အထက်ပါ **Google sign-in** အဆင့်များကို လုပ်ပါ။ |
| Google စာမျက်နှာတွင် `redirect_uri_mismatch` ပေါ်သည်။ | Google Cloud ရှိ **Authorized redirect URIs** သည် Supabase မှ ပေးသော `…supabase.co/auth/v1/callback` လိပ်စာ အတိအကျ ဖြစ်ရပါမည်။ |
| Account ဖန်တီးပြီးပြီ၊ **Waiting for approval** သာ မြင်ရသည်။ | ပုံမှန်ပါ။ Admin ကို ခွင့်ပြုပေးရန် ပြောပါ (admin က **Admin** ဘေးတွင် ဂဏန်းတစ်ခု မြင်ရပါမည်)။ |
| Website အဓိကတွင် sign in အလုပ်လုပ်သော်လည်း preview website တွင် မလုပ်ပါ။ | Preview wildcard (`https://*-YOUR-VERCEL-TEAM.vercel.app/**`) ကို **Redirect URLs** ထဲ ထည့်ပါ (setup အဆင့် ၄)။ |
| Sign-in စာမျက်နှာတွင် Google ခလုတ် မရှိပါ။ | `VITE_AUTH_METHODS` ထဲ `google` မပါပါ၊ သို့မဟုတ် ထည့်ပြီးနောက် ပြန် deploy မလုပ်ရသေးပါ။ **Admin** → **Connection check** ကို ကြည့်ပါ။ |
