import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" && process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 && typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0;

// Create Supabase client for Client Components
export function createClient(): SupabaseClient<any, "public", any> {
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
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
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

  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
