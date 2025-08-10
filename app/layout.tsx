import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Analytics from "@/components/analytics"
import { Suspense } from "react"

export const metadata = {
  title: "Harish Sivaram | Cybersecurity Portfolio",
  description: "Personal portfolio of Harish Sivaram, Cybersecurity and Threat Intelligence professional",
}

// Add Google Fonts
const playfair = {
  variable: "--font-playfair",
  display: "swap",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <Suspense fallback={null}>
            {children}
            <Analytics />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}