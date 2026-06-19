import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (xs: { name: string; value: string; options?: any }[]) => {
          try {
            xs.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component: cookies cannot be set here.
          }
        },
      },
    }
  );
}
