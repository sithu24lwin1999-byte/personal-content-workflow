import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function parseCookieHeader(cookieHeader: string) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      const name = separatorIndex >= 0 ? part.slice(0, separatorIndex) : part;
      const value = separatorIndex >= 0 ? part.slice(separatorIndex + 1) : "";
      return { name, value };
    });
}

function hasSupabaseAuthCookie(cookieHeader: string) {
  return /sb-[^=;]+-auth-token/.test(cookieHeader);
}

export function jsonWithAuthCookies(
  body: unknown,
  init: ResponseInit | undefined,
  cookiesToSet: CookieToSet[] = [],
  context = "api"
) {
  const response = NextResponse.json(body, init);
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  console.log(`${context} API response status: ${response.status}`);
  return response;
}

export async function getApiContextFromRequest(
  request: Request,
  context = "api"
) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookiesToSet: CookieToSet[] = [];
  const { supabaseUrl, supabaseKey } = getSupabasePublicConfig(context);
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(cookieHeader);
      },
      setAll(nextCookiesToSet) {
        cookiesToSet.push(...nextCookiesToSet);
      }
    }
  });

  console.log(`${context} auth cookie exists: ${hasSupabaseAuthCookie(cookieHeader)}`);

  const {
    data: { user }
  } = await supabase.auth.getUser();

  console.log(`${context} auth.getUser returned user id: ${Boolean(user?.id)}`);

  if (!user) {
    throw new ApiError("Not authenticated.", 401);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (error || !profile) {
    throw new ApiError("Profile not found.", 403);
  }

  if (!profile.is_active) {
    throw new ApiError("Account is inactive.", 403);
  }

  return {
    admin: createSupabaseAdminClient(),
    cookiesToSet,
    profile,
    supabase,
    user
  };
}

export async function requireApiOwnerFromRequest(
  request: Request,
  context = "api"
) {
  const apiContext = await getApiContextFromRequest(request, context);

  if (apiContext.profile.role !== "owner") {
    throw new ApiError("Owner access required.", 403);
  }

  return apiContext;
}

export async function getApiContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ApiError("Not authenticated.", 401);
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (error || !profile) {
    throw new ApiError("Profile not found.", 403);
  }

  if (!profile.is_active) {
    throw new ApiError("Account is inactive.", 403);
  }

  return { admin, profile, supabase, user };
}

export async function requireApiOwner() {
  const context = await getApiContext();

  if (context.profile.role !== "owner") {
    throw new ApiError("Owner access required.", 403);
  }

  return context;
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Request failed." },
    { status: 500 }
  );
}

export function apiErrorResponseWithCookies(
  error: unknown,
  cookiesToSet: CookieToSet[] = [],
  context = "api"
) {
  if (error instanceof ApiError) {
    return jsonWithAuthCookies(
      { error: error.message },
      { status: error.status },
      cookiesToSet,
      context
    );
  }

  return jsonWithAuthCookies(
    { error: error instanceof Error ? error.message : "Request failed." },
    { status: 500 },
    cookiesToSet,
    context
  );
}
