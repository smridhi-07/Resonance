"use client"

import { ArrowUpRight } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

export function ContactSection() {
  const { ref: headRef, isVisible: headVisible } = useScrollReveal(0.15)
  const { ref: bodyRef, isVisible: bodyVisible } = useScrollReveal(0.1)

  return (
    <section id="contact" className="scroll-mt-20 px-6 py-20 md:px-12 lg:px-20 md:py-28 bg-foreground text-background">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28">
        <div
          ref={headRef}
          className={`transition-all duration-1000 ${
            headVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <p className="text-xs font-medium tracking-[0.15em] uppercase text-background/50 mb-6">
            System Integration
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-light leading-[1.15] tracking-tight text-balance">
            Deploy continuous telemetry<br />for critical assets
          </h2>
          <div className="mt-8">
            <a
              href="mailto:monitoring@resonance.local"
              className="group inline-flex items-center gap-3 text-sm tracking-wide text-background/70 hover:text-background transition-colors duration-500"
            >
              <span className="border-b border-background/20 pb-0.5 group-hover:border-background/60 transition-colors duration-500">
                monitoring@resonance.local
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
            </a>
          </div>
        </div>

        <div
          ref={bodyRef}
          className={`flex flex-col justify-end transition-all duration-1000 delay-200 ${
            bodyVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <p className="text-xs font-medium tracking-wider uppercase text-background/45 mb-4">
                Specifications
              </p>
              <p className="text-sm leading-[1.75] text-background/60">
                Draft 2020-12 Contract<br />
                Node.js Gateway (:4000)<br />
                Socket.IO Telemetry Hub
              </p>
              <p className="text-xs text-background/40 mt-4">
                Port 4000 Telemetry Ingest
              </p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wider uppercase text-background/45 mb-4">
                Deployment
              </p>
              <p className="text-sm leading-[1.75] text-background/60">
                Civil Infrastructure Nodes<br />
                Pillar Accelerometer Arrays<br />
                Z24 Modal Invariant Engine
              </p>
              <p className="text-xs text-background/40 mt-4">
                Edge IoT & Microcontroller Support
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
