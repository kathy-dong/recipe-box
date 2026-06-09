# Setup Guide

How to fork and deploy your own copy of this recipe box app.

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the SQL block below
3. Go to **Storage → New bucket**, name it `cook-photos`, and enable **Public bucket**
4. Copy your project URL and keys from **Settings → API**

### Required SQL

```sql
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  image_url TEXT,
  author TEXT,
  cook_time TEXT,
  rating TEXT,
  rating_count TEXT,
  description TEXT,
  source_site TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'to_try' CHECK (status IN ('to_try', 'made_it', 'favorite')),
  is_video BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  ingredients TEXT[] DEFAULT '{}',
  our_rating INTEGER CHECK (our_rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_recipes_status ON recipes(status);

CREATE TABLE cook_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  cooked_on DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cook_log_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cook_log_id UUID REFERENCES cook_log(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the app title (change this to your own name)
INSERT INTO app_settings (key, value) VALUES ('app_title', 'Sam & Kathy''s Recipes');

-- Enable RLS with open policies (trusted small-group app)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cook_log_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON cook_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON cook_log_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- Storage policies (run after creating the cook-photos bucket)
CREATE POLICY "allow all uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cook-photos');
CREATE POLICY "allow all reads" ON storage.objects FOR SELECT USING (bucket_id = 'cook-photos');
CREATE POLICY "allow all updates" ON storage.objects FOR UPDATE USING (bucket_id = 'cook-photos');
CREATE POLICY "allow all deletes" ON storage.objects FOR DELETE USING (bucket_id = 'cook-photos');
```

## 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```
# Required
NEXT_PUBLIC_SUPABASE_URL=       # from Supabase Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # from Supabase Settings → API
GEMINI_API_KEY=                 # from Google AI Studio (free tier)

# Optional
SUPABASE_SERVICE_ROLE_KEY=      # from Supabase Settings → API (for photo uploads; falls back to anon key)
QUICK_ADD_KEY=                  # any passphrase you choose (enables iOS shortcut auth)
NEXT_PUBLIC_APP_TITLE=          # fallback title if app_settings not yet seeded
NEXT_PUBLIC_SITE_URL=           # your production URL, e.g. https://your-app.vercel.app
```

> **Note:** The app name is stored in the database and editable from `/settings` — you don't need to set `NEXT_PUBLIC_APP_TITLE` unless you want a fallback before the DB is seeded.

## 3. Run locally

```bash
npm install
npm run dev
```

## 4. Deploy to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add all environment variables in **Settings → Environment Variables**
4. Deploy

## 5. Personalize the app name

After deploying, go to `/settings` and update the app title. It saves to the database and updates the header immediately — no redeploy needed.

## 6. iOS Share Shortcut (optional)

Visit `your-domain.com/share` after deploying — it has step-by-step instructions to set up the iOS shortcut that lets you add recipes directly from Safari.

Requires `QUICK_ADD_KEY` to be set in Vercel environment variables.

## 7. Backfill ingredients (optional)

If you have existing recipes without ingredients, run:

```bash
curl -X POST https://your-domain.com/api/backfill-ingredients \
  -H "Content-Type: application/json" \
  -d '{"key":"your-quick-add-key"}'
```
