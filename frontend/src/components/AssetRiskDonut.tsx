import React, { useState } from 'react'

interface AssetRiskData {
  critical: number
  high: number
  medium: number
  low: number
  total: number
}

const DEFAULT_DATA: AssetRiskData = {
  critical: 6,
  high: 18,
  medium: 37,
  low: 63,
  total: 124,
}

interface AssetRiskDonutProps {
  data?: AssetRiskData
  onSelectRisk?: (risk: string) => void
}

export const AssetRiskDonut: React.FC<AssetRiskDonutProps> = ({
  data = DEFAULT_DATA,
  onSelectRisk,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

  const radius = 52
  const defaultStrokeWidth = 13.5
  const circumference = 2 * Math.PI * radius // ~326.73px

  // Security UX Principle: Critical & High assets must NEVER be diminished to invisible slivers.
  // We enforce a minimum visual presence of 11% (~40 degrees) for Critical so operators can immediately see and interact with it.
  const MIN_CRITICAL_FRACTION = 0.11

  const rawCritFrac = data.total > 0 ? data.critical / data.total : 0.11
  const criticalFrac = Math.max(rawCritFrac, MIN_CRITICAL_FRACTION)

  // Scale remaining categories proportionally into the remaining space
  const remainingTotal = (data.high + data.medium + data.low) || 1
  const remainingFrac = 1 - criticalFrac

  const highFrac = (data.high / remainingTotal) * remainingFrac
  const mediumFrac = (data.medium / remainingTotal) * remainingFrac
  const lowFrac = (data.low / remainingTotal) * remainingFrac

  const segments = [
    {
      id: 'critical',
      label: 'Critical',
      count: data.critical,
      fraction: criticalFrac,
      color: '#ef4444',
      hoverColor: '#ff5c5c',
    },
    {
      id: 'high',
      label: 'High',
      count: data.high,
      fraction: highFrac,
      color: '#f59e0b',
      hoverColor: '#fbbf24',
    },
    {
      id: 'medium',
      label: 'Medium',
      count: data.medium,
      fraction: mediumFrac,
      color: '#94a3b8',
      hoverColor: '#cbd5e1',
    },
    {
      id: 'low',
      label: 'Low',
      count: data.low,
      fraction: lowFrac,
      color: '#10b981',
      hoverColor: '#34d399',
    },
  ]

  // Clean spacing between rounded segments:
  // strokeLinecap="round" adds strokeWidth/2 on both sides of the path.
  // To prevent overlapping caps and preserve a crisp 4.5px gap:
  const gap = 4.5
  const capCompensation = defaultStrokeWidth

  let accumulatedArc = 0
  const computedSegments = segments.map((seg) => {
    const arcLength = seg.fraction * circumference
    const strokeDash = Math.max(arcLength - capCompensation - gap, 6)
    const dashOffset = -(accumulatedArc + capCompensation / 2 + gap / 2)
    accumulatedArc += arcLength

    return {
      ...seg,
      arcLength,
      strokeDash,
      dashOffset,
    }
  })

  return (
    <div className="cg-card assets-risk-card">
      <div className="card-header">
        <h3 className="card-title">Assets by Risk</h3>
      </div>

      <div className="risk-donut-layout">
        {/* Donut Chart SVG */}
        <div className="donut-canvas-container" title="Asset risk distribution">
          <svg viewBox="0 0 140 140" className="donut-svg" role="img" aria-label="Donut chart showing asset risk distribution">
            <defs>
              <filter id="criticalGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.45" />
              </filter>
            </defs>

            {/* Rotated to start at 12 o'clock (top) */}
            <g transform="rotate(-90 70 70)">
              {/* Subtle background track */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="var(--border-subtle, #1a1e27)"
                strokeWidth={defaultStrokeWidth}
              />

              {/* Individual segments */}
              {computedSegments.map((seg) => {
                const isHovered = hoveredCategory === seg.id
                return (
                  <circle
                    key={seg.id}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke={isHovered ? seg.hoverColor : seg.color}
                    strokeWidth={isHovered ? defaultStrokeWidth + 1.5 : defaultStrokeWidth}
                    strokeDasharray={`${seg.strokeDash} ${circumference}`}
                    strokeDashoffset={seg.dashOffset}
                    strokeLinecap="round"
                    className="donut-segment"
                    filter={seg.id === 'critical' ? 'url(#criticalGlow)' : undefined}
                    style={{
                      cursor: 'pointer',
                      transition: 'stroke-width 0.2s ease, stroke 0.2s ease',
                    }}
                    onMouseEnter={() => setHoveredCategory(seg.id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() => onSelectRisk?.(seg.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${seg.label}: ${seg.count} assets`}
                  />
                )
              })}
            </g>
          </svg>

          {/* Center Hole Metrics */}
          <div className="donut-center-hole">
            <span className="donut-center-number">{data.total}</span>
            <span className="donut-center-label">Assets</span>
          </div>
        </div>

        {/* Legend List */}
        <div className="risk-legend-list">
          {segments.map((seg) => {
            const isHovered = hoveredCategory === seg.id
            return (
              <div
                key={seg.id}
                className={`legend-row ${isHovered ? 'hovered' : ''}`}
                onClick={() => onSelectRisk?.(seg.id)}
                onMouseEnter={() => setHoveredCategory(seg.id)}
                onMouseLeave={() => setHoveredCategory(null)}
                role="button"
                tabIndex={0}
                style={{
                  cursor: 'pointer',
                  opacity: hoveredCategory && !isHovered ? 0.6 : 1,
                  transition: 'opacity 0.2s ease, transform 0.15s ease',
                }}
              >
                <div className="legend-indicator-group">
                  <span className={`legend-dot ${seg.id}`} />
                  <span className="legend-name">{seg.label}</span>
                </div>
                <span className="legend-count">{seg.count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
