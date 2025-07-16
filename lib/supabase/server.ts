import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" && process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 && typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0;

// Create Supabase client for Server Components
export async function createClient(): Promise<SupabaseClient<any, "public", any>> {
  if (!isSupabaseConfigured) {
    console.warn("Supabase environment variables are not set. Creating mock client.");
    // Return a properly typed SupabaseClient that throws errors when used
    const mockError = new Error("Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.");

    return new Proxy({} as SupabaseClient<any, "public", any>, {
      get(target, prop) {
        if (prop === "auth") {
          return {
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            signOut: () => Promise.resolve({ error: null }),
            signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: mockError }),
            updateUser: () => Promise.resolve({ data: { user: null }, error: mockError }),
            admin: {
              inviteUserByEmail: () => Promise.resolve({ data: null, error: mockError }),
              generateLink: () => Promise.resolve({ data: null, error: mockError }),
            },
          };
        }
        if (prop === "from") {
          return () => {
            throw mockError;
          };
        }
        return () => {
          throw mockError;
        };
      },
    });
  }

  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

// Create Supabase client with service role for server-side operations (webhooks, etc.)
export function createServiceClient(): SupabaseClient<any, "public", any> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service role configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
