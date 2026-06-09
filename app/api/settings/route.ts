import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data, error } = await supabase.from("app_settings").select("key, value");
  if (error) return NextResponse.json({}, { status: 500 });
  const result: Record<string, string> = {};
  for (const row of data ?? []) result[row.key] = row.value;
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as Record<string, string>;
  const rows = Object.entries(body).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("app_settings")
    .upsert(rows, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
