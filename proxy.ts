import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items: { name: string; value: string; options: CookieOptions }[]) => items.forEach(({ name, value, options }) => { request.cookies.set(name, value); response.cookies.set(name, value, options); }) } });
  const { data: { user } } = await supabase.auth.getUser();
  if (request.nextUrl.pathname.startsWith("/app") && !user) return NextResponse.redirect(new URL("/", request.url));
  return response;
}
export const config = { matcher: ["/app/:path*"] };
