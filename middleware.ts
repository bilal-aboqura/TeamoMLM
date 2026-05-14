import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options ?? {})
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthed = !!user;
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminChatRoute = pathname.startsWith("/admin/chat");
  const isAdminChatAuditRoute =
    pathname.startsWith("/admin/chat/blacklist") || pathname.startsWith("/admin/chat/logs");
  const isAdminChatSettingsRoute =
    pathname.startsWith("/admin/chat/groups/") && pathname.endsWith("/settings");
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isDashboard = pathname.startsWith("/dashboard");
  const isRoot = pathname === "/";

  if (isAdminRoute && !isAuthed) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAdminRoute && isAuthed) {
    const { data: chatProfile } = await supabase
      .from("chat_profiles")
      .select("global_role")
      .eq("user_id", user.id)
      .maybeSingle();
    const role = chatProfile?.global_role ?? user?.app_metadata?.role;

    if ((isAdminChatSettingsRoute || isAdminChatAuditRoute) && role === "moderator") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (isAdminChatRoute) {
      if (role !== "admin" && role !== "moderator") {
        return new NextResponse("Forbidden", { status: 403 });
      }
    } else if (role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (isDashboard && isAuthed) {
    const role = user?.app_metadata?.role;
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  if (isRoot && isAuthed) {
    const role = user?.app_metadata?.role;
    return NextResponse.redirect(new URL(role === "admin" ? "/admin" : "/dashboard", request.url));
  }

  if (isDashboard && !isAuthed) {
    const url = new URL("/login", request.url);
    const hasAuthCookie = request.cookies.getAll().some((c) =>
      c.name.includes("sb-") && c.name.includes("-auth-token")
    );
    if (hasAuthCookie) {
      url.searchParams.set("expired", "1");
    }
    return NextResponse.redirect(url);
  }

  if (isAuthPage && isAuthed) {
    const role = user?.app_metadata?.role;
    return NextResponse.redirect(new URL(role === "admin" ? "/admin" : "/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
