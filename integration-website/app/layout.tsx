import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, Bodoni_Moda, GFS_Didot } from 'next/font/google'

import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const bodoniModa = Bodoni_Moda({
  subsets: ['latin'],
  variable: '--font-bodoni',
  display: 'swap',
  style: ['normal', 'italic'],
})
const gfsDidot = GFS_Didot({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-didot',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Resonance — Acoustic & Vibration Anomaly Monitoring for Aging Infrastructure',
  description: 'Acoustic and vibration anomaly detection system for continuous structural health monitoring of aging bridges and civil infrastructure.',
}

export const viewport: Viewport = {
  themeColor: '#0d0d0d',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${bodoniModa.variable} ${gfsDidot.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
