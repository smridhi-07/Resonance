"use client"

import { useEffect, useRef, useState } from "react"

export function Hero() {
  const [visible, setVisible] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section ref={ref} className="relative h-screen flex flex-col justify-end overflow-hidden">
      {/* Background - River bridge photograph */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-bridge.png"
          alt="Concrete river bridge infrastructure"
          className={`w-full h-full object-cover object-[center_35%] transition-transform duration-[2s] ease-out ${
            visible ? "scale-100" : "scale-110"
          }`}
        />
        <div className="absolute inset-0 bg-foreground/55" />
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 pb-16 md:px-12 lg:px-20 md:pb-20">
        <div className="max-w-5xl">
          <div
            className={`transition-all duration-1000 delay-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <h1 className="font-didot font-normal tracking-[0.01em] text-[clamp(3.75rem,10.5vw,9.75rem)] text-background uppercase leading-[0.9] select-none">
              Resonance
            </h1>
            <p className="mt-6 text-sm md:text-base font-light tracking-wide text-background/70 max-w-xl leading-relaxed">
              AI-powered acoustic and vibration anomaly detection for aging public infrastructure.
            </p>
          </div>
        </div>

        <a
          href="#operations"
          onClick={(e) => {
            e.preventDefault()
            const target = document.getElementById("operations") || document.getElementById("telemetry")
            if (target) {
              window.history.pushState(null, "", "#operations")
              const navbarOffset = 80
              const elementPosition = target.getBoundingClientRect().top
              const offsetPosition = elementPosition + window.pageYOffset - navbarOffset
              window.scrollTo({ top: Math.max(0, offsetPosition), behavior: "smooth" })
            }
          }}
          className={`mt-16 md:mt-20 inline-flex items-center gap-6 transition-all duration-1000 delay-1000 hover:opacity-80 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="w-12 h-px bg-background/40" />
          <span className="text-xs tracking-[0.15em] uppercase font-normal text-background/60">
            Scroll to explore
          </span>
        </a>
      </div>
    </section>
  )
}
