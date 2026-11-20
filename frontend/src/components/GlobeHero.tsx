import React from 'react'
import {
  Calendar,
  Play,
  Shield,
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

      <div className="hero-content">
        {/* Left Column: Heading, Subtitle & Severity Counts */}
        <div className="hero-text-col">
          <div className="hero-eyebrow">
            <span className="live-dot" />
            <span className="eyebrow-text">AUTONOMOUS CYBER DEFENSE ACTIVE</span>
          </div>

          <h1 className="hero-title">
            Predict. Protect. Respond.
            <br />
            <span className="hero-title-gradient">Before Threats Strike.</span>
          </h1>

          <p className="hero-subtitle">
            Autonomous threat forecasting, live digital twin simulation, and real-time defensive
            orchestration for enterprise security operations.
          </p>

          {/* Severity Counters Strip with Visual Progress Bars */}
          <div className="hero-severity-strip" role="region" aria-label="Incident Severity Counts">
            <div className="hero-severity-item critical">
              <div className="severity-item-top">
                <span className="severity-dot" />
                <span className="severity-label">CRITICAL</span>
                <span className="severity-val mono">{criticalCount}</span>
              </div>
              <div className="severity-bar-track">
                <div
                  className="severity-bar-fill critical"
                  style={{ width: `${Math.min(criticalCount * 20, 100)}%` }}
                />
              </div>
            </div>

            <div className="hero-severity-item high">
              <div className="severity-item-top">
                <span className="severity-dot" />
                <span className="severity-label">HIGH</span>
                <span className="severity-val mono">{highCount}</span>
              </div>
              <div className="severity-bar-track">
                <div
                  className="severity-bar-fill high"
                  style={{ width: `${Math.min(highCount * 12, 100)}%` }}
                />
              </div>
            </div>

            <div className="hero-severity-item medium">
              <div className="severity-item-top">
                <span className="severity-dot" />
                <span className="severity-label">MEDIUM</span>
                <span className="severity-val mono">{mediumCount}</span>
              </div>
              <div className="severity-bar-track">
                <div
                  className="severity-bar-fill medium"
                  style={{ width: `${Math.min(mediumCount * 8, 100)}%` }}
                />
              </div>
            </div>

            <div className="hero-severity-item low">
              <div className="severity-item-top">
                <span className="severity-dot" />
                <span className="severity-label">LOW</span>
                <span className="severity-val mono">{lowCount}</span>
              </div>
              <div className="severity-bar-track">
                <div
                  className="severity-bar-fill low"
                  style={{ width: `${Math.min(lowCount * 5, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Time Window & Quick Action Buttons */}
        <div className="hero-actions-col">
          <div className="hero-time-badge" title="Filter timeframe">
            <Calendar size={13} className="time-icon" />
            <span className="time-text mono">{timeRange}</span>
            <ChevronDown size={12} className="time-chevron" />
          </div>

          <div className="hero-cta-group">
            <button
              type="button"
              className="btn-hero-action primary"
              onClick={onRunDetection}
              title="Execute immediate threat detection scan"
            >
              <Play size={14} className="btn-icon" />
              <span>Run Detection</span>
            </button>
          </div>

          <div className="hero-status-pills">
            <div className="status-pill-item" title="ML Anomaly Engine Status">
              <CheckCircle size={12} className="pill-icon text-green" />
              <span className="pill-text mono">ML-ENGINE: ONLINE</span>
            </div>
            <div className="status-pill-item" title="Attack Graph Synchronization">
              <Shield size={12} className="pill-icon text-cyan" />
              <span className="pill-text mono">TWIN: SYNCED</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GlobeHero
