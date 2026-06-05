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
  status: "to_try" | "favorite";
  is_video: boolean;
  added_at: string;
};
