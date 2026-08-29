import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(name, value);
            },
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              supabaseResponse.cookies.set(
                name,
                value,
                options,
              );
            },
          );
        },
      },
    },
  );

  /*
   * IMPORTANT:
   * Always use getUser() on the server to validate
   * the authenticated Supabase user.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  /*
   * Protect everything under /dashboard.
   *
   * A visitor without a valid Supabase session
   * is redirected to /login.
   */
  if (pathname.startsWith("/dashboard") && !user) {
    const loginUrl = request.nextUrl.clone();

    loginUrl.pathname = "/login";

    /*
     * Remember where the user was trying to go.
     * After login we can use this later to return
     * them to the original page.
     */
    loginUrl.searchParams.set(
      "redirect",
      pathname,
    );

    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
