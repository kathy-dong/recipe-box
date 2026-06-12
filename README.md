# 🍳 Recipe Box

Have you ever had a messy and outdated excel with all the recipes you've tried or aspired to try? And did it drive you crazy seeing a bunch of URLs rather than what the food looked like? 

That's why I made a shared recipe archive!!! Save recipes from any website, rate them, log your cooks with photos, and build a cooking journal. 👩‍🍳

<img width="1697" height="880" alt="Screenshot 2026-06-11 at 5 25 41 PM" src="https://github.com/user-attachments/assets/8614001d-1c68-4381-a921-6a2ed382ce36" />

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kathy-dong/recipe-box&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,GEMINI_API_KEY&envDescription=See%20SETUP.md%20for%20where%20to%20get%20these%20keys&envLink=https://github.com/kathy-dong/recipe-box/blob/main/SETUP.md)

---

## What you'll need

Three free accounts — setup takes about 10–15 minutes total:

- **[Supabase](https://supabase.com)** — your database. Stores all your recipes and cook logs. Free tier is plenty.
- **[Google AI Studio](https://aistudio.google.com)** — powers the "paste a URL and it fills itself in" magic. Free tier, no credit card.
- **[Vercel](https://vercel.com)** — hosts the app. Free tier, deploys in under 2 minutes.

## How to deploy

1. Create your three accounts above
2. Follow [SETUP.md](SETUP.md) to get your API keys (takes ~10 minutes)
3. Click the Deploy button above — it'll ask for those keys, then deploy automatically
4. Visit your new app, go to `/settings` to name it, and start adding recipes

**Full step-by-step instructions: [SETUP.md](SETUP.md)**

---

## Features

- **Save recipes from any website** — paste a URL and the app auto-extracts the title, photo, cook time, and ingredients
- **iOS Shortcut** — save recipes directly from Safari, Instagram, or YouTube without opening the app
- **Cook log** — track when you made each recipe, with notes and photos each time
- **Shared rating** — rate recipes 1–5 stars, shared across your household
- **Smart tagging** — auto-suggested tags (Dinner, Quick, Asian, Healthy, etc.) you can filter by
- **Admin view** — bulk import recipes, manage tags across your whole collection
- **Fully customizable** — name your recipe box from the settings page, no code changes needed
- **Mobile friendly** — works on your phone while you're cooking

---

## For developers

Built with [Next.js](https://nextjs.org), [Supabase](https://supabase.com), and [Gemini 1.5 Flash](https://deepmind.google/technologies/gemini/flash/). Deployed on Vercel. All free tiers. See [SETUP.md](SETUP.md) for local development instructions.
