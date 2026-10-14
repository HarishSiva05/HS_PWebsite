import type React from "react"
import type { Metadata, Viewport } from "next"
import "@/app/globals.css"
import { Archivo, Caveat, IBM_Plex_Mono } from "next/font/google"
import Analytics from "@/components/analytics"
import { Suspense } from "react"
import { SUBJECT } from "@/lib/dossier"

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" })
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" })
const caveat = Caveat({ subsets: ["latin"], weight: ["600"], variable: "--font-caveat", display: "swap" })

const description =
  "Cybersecurity and software engineer in Markham, Ontario. M.Sc. in Cybersecurity & Threat Intelligence (University of Guelph). Threat intelligence, AI and LLM security, malware attribution, and privacy-first iOS apps."

export const metadata: Metadata = {
  metadataBase: new URL(SUBJECT.site),
  title: "Harish Sivaram — Cybersecurity & Software Engineer",
  description,
  openGraph: {
    title: "Harish Sivaram — File HS-0519, declassified",
    description,
    url: SUBJECT.site,
    type: "profile",
    images: [{ url: "/subject.jpg", width: 1000, height: 1000, alt: "Harish Sivaram" }],
  },
  twitter: { card: "summary_large_image", title: "Harish Sivaram — File HS-0519", description, images: ["/subject.jpg"] },
}

export const viewport: Viewport = { themeColor: "#ede9df" }

// Skip the folder intro on repeat visits and for reduced motion, before first paint.
const introScript = `try{if(sessionStorage.getItem('hs-intro')||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.intro='skip'}catch(e){}`

const personLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SUBJECT.name,
  jobTitle: SUBJECT.title,
  url: SUBJECT.site,
  email: `mailto:${SUBJECT.email}`,
  address: { "@type": "PostalAddress", addressLocality: "Markham", addressRegion: "ON", addressCountry: "CA" },
  alumniOf: ["University of Guelph", "Sri Krishna College of Engineering and Technology"],
  sameAs: [SUBJECT.github, SUBJECT.linkedin],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexMono.variable} ${caveat.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }} />
        <noscript>
          <style>{`.intro{display:none}.rd{background-size:0 0,0 0}.rd-b::after{display:none}`}</style>
        </noscript>
      </head>
      <body>
        <Suspense fallback={null}>
          {children}
          <Analytics />
        </Suspense>
      </body>
    </html>
  )
}
