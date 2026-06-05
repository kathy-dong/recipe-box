-- Seed data — run this in the Supabase SQL editor after schema.sql
-- NOTE: For the NYT recipes, replace the image_url placeholders with the actual
-- og:image URL from each page (NYT blocks server-side fetches).
-- Visit each URL in your browser, View Source, and search for og:image.

INSERT INTO recipes (url, title, image_url, author, cook_time, rating, rating_count, source_site, status, is_video, tags)
VALUES

-- Recipe 1: Crispy Gnocchi with Sausage and Broccoli (NYT Cooking)
-- To get image_url: open the URL, view source, find og:image (starts with https://static01.nyt.com/images/...)
(
  'https://cooking.nytimes.com/recipes/1025733-crispy-gnocchi-with-sausage-and-broccoli',
  'Crispy Gnocchi With Sausage and Broccoli',
  NULL,  -- replace with og:image from NYT page
  'Ali Slagle',
  NULL,
  NULL,
  NULL,
  'NYT Cooking',
  'to_try',
  FALSE,
  '{}'
),

-- Recipe 2: Sheet-Pan Baked Feta (NYT Cooking)
(
  'https://cooking.nytimes.com/recipes/1021277-sheet-pan-baked-feta-with-broccolini-tomatoes-and-lemon',
  'Sheet-Pan Baked Feta With Broccolini, Tomatoes and Lemon',
  NULL,  -- replace with og:image from NYT page
  'Yasmin Fahr',
  '25 min',
  '5',
  '20752',
  'NYT Cooking',
  'to_try',
  FALSE,
  '{}'
),

-- Recipe 3: Classic Pumpkin Roll (Tastes Better From Scratch)
(
  'https://tastesbetterfromscratch.com/classic-pumpkin-roll/',
  'Classic Pumpkin Roll',
  'https://tastesbetterfromscratch.com/wp-content/uploads/2019/10/Pumpkin-Roll-.png',
  'Lauren Allen',
  '1 hr 55 min',
  '4.95',
  '3375',
  'Tastes Better From Scratch',
  'to_try',
  FALSE,
  '{}'
),

-- Recipe 4: Shrimp with Lobster Sauce (Woks of Life)
(
  'https://thewoksoflife.com/shrimp-lobster-sauce/',
  'Shrimp with Lobster Sauce',
  'https://thewoksoflife.com/wp-content/uploads/2014/12/shrimp-lobster-sauce-11.jpg',
  'Bill',
  '20 min',
  '4.94',
  '172',
  'Woks of Life',
  'to_try',
  FALSE,
  '{}'
);
