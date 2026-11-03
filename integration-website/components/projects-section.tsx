"use client"

import { useState } from "react"
import { ArrowUpRight } from "lucide-react"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const projects = [
  {
    title: "Z24 Benchmark Bridge",
    category: "Prestressed Concrete Box-Girder",
    year: "Benchmark Dataset",
    location: "Solothurn, Switzerland",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
  },
  {
    title: "Pillar A Accelerometer Node",
    category: "Triaxial Telemetry Array",
    year: "100 Hz Continuous",
    location: "Pier 1 Vertical / R1V",
    image: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=1200&q=80",
  },
  {
    title: "Mid-Span Transverse Cluster",
    category: "Dynamic Modal Tracking",
    year: "100 Hz Continuous",
    location: "Pier 2 Transverse / R2T",
    image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=80",
  },
  {
    title: "Pier Foundation Array",
    category: "Subsurface Vibration Node",
    year: "100 Hz Continuous",
    location: "Pier 3 Vertical / R3V",
    image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=1200&q=80",
  },
]

function ProjectCard({ project, index }: { project: typeof projects[0]; index: number }) {
  const [hovered, setHovered] = useState(false)
  const { ref, isVisible } = useScrollReveal(0.1)

  return (
    <div
      ref={ref}
      className={`bg-background group cursor-pointer transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      }`}
      style={{ transitionDelay: `${(index % 2) * 150}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="overflow-hidden">
        <img
          src={project.image || "/placeholder.svg"}
          alt={`${project.title} - ${project.category} infrastructure node in ${project.location}`}
          className={`w-full aspect-[4/3] object-cover transition-all duration-[800ms] ease-out ${
            hovered ? "scale-[1.04]" : "scale-100"
          }`}
        />
      </div>
      <div className="p-6 md:p-8 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <span className="text-[11px] tracking-[0.15em] text-muted-foreground/50 mt-1.5 tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="text-lg md:text-xl font-light tracking-tight text-foreground mb-1.5">
              {project.title}
            </h3>
            <p className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground">
              {project.category} / {project.location} / {project.year}
            </p>
          </div>
        </div>
        <ArrowUpRight
          className={`h-4 w-4 text-muted-foreground/40 transition-all duration-300 mt-1.5 ${
            hovered ? "translate-x-0.5 -translate-y-0.5 text-foreground" : ""
          }`}
        />
      </div>
    </div>
  )
}

export function ProjectsSection() {
  const { ref, isVisible } = useScrollReveal(0.05)

  return (
    <section id="infrastructure" className="px-6 py-28 md:px-12 lg:px-20 md:py-36">
      <div
        ref={ref}
        className={`flex flex-col md:flex-row md:items-end justify-between mb-20 pb-6 border-b border-border transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-3">
            Monitored Infrastructure
          </p>
          <h2 className="text-3xl md:text-[2.75rem] font-extralight tracking-tight text-foreground">
            Sensor Arrays
          </h2>
        </div>
        <span className="text-[11px] tracking-[0.15em] text-muted-foreground/50 mt-4 md:mt-0">
          ({String(projects.length).padStart(2, "0")}) Monitored Clusters
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
        {projects.map((project, index) => (
          <ProjectCard key={project.title} project={project} index={index} />
        ))}
      </div>
    </section>
  )
}
