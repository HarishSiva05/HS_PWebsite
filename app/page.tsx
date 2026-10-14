import { SmoothScroll } from "@/components/dossier/smooth-scroll"
import { Cursor } from "@/components/dossier/cursor"
import { Intro } from "@/components/dossier/intro"
import { Nav } from "@/components/dossier/nav"
import { Hero, Tapes } from "@/components/dossier/hero"
import { Summary } from "@/components/dossier/summary"
import { Matrix } from "@/components/dossier/matrix"
import { Cases, CaseDrawer } from "@/components/dossier/cases"
import { Record, Honours } from "@/components/dossier/record"
import { Contact } from "@/components/dossier/contact"

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Cursor />
      <Intro />
      <Nav />
      <main>
        <Hero />
        <Tapes />
        <Summary />
        <Matrix />
        <Cases />
        <Record />
        <Honours />
        <Contact />
      </main>
      <CaseDrawer />
    </>
  )
}
