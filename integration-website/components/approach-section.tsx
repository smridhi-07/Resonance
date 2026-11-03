"use client"

import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const principles = [
  {
    number: "01",
    title: "Signal Acquisition",
    description:
      "Continuous 100 Hz acoustic and vibration telemetry acquisition across structural sensor nodes (Pillars A through D), capturing high-fidelity dynamic acceleration responses.",
  },
  {
    number: "02",
    title: "Feature Extraction",
    description:
      "Telemetry streams are segmented into 2.0-second (200-sample) sliding windows with 75% overlap, calculating Root Mean Square (RMS) energy, amplitude standard deviation, and FFT dominant modal frequency.",
  },
  {
    number: "03",
    title: "Anomaly Detection",
    description:
      "Unsupervised Scikit-learn IsolationForest inference evaluates multidimensional feature drift against calibrated baseline distributions, generating continuous severity metrics.",
  },
  {
    number: "04",
    title: "Telemetry & Monitoring",
    description:
      "Events are validated against JSON Schema Draft 2020-12, protected by runtime sequence monotonicity and duplicate-ID rejection, and broadcast in real time via Socket.IO.",
  },
]

function PrincipleCard({ principle, index }: { principle: typeof principles[0]; index: number }) {
  const { ref, isVisible } = useScrollReveal(0.15)

  return (
    <div
      ref={ref}
      className={`bg-background p-8 md:p-12 group transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
      style={{ transitionDelay: `${(index % 2) * 120}ms` }}
    >
      <div className="flex items-start justify-between mb-8">
        <span className="text-xs font-normal tracking-wider text-muted-foreground/60">
          ({principle.number})
        </span>
      </div>
      <h3 className="text-xl md:text-2xl font-light tracking-tight text-foreground mb-4 group-hover:translate-x-1 transition-transform duration-500">
        {principle.title}
      </h3>
      <div className="w-8 h-px bg-border mb-5 group-hover:w-12 transition-all duration-500" />
      <p className="text-sm leading-[1.75] text-muted-foreground max-w-sm">
        {principle.description}
      </p>
    </div>
  )
}

export function ApproachSection() {
  const { ref, isVisible } = useScrollReveal(0.05)

  return (
    <section id="methodology" className="scroll-mt-20 px-6 pt-16 pb-12 md:px-12 lg:px-20 md:pt-24 md:pb-14 bg-background">
      <div
        ref={ref}
        className={`mb-12 md:mb-14 pb-6 border-b border-border transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground mb-2">
          Architecture & Workflow
        </p>
        <h2 className="text-3xl md:text-4xl font-light tracking-tight text-foreground">
          Methodology
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
        {principles.map((principle, index) => (
          <PrincipleCard key={principle.number} principle={principle} index={index} />
        ))}
      </div>
    </section>
  )
}
