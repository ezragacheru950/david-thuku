import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_ALLOWED_EMAILS = ["david@example.com", "eve@example.com"];

export function getAllowedEmails(): string[] {
  const configured = process.env.NEXT_PUBLIC_ALLOWED_EMAILS ?? DEFAULT_ALLOWED_EMAILS.join(",");

  return configured
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedUserEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }

  return getAllowedEmails().includes(email.trim().toLowerCase());
}

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key || url.includes("your_supabase_project_url") || key.includes("your_supabase_publishable_key")) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
