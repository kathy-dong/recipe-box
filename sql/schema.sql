-- Run this in the Supabase SQL editor to create the recipes table

CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  image_url TEXT,
  author TEXT,
  cook_time TEXT,            -- e.g. "25 min", "1 hr 15 min"
  rating TEXT,               -- e.g. "4.5"
  rating_count TEXT,         -- e.g. "13847"
  description TEXT,
  source_site TEXT,          -- e.g. "NYT Cooking", "Woks of Life"
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'to_try' CHECK (status IN ('to_try', 'favorite')),
  is_video BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipes_status ON recipes(status);
