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
  "tiktok",
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
  "tiktok.com": "TikTok",
  "vm.tiktok.com": "TikTok",
};

function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\.|^m\./, "");
    if (hostname === "youtube.com") {
      if (parsed.pathname.startsWith("/shorts/")) return parsed.pathname.split("/")[2] || null;
      if (parsed.pathname.startsWith("/live/")) return parsed.pathname.split("/")[2] || null;
      return parsed.searchParams.get("v");
    }
    if (hostname === "youtu.be") return parsed.pathname.slice(1).split("?")[0] || null;
    return null;
  } catch {
    return null;
  }
}

function getSourceSite(url: string): {
  source_site: string;
  is_video: boolean;
  video_author_hint?: string;
} {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\.|^m\./, "");
    const path = parsed.pathname;
    const mapped = SOURCE_SITE_MAP[hostname];

    let is_video = false;
    let video_author_hint: string | undefined;

    if (hostname === "youtube.com") {
      is_video = path.startsWith("/watch") || path.startsWith("/shorts/") || path.startsWith("/live/");
    } else if (hostname === "youtu.be") {
      is_video = true;
    } else if (hostname === "instagram.com") {
      is_video = path.includes("/reel/") || path.includes("/p/");
      if (is_video) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length > 0 && !["reel", "p", "tv"].includes(parts[0])) {
          video_author_hint = `@${parts[0]}`;
        }
      }
    } else if (hostname === "tiktok.com") {
      is_video = path.includes("/video/");
      if (is_video) {
        const parts = path.split("/").filter(Boolean);
        if (parts[0]?.startsWith("@")) video_author_hint = parts[0];
      }
    } else if (hostname === "vm.tiktok.com") {
      is_video = true;
    }

    if (mapped) return { source_site: mapped, is_video, video_author_hint };

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

// --- oEmbed ---

type OEmbedResult = { title: string | null; author: string | null; image_url: string | null };

async function fetchOEmbed(url: string, sourceSite: string): Promise<OEmbedResult> {
  let oembedUrl: string;
  if (sourceSite === "YouTube") {
    oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  } else if (sourceSite === "TikTok") {
    oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  } else if (sourceSite === "Instagram") {
    oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
  } else {
    return { title: null, author: null, image_url: null };
  }

  try {
    const res = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return { title: null, author: null, image_url: null };
    const data = await res.json();
    if (data.error) return { title: null, author: null, image_url: null };

    const title = typeof data.title === "string" && data.title ? data.title : null;
    const authorRaw = typeof data.author_name === "string" && data.author_name ? data.author_name : null;
    const image_url = typeof data.thumbnail_url === "string" && data.thumbnail_url ? data.thumbnail_url : null;

    // Filter obviously junk titles from Instagram
    let cleanTitle = title;
    if (sourceSite === "Instagram" && title) {
      const lower = title.toLowerCase();
      if (lower === "instagram" || lower.includes("log in") || lower === "instagram photo" || lower === "instagram video") {
        cleanTitle = null;
      }
    }

    return { title: cleanTitle, author: authorRaw, image_url };
  } catch {
    return { title: null, author: null, image_url: null };
  }
}

// --- HTML extraction ---

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
    const match =
      html.match(new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, "i")) ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, "i"));
    return match ? match[1].trim() : null;
  };
  const getMeta = (name: string) => {
    const match =
      html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i")) ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"));
    return match ? match[1].trim() : null;
  };
  return {
    title: get("title"),
    image_url: get("image"),
    description: get("description"),
    site_name: get("site_name"),
    meta_author: getMeta("author"),
  };
}

function extractYouTubeChannelName(html: string): string | null {
  const match =
    html.match(/<link[^>]+itemprop=["']name["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+content=["']([^"']+)["'][^>]+itemprop=["']name["']/i);
  return match ? match[1].trim() : null;
}

function extractJsonLd(html: string) {
  const result: Record<string, string | null> = {
    title: null, image_url: null, author: null,
    cook_time: null, rating: null, rating_count: null, description: null,
  };

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

        if (!result.title && obj.name) result.title = String(obj.name);
        if (!result.description && obj.description) result.description = String(obj.description);

        if (!result.image_url && obj.image) {
          const extractImageUrl = (val: unknown): string | null => {
            if (typeof val === "string") return val;
            if (typeof val === "object" && val !== null) {
              const v = val as Record<string, unknown>;
              if (typeof v.url === "string") return v.url;
            }
            return null;
          };
          result.image_url = Array.isArray(obj.image)
            ? (obj.image.length > 0 ? extractImageUrl(obj.image[0]) : null)
            : extractImageUrl(obj.image);
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

        const timeRaw = (obj.totalTime as string) ?? (obj.cookTime as string) ?? null;
        if (!result.cook_time && timeRaw) result.cook_time = parseIso8601Duration(timeRaw) ?? timeRaw;

        if (obj.aggregateRating && typeof obj.aggregateRating === "object") {
          const ar = obj.aggregateRating as Record<string, unknown>;
          if (!result.rating && ar.ratingValue) result.rating = String(ar.ratingValue);
          if (!result.rating_count && ar.ratingCount) result.rating_count = String(ar.ratingCount);
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

async function extractWithGemini(html: string, missingFields: string[]): Promise<Record<string, unknown>> {
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
  Return only the tag values that clearly apply. Return an empty array if nothing clearly fits.

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

// --- Main handler ---

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url } = body;
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const { source_site, is_video, video_author_hint } = getSourceSite(url);

  // Step 1: oEmbed (video URLs only) — runs in parallel with HTML fetch
  const oEmbedPromise: Promise<OEmbedResult> =
    is_video && (source_site === "YouTube" || source_site === "Instagram" || source_site === "TikTok")
      ? fetchOEmbed(url, source_site)
      : Promise.resolve({ title: null, author: null, image_url: null });

  // Step 2: Fetch HTML
  const htmlPromise = fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(10000),
  })
    .then((r) => r.text())
    .catch(() => null);

  const [oEmbed, htmlOrNull] = await Promise.all([oEmbedPromise, htmlPromise]);

  // If HTML fetch failed and oEmbed gave us nothing, bail out
  if (htmlOrNull === null && !oEmbed.title && !oEmbed.image_url) {
    return NextResponse.json(
      { error: "Could not fetch that URL", source_site, is_video },
      { status: 422 }
    );
  }

  const html = htmlOrNull ?? "";

  // Step 3: OG tags and JSON-LD from HTML
  const og = extractOgData(html);
  const ld = extractJsonLd(html);

  // Merge: oEmbed takes priority, then JSON-LD, then OG
  const ldAuthor = ld.author && !isPublisher(ld.author, source_site) ? ld.author : null;
  const oEmbedAuthor = oEmbed.author && !isPublisher(oEmbed.author, source_site) ? oEmbed.author : null;

  const merged: Record<string, unknown> = {
    title: oEmbed.title ?? ld.title ?? og.title,
    image_url: oEmbed.image_url ?? ld.image_url ?? og.image_url,
    author: oEmbedAuthor ?? ldAuthor,
    cook_time: is_video ? null : ld.cook_time,
    rating: is_video ? null : ld.rating,
    rating_count: is_video ? null : ld.rating_count,
    description: ld.description ?? og.description,
    source_site,
    is_video,
    suggested_tags: [] as string[],
  };

  // Video-specific author fallback (when oEmbed and JSON-LD both gave nothing)
  if (is_video && !merged.author) {
    if (source_site === "YouTube") {
      const channelName = extractYouTubeChannelName(html);
      if (channelName && !isPublisher(channelName, source_site)) {
        merged.author = channelName;
      }
      if (!merged.author && og.meta_author && !isPublisher(og.meta_author, source_site)) {
        merged.author = og.meta_author;
      }
      if (!merged.author && og.site_name && !isPublisher(og.site_name, source_site)) {
        merged.author = og.site_name;
      }
    } else if (video_author_hint) {
      merged.author = video_author_hint;
    }
  }

  // YouTube thumbnail: always upgrade to maxresdefault from video ID
  if (source_site === "YouTube") {
    const videoId = extractYouTubeVideoId(url);
    if (videoId) merged.image_url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  // Step 4: Gemini fallback — only when title or image_url still missing
  if (!merged.title || !merged.image_url) {
    const missing: string[] = ["suggested_tags"];
    if (!merged.title) missing.push("title");
    if (!merged.image_url) missing.push("image_url");
    if (!merged.author) missing.push("author");
    if (!is_video) {
      if (!merged.cook_time) missing.push("cook_time");
      if (!merged.rating) missing.push("rating");
      if (!merged.rating_count) missing.push("rating_count");
    }
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
