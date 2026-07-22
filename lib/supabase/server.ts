import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
export async function createClient() {
  const store = await cookies(); const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = env();
  return createServerClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => store.getAll(), setAll: (items: { name: string; value: string; options: CookieOptions }[]) => { try { items.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {} } } });
}
