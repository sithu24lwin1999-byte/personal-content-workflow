# Content Workflow MVP Setup Guide

This app is prepared for real Supabase Auth testing. It does not include mock auth or a fake local user path.

## What You Are Connecting

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase Auth email/password
- Supabase PostgreSQL with Row Level Security
- Owner/user roles
- Feature permissions
- Gemini API key saved from `/owner`, encrypted server-side, and stored in Supabase

## 1. Required `.env.local` Variables

Create a local env file:

```bash
cp .env.example .env.local
```

Required for the app:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
# Optional fallback if you use Supabase's publishable-key naming:
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
APP_ENCRYPTION_KEY=your-long-random-secret
```

The code prefers `NEXT_PUBLIC_SUPABASE_ANON_KEY` and also supports `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as a fallback.

Current Supabase dashboards may label this as an anon key or publishable key. Recommended setup:

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

If you already configured only `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel, the app will now read that too.

Optional local reference:

```bash
GEMINI_API_KEY=your-gemini-api-key
```

The app does not read `GEMINI_API_KEY` at runtime. Paste the Gemini key in `/owner` so it can be encrypted and stored in `gemini_settings`.

Optional for the owner seed script:

```bash
OWNER_EMAIL=owner@example.com
OWNER_PASSWORD=use-a-real-temp-password
OWNER_FULL_NAME=Owner
OWNER_DAILY_USAGE_LIMIT=1000
OWNER_USER_ID=
```

Use this to generate `APP_ENCRYPTION_KEY`:

```bash
openssl rand -base64 32
```

Keep these server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ENCRYPTION_KEY`
- any real Gemini key

## 2. Supabase Project Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open Project Settings > API.
3. Copy the Project URL into `NEXT_PUBLIC_SUPABASE_URL`.
4. Copy the anon public key, also sometimes labeled publishable key, into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   If you prefer Supabase's newer naming, put it in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Copy the service_role key into `SUPABASE_SERVICE_ROLE_KEY`.
6. Open Authentication > Providers > Email.
7. Enable Email/password authentication.
8. Open Authentication > URL Configuration.
9. Set Site URL:

```text
http://localhost:3000
```

10. Add Redirect URL:

```text
http://localhost:3000/update-password
```

For Vercel later, add the production domain to Site URL and Redirect URLs too.

## 3. Apply SQL Migration

Migration file:

[`supabase/migrations/001_initial_schema.sql`](/Users/mooki3/Documents/Codex/2026-06-12/build-a-simple-personal-content-workflow/supabase/migrations/001_initial_schema.sql)

Apply from Supabase dashboard:

1. Open SQL Editor.
2. Create a new query.
3. Paste the full migration file.
4. Click Run.
5. Open Table Editor and confirm these tables exist:
   - `profiles`
   - `user_permissions`
   - `brands`
   - `gemini_settings`
   - `usage_logs`
   - `ai_outputs`
6. Confirm RLS is enabled on all six tables.

The migration creates all required enums, tables, indexes, triggers, helper functions, and RLS policies.

## 4. Seed the First Owner Profile

You can seed the owner with the included script:

[`scripts/seed-owner.mjs`](/Users/mooki3/Documents/Codex/2026-06-12/build-a-simple-personal-content-workflow/scripts/seed-owner.mjs)

Option A: create the Auth user and owner profile in one command.

1. Put these in `.env.local`:

```bash
OWNER_EMAIL=owner@example.com
OWNER_PASSWORD=use-a-real-temp-password
OWNER_FULL_NAME=Owner
OWNER_DAILY_USAGE_LIMIT=1000
```

2. Run:

```bash
npm run seed:owner
```

Option B: seed a profile for an Auth user you already created.

1. In Supabase, go to Authentication > Users.
2. Create the owner user manually.
3. Copy the user UUID.
4. Put this in `.env.local`:

```bash
OWNER_USER_ID=auth-user-uuid
OWNER_EMAIL=owner@example.com
OWNER_FULL_NAME=Owner
OWNER_DAILY_USAGE_LIMIT=1000
```

5. Run:

```bash
npm run seed:owner
```

The script upserts:

- `profiles` row with `role = 'owner'`
- all `user_permissions` rows enabled

## 5. Test Owner Login

Start the app:

```bash
npm install
npm run dev
```

Then:

1. Open `http://localhost:3000/login`.
2. Sign in with the owner email/password.
3. Confirm you are redirected to `/owner`.
4. Confirm these panels load:
   - Users and permissions
   - Gemini settings
   - Brand database
   - Recent usage logs

If `/owner` redirects back to `/login`, check:

- `.env.local` values are present.
- The dev server was restarted after editing `.env.local`.
- `profiles.role` is `owner`.
- `profiles.is_active` is `true`.

## 6. Add a Normal User

From `/owner`:

1. In Users and permissions, enter:
   - Email
   - Temporary password
   - Name
   - Role: `user`
2. Click Create.
3. Confirm the user appears in the table.
4. Confirm the user exists in Supabase Authentication > Users.
5. Enable only the permissions you want:
   - `content_generate`
   - `qc_check`
   - `brand_database_view`
   - `history_view`
   - `export_output`
   - `gemini_settings`

Normal users only see features with enabled permissions. Owners always have full access.

## 7. Save Gemini API Key from `/owner`

From `/owner`:

1. Find Gemini settings.
2. Paste the Gemini API key into the API key field.
3. Set:
   - Model name, for example `gemini-2.5-flash`
   - Temperature
   - Max output tokens
   - Content generation system prompt
   - QC checking system prompt
   - Daily usage limit default
4. Click Save settings.
5. Refresh `/owner`.
6. Confirm the Gemini Key card says `Set`.

The API key is encrypted with `APP_ENCRYPTION_KEY` before being saved to Supabase. It is never returned to the browser. Gemini calls only run from server-side API routes:

- [`app/api/ai/generate/route.ts`](/Users/mooki3/Documents/Codex/2026-06-12/build-a-simple-personal-content-workflow/app/api/ai/generate/route.ts)
- [`app/api/ai/qc/route.ts`](/Users/mooki3/Documents/Codex/2026-06-12/build-a-simple-personal-content-workflow/app/api/ai/qc/route.ts)

## 8. Test Permission-Based User Access

Use this flow:

1. Log in as owner.
2. Create a brand in `/owner`.
3. Create a normal user.
4. Enable only:
   - `brand_database_view`
   - `history_view`
5. Log out.
6. Log in as the normal user.
7. Open `/dashboard`.
8. Confirm Brand Database Viewer and History are visible.
9. Confirm Content Generator and QC Checker are hidden.
10. Log back in as owner.
11. Enable `content_generate`.
12. Log in as the normal user again.
13. Confirm Content Generator appears.
14. Generate content.
15. Confirm a row is added to `ai_outputs`.
16. Confirm a row is added to `usage_logs`.
17. Repeat by enabling `qc_check` and testing QC Checker.

To test deactivation:

1. Log in as owner.
2. Uncheck Active for the normal user.
3. Log out.
4. Try logging in as that user.
5. Confirm access is rejected.

## 9. Verification Checklist

### `/login`

- Page loads at `http://localhost:3000/login`.
- Owner can sign in with Supabase Auth credentials.
- Invalid credentials show an error.
- Inactive users cannot access the app.
- Reset password link goes to `/reset-password`.

### `/owner`

- Unauthenticated visitors are redirected to `/login`.
- Non-owner users are redirected to `/dashboard`.
- Owner sees user management, permission toggles, Gemini settings, brand database, and usage logs.
- Owner can deactivate/reactivate users.

### `/dashboard`

- Unauthenticated visitors are redirected to `/login`.
- Active users can access `/dashboard`.
- The visible dashboard cards match enabled permissions.

### User permissions

- With `content_generate` off, Content Generator is hidden.
- With `qc_check` off, QC Checker is hidden.
- With `brand_database_view` off, Brand Database Viewer is hidden.
- With `history_view` off, History is hidden.
- With `export_output` off, Export button is hidden.

### Gemini settings save

- Owner can save model, temperature, token limit, prompts, and daily default limit.
- Owner can save a Gemini API key.
- `/owner` shows Gemini Key as `Set` after saving.
- The raw key is not displayed after refresh.

### Brand create/edit/delete

- Owner can create a brand with all required brand database fields.
- Created brand appears in `/owner`.
- Brand appears in `/dashboard` for users with `brand_database_view`.
- Owner can edit brand fields.
- Owner can delete a brand.

## Vercel Hobby Deployment

1. Push this project to GitHub.
2. Create a Vercel project on the Hobby plan.
3. Add all required `.env.local` values to Vercel Project Settings > Environment Variables.
4. Add the production Vercel URL to Supabase Authentication > URL Configuration.
5. Deploy.
