# Setup Guide

How to fork and deploy your own copy of this recipe box app.

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the SQL in `SCHEMA.sql` (or paste from the block below)
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
  ingredients TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_recipes_status ON recipes(status);

CREATE TABLE personal_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  person TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  rated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (recipe_id, person)
);

CREATE TABLE cook_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  person TEXT,
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

-- Enable RLS with open policies (trusted small-group app)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cook_log_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON personal_ratings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON cook_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON cook_log_photos FOR ALL USING (true) WITH CHECK (true);

-- Storage policies (run after creating the cook-photos bucket)
CREATE POLICY "allow all uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cook-photos');
CREATE POLICY "allow all reads" ON storage.objects FOR SELECT USING (bucket_id = 'cook-photos');
CREATE POLICY "allow all updates" ON storage.objects FOR UPDATE USING (bucket_id = 'cook-photos');
CREATE POLICY "allow all deletes" ON storage.objects FOR DELETE USING (bucket_id = 'cook-photos');
```

## 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=       # from Supabase Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # from Supabase Settings → API
SUPABASE_SERVICE_ROLE_KEY=      # from Supabase Settings → API (for photo uploads)
GEMINI_API_KEY=                 # from Google AI Studio (free tier)
QUICK_ADD_KEY=                  # any passphrase you choose (used for iOS shortcut auth)

# Personalize these:
NEXT_PUBLIC_APP_TITLE=Sam & Kathy's Recipes
NEXT_PUBLIC_PERSON_1=Kathy
NEXT_PUBLIC_PERSON_2=Sam

NEXT_PUBLIC_SITE_URL=           # your production URL, e.g. https://your-app.vercel.app
```

## 3. Run locally

```bash
npm install
npm run dev
```

## 4. Deploy to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.local` in **Settings → Environment Variables**
4. Deploy

## 5. iOS Share Shortcut

Visit `your-domain.com/share` after deploying — it has step-by-step instructions to set up the iOS shortcut and desktop bookmarklet.

## 6. Backfill ingredients (optional)

If you have existing recipes without ingredients, run:

```bash
curl -X POST https://your-domain.com/api/backfill-ingredients \
  -H "Content-Type: application/json" \
  -d '{"key":"your-quick-add-key"}'
```
