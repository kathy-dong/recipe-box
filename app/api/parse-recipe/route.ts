import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const PUBLISHER_NAMES = new Set([
  "the new york times",
  "nyt cooking",
  "bon appétit",
  "bon appetit",
  "serious eats",
  "allrecipes",
  "delish",
  "tastes better from scratch",
  "woks of life",
  "youtube",
  "instagram",
]);

function isPublisher(name: string, sourceSite: string | null): boolean {
  const lower = name.toLowerCase();
  if (PUBLISHER_NAMES.has(lower)) return true;
  if (sourceSite && lower === sourceSite.toLowerCase()) return true;
  return false;
}

const SOURCE_SITE_MAP: Record<string, string> = {
  "cooking.nytimes.com": "NYT Cooking",
  "thewoksoflife.com": "Woks of Life",
  "allrecipes.com": "AllRecipes",
  "tastesbetterfromscratch.com": "Tastes Better From Scratch",
  "delish.com": "Delish",
  "bonappetit.com": "Bon Appétit",
  "seriouseats.com": "Serious Eats",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "instagram.com": "Instagram",
};

function getSourceSite(url: string): { source_site: string; is_video: boolean } {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const mapped = SOURCE_SITE_MAP[hostname];
    if (mapped) {
      return {
        source_site: mapped,
        is_video: mapped === "YouTube" || mapped === "Instagram",
      };
    }
    // Fallback: title-case the domain parts
    const parts = hostname.split(".");
    const name = parts
      .slice(0, -1)
      .join(" ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { source_site: name || hostname, is_video: false };
  } catch {
    return { source_site: "", is_video: false };
  }
}

function parseIso8601Duration(duration: string): string | null {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = parseInt(match[1] ?? "0");
  const minutes = parseInt(match[2] ?? "0");
  if (hours && minutes) return `${hours} hr ${minutes} min`;
  if (hours) return `${hours} hr`;
  if (minutes) return `${minutes} min`;
  return null;
}

function extractOgData(html: string) {
  const get = (property: string) => {
    const match = html.match(
      new RegExp(
        `<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`,
        "i"
      )
    ) ?? html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`,
        "i"
      )
    );
    return match ? match[1].trim() : null;
  };
  return {
    title: get("title"),
    image_url: get("image"),
    description: get("description"),
  };
}

function extractJsonLd(html: string) {
  const result: Record<string, string | null> = {
    title: null,
    image_url: null,
    author: null,
    cook_time: null,
    rating: null,
    rating_count: null,
    description: null,
  };

  const scriptMatches = Array.from(
    html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    )
  );

  for (const match of scriptMatches) {
    try {
      const data = JSON.parse(match[1]);
      const items: unknown[] = Array.isArray(data)
        ? data
        : data["@graph"]
        ? data["@graph"]
        : [data];

      for (const item of items) {
        if (typeof item !== "object" || item === null) continue;
        const obj = item as Record<string, unknown>;
        const type = String(obj["@type"] ?? "");
        if (!type.toLowerCase().includes("recipe")) continue;

        if (!result.title && obj.name) result.title = String(obj.name);
        if (!result.description && obj.description)
          result.description = String(obj.description);

        if (!result.image_url && obj.image) {
          const extractImageUrl = (val: unknown): string | null => {
            if (typeof val === "string") return val;
            if (typeof val === "object" && val !== null) {
              const v = val as Record<string, unknown>;
              if (typeof v.url === "string") return v.url;
            }
            return null;
          };
          if (Array.isArray(obj.image)) {
            result.image_url = obj.image.length > 0 ? extractImageUrl(obj.image[0]) : null;
          } else {
            result.image_url = extractImageUrl(obj.image);
          }
        }

        if (!result.author && obj.author) {
          if (typeof obj.author === "string") result.author = obj.author;
          else if (typeof obj.author === "object" && obj.author !== null) {
            const a = obj.author as Record<string, unknown>;
            if (a.name) result.author = String(a.name);
          } else if (Array.isArray(obj.author) && obj.author.length > 0) {
            const first = obj.author[0];
            result.author =
              typeof first === "string"
                ? first
                : (first as Record<string, unknown>).name
                ? String((first as Record<string, unknown>).name)
                : null;
          }
        }

        const timeRaw =
          (obj.totalTime as string) ?? (obj.cookTime as string) ?? null;
        if (!result.cook_time && timeRaw) {
          result.cook_time = parseIso8601Duration(timeRaw) ?? timeRaw;
        }

        if (obj.aggregateRating && typeof obj.aggregateRating === "object") {
          const ar = obj.aggregateRating as Record<string, unknown>;
          if (!result.rating && ar.ratingValue)
            result.rating = String(ar.ratingValue);
          if (!result.rating_count && ar.ratingCount)
            result.rating_count = String(ar.ratingCount);
        }
      }
    } catch {
      continue;
    }
  }

  return result;
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000);
}

const TAG_TAXONOMY = `Meal type tags (use one or more if applicable): "breakfast", "lunch", "dinner", "appetizer-side", "dessert", "snack"
Attribute tags (use any that apply): "quick" (under 30 min total), "healthy", "indulgent", "meal-prep"`;

async function extractWithGemini(
  html: string,
  missingFields: string[]
): Promise<Record<string, unknown>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return {};

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const cleaned = cleanHtml(html);
  const metaFields = missingFields.filter((f) => f !== "suggested_tags");
  const prompt = `Extract recipe metadata from this webpage text.

Return ONLY a JSON object with these fields:
${metaFields.length > 0 ? `- ${metaFields.join(", ")} (use null if not found, do not fabricate)` : ""}
- suggested_tags: array of applicable tags from this taxonomy:
${TAG_TAXONOMY}
  Return only the tag values that clearly apply based on the recipe title, description, cook time, and ingredients. Return an empty array if nothing clearly fits.

Webpage text:
${cleaned}

Return only valid JSON, no markdown, no explanation.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    // ignore
  }
  return {};
}

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url } = body;
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const { source_site, is_video } = getSourceSite(url);

  let html = "";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    html = await res.text();
  } catch {
    return NextResponse.json(
      { error: "Could not fetch that URL", source_site, is_video },
      { status: 422 }
    );
  }

  const og = extractOgData(html);
  const ld = extractJsonLd(html);

  const merged: Record<string, unknown> = {
    title: ld.title ?? og.title,
    image_url: ld.image_url ?? og.image_url,
    author: ld.author && !isPublisher(ld.author, source_site) ? ld.author : null,
    cook_time: ld.cook_time,
    rating: ld.rating,
    rating_count: ld.rating_count,
    description: ld.description ?? og.description,
    source_site,
    is_video,
    suggested_tags: [] as string[],
  };

  // Step 3: Gemini fallback — called when title or image missing; also always fetches tag suggestions
  if (!merged.title || !merged.image_url) {
    const missing: string[] = ["suggested_tags"];
    if (!merged.title) missing.push("title");
    if (!merged.image_url) missing.push("image_url");
    if (!merged.author) missing.push("author");
    if (!merged.cook_time) missing.push("cook_time");
    if (!merged.rating) missing.push("rating");
    if (!merged.rating_count) missing.push("rating_count");
    if (!merged.description) missing.push("description");

    const gemini = await extractWithGemini(html, missing);
    for (const key of missing) {
      if (key === "suggested_tags") {
        if (Array.isArray(gemini.suggested_tags)) merged.suggested_tags = gemini.suggested_tags;
      } else if (gemini[key] && !merged[key]) {
        merged[key] = gemini[key];
      }
    }
  }

  return NextResponse.json(merged);
}
