import Link from "next/link"

const footerLinks = [
  { label: "Infrastructure", href: "#infrastructure" },
  { label: "The System", href: "#system" },
  { label: "Methodology", href: "#methodology" },
  { label: "Operations Console", href: "#operations" },
  { label: "Engineering Records", href: "#validation" },
  { label: "Contact", href: "#contact" },
]

const documentationLinks = [
  { label: "Event Schema v1.0", href: "#" },
  { label: "System Architecture", href: "#" },
  { label: "Gateway API (:4000)", href: "#" },
  { label: "Z24 Benchmark Docs", href: "#" },
]

export function Footer() {
  return (
    <footer className="px-6 py-16 md:px-12 lg:px-20 border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 mb-20">
        <div className="md:col-span-5">
          <Link
            href="/"
            className="text-xs font-semibold tracking-[0.2em] uppercase text-foreground"
          >
            Resonance
          </Link>
          <p className="text-sm leading-[1.75] text-muted-foreground mt-5 max-w-sm">
            Real-time acoustic and vibration anomaly monitoring for aging civil infrastructure.
            Continuous modal spectral evaluation engineered to identify early fatigue before visible structural collapse.
          </p>
        </div>

        <div className="md:col-span-3 md:col-start-7">
          <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground/60 mb-5">
            Navigation
          </p>
          <div className="flex flex-col gap-3">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  if (link.href.startsWith("#")) {
                    e.preventDefault()
                    const targetId = link.href.replace("#", "")
                    const targetEl = document.getElementById(targetId)
                    if (targetEl) {
                      window.history.pushState(null, "", link.href)
                      const navbarOffset = 80
                      const elementPosition = targetEl.getBoundingClientRect().top
                      const offsetPosition = elementPosition + window.pageYOffset - navbarOffset
                      window.scrollTo({ top: Math.max(0, offsetPosition), behavior: "smooth" })
                    }
                  }
                }}
                className="text-sm text-foreground/70 hover:text-foreground transition-colors duration-300"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 md:col-start-11">
          <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground/60 mb-5">
            Architecture
          </p>
          <div className="flex flex-col gap-3">
            {documentationLinks.map((link) => (
              <span
                key={link.label}
                className="text-sm text-foreground/70"
              >
                {link.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pt-8 border-t border-border gap-4">
        <p className="text-xs tracking-wide text-muted-foreground/60">
          {"Resonance Monitoring System. Schema Draft 2020-12."}
        </p>
        <p className="text-xs tracking-wider text-muted-foreground/60 uppercase">
          Acoustic & Vibration Telemetry Prototype
        </p>
      </div>
    </footer>
  )
}
