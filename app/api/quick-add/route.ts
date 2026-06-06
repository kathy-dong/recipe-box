import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { suggestTagsFromMetadata } from "@/lib/tag-rules";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  // --- Auth ---
  const expectedKey = process.env.QUICK_ADD_KEY;
  if (!expectedKey) {
    return json({ success: false, message: "Server not configured (missing QUICK_ADD_KEY)" }, 500);
  }

  let body: Record<string, string> = {};
  try {
    body = await request.json();
  } catch {
    // body may be empty for query-param-only requests
  }

  const providedKey =
    body.key ?? request.nextUrl.searchParams.get("key");
  if (!providedKey || providedKey !== expectedKey) {
    return json({ success: false, message: "Invalid key" }, 401);
  }

  // --- URL ---
  const url = (body.url ?? request.nextUrl.searchParams.get("url") ?? "").trim();
  if (!url) {
    return json({ success: false, message: "url is required" }, 400);
  }

  // --- Duplicate check ---
  const { data: existing } = await supabase
    .from("recipes")
    .select("title")
    .eq("url", url)
    .maybeSingle();

  if (existing) {
    return json({
      success: false,
      message: `Already saved: "${existing.title}"`,
      title: existing.title,
    });
  }

  // --- Parse ---
  const base = new URL(request.url).origin;
  let parsed: Record<string, unknown> = {};
  try {
    const parseRes = await fetch(`${base}/api/parse-recipe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(30000),
    });
    parsed = await parseRes.json();
  } catch {
    // Parsing failed — still save with just the URL and a blank title the user can fix
    parsed = {};
  }

  const title = (parsed.title as string | null) || url;

  // --- Tags (rule-based; Gemini already ran inside parse-recipe if needed) ---
  const suggestedTags = (parsed.suggested_tags as string[] | null) ?? [];
  const ruleTags = suggestTagsFromMetadata({
    title: parsed.title as string | null,
    description: parsed.description as string | null,
    cook_time: parsed.cook_time as string | null,
    source_site: parsed.source_site as string | null,
  });
  const tags = Array.from(new Set([...ruleTags, ...suggestedTags]));

  // --- Insert ---
  const { data: inserted, error } = await supabase
    .from("recipes")
    .insert({
      url,
      title,
      image_url: (parsed.image_url as string | null) || null,
      author: (parsed.author as string | null) || null,
      cook_time: (parsed.cook_time as string | null) || null,
      rating: (parsed.rating as string | null) || null,
      rating_count: (parsed.rating_count as string | null) || null,
      description: (parsed.description as string | null) || null,
      source_site: (parsed.source_site as string | null) || null,
      is_video: (parsed.is_video as boolean | null) ?? false,
      status: "to_try",
      tags,
    })
    .select("title")
    .single();

  if (error) {
    if (error.code === "23505") {
      return json({ success: false, message: "Recipe already saved", title });
    }
    return json({ success: false, message: "Failed to save recipe" }, 500);
  }

  return json({
    success: true,
    message: `Recipe added: "${inserted.title}"`,
    title: inserted.title,
  });
}
