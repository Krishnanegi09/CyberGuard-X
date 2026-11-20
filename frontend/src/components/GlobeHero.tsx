import React from 'react'
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
  return (
    <section className="cg-hero" aria-label="Defense Overview Header">
      {/* Real Earth Photographic Visual from Space */}
      <div className="hero-earth-container" aria-hidden="true">
        <img
          src={earthHeroImg}
          alt="Earth from Orbit"
          className="hero-earth-img"
        />
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
