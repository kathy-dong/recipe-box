import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TAG_TAXONOMY, suggestTagsFromMetadata } from "@/lib/tag-rules";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function suggestTagsWithGemini(recipe: {
  title: string;
  description: string | null;
  source_site: string | null;
}): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Suggest tags for this recipe.

Title: ${recipe.title}
${recipe.description ? `Description: ${recipe.description}` : ""}
${recipe.source_site ? `Source: ${recipe.source_site}` : ""}

Tag taxonomy:
${TAG_TAXONOMY}

Return ONLY a JSON array of tag values that clearly apply, e.g. ["dinner", "asian"]. Return [] if nothing clearly fits. No explanation, no markdown.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr)) return arr.filter((t: unknown) => typeof t === "string");
    }
  } catch {
    // ignore
  }
  return [];
}

export async function POST() {
  // Fetch all recipes with empty tags
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, description, cook_time, source_site, tags")
    .eq("tags", "{}");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!recipes || recipes.length === 0) {
    return NextResponse.json({ message: "No untagged recipes found.", tagged: 0, skipped: 0 });
  }

  const results: { id: string; title: string; tags: string[]; method: string }[] = [];
  let geminiCallCount = 0;

  for (const recipe of recipes) {
    // Rule-based first
    const ruleTags = suggestTagsFromMetadata({
      title: recipe.title,
      description: recipe.description,
      cook_time: recipe.cook_time,
      source_site: recipe.source_site,
    });

    let finalTags = ruleTags;
    let method = "rules";

    // Gemini fallback when rule-based found nothing
    if (finalTags.length === 0) {
      const geminiTags = await suggestTagsWithGemini({
        title: recipe.title,
        description: recipe.description,
        source_site: recipe.source_site,
      });
      finalTags = geminiTags;
      method = "gemini";
      geminiCallCount++;
    }

    if (finalTags.length === 0) {
      results.push({ id: recipe.id, title: recipe.title, tags: [], method: "none" });
      continue;
    }

    const { error: updateError } = await supabase
      .from("recipes")
      .update({ tags: finalTags })
      .eq("id", recipe.id);

    if (updateError) {
      results.push({ id: recipe.id, title: recipe.title, tags: [], method: `error: ${updateError.message}` });
    } else {
      results.push({ id: recipe.id, title: recipe.title, tags: finalTags, method });
    }
  }

  const tagged = results.filter((r) => r.tags.length > 0).length;
  const skipped = results.filter((r) => r.tags.length === 0).length;

  return NextResponse.json({
    message: `Tagged ${tagged} recipe${tagged !== 1 ? "s" : ""}, skipped ${skipped} (no tags found).`,
    gemini_calls: geminiCallCount,
    tagged,
    skipped,
    results,
  });
}
