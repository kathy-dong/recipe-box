import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { Recipe } from "@/lib/supabase";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function extractIngredientsFromHtml(html: string): string[] {
  const scriptMatches = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  );

  for (const match of scriptMatches) {
    try {
      const data = JSON.parse(match[1]);
      const items: unknown[] = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];

      for (const item of items) {
        if (typeof item !== "object" || item === null) continue;
        const obj = item as Record<string, unknown>;
        const type = String(obj["@type"] ?? "");
        if (!type.toLowerCase().includes("recipe")) continue;

        if (Array.isArray(obj.recipeIngredient) && obj.recipeIngredient.length > 0) {
          return (obj.recipeIngredient as unknown[])
            .map((i) => String(i).trim())
            .filter(Boolean);
        }
      }
    } catch {
      continue;
    }
  }

  return [];
}

export async function POST(request: NextRequest) {
  // Require the QUICK_ADD_KEY as a simple auth mechanism
  let body: { key?: string } = {};
  try { body = await request.json(); } catch { /* no body */ }

  const key = process.env.QUICK_ADD_KEY;
  if (key && body.key !== key) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch recipes with empty ingredients
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, url, title")
    .eq("is_video", false)
    .or("ingredients.eq.{},ingredients.is.null");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!recipes || recipes.length === 0) {
    return NextResponse.json({ message: "No recipes to backfill", updated: 0 });
  }

  const results: { id: string; title: string; status: string; count: number }[] = [];

  for (const recipe of recipes as Pick<Recipe, "id" | "url" | "title">[]) {
    try {
      const res = await fetch(recipe.url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        results.push({ id: recipe.id, title: recipe.title, status: "fetch_failed", count: 0 });
        continue;
      }

      const html = await res.text();
      const ingredients = extractIngredientsFromHtml(html);

      if (ingredients.length === 0) {
        results.push({ id: recipe.id, title: recipe.title, status: "no_ingredients", count: 0 });
        continue;
      }

      const { error: updateErr } = await supabase
        .from("recipes")
        .update({ ingredients })
        .eq("id", recipe.id);

      if (updateErr) {
        results.push({ id: recipe.id, title: recipe.title, status: "update_failed", count: 0 });
      } else {
        results.push({ id: recipe.id, title: recipe.title, status: "updated", count: ingredients.length });
      }
    } catch {
      results.push({ id: recipe.id, title: recipe.title, status: "error", count: 0 });
    }
  }

  const updated = results.filter((r) => r.status === "updated").length;
  return NextResponse.json({ updated, total: recipes.length, results });
}
