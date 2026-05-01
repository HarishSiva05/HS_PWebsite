import type React from "react"
import "@/app/globals.css"
import { Anton, Inter, JetBrains_Mono } from "next/font/google"
import Analytics from "@/components/analytics"
import { Suspense } from "react"

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" })
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono", display: "swap" })

export const metadata = {
  title: "Harish Sivaram | Cybersecurity Portfolio",
  description: "Cybersecurity researcher and engineer. M.Sc. Cybersecurity & Threat Intelligence, University of Guelph. Specialising in AI-driven security, malware analysis, and threat intelligence.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body>
        <Suspense fallback={null}>
          {children}
          <Analytics />
        </Suspense>
      </body>
    </html>
  )
}
