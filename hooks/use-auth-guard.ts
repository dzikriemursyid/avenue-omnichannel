import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserProfile } from "@/lib/supabase/profiles";

export function useAuthGuard(requiredRoles?: string[]) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      if (requiredRoles) {
        const profile = await getUserProfile(user.id);
        if (!profile || !requiredRoles.includes(profile.role)) {
          router.push("/dashboard");
          return;
        }
      }
    };

    checkAuth();
  }, [router, requiredRoles]);
}
