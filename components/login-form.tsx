"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { signIn } from "@/lib/actions"
import { toast } from "sonner"
import Image from "next/image"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-[#2b725e] hover:bg-[#235e4c] text-white text-lg font-medium rounded-lg py-2.5 h-11"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing in...
        </>
      ) : (
        "Sign In"
      )}
    </Button>
  )
}

export default function LoginForm() {
  const router = useRouter()
  const [state, formAction] = useActionState(signIn, null)

  // Handle login result with toast notifications
  useEffect(() => {
    if (state?.success) {
      toast.success("Login Successful", {
        description: state.message || "Welcome back!",
      })
      // Add a small delay to allow toast to be visible before redirect
      setTimeout(() => {
        router.push("/")
      }, 1500)
    } else if (state?.message && !state.success) {
      toast.error("Login Failed", {
        description: state.message,
      })
    }
  }, [state, router])

  return (
    <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-lg shadow-lg">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Welcome back</h1>
        <p className="text-lg text-gray-600">Sign in to your account</p>
      </div>

      <div className="flex justify-center mb-8">
        <Image
          src="/images/logo-avenue.png"
          alt="Avenue Developments Logo"
          width={200}
          height={100}
          className="h-auto max-w-[200px]"
        />
      </div>

      <form action={formAction} className="space-y-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div>

        <SubmitButton />

        <div className="text-center text-gray-600">
          <p className="text-sm">
            Don't have an account? Contact your administrator to create one for you.
          </p>
        </div>
      </form>
    </div>
  )
}
