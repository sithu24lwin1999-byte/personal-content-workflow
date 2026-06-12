const publicSupabaseKeyNames = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
] as const;

function missing(names: string[]) {
  return names.filter((name) => !process.env[name]);
}

export function getMissingSupabasePublicEnv() {
  const missingNames = missing(["NEXT_PUBLIC_SUPABASE_URL"]);

  if (!publicSupabaseKeyNames.some((name) => process.env[name])) {
    missingNames.push(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  return missingNames;
}

export function getMissingSupabaseAdminEnv() {
  return [
    ...getMissingSupabasePublicEnv(),
    ...missing(["SUPABASE_SERVICE_ROLE_KEY"])
  ];
}

export function getMissingGeminiEncryptionEnv() {
  return missing(["APP_ENCRYPTION_KEY"]);
}

export function logMissingEnv(context: string, missingNames: string[]) {
  if (missingNames.length > 0) {
    console.error(`${context} missing environment variables:`, missingNames);
  }
}

export function getSupabasePublicConfig(context = "Supabase public client") {
  const missingNames = getMissingSupabasePublicEnv();

  if (missingNames.length > 0) {
    logMissingEnv(context, missingNames);
    throw new Error(`Missing environment variables: ${missingNames.join(", ")}`);
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  };
}

export function getSupabaseAdminConfig(context = "Supabase admin client") {
  const missingNames = getMissingSupabaseAdminEnv();

  if (missingNames.length > 0) {
    logMissingEnv(context, missingNames);
    throw new Error(`Missing environment variables: ${missingNames.join(", ")}`);
  }

  return {
    ...getSupabasePublicConfig(context),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
  };
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
