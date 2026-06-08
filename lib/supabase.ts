import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Recipe = {
  id: string;
  url: string;
  title: string;
  image_url: string | null;
  author: string | null;
  cook_time: string | null;
  rating: string | null;
  rating_count: string | null;
  description: string | null;
  source_site: string | null;
  tags: string[];
  status: "to_try" | "made_it" | "favorite";
  is_video: boolean;
  added_at: string;
  notes: string | null;
  ingredients: string[];
  our_rating: number | null;
};

export type CookLogEntry = {
  id: string;
  recipe_id: string;
  cooked_on: string;
  notes: string | null;
  created_at: string;
  cook_log_photos: CookLogPhoto[];
};

export type CookLogPhoto = {
  id: string;
  cook_log_id: string;
  photo_url: string;
  caption: string | null;
  uploaded_at: string;
};

export type CookSummary = {
  recipe_id: string;
  count: number;
  last_cooked: string | null;
};
