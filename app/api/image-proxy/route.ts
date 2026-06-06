import { NextRequest, NextResponse } from "next/server";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=604800, immutable",
};

async function fetchImage(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: { ...HEADERS, Referer: new URL(url).origin },
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse(null, { status: 400 });

  let res = await fetchImage(url);

  // YouTube maxresdefault fallback: if it 404s, try hqdefault
  if (!res) {
    const ytMatch = url.match(/img\.youtube\.com\/vi\/([^/]+)\/maxresdefault\.jpg/i);
    if (ytMatch) {
      const fallbackUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      res = await fetchImage(fallbackUrl);
    }
  }

  if (!res) return new NextResponse(null, { status: 404 });

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = await res.arrayBuffer();

  return new NextResponse(buffer, {
    headers: { "Content-Type": contentType, ...CACHE_HEADERS },
  });
}
