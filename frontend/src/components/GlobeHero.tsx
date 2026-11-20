import React, { useRef, useState } from 'react'
import {
  Calendar,
  Play,
  AlertTriangle,
  Shield,
  Crosshair,
  CheckCircle,
  ChevronDown,
} from 'lucide-react'
import earthHeroImg from '../assets/earth-hero.jpg'
import Earth3D from './Earth3D'

interface GlobeHeroProps {
  onRunDetection: () => void
  timeRange?: string
  criticalCount?: number
  highCount?: number
  mediumCount?: number
  lowCount?: number
}

export const GlobeHero: React.FC<GlobeHeroProps> = ({
  onRunDetection,
  timeRange = 'Last 24 hours',
  criticalCount = 0,
  highCount = 0,
  mediumCount = 0,
  lowCount = 0,
}) => {
  const [use3D, setUse3D] = useState(true)
  const [earth3DLoaded, setEarth3DLoaded] = useState(false)
  const [parallax, setParallax] = useState({ x: 0, y: 0 })
  const heroRef = useRef<HTMLElement>(null)

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    const normX = (e.clientX - rect.left) / rect.width - 0.5
    const normY = (e.clientY - rect.top) / rect.height - 0.5
    setParallax({ x: normX, y: normY })
  }

  const handlePointerLeave = () => {
    setParallax({ x: 0, y: 0 })
  }

  return (
    <section
      ref={heroRef}
      className="cg-hero"
      aria-label="Defense Overview Header"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Real Earth Photographic Visual from Space with 3D Animated Upgrade */}
      <div className="hero-earth-container" aria-hidden="true">
        {/* Static Earth acts as immediate fallback / background while 3D initializes */}
        <img
          src={earthHeroImg}
          alt="Earth from Orbit"
          className="hero-earth-img"
          style={{
            opacity: earth3DLoaded ? 0 : 0.92,
            transition: 'opacity 0.8s ease-in-out',
          }}
        />

        {use3D && (
          <Earth3D
            onLoaded={() => setEarth3DLoaded(true)}
            onError={() => {
              setUse3D(false)
              setEarth3DLoaded(false)
            }}
            parallaxTarget={parallax}
          />
        )}

        <div className="hero-earth-overlay" />
      </div>

      {/* Hero Content */}
      <div className="hero-content">
        <div className="hero-eyebrow">Defense Overview</div>

        <div className="hero-headline-row">
          <div className="hero-text-block">
            <h1 className="hero-heading">
              Continuous defense<br />for your digital infrastructure.
            </h1>
            <p className="hero-subtext">
              Observe • Understand • Simulate • Defend • Learn
            </p>
          </div>

          {/* Action Controls */}
          <div className="hero-actions">
            <button type="button" className="hero-btn-secondary" title="Select time horizon">
              <Calendar size={14} />
              <span>{timeRange}</span>
              <ChevronDown size={14} className="chevron" />
            </button>

            <button
              type="button"
              className="hero-btn-primary"
              onClick={onRunDetection}
              title="Launch scope-bound detection scan or NIDS check"
            >
              <Play size={13} fill="currentColor" />
              <span>Run Detection</span>
            </button>
          </div>
        </div>

        {/* Embedded 4-Metric KPI Strip */}
        <div className="hero-kpi-strip">
          {/* Critical */}
          <div className="kpi-metric-card critical">
            <div className="kpi-icon-wrap critical">
              <AlertTriangle size={15} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-number">{criticalCount}</span>
              <span className="kpi-label">Critical</span>
            </div>
          </div>

          <div className="kpi-divider" />

          {/* High */}
          <div className="kpi-metric-card high">
            <div className="kpi-icon-wrap high">
              <Shield size={15} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-number">{highCount}</span>
              <span className="kpi-label">High</span>
            </div>
          </div>

          <div className="kpi-divider" />

          {/* Medium */}
          <div className="kpi-metric-card medium">
            <div className="kpi-icon-wrap medium">
              <Crosshair size={15} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-number">{mediumCount}</span>
              <span className="kpi-label">Medium</span>
            </div>
          </div>

          <div className="kpi-divider" />

          {/* Low */}
          <div className="kpi-metric-card low">
            <div className="kpi-icon-wrap low">
              <CheckCircle size={15} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-number">{lowCount}</span>
              <span className="kpi-label">Low</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
