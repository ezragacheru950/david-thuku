# DAVE AND EVE

A private two-person messaging website built with Next.js and Supabase.

## Stack

- Next.js App Router
- Supabase Auth
- Supabase Postgres
- `@supabase/ssr` cookie-based sessions
- TypeScript

## Local setup

1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local`.
3. Add the Supabase project URL and publishable key.
4. Run:

```bash
npm install
npm run dev
```

5. Open `http://localhost:3000`.

## Supabase requirements

The existing project should contain:

- `public.messages`
- RLS enabled
- SELECT policy allowing only David and Eve
- INSERT policy requiring `sender_id = auth.uid()` and allowing only David and Eve

Create the two Supabase Auth users before testing login. Passwords should be set privately by the respective account owner.

## Deployment

The project is ready to deploy to a free Next.js host such as Vercel after the GitHub repository contains these files. Add the same two environment variables in the host's project settings.
