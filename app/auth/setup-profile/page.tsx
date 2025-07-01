import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SetupProfileForm } from "@/components/auth/setup-profile-form"

export default async function SetupProfilePage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    // Check if profile already exists
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

    if (profile) {
        redirect("/dashboard")
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="mx-auto max-w-sm space-y-6">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold">Setup Your Profile</h1>
                    <p className="text-muted-foreground">
                        Complete your profile to get started
                    </p>
                </div>
                <SetupProfileForm user={user} />
            </div>
        </div>
    )
}
