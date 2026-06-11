-- Recipe Box — Full Database Schema
-- Run this entire file in Supabase SQL Editor to set up a fresh database.
-- Then go to Storage → New bucket, name it "cook-photos", enable Public.

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

-- Change this to your own name before running, or update it later from /settings
INSERT INTO app_settings (key, value) VALUES ('app_title', 'Our Recipe Box');

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
