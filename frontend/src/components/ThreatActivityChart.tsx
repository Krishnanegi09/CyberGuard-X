import React, { useState } from 'react'
import { CheckCircle } from 'lucide-react'

export interface DataPoint {
  time: string
  events: number
  xPercent: number
  yVal: number // 0-100
}

interface ThreatActivityChartProps {
  data?: DataPoint[]
  isLoading?: boolean
}

export const ThreatActivityChart: React.FC<ThreatActivityChartProps> = ({
  data = [],
  isLoading = false,
}) => {
  // Tooltip is NOT visible by default. Appears ONLY on pointer hover/focus!
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null)

  const hasEvents = data.length > 0 && data.some((p) => p.events > 0)

  // Chart dimensions in SVG coordinates
  const svgWidth = 600
  const svgHeight = 220
  const paddingLeft = 35
  const paddingBottom = 30
  const paddingTop = 20
  const paddingRight = 15

  const usableWidth = svgWidth - paddingLeft - paddingRight
  const usableHeight = svgHeight - paddingTop - paddingBottom

  // Calculate coordinates for SVG curve if events exist
  const points = hasEvents
    ? data.map((pt) => {
        const x = paddingLeft + (pt.xPercent / 100) * usableWidth
        const y = paddingTop + usableHeight - (pt.yVal / 100) * usableHeight
        return { ...pt, x, y }
      })
    : []

  // Build smooth cubic bezier path
  let pathD = points.length > 0 ? `M ${points[0].x} ${points[0].y}` : ''
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[0]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = i !== points.length - 2 ? points[i + 2] : p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  // Area path closing to bottom
  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + usableHeight} L ${points[0].x} ${paddingTop + usableHeight} Z`
      : ''

  const activeSvgPoint = hoveredPoint && points.length > 0 ? points.find((p) => p.time === hoveredPoint.time) : null

  return (
    <div className="cg-card threat-activity-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Threat Activity</h3>
          <p className="card-subtitle">Security events over time</p>
        </div>
      </div>

      <div className="chart-canvas-wrap" onMouseLeave={() => setHoveredPoint(null)}>
        {isLoading ? (
          <div className="chart-loading-state">Loading telemetry...</div>
        ) : !hasEvents ? (
          <div
            className="chart-empty-state"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: '180px',
              color: 'var(--text-muted)',
              gap: '10px',
            }}
          >
            <CheckCircle size={32} style={{ color: 'var(--accent-emerald)', opacity: 0.8 }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              No Threat Activity Detected
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
              0 security alerts recorded. Network telemetry is normal.
            </span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="threat-chart-svg"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Restrained Crimson Gradient Area Fill */}
              <linearGradient id="threatAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
                <stop offset="50%" stopColor="#ef4444" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>

              {/* Restrained Line Stroke */}
              <linearGradient id="threatLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ff4d6a" stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            {[100, 75, 50, 25, 0].map((val) => {
              const y = paddingTop + usableHeight - (val / 100) * usableHeight
              return (
                <g key={val} className="grid-row">
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="var(--border-subtle)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="var(--text-muted)"
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                  >
                    {val}
                  </text>
                </g>
              )
            })}

            {/* Area Fill */}
            <path d={areaD} fill="url(#threatAreaGrad)" />

            {/* Line Stroke */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#threatLineGrad)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            {/* Active Hover Marker (Appears ONLY when hovered!) */}
            {activeSvgPoint && (
              <>
                <line
                  x1={activeSvgPoint.x}
                  y1={paddingTop}
                  x2={activeSvgPoint.x}
                  y2={paddingTop + usableHeight}
                  stroke="rgba(239, 68, 68, 0.45)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={activeSvgPoint.x}
                  cy={activeSvgPoint.y}
                  r="7"
                  fill="rgba(239, 68, 68, 0.25)"
                />
                <circle
                  cx={activeSvgPoint.x}
                  cy={activeSvgPoint.y}
                  r="4"
                  fill="#ffffff"
                  stroke="#ef4444"
                  strokeWidth="2"
                />
              </>
            )}

            {/* Interactive hover target columns */}
            {points.map((pt, idx) => (
              <rect
                key={pt.time}
                x={idx === 0 ? paddingLeft : (pt.x + (points[idx - 1]?.x || pt.x)) / 2}
                y={paddingTop}
                width={usableWidth / points.length}
                height={usableHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredPoint(pt)}
                onFocus={() => setHoveredPoint(pt)}
                tabIndex={0}
                aria-label={`${pt.events} events at ${pt.time}`}
              />
            ))}

            {/* X Axis Time Labels */}
            {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'].map((timeStr) => {
              const matched = points.find((p) => p.time === timeStr)
              if (!matched) return null
              return (
                <text
                  key={timeStr}
                  x={matched.x}
                  y={svgHeight - 8}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                >
                  {timeStr}
                </text>
              )
            })}
          </svg>
        )}

        {/* Dynamic Tooltip Badge: Appears ONLY on active hover! */}
        {activeSvgPoint && hoveredPoint && (
          <div
            className="chart-tooltip-pin"
            style={{
              left: `${(activeSvgPoint.x / svgWidth) * 100}%`,
              top: `${(activeSvgPoint.y / svgHeight) * 100 - 32}%`,
            }}
          >
            <div className="tooltip-events">{hoveredPoint.events} events</div>
            <div className="tooltip-sub">Today, {hoveredPoint.time}</div>
          </div>
        )}
      </div>
    </div>
  )
}
