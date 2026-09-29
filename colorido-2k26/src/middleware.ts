import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * COLORIDO 2K26 — entry flow + route guards (spec §4, §48).
 *
 * LOGIN-FIRST ENTRY (spec §4: "When the website is opened: LOGIN PAGE"):
 *   Every unauthenticated visit lands on /login first. The login page offers:
 *     - Path A (Participant/Viewer): one click → cookie admits the public site
 *     - Path B (Admin/Event Host):   staff sign-in → role-based dashboard
 *   Deep links are preserved via ?next= and released after Path A.
 *
 * Route fences (server-side, never client-only — spec §48):
 *   /admin/**  → authenticated user (role re-checked in the page)
 *   /host/**   → authenticated user (role re-checked in the page)
 *   /login     → signed-in staff are sent to their dashboard
 *
 * Final role authorization always happens in server components
 * (requireRole) against the database — middleware is the outer fence.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() validates the token with the Supabase server — do NOT use
  // getSession() here, which trusts unverified cookie data.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith("/admin") || path.startsWith("/host");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (path === "/login" && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = profile?.role === "admin" ? "/admin" : "/host";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ---- Login-first gate -----------------------------------------------------
  // Static assets, internal Next files and any file with an extension pass
  // through; everything else requires either a staff session or a Path-A
  // viewer admission cookie.
  const isStaticLike =
    path.startsWith("/_next") ||
    path === "/favicon.ico" ||
    /\.[\w]+$/.test(path.split("/").pop() ?? "");

  // Phase 16: check-in passes (/check-in/<uuid>) are shared with participants
  // (WhatsApp, print) and must open without any session or viewer cookie.
  // The UUID is the capability token — same trust model as /registration/[id].
  const isPublicPass = path.startsWith("/check-in/");

  const viewerAdmitted =
    request.cookies.get("clr_viewer")?.value === "1";

  if (
    path !== "/login" &&
    !user &&
    !viewerAdmitted &&
    !isStaticLike &&
    !isPublicPass
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const deepLink = path + request.nextUrl.search;
    if (deepLink !== "/") {
      url.searchParams.set("next", deepLink);
    }
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except Next internals and obvious static files.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
