import React from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import type { SafeZones } from './tokens.js'

interface SafeZoneOverlayProps {
  zones: SafeZones
  /** Afficher uniquement en mode debug (REMOTION_SAFE_ZONES_DEBUG=true) */
  debug?: boolean
}

/**
 * Overlay visuel optionnel montrant les safe zones TikTok.
 * Activé via la prop `debug` ou la variable d'environnement REMOTION_SAFE_ZONES_DEBUG.
 * Jamais rendu en production (les bordures sont invisibles à l'utilisateur final).
 */
export function SafeZoneOverlay({ zones, debug = false }: SafeZoneOverlayProps) {
  const { width, height } = useVideoConfig()

  if (!debug && process.env.REMOTION_SAFE_ZONES_DEBUG !== 'true') {
    return null
  }

  const safeWidth  = width - zones.leftPx - zones.rightPx
  const safeHeight = height - zones.topPx - zones.bottomPx

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Zone safe : rectangle vert */}
      <div
        style={{
          position: 'absolute',
          top: zones.topPx,
          left: zones.leftPx,
          width: safeWidth,
          height: safeHeight,
          border: '3px solid rgba(0,255,0,0.7)',
          boxSizing: 'border-box',
        }}
      />
      {/* Étiquettes des marges */}
      <div style={{ position: 'absolute', top: zones.topPx / 2, left: '50%', transform: 'translateX(-50%)', color: '#0f0', fontSize: 20, fontFamily: 'monospace' }}>
        top: {zones.topPx}px
      </div>
      <div style={{ position: 'absolute', bottom: zones.bottomPx / 2, left: '50%', transform: 'translateX(-50%)', color: '#0f0', fontSize: 20, fontFamily: 'monospace' }}>
        bottom: {zones.bottomPx}px (nav/CTA TikTok)
      </div>
      <div style={{ position: 'absolute', top: '50%', left: zones.leftPx / 2, transform: 'translateY(-50%) rotate(-90deg)', color: '#0f0', fontSize: 18, fontFamily: 'monospace' }}>
        left: {zones.leftPx}px
      </div>
      <div style={{ position: 'absolute', top: '50%', right: zones.rightPx / 2, transform: 'translateY(-50%) rotate(90deg)', color: '#0f0', fontSize: 18, fontFamily: 'monospace' }}>
        right: {zones.rightPx}px
      </div>
      {/* Overlay semi-transparent sur les zones non-safe */}
      {/* Top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: zones.topPx, background: 'rgba(255,0,0,0.15)' }} />
      {/* Bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: zones.bottomPx, background: 'rgba(255,0,0,0.25)' }} />
      {/* Left */}
      <div style={{ position: 'absolute', top: zones.topPx, left: 0, width: zones.leftPx, height: safeHeight, background: 'rgba(255,128,0,0.15)' }} />
      {/* Right */}
      <div style={{ position: 'absolute', top: zones.topPx, right: 0, width: zones.rightPx, height: safeHeight, background: 'rgba(255,128,0,0.25)' }} />
    </AbsoluteFill>
  )
}
