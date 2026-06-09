# Sam & Kathy's Recipes

## What this is
A shared recipe archive web app for a small group. Anyone with the link can view, add, edit, and delete recipes. No auth, no accounts. Built to be a friendlier alternative to a shared Google Sheet — visually rich cards with food photos, cook times, shared ratings, and a cook log with photos.

Designed to be forkable: app title is stored in the database and editable from `/settings` without a redeploy. The only things a new deployer must configure in Vercel are Supabase credentials and an optional passkey for the iOS shortcut.

## Tech stack
- **Next.js 14** (App Router) deployed on Vercel
- **Supabase** (Postgres + Storage) for the database and cook photo uploads
- **Gemini 1.5 Flash API** for recipe metadata extraction (free tier, fallback only)
- **TypeScript** throughout
- **CSS Modules** for all styles (no Tailwind)

## Pages & routes

| Route | Description |
|---|---|
| `/` | Main recipe grid |
| `/settings` | App name, iOS Quick Add setup, link to /admin |
| `/admin` | Full recipe management table with bulk actions and import |
| `/share` | iOS Shortcut setup instructions |

## Database

Five tables in Supabase. All have RLS enabled with open policies (trusted small-group app).

```sql
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  image_url TEXT,
  author TEXT,
  cook_time TEXT,            -- e.g. "25 min", "1 hr 15 min"
  rating TEXT,               -- scraped crowd rating value (stored, not displayed on cards)
  rating_count TEXT,         -- scraped crowd rating count (stored, not displayed on cards)
  description TEXT,
  source_site TEXT,          -- e.g. "NYT Cooking", "Woks of Life"
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'to_try' CHECK (status IN ('to_try', 'made_it', 'favorite')),
  is_video BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,                -- personal notes, shown only in Edit modal
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

INSERT INTO app_settings (key, value) VALUES ('app_title', 'Sam & Kathy''s Recipes');
```

**Status values:**
- `to_try` — saved but not cooked yet
- `made_it` — cooked at least once (auto-promoted when first cook log entry is saved)
- `favorite` — explicitly favorited via the heart icon

## API routes

| Route | Method | Description |
|---|---|---|
| `/api/parse-recipe` | POST | Parses a URL, returns recipe metadata + `suggested_tags` |
| `/api/image-proxy` | GET | Proxies images server-side to bypass hotlink blocking |
| `/api/settings` | GET, PATCH | Reads/writes `app_settings` table |
| `/api/upload-photo` | POST | Uploads a cook photo to Supabase Storage (`cook-photos` bucket) |
| `/api/quick-add` | POST | iOS Shortcut endpoint — parses + inserts a recipe by URL, auth via `QUICK_ADD_KEY` |
| `/api/auto-tag` | POST | Suggests tags for a recipe using Gemini + rule-based logic |
| `/api/backfill-ingredients` | POST | One-time route to backfill `ingredients` on existing recipes |

## Recipe parsing — 3-step chain

POST `/api/parse-recipe` runs these steps in order and merges results.

**Step 0 — Source site mapping**
Derive `source_site` and `is_video` from the URL domain using a hardcoded map. Video detection: YouTube watch/shorts/live paths → `is_video: true`. Instagram reels → `is_video: true`.

Known mappings: cooking.nytimes.com → "NYT Cooking", thewoksoflife.com → "Woks of Life", allrecipes.com → "AllRecipes", bonappetit.com → "Bon Appétit", seriouseats.com → "Serious Eats", delish.com → "Delish", youtube.com/youtu.be → "YouTube", instagram.com → "Instagram", tiktok.com → "TikTok". Fallback: clean the domain (e.g. "iwashyoudry.com" → "I Wash You Dry").

**Step 1 — Open Graph meta tags**
Fetch raw HTML with a realistic browser User-Agent. Extract `og:title`, `og:image`, `og:description`. Works on paywalled sites like NYT Cooking because OG tags exist for link previews.

**Step 2 — JSON-LD structured data**
Parse `<script type="application/ld+json">` blocks. Look for Recipe schema: `name`, `image`, `author`, `totalTime`/`cookTime` (convert ISO 8601 e.g. "PT25M" → "25 min"), `aggregateRating.ratingValue/ratingCount`, `description`, `recipeIngredient` → `ingredients[]`.

**Step 3 — Gemini 1.5 Flash (fallback only)**
Only called if `title` OR `image_url` is still missing. Strips script/style/nav/footer tags, truncates HTML to 15k chars, requests JSON for missing fields + `suggested_tags`.

**Tags:** After all steps, `suggestTagsFromMetadata()` (in `lib/tag-rules.ts`) runs rule-based tag suggestions and merges with any Gemini tags. Result returned as `suggested_tags[]`. Used by Add Recipe, Quick Add, and Bulk Import.

**Important:** If all parsing steps fail, the modal still lets the user fill in fields manually. Parsing is a convenience, not a requirement.

## Image handling

GET `/api/image-proxy?url={encoded_url}` fetches the image server-side and pipes it back. Solves hotlink blocking and avoids whitelisting every image domain in Next.js config. All `<img>` tags use the proxy URL. On error, show a warm-toned placeholder with a utensil icon.

## Cook log

Users log each time they cook a recipe. Each entry stores `cooked_on` (date), `notes`, and optionally photos (uploaded to Supabase Storage via `/api/upload-photo`, rows stored in `cook_log_photos`).

- Triggered via the checkmark (✓) button on each recipe card
- On save: if recipe is `to_try`, it auto-promotes to `made_it`
- Cook count and last-cooked date shown on each card ("Cooked 3× · Last: Jun 5")
- History tab in Edit modal shows all entries with delete buttons (trash icon, hover to reveal)
- Deleting an entry removes the `cook_log` row (CASCADE handles `cook_log_photos` rows) and deletes photo files from Storage

## Our Rating

A single shared 1–5 integer per recipe (`our_rating` on `recipes`). One rating for the household — not per-person.

- Shown as terracotta stars on the card (only if non-null); tap same star to clear
- Editable at the top of the Edit tab in the Edit modal
- Editable inline in the Admin table

## App settings

The app title is stored in `app_settings` (key: `app_title`) and editable from `/settings` without a Vercel redeploy. `lib/settings-context.tsx` provides a React context that fetches the title on mount and updates `document.title`.

**Fallback chain:** `app_settings.app_title` → `NEXT_PUBLIC_APP_TITLE` env var → `"Recipe Box"`

`QUICK_ADD_KEY` stays as a Vercel env var only — never stored in the database to avoid exposing it via the public GET `/api/settings` endpoint.

## Design

### Visual direction
Clean and editorial with warmth. Not cold/corporate, not cutesy. Think: a well-designed cookbook that happens to be digital.

### Typography
- Titles/headings: DM Serif Display (Google Fonts)
- Body/metadata/UI: DM Sans (Google Fonts)

### Color palette
- Background: warm white (`#ffffff`, `#faf9f6` for alternating rows and subtle sections)
- Accent: terracotta `#C84B31` (hover: `#a83a22`) — buttons, active states, filled stars, active tabs
- Text: `#1a1a1a` primary, `#888` muted, `#aaa` light
- Border: `#eeeeee`

### Card anatomy
Each recipe card shows:
- Food photo (full bleed, 3:2 aspect ratio, via image proxy with placeholder fallback)
- Source badge pill on image (bottom-left)
- Play button overlay if `is_video = true`
- Edit (pencil) and Trash icons — visible on hover (desktop) or always (touch)
- Cook log button (✓) — bottom-right of image, green tint if cooked before
- Heart icon (top-right) — outlined = not favorite, filled terracotta = favorite
- Notes indicator (✎) next to title if `notes` is set
- Title (DM Serif Display, 2-line clamp)
- Author (muted, small) — if available
- Cook time with clock icon — if available
- Our Rating (terracotta stars) — only if `our_rating` is non-null; tappable to rate/clear
- Cook summary ("Cooked 3× · Last: Jun 5") — only if cook log count > 0
- Tag pills (up to 4 visible)

### Layout
- Desktop: 5-column grid (4 at 1280px, 3 at 960px, 2 at 640px, 1 at 480px)
- Header: app title left, search + gear icon (⚙ → `/settings`) + "+ Add Recipe" right
- Mobile: FAB (floating action button) replaces "+ Add Recipe" in header

## UI flows

### Add Recipe
1. Click "+ Add Recipe" → modal opens
2. Paste URL → "Fetch Recipe" → `/api/parse-recipe` → show editable preview
3. If already saved: show "This recipe is already in your box!"
4. Status toggle (To Try / Made It / Favorite), default To Try
5. Save → insert to Supabase (author + description come from parsing, not from form fields) → card appears in grid
6. Escape key closes modal

### Edit Recipe
1. Click pencil icon on card → Edit modal with two tabs
2. **Edit tab:** Our Rating picker at top, then form (title, cook time, image URL, status, tags, notes, ingredients — collapsed by default unless already populated)
3. **History tab:** Cook log entries newest-first. Date, notes, photo thumbnails. Trash icon per entry (hover to reveal) → inline "Delete this entry? Yes · No"
4. Modal keeps a fixed min-height when switching tabs so the frame doesn't resize
5. Escape key closes modal

### Log a Cook
1. Click ✓ button on card → Cook Log modal
2. Set date (defaults today), optional notes, optional photos (drag-and-drop or tap)
3. Save → inserts `cook_log` row, uploads photos, promotes `to_try` → `made_it`
4. Card cook count and last-cooked date update immediately (optimistic)

### Delete Recipe
1. Hover (desktop) or always-visible (touch) → trash icon
2. Confirm in `DeleteConfirmDialog`
3. Card fades out (300ms) then removed; Supabase delete runs async

### Favorite Toggle
Click heart → toggles `favorite` ↔ `made_it` (or `to_try` if never cooked). Optimistic update; reverts on error.

### Settings (`/settings`)
Three sections:
1. **Recipe Box Name** — text input, saves to `app_settings`, header updates live
2. **iOS Quick Add** — shows API endpoint URL, instructions for `QUICK_ADD_KEY` in Vercel, link to `/share`
3. **Recipe Management** — link card to `/admin`

### Admin (`/admin`)
Full-width recipe management table:
- Sortable columns: Title, Source, Cook Time, Our Rating, Status, Date Added (click to sort, click again to reverse)
- Inline tag editing: click Tags cell → popover, saves on each toggle
- Inline status editing: click Status cell → 3-option dropdown, saves immediately
- Inline rating: tappable stars, saves immediately
- Select-all checkbox + per-row checkboxes
- Bulk action bar (fixed bottom) when rows selected: Add Tags (additive), Set Status, Delete
- Search bar filters by title + source_site client-side
- Mobile (≤768px): table replaced with stacked cards; same interactions preserved

### Bulk Import (`/admin` → Bulk Import button)
1. Paste one URL per line; lines not starting with `http` are skipped with ❌ "Not a valid URL"
2. Import button shows count (`Import 12 recipes`), disabled until ≥1 valid URL
3. Processing (sequential, 500ms between URLs): duplicate check → `/api/parse-recipe` → auto-tag → Supabase insert
4. Live progress list: spinning circle → ✅ title / ⚠️ Already saved / ❌ error message
5. Summary on completion: "Done! X imported, Y already existed, Z failed"
6. Closing mid-import shows abort confirmation; already-imported recipes are kept
7. On Done: admin table refreshes

## Tag taxonomy

**Meal type** (pick one or more): `breakfast`, `lunch`, `dinner`, `appetizer-side`, `dessert`

**Attributes**: `quick` (≤30 min), `healthy`, `indulgent`, `meal-prep`, `asian`

Rule-based logic lives in `lib/tag-rules.ts` — pure functions, no external deps, safe to import client-side. Gemini adds additional tags when called as fallback.

## iOS Quick Add

POST `/api/quick-add?key={QUICK_ADD_KEY}&url={url}` — parses and inserts a recipe without opening the app. Used with an iOS Shortcut that shares URLs from Safari. Returns `{ success, message, title }`. If `QUICK_ADD_KEY` is not set, returns 500 (feature is opt-in).

## Environment variables

```
# Required
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon/public key
GEMINI_API_KEY=                    # Gemini 1.5 Flash (free tier)

# Optional
SUPABASE_SERVICE_ROLE_KEY=         # For photo uploads (falls back to anon key if absent)
QUICK_ADD_KEY=                     # Passkey for iOS Shortcut endpoint
NEXT_PUBLIC_APP_TITLE=             # Fallback title if app_settings not yet seeded
NEXT_PUBLIC_SITE_URL=              # Production URL (used on /share page)
```
