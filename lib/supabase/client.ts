"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseKey } = getSupabasePublicConfig(
    "createSupabaseBrowserClient"
  );

  return createBrowserClient(supabaseUrl, supabaseKey);
}
