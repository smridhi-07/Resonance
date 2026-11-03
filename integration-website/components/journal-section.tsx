"use client"

import { ArrowUpRight } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const entries = [
  {
    date: "Oct 2026",
    title: "Z24 Benchmark Bridge Modal Response Ingestion & Baseline Calibration",
    tag: "Validation",
  },
  {
    date: "Oct 2026",
    title: "IsolationForest Training & 200-Sample Sliding Window Optimization",
    tag: "ML Engine",
  },
  {
    date: "Oct 2026",
    title: "JSON Schema Draft 2020-12 Contract Verification (61/61 Tests Passing)",
    tag: "Contract",
  },
  {
    date: "Oct 2026",
    title: "Node.js Express Gateway & Socket.IO Telemetry Ingestion Hub Verification",
    tag: "Gateway",
  },
]

function JournalEntry({ entry, index }: { entry: typeof entries[0]; index: number }) {
  const { ref, isVisible } = useScrollReveal(0.1)

  return (
    <div
      ref={ref}
      className={`group flex items-start md:items-center justify-between py-7 md:py-8 gap-6 transition-all duration-700 cursor-pointer ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-10 flex-1">
        <span className="text-xs font-normal tracking-wide text-muted-foreground/60 shrink-0 w-24 tabular-nums">
          {entry.date}
        </span>
        <h3 className="text-base md:text-lg font-light tracking-tight text-foreground group-hover:text-muted-foreground transition-colors duration-300">
          {entry.title}
        </h3>
      </div>
      <div className="flex items-center gap-5 shrink-0">
        <span className="text-xs font-normal tracking-wider uppercase text-muted-foreground/50 hidden md:block">
          {entry.tag}
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
      </div>
    </div>
  )
}

export function JournalSection() {
  const { ref, isVisible } = useScrollReveal(0.05)

  return (
    <section id="validation" className="scroll-mt-20 px-6 pt-10 pb-16 md:px-12 lg:px-20 md:pt-14 md:pb-24 bg-background">
      <div
        ref={ref}
        className={`mb-12 md:mb-14 pb-6 border-b border-border transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground mb-2">
          Technical Validation
        </p>
        <h2 className="text-3xl md:text-4xl font-light tracking-tight text-foreground">
          Engineering Records
        </h2>
      </div>

      <div className="divide-y divide-border">
        {entries.map((entry, index) => (
          <JournalEntry key={entry.title} entry={entry} index={index} />
        ))}
      </div>
    </section>
  )
}
