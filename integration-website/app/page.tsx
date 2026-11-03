"use client"

import { useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Hero } from "@/components/hero"
import { StudioSection } from "@/components/studio-section"
import { ApproachSection } from "@/components/approach-section"
import { OperationsConsole } from "@/components/operations-console"
import { JournalSection } from "@/components/journal-section"
import { ContactSection } from "@/components/contact-section"
import { Footer } from "@/components/footer"

export default function Page() {
  useEffect(() => {
    const scrollToTarget = (targetId: string, smooth: boolean = true) => {
      const el = document.getElementById(targetId)
      if (el) {
        const navbarOffset = 80
        const elementPosition = el.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - navbarOffset

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: smooth ? "smooth" : "auto",
        })
      }
    }

    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "")
      if (hash) {
        scrollToTarget(hash, true)
      } else if (window.location.hash === "" && window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    }

    const params = new URLSearchParams(window.location.search)
    const initialTarget = params.get("scroll") || window.location.hash.replace("#", "")
    if (initialTarget) {
      setTimeout(() => scrollToTarget(initialTarget, false), 150)
    }

    window.addEventListener("popstate", handleHashChange)
    window.addEventListener("hashchange", handleHashChange)

    return () => {
      window.removeEventListener("popstate", handleHashChange)
      window.removeEventListener("hashchange", handleHashChange)
    }
  }, [])

  return (
    <main>
      <Navigation />
      <Hero />
      <OperationsConsole />
      <StudioSection />
      <ApproachSection />
      <JournalSection />
      <ContactSection />
      <Footer />
    </main>
  )
}
