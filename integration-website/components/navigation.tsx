"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

const navLinks = [
  { label: "Operations", href: "#operations" },
  { label: "Infrastructure", href: "#infrastructure" },
  { label: "Methodology", href: "#methodology" },
  { label: "Validation", href: "#validation" },
  { label: "Contact", href: "#contact" },
]

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const isNavigatingRef = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      setScrolled(currentY > 60)
      if (!isNavigatingRef.current) {
        setHidden(currentY > lastScrollY && currentY > 400)
      }
      setLastScrollY(currentY)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault()
      const targetId = href.replace("#", "")
      const targetEl = document.getElementById(targetId)

      setIsOpen(false)

      if (targetEl) {
        isNavigatingRef.current = true
        setHidden(false)

        if (window.location.hash !== href) {
          window.history.pushState(null, "", href)
        }

        const navbarOffset = 80
        const elementPosition = targetEl.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - navbarOffset

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: "smooth",
        })

        setTimeout(() => {
          isNavigatingRef.current = false
        }, 800)
      }
    }
  }

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      e.preventDefault()
      setIsOpen(false)
      isNavigatingRef.current = true
      setHidden(false)
      if (window.location.hash) {
        window.history.pushState(null, "", window.location.pathname)
      }
      window.scrollTo({ top: 0, behavior: "smooth" })
      setTimeout(() => {
        isNavigatingRef.current = false
      }, 800)
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        hidden && !isOpen ? "-translate-y-full" : "translate-y-0"
      } ${scrolled ? "bg-background/95 backdrop-blur-md border-b border-border" : "bg-transparent"}`}
    >
      <nav className="flex items-center justify-between px-6 py-5 md:px-12 lg:px-20">
        <Link
          href="/"
          onClick={handleLogoClick}
          className={`text-xs font-semibold tracking-[0.2em] uppercase transition-colors duration-500 ${
            scrolled ? "text-foreground" : "text-background"
          }`}
        >
          Resonance
        </Link>

        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className={`text-xs tracking-[0.12em] uppercase font-normal transition-colors duration-500 hover:opacity-100 ${
                scrolled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-background/60 hover:text-background"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`md:hidden transition-colors duration-500 ${
            scrolled || isOpen ? "text-foreground" : "text-background"
          }`}
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <div
        className={`md:hidden overflow-hidden transition-all duration-500 ease-in-out ${
          isOpen ? "max-h-[440px] opacity-100" : "max-h-0 opacity-0"
        } bg-background border-b border-border`}
      >
        <div className="flex flex-col px-6 py-8 gap-5">
          {navLinks.map((link, i) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-xl font-light tracking-tight text-foreground hover:text-muted-foreground transition-colors duration-300"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}
