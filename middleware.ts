import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  // If no session, redirect to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Get current path
  const pathname = req.nextUrl.pathname;

  // Check the user’s role in the officials table
  const { data: userData } = await supabase
    .from("officials")
    .select("role")
    .eq("user_id", session.user.id)
    .single();

  const role = userData?.role || "user";

  // Role-based access
  if (pathname.startsWith("/collector") && role !== "collector") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname.startsWith("/official") && role !== "official") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/collector/:path*", "/official/:path*"], // protect these routes
};