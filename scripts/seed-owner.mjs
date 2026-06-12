import { existsSync, readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const permissions = [
  "content_generate",
  "qc_check",
  "brand_database_view",
  "history_view",
  "export_output",
  "gemini_settings"
];

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const contents = readFileSync(path, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    const rawValue = valueParts.join("=");
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local or export it first.`);
  }

  return value;
}

function getSupabaseHost(supabaseUrl) {
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return "invalid-url";
  }
}

function logSupabaseError(label, error) {
  console.error(`${label} Supabase error:`);
  console.error({
    message: error?.message,
    code: error?.code,
    status: error?.status
  });
}

async function adminListUsers(supabase, options) {
  const { data, error } = await supabase.auth.admin.listUsers(options);

  if (error) {
    logSupabaseError("auth.admin.listUsers()", error);
    throw error;
  }

  return data;
}

async function adminGetUserById(supabase, userId) {
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    logSupabaseError("auth.admin.getUserById()", error);
    throw error;
  }

  return data;
}

async function adminCreateUser(supabase, payload) {
  const { data, error } = await supabase.auth.admin.createUser(payload);

  if (error) {
    logSupabaseError("auth.admin.createUser()", error);
    throw error;
  }

  return data;
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const data = await adminListUsers(supabase, {
      page,
      perPage
    });

    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (found) {
      return found;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function getOrCreateOwnerAuthUser(supabase) {
  const explicitUserId = process.env.OWNER_USER_ID;

  if (explicitUserId) {
    const data = await adminGetUserById(supabase, explicitUserId);

    if (!data.user) {
      throw new Error("OWNER_USER_ID was not found in Supabase Auth.");
    }

    return data.user;
  }

  const email = requireEnv("OWNER_EMAIL");
  const password = requireEnv("OWNER_PASSWORD");
  const fullName = process.env.OWNER_FULL_NAME || "Owner";
  const existingUser = await findUserByEmail(supabase, email);

  if (existingUser) {
    return existingUser;
  }

  const data = await adminCreateUser(supabase, {
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (!data.user) {
    throw new Error("Could not create owner auth user.");
  }

  return data.user;
}

async function main() {
  loadEnvFile(".env.local");

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  console.log(`Supabase host: ${getSupabaseHost(supabaseUrl)}`);
  console.log(`Service role key exists: ${Boolean(serviceRoleKey)}`);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  const user = await getOrCreateOwnerAuthUser(supabase);
  const email = user.email || requireEnv("OWNER_EMAIL");
  const fullName =
    process.env.OWNER_FULL_NAME || user.user_metadata?.full_name || "Owner";
  const dailyUsageLimit = Number(process.env.OWNER_DAILY_USAGE_LIMIT || 1000);

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name: fullName,
      role: "owner",
      is_active: true,
      daily_usage_limit: dailyUsageLimit
    },
    { onConflict: "id" }
  );

  if (profileError) {
    throw profileError;
  }

  const { error: permissionError } = await supabase
    .from("user_permissions")
    .upsert(
      permissions.map((permission) => ({
        user_id: user.id,
        permission,
        enabled: true
      })),
      { onConflict: "user_id,permission" }
    );

  if (permissionError) {
    throw permissionError;
  }

  console.log(`Owner ready: ${email}`);
  console.log(`Auth user id: ${user.id}`);
  console.log("All owner permissions enabled.");
}

main().catch((error) => {
  console.error("Seed owner failed:");
  console.error({
    message: error?.message,
    code: error?.code,
    status: error?.status
  });
  process.exit(1);
});
