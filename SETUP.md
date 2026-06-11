# Setup Guide

This guide walks you through setting up your own recipe box. It takes about 10–15 minutes. You'll need free accounts on three services: **Supabase** (database), **Google AI Studio** (recipe parsing), and **Vercel** (hosting). No coding experience needed.

---

## 1. Set up Supabase (your database)

1. Go to [supabase.com](https://supabase.com) and sign up for a free account
2. Click **New project**. Give it any name (e.g. `recipe-box`), set a database password (save it somewhere, but you won't need it again), and choose a region close to you. Click **Create new project** and wait about a minute for it to spin up.

**Create the database tables:**

3. In the left sidebar, click the **SQL Editor** icon (it looks like `>_`)
4. Click **New query**
5. Open [`schema.sql`](schema.sql) from this repo, copy everything, paste it into the editor, and click the green **Run** button. You should see "Success. No rows returned."

**Create the storage bucket (for cook log photos):**

6. In the left sidebar, click the **Storage** icon (bucket icon)
7. Click **New bucket**. Name it exactly `cook-photos` (with the hyphen). Toggle **Public bucket** ON. Click **Create bucket**.

**Copy your API keys:**

8. In the left sidebar, click the **Settings** icon (gear), then click **API** in the submenu
9. You'll see a **Project URL** and two keys under **Project API keys**. Copy:
   - The **Project URL**
   - The key labeled **anon / public**
   - The key labeled **service_role** (needed for cook log photo uploads — click the eye icon to reveal it)

Keep these handy for step 3.

---

## 2. Get a Gemini API key (for recipe parsing)

1. Go to [aistudio.google.com](https://aistudio.google.com) and sign in with your Google account
2. Click **Get API key**, then **Create API key**
3. Copy the key — you'll need it in the next step. This is free.

---

## 3. Deploy to Vercel

1. Click the **Deploy** button in the [README](README.md) (or go to [vercel.com/new](https://vercel.com/new) and import this repo)
2. Connect your GitHub account if prompted and select this repo
3. Before clicking Deploy, open **Environment Variables** and add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL (from step 1) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon / public key (from step 1) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service_role key (from step 1) |
| `GEMINI_API_KEY` | Your Gemini API key (from step 2) |

4. Click **Deploy**. It takes about 1–2 minutes.

---

## 4. You're done!

Visit your new URL (Vercel shows it after deploy). You'll see an empty recipe box — visit `/settings` to give it a name, then click **+ Add Recipe** to get started.

---

## Optional: iOS Shortcut

Add recipes directly from Safari on your iPhone without opening the app.

1. In your Vercel project, go to **Settings → Environment Variables** and add:
   - `QUICK_ADD_KEY` — any passphrase you choose (e.g. `mysecretkey123`)
   - `NEXT_PUBLIC_SITE_URL` — your Vercel deployment URL (e.g. `https://your-app.vercel.app`)
2. Redeploy (Vercel → Deployments → Redeploy)
3. Visit `/share` on your app for step-by-step shortcut setup instructions

---

## Optional configuration

These can be set in Vercel environment variables if needed:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_TITLE` | Fallback app title shown before the database loads. Usually not needed — the name you set in `/settings` takes effect immediately. |

---

<details>
<summary>For developers — run locally</summary>

```bash
npm install
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill in the variables from steps 1–2 above.

</details>

<details>
<summary>For developers — backfill ingredients on existing recipes</summary>

If you have existing recipes that were added before ingredient parsing was supported:

```bash
curl -X POST https://your-domain.com/api/backfill-ingredients \
  -H "Content-Type: application/json" \
  -d '{"key":"your-quick-add-key"}'
```

</details>
