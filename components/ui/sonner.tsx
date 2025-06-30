"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      expand={true}
      richColors={true}
      closeButton={true}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg dark:group-[.toaster]:bg-gray-800 dark:group-[.toaster]:text-gray-100 dark:group-[.toaster]:border-gray-700",
          description: "group-[.toast]:text-gray-600 dark:group-[.toast]:text-gray-300",
          actionButton:
            "group-[.toast]:bg-gray-900 group-[.toast]:text-white hover:group-[.toast]:bg-gray-800 dark:group-[.toast]:bg-gray-100 dark:group-[.toast]:text-gray-900 dark:hover:group-[.toast]:bg-gray-200",
          cancelButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-900 hover:group-[.toast]:bg-gray-200 dark:group-[.toast]:bg-gray-700 dark:group-[.toast]:text-gray-100 dark:hover:group-[.toast]:bg-gray-600",
          closeButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-900 hover:group-[.toast]:bg-gray-200 group-[.toast]:border-gray-200 dark:group-[.toast]:bg-gray-700 dark:group-[.toast]:text-gray-100 dark:hover:group-[.toast]:bg-gray-600 dark:group-[.toast]:border-gray-600",
          success:
            "group-[.toaster]:bg-green-50 group-[.toaster]:text-green-900 group-[.toaster]:border-green-200 dark:group-[.toaster]:bg-green-900/20 dark:group-[.toaster]:text-green-100 dark:group-[.toaster]:border-green-800",
          error:
            "group-[.toaster]:bg-red-50 group-[.toaster]:text-red-900 group-[.toaster]:border-red-200 dark:group-[.toaster]:bg-red-900/20 dark:group-[.toaster]:text-red-100 dark:group-[.toaster]:border-red-800",
          warning:
            "group-[.toaster]:bg-yellow-50 group-[.toaster]:text-yellow-900 group-[.toaster]:border-yellow-200 dark:group-[.toaster]:bg-yellow-900/20 dark:group-[.toaster]:text-yellow-100 dark:group-[.toaster]:border-yellow-800",
          info:
            "group-[.toaster]:bg-blue-50 group-[.toaster]:text-blue-900 group-[.toaster]:border-blue-200 dark:group-[.toaster]:bg-blue-900/20 dark:group-[.toaster]:text-blue-100 dark:group-[.toaster]:border-blue-800",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
