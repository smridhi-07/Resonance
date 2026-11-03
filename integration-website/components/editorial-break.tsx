"use client"

import { useScrollReveal } from "@/hooks/use-scroll-reveal"

export function EditorialBreak() {
  const { ref: imgRef, isVisible: imgVisible } = useScrollReveal(0.15)
  const { ref: quoteRef, isVisible: quoteVisible } = useScrollReveal(0.2)

  return (
    <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center">
        <div
          ref={imgRef}
          className={`lg:col-span-7 overflow-hidden transition-all duration-1000 ${
            imgVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <img
            src="https://images.unsplash.com/photo-1431576901776-e539bd916ba2?w=1400&q=80"
            alt="Monolithic architectural concrete structural detail with dramatic chiaroscuro lighting"
            className="w-full aspect-[16/10] object-cover grayscale hover:grayscale-0 transition-all duration-1000"
          />
        </div>
        <div
          ref={quoteRef}
          className={`lg:col-span-4 lg:col-start-9 transition-all duration-1000 delay-200 ${
            quoteVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="w-10 h-px bg-foreground/20 mb-8" />
          <blockquote className="text-xl md:text-2xl lg:text-[1.65rem] font-extralight leading-[1.35] tracking-tight text-foreground text-balance">
            {'"'}Civil infrastructure rarely fails without warning. It whispers its degradation through subtle spectral shifts long before visible collapse.{'"'}
          </blockquote>
          <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mt-8">
            Resonance Structural Dynamics
          </p>
        </div>
      </div>
    </section>
  )
}
