# Sam & Kathy's Recipes

## What this is
A shared recipe archive web app for a small group. Anyone with the link can view, add, and delete recipes. No auth, no accounts. Built to be a friendlier alternative to a shared Google Sheet — visually rich cards with food photos, cook times, authors, and tags.

## Tech stack
- **Next.js 14** (App Router) deployed on Vercel
- **Supabase** (Postgres) for the database
- **Gemini 1.5 Flash API** for recipe metadata extraction (free tier)
- **TypeScript** throughout

## Database
Single `recipes` table in Supabase with a UNIQUE constraint on `url` to prevent duplicates:

```sql
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
```

## Recipe parsing — 3-step chain

When a URL is submitted, the API route POST /api/parse-recipe runs these steps in order and merges results. Each step fills in fields that previous steps missed.

**Step 0 — Source site mapping**
Derive source_site from the URL domain using a hardcoded map:
- cooking.nytimes.com → "NYT Cooking"
- thewoksoflife.com → "Woks of Life"
- allrecipes.com → "AllRecipes"
- tastesbetterfromscratch.com → "Tastes Better From Scratch"
- delish.com → "Delish"
- bonappetit.com → "Bon Appétit"
- seriouseats.com → "Serious Eats"
- youtube.com / youtu.be → "YouTube"
- instagram.com → "Instagram"
- (fallback: use cleaned domain name, e.g. "iwashyoudry.com" → "I Wash You Dry")

**Step 1 — Open Graph meta tags**
Fetch raw HTML with a realistic browser User-Agent header. Extract:
- og:title → title
- og:image → image_url
- og:description → description
This works on nearly all sites including paywalled ones like NYT Cooking, because OG tags exist for link previews.

**Step 2 — JSON-LD structured data**
Parse `<script type="application/ld+json">` blocks from the same HTML. Look for Recipe schema:
- name → title (if not already set)
- image → image_url (if not already set; may be string or array)
- author → author (may be object with .name or string)
- totalTime or cookTime → cook_time (convert ISO 8601 duration like "PT25M" to "25 min")
- aggregateRating.ratingValue → rating
- aggregateRating.ratingCount → rating_count
- description → description (if not already set)

**Step 3 — Gemini 1.5 Flash (fallback only)**
Only called if title OR image_url is still missing after steps 1 & 2. Clean the HTML (strip <script>, <style>, <nav>, <footer> tags), truncate to 15k chars, and send to Gemini with a prompt requesting JSON extraction of the missing fields. Do not call Gemini if we already have title + image.

**Important:** If all parsing steps fail or the URL is unreachable, the modal should still let the user manually fill in all fields. Parsing is a convenience, not a requirement.

## Image handling

**Image proxy route:** Create GET /api/image-proxy?url={encoded_url} that fetches the image server-side and pipes it back to the client. This solves two problems:
1. Many sites block hotlinking (image loads on their site but returns 403 from yours)
2. Next.js Image component requires whitelisting every domain — image proxy avoids this

Use standard `<img>` tags pointing at the proxy route. If the image fails to load, show a warm-toned placeholder (solid color with a utensil icon or similar).

## Duplicate detection
Before inserting a new recipe, check if the URL already exists (the UNIQUE constraint will catch this at the DB level). Show the user a message like "This recipe is already in your box!" and don't insert.

## Design

### Visual direction
Clean and editorial with warmth. Not cold/corporate, not cutesy. Think: a well-designed cookbook that happens to be digital.

### Typography
- Titles: DM Serif Display (Google Fonts) — warm, readable serif
- Body/metadata: DM Sans (Google Fonts) — clean, friendly sans-serif
- These pair well together and have the right warmth level

### Color palette
- Background: warm off-white (#FAF9F6 or similar)
- Cards: white with subtle border or shadow
- Accent: warm terracotta/rust for highlights and buttons (#C84B31 or similar)
- Source badge: semi-transparent dark pill on the image
- Tags: light warm-gray pills with darker text

### Card anatomy
Each recipe card shows:
- Food photo (full bleed, top of card, ~3:2 aspect ratio, via image proxy with fallback)
- Source badge pill on the image (bottom-left corner)
- Play icon overlay on image if is_video = true
- Title (serif, max 2 lines, clamp with ellipsis)
- Author (muted, small) — show if available
- Cook time with clock icon — show if available
- Rating as stars + count (e.g. ★★★★½ 13,847) — show if available
- Heart icon: outlined = to_try, filled red = favorite
- Trash icon: appears on hover (desktop) or via long-press/swipe (mobile) → confirmation dialog before delete

### Layout
- Desktop: 4-column card grid
- Tablet: 2-column
- Mobile: 1-column
- Header: "Sam & Kathy's Recipes" on left, "+ Add Recipe" button on right
- On mobile, "+ Add Recipe" is a floating action button (bottom-right)

### Grid refresh
After adding or deleting a recipe, the grid should update immediately without a full page reload. Use client-side state: optimistically add the new card after successful Supabase insert, or remove the card after successful delete.

## UI flows

### Add Recipe
1. User clicks "+ Add Recipe"
2. Modal opens with URL text input + "Fetch Recipe" button
3. On fetch: loading state → call /api/parse-recipe → show editable preview card
4. If parsing fails: show error message but let user fill in all fields manually
5. If URL is already saved: show "already in your box" message
6. Below preview: status toggle (To Try / Favorite — two buttons, default To Try)
7. Save button → insert to Supabase → card appears in grid → modal closes

### Delete Recipe
1. User hovers card (desktop) or long-presses (mobile) → trash icon appears
2. Click trash → confirmation dialog: "Delete [recipe title]?" with Cancel / Delete buttons
3. Confirm → delete from Supabase → card removed from grid

### Favorite Toggle
1. Click heart icon on card
2. Toggle status between "to_try" and "favorite" in Supabase
3. Heart fills/unfills immediately (optimistic update)

## Tag taxonomy (Phase 3)
Meal type: Breakfast, Lunch, Dinner, Appetizer, Dessert, Snack
Attributes: Healthy, Quick, Indulgent

## Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```
