import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut({
    scope: "local",
  });

  if (error) {
    console.error("Sign out error:", error);
  }

  return NextResponse.redirect(
    new URL("/login", request.url),
    303,
  );
}