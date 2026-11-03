"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Navigation } from "@/components/navigation"
import { Hero } from "@/components/hero"
import { StudioSection } from "@/components/studio-section"
import { ApproachSection } from "@/components/approach-section"
import { OperationsConsole } from "@/components/operations-console"
import { JournalSection } from "@/components/journal-section"
import { ContactSection } from "@/components/contact-section"
import { Footer } from "@/components/footer"

function PreviewContent() {
  const searchParams = useSearchParams()
  const section = searchParams.get("section") || "hero"

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {section === "hero" && <Hero />}
      {section === "infrastructure" && (
        <div className="pt-20">
          <StudioSection />
        </div>
      )}
      {section === "methodology" && (
        <div className="pt-20">
          <ApproachSection />
        </div>
      )}
      {section === "operations" && (
        <div className="pt-20">
          <OperationsConsole />
        </div>
      )}
      {section === "validation" && (
        <div className="pt-20">
          <JournalSection />
        </div>
      )}
      {section === "contact" && (
        <div className="pt-20">
          <ContactSection />
        </div>
      )}
      {section === "all" && (
        <>
          <Hero />
          <OperationsConsole />
          <StudioSection />
          <ApproachSection />
          <JournalSection />
          <ContactSection />
          <Footer />
        </>
      )}
    </div>
  )
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div>Loading preview...</div>}>
      <PreviewContent />
    </Suspense>
  )
}
