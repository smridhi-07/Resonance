"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import {
  telemetryService,
  getInitialWaveform,
  getInitialFrequencySpectrum,
} from "@/lib/telemetry"
import type {
  ResonanceSensorEvent,
  ConnectionStatus,
  PillarStatus,
  WaveformPoint,
  FrequencyPoint,
} from "@/lib/types"

export function OperationsConsole() {
  const { ref: headRef, isVisible: headVisible } = useScrollReveal(0.05)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [selectedEvent, setSelectedEvent] = useState<ResonanceSensorEvent | null>(null)

  // Authoritative events stream (begins empty until real telemetry arrives)
  const [events, setEvents] = useState<ResonanceSensorEvent[]>([])

  // Pillar states (initialized to unpopulated nulls displaying "—" until real data arrives)
  const [pillars, setPillars] = useState<PillarStatus[]>([
    { id: "Pillar_A", name: "Pillar A", status: "normal", lastScore: null, lastRms: null, lastStdDev: null, lastFrequency: null, lastUpdated: "—" },
    { id: "Pillar_B", name: "Pillar B", status: "normal", lastScore: null, lastRms: null, lastStdDev: null, lastFrequency: null, lastUpdated: "—" },
    { id: "Pillar_C", name: "Pillar C", status: "normal", lastScore: null, lastRms: null, lastStdDev: null, lastFrequency: null, lastUpdated: "—" },
    { id: "Pillar_D", name: "Pillar D", status: "normal", lastScore: null, lastRms: null, lastStdDev: null, lastFrequency: null, lastUpdated: "—" },
  ])

  // Waveform state (actual sampled window data)
  const [waveform, setWaveform] = useState<WaveformPoint[]>(getInitialWaveform)
  // Frequency spectrum (actual FFT frequency and magnitude arrays)
  const [freqSpectrum, setFreqSpectrum] = useState<FrequencyPoint[]>(getInitialFrequencySpectrum)
  const [latestPeakFreq, setLatestPeakFreq] = useState<number | null>(null)

  // In-memory cache of latest raw sample arrays per pillar
  const rawWindowsRef = useRef<Record<string, number[]>>({})

  // Ingest incoming authoritative telemetry event
  const handleIncomingEvent = useCallback((event: ResonanceSensorEvent) => {
    // 1. Prepend to events list (retain latest 20 events)
    setEvents((prev) => [event, ...prev.slice(0, 19)])

    // 2. Update pillar status
    setPillars((prev) =>
      prev.map((p) => {
        const matches =
          p.id.toLowerCase() === event.sensor_id.toLowerCase() ||
          p.name.toLowerCase() === event.sensor_id.toLowerCase() ||
          event.sensor_id.toLowerCase().includes(p.id.toLowerCase()) ||
          event.sensor_id.toLowerCase().includes(p.name.toLowerCase())

        if (matches) {
          return {
            ...p,
            status: event.status,
            lastScore: event.anomaly_score,
            lastRms: event.features.rms,
            lastStdDev: event.features.std_dev,
            lastFrequency: event.features.dominant_frequency_hz,
            lastUpdated: event.timestamp.includes("T")
              ? event.timestamp.split("T")[1].substring(0, 8)
              : event.timestamp,
          }
        }
        return p
      })
    )

    // 3. Connect actual FFT frequency spectrum from Python
    if (event.fft_spectrum && event.fft_spectrum.length > 0) {
      setFreqSpectrum(event.fft_spectrum)
    }
    setLatestPeakFreq(event.features.dominant_frequency_hz)

    // 4. Connect actual raw waveform samples from Python
    if (event.raw_samples && event.raw_samples.length > 0) {
      const normId = event.sensor_id.toLowerCase().replace(/[^a-z0-9]/g, "")
      // Convert acceleration from m/s² to g (1g = 9.80665 m/s²) for standard structural g-units
      const samplesInG = event.raw_samples.map((s) => +(s / 9.80665).toFixed(4))
      rawWindowsRef.current[normId] = samplesInG

      // Subsample 200 samples down to 40 representative window points for smooth rendering
      const totalSamples = event.raw_samples.length
      const step = Math.max(1, Math.floor(totalSamples / 40))
      const newWaveform: WaveformPoint[] = []

      for (let i = 0; i < 40; i++) {
        const sampleIdx = Math.min(i * step, totalSamples - 1)
        const t = (sampleIdx / 100.0).toFixed(2) // 100 Hz acquisition rate
        newWaveform.push({
          time: `+${t}s`,
          timestamp: Date.now(),
          pillarA: rawWindowsRef.current["pillara"]?.[sampleIdx] ?? 0,
          pillarB: rawWindowsRef.current["pillarb"]?.[sampleIdx] ?? 0,
          pillarC: rawWindowsRef.current["pillarc"]?.[sampleIdx] ?? 0,
          pillarD: rawWindowsRef.current["pillard"]?.[sampleIdx] ?? 0,
        })
      }
      setWaveform(newWaveform)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = telemetryService.subscribe(
      handleIncomingEvent,
      (status) => setConnectionStatus(status)
    )
    return () => unsubscribe()
  }, [handleIncomingEvent])

  return (
    <section id="operations" data-section="telemetry" className="scroll-mt-20 relative px-6 pt-16 pb-16 md:px-12 lg:px-20 md:pt-20 md:pb-24 bg-background">
      <div id="telemetry" className="scroll-mt-20 absolute -top-16" />
      {/* Header */}
      <div
        ref={headRef}
        className={`flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-10 pb-6 border-b border-border transition-all duration-700 ${
          headVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div>
          <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground mb-2">
            Real-Time Monitoring
          </p>
          <h2 className="text-3xl md:text-4xl font-light tracking-tight text-foreground">
            Operations Console
          </h2>
        </div>

        {/* Provenance Status Badge */}
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 border border-border text-xs font-normal text-muted-foreground tracking-wide">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-foreground animate-pulse"
                  : "bg-red-500/80"
              }`}
            />
            <span className="text-foreground/90 font-mono text-[11px]">
              {connectionStatus === "connected"
                ? "LIVE GATEWAY INGEST (:4000)"
                : "BACKEND OFFLINE (:4000 DISCONNECTED)"}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Pillar Sensor Nodes in 1px Hairline Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border mb-8 md:mb-10">
        {pillars.map((pillar) => (
          <div key={pillar.id} className="bg-background p-6 md:p-7 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Telemetry Node
                </p>
                <h3 className="text-xl font-normal tracking-tight text-foreground mt-1">
                  {pillar.name}
                </h3>
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-0.5 uppercase tracking-wide border ${
                  pillar.lastScore === null
                    ? "border-border text-muted-foreground/60"
                    : pillar.status === "normal"
                    ? "border-border text-muted-foreground"
                    : "border-foreground bg-foreground text-background"
                }`}
              >
                {pillar.lastScore === null ? "STANDBY" : pillar.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-5 border-t border-border">
              <div>
                <p className="text-xs font-normal tracking-wide text-muted-foreground uppercase">RMS</p>
                <p className="text-sm md:text-base font-medium tabular-nums text-foreground mt-1">
                  {pillar.lastRms !== null ? pillar.lastRms.toFixed(3) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-normal tracking-wide text-muted-foreground uppercase">StdDev</p>
                <p className="text-sm md:text-base font-medium tabular-nums text-foreground mt-1">
                  {pillar.lastStdDev !== null ? pillar.lastStdDev.toFixed(3) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-normal tracking-wide text-muted-foreground uppercase">Peak Freq</p>
                <p className="text-sm md:text-base font-medium tabular-nums text-foreground mt-1">
                  {pillar.lastFrequency !== null ? (
                    <>
                      {pillar.lastFrequency.toFixed(1)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">Hz</span>
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid: Balanced Two-Column Layout for Waveform + FFT Spectrum */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border mb-8 md:mb-10">
        {/* Live Waveform Oscillations (Col 1) */}
        <div className="bg-background p-6 md:p-8 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-medium tracking-[0.12em] uppercase text-muted-foreground">
                Time-Domain Acceleration (2.0s Window)
              </p>
              <h3 className="text-lg font-normal tracking-tight text-foreground mt-1">
                Live Sensor Waveform (Pillars A–D)
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-normal text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-0.5 bg-foreground" />
                Pillar A
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-0.5 border-b-2 border-foreground border-dashed" />
                Pillar B
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-0.5 border-b-2 border-foreground border-dotted" />
                Pillar C
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-0.5 bg-muted-foreground" />
                Pillar D
              </span>
            </div>
          </div>

          <div className="h-[360px] md:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={waveform} margin={{ top: 10, right: 15, left: -15, bottom: 10 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.7} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[-0.6, 0.6]}
                  ticks={[-0.6, -0.3, 0.0, 0.3, 0.6]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                  unit="g"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0px",
                    fontSize: "12px",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    padding: "10px 14px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                  }}
                  itemStyle={{
                    fontSize: "12px",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    padding: "2px 0",
                  }}
                  labelStyle={{
                    fontSize: "11px",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    color: "hsl(var(--muted-foreground))",
                    marginBottom: "4px",
                    letterSpacing: "0.02em",
                  }}
                  formatter={(value: any) => [`${typeof value === 'number' ? value.toFixed(3) : value} g`, undefined]}
                />
                <Line
                  type="monotone"
                  dataKey="pillarA"
                  name="Pillar A (Pier 1)"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="pillarB"
                  name="Pillar B (Pier 2)"
                  stroke="hsl(var(--foreground))"
                  strokeDasharray="4 4"
                  strokeWidth={1.75}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="pillarC"
                  name="Pillar C (Mid-Span)"
                  stroke="hsl(var(--foreground))"
                  strokeDasharray="2 2"
                  strokeWidth={1.5}
                  opacity={0.75}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="pillarD"
                  name="Pillar D (Abutment)"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FFT Modal Spectrum Decomposition (Col 2) */}
        <div className="bg-background p-6 md:p-8 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-medium tracking-[0.12em] uppercase text-muted-foreground">
                Fast Fourier Transform (FFT)
              </p>
              <h3 className="text-lg font-normal tracking-tight text-foreground mt-1">
                Modal Frequency Spectrum (0–50 Hz)
              </h3>
            </div>
            <span className="text-xs font-normal text-muted-foreground border border-border px-2.5 py-1 tabular-nums">
              Peak: {latestPeakFreq !== null ? `${latestPeakFreq.toFixed(1)} Hz` : "—"}
            </span>
          </div>

          <div className="h-[360px] md:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={freqSpectrum} margin={{ top: 10, right: 15, left: -15, bottom: 10 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} opacity={0.7} />
                <XAxis
                  dataKey="frequency"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                  unit="Hz"
                  interval={9}
                />
                <YAxis
                  domain={[0, 0.4]}
                  ticks={[0, 0.1, 0.2, 0.3, 0.4]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0px",
                    fontSize: "12px",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    padding: "10px 14px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                  }}
                  itemStyle={{
                    fontSize: "12px",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    padding: "2px 0",
                  }}
                  labelStyle={{
                    fontSize: "11px",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    color: "hsl(var(--muted-foreground))",
                    marginBottom: "4px",
                    letterSpacing: "0.02em",
                  }}
                  formatter={(value: any) => [`${typeof value === 'number' ? value.toFixed(3) : value}`, 'Magnitude']}
                />
                <Bar
                  dataKey="magnitude"
                  name="Spectral Power"
                  fill="hsl(var(--foreground))"
                  radius={[1, 1, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Telemetry Event Stream Table */}
      <div className="border border-border">
        <div className="p-6 md:p-8 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.12em] uppercase text-muted-foreground">
              Schema v1.0 Ingest Log
            </p>
            <h3 className="text-lg font-normal text-foreground mt-1">
              Authoritative Telemetry Event Stream
            </h3>
          </div>
          <span className="text-xs font-normal text-muted-foreground border border-border px-2.5 py-1">
            Strict Draft 2020-12
          </span>
        </div>

        <div className="divide-y divide-border">
          {events.length === 0 ? (
            <div className="p-8 text-center text-xs font-normal text-muted-foreground tracking-wide">
              {connectionStatus === "connected"
                ? "Gateway online (:4000). Awaiting incoming telemetry stream from edge simulator..."
                : "Gateway offline (:4000). Start the Python simulator and Express gateway to stream live telemetry."}
            </div>
          ) : (
            events.slice(0, 5).map((evt) => (
              <div
                key={evt.event_id}
                onClick={() => setSelectedEvent(evt)}
                className="p-5 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      evt.status === "normal" ? "bg-foreground" : "bg-destructive"
                    }`}
                  />
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">
                    {evt.timestamp}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {evt.sensor_id}
                  </span>
                  <span
                    className={`text-xs font-medium uppercase px-2 py-0.5 border tracking-wide ${
                      evt.status === "normal"
                        ? "border-border text-muted-foreground"
                        : "border-foreground text-foreground"
                    }`}
                  >
                    {evt.status}
                  </span>
                </div>

                <div className="flex items-center gap-6 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    <span className="text-muted-foreground/70">Score:</span>{" "}
                    <span className="font-normal text-foreground">{evt.anomaly_score.toFixed(4)}</span>
                  </span>
                  <span className="tabular-nums">
                    <span className="text-muted-foreground/70">RMS:</span>{" "}
                    <span className="font-normal text-foreground">{evt.features.rms.toFixed(4)}</span>
                  </span>
                  <span className="tabular-nums">
                    <span className="text-muted-foreground/70">Freq:</span>{" "}
                    <span className="font-normal text-foreground">{evt.features.dominant_frequency_hz.toFixed(1)} Hz</span>
                  </span>
                  <span className="text-xs font-medium text-foreground group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Inspect &rarr;
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Event Inspector Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-background border border-border max-w-lg w-full p-8 text-foreground shadow-2xl">
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div>
                <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Payload Inspection
                </p>
                <h3 className="text-xl font-normal text-foreground mt-1">
                  Event: <span className="font-mono text-base">{selectedEvent.event_id}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                Close &times;
              </button>
            </div>

            <div className="my-6 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Sensor Node:</span>
                <span className="font-medium">{selectedEvent.sensor_id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Timestamp (UTC):</span>
                <span className="font-mono tabular-nums">{selectedEvent.timestamp}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Sequence Monotonicity:</span>
                <span className="font-mono">#{selectedEvent.sequence}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Classification Status:</span>
                <span className="uppercase font-medium">{selectedEvent.status}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Anomaly Severity Score:</span>
                <span className="tabular-nums font-medium">{selectedEvent.anomaly_score.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">RMS Magnitude:</span>
                <span className="tabular-nums font-medium">{selectedEvent.features.rms.toFixed(4)} m/s²</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Amplitude Std Dev:</span>
                <span className="tabular-nums font-medium">{selectedEvent.features.std_dev.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Dominant Modal Frequency:</span>
                <span className="tabular-nums font-medium">{selectedEvent.features.dominant_frequency_hz.toFixed(2)} Hz</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Data Provenance Source:</span>
                <span className="uppercase">{selectedEvent.source}</span>
              </div>
              {selectedEvent.raw_samples && (
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Raw Waveform Window:</span>
                  <span className="tabular-nums font-medium">{selectedEvent.raw_samples.length} samples @ 100 Hz</span>
                </div>
              )}
              {selectedEvent.fft_spectrum && (
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">FFT Spectral Bins:</span>
                  <span className="tabular-nums font-medium">{selectedEvent.fft_spectrum.length} frequency bins (rfft)</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2.5 border border-border text-xs font-medium uppercase tracking-wider hover:bg-foreground hover:text-background transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
