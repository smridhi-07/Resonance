"use client"

import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const stats = [
  { value: "100 Hz", label: "Sampling Rate" },
  { value: "2.0 s", label: "Window Duration" },
  { value: "v1.0", label: "Contract Version" },
]

export function StudioSection() {
  const { ref: headRef, isVisible: headVisible } = useScrollReveal(0.15)
  const { ref: bodyRef, isVisible: bodyVisible } = useScrollReveal(0.1)

  return (
    <section id="infrastructure" className="scroll-mt-20 px-6 py-20 md:px-12 lg:px-20 md:py-28 bg-foreground text-background">
      <div id="system" className="scroll-mt-20" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28">
        <div
          ref={headRef}
          className={`transition-all duration-1000 ${
            headVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <p className="text-xs font-medium tracking-[0.15em] uppercase text-background/50 mb-6">
            The Problem of Aging Infrastructure
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-light leading-[1.15] tracking-tight text-balance">
            Civil structures degrade silently long before damage becomes visible
          </h2>
        </div>

        <div
          ref={bodyRef}
          className={`flex flex-col justify-end gap-10 transition-all duration-1000 delay-200 ${
            bodyVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="flex flex-col gap-6 max-w-lg">
            <p className="text-sm leading-[1.75] text-background/60">
              Thousands of major concrete bridges, piers, and overpasses worldwide have exceeded their original 50-year engineering design horizons. Conventional maintenance depends heavily on periodic visual walk-throughs—an approach that catches micro-fissuring and tendon fatigue only after surface damage is already severe.
            </p>
            <p className="text-sm leading-[1.75] text-background/60">
              Resonance continuously evaluates the acoustic and vibrational telemetry of structural members. By streaming high-frequency modal waveforms, windowed spectral analysis decomposes modal frequencies in real time, detecting baseline anomalies and mechanical distress long before physical cracking appears.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-8 pt-10 border-t border-background/10">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl md:text-3xl lg:text-4xl font-light text-background tracking-tight tabular-nums">
                  {stat.value}
                </p>
                <p className="text-xs font-normal tracking-wider uppercase text-background/45 mt-2">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
