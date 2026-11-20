import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Zap,
  SlidersHorizontal,
  RotateCcw,
  Columns,
  X,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { GlobeHero } from '../components/GlobeHero'
import { ThreatActivityChart } from '../components/ThreatActivityChart'
import { DigitalTwinPreview } from '../components/DigitalTwinPreview'
import { AssetRiskDonut } from '../components/AssetRiskDonut'
import type { FindingDetail } from '../components/EvidenceDrawer'

interface RawOverviewPort {
  port: number
  service?: string
}

interface RawOverviewAsset {
  id: string
  ip_address: string
  ports?: RawOverviewPort[]
}

interface RawOverviewAuditLog {
  id?: string
  action?: string
  details?: string
  entity_type?: string
  created_at?: string
}

interface OverviewViewProps {
  onRunDetection: () => void
  onViewTwin: () => void
  onViewAllFindings: () => void
  onSelectFinding: (finding: FindingDetail) => void
  onSelectRiskCategory: (category: string) => void
  onViewLiveActivity: () => void
  organizationId?: string
  getIdToken?: () => Promise<string>
}

interface LayoutConfig {
  mainSplit: number // Percentage for Threat Activity vs Twin (25 to 75, default: 48)
  mainHeight: number // Row height in px (240 to 520, default: 310)
  bottomSplit: [number, number, number] // Percentages for [Findings, Assets, Recent] (sum to 100, default: [38.5, 27.5, 34.0])
  bottomHeight: number // Row height in px (260 to 550, default: 340)
}

const DEFAULT_LAYOUT: LayoutConfig = {
  mainSplit: 48,
  mainHeight: 310,
  bottomSplit: [38.5, 27.5, 34.0],
  bottomHeight: 340,
}

const STORAGE_KEY = 'cgx_overview_layout_v2'

export const OverviewView: React.FC<OverviewViewProps> = ({
  onRunDetection,
  onViewTwin,
  onViewAllFindings,
  onSelectFinding,
  onSelectRiskCategory,
  onViewLiveActivity,
  organizationId,
  getIdToken,
}) => {
  const [realAssets, setRealAssets] = useState<RawOverviewAsset[]>([])
  const [realTwinNodes, setRealTwinNodes] = useState<unknown[]>([])
  const [realFindings, setRealFindings] = useState<FindingDetail[]>([])
  const [realAuditLogs, setRealAuditLogs] = useState<RawOverviewAuditLog[]>([])

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      if (!organizationId || !getIdToken) return
      try {
        const token = await getIdToken()
        const [assetsRes, twinRes, logsRes] = await Promise.all([
          fetch(`/api/v1/organizations/${encodeURIComponent(organizationId)}/assets`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/v1/organizations/${encodeURIComponent(organizationId)}/twin/graph`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/v1/organizations/${encodeURIComponent(organizationId)}/audit-logs`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])
        if (mounted && assetsRes.ok) {
          const assets = await assetsRes.json()
          if (Array.isArray(assets)) {
            setRealAssets(assets as RawOverviewAsset[])
            const derivedFindings: FindingDetail[] = []
            ;(assets as RawOverviewAsset[]).forEach((ast) => {
              (ast.ports || []).forEach((p) => {
                if ([21, 23, 445].includes(p.port)) {
                  derivedFindings.push({
                    id: `find-${ast.id}-${p.port}`,
                    title: `Risky exposed service (${p.service || 'unknown'})`,
                    severity: 'High',
                    ruleId: 'RULE_RISKY_SERVICE',
                    mitreTechnique: 'T1133',
                    mitreTactic: 'Initial Access',
                    target: `${ast.ip_address}:${p.port}`,
                    destinationPort: p.port,
                    confidence: 0.95,
                    provenance: 'OBSERVED',
                    status: 'OPEN',
                    description: `Insecure plaintext or legacy service observed listening on ${ast.ip_address} port ${p.port}.`,
                    evidenceLogs: [],
                  })
                }
              })
            })
            setRealFindings(derivedFindings)
          }
        }
        if (mounted && twinRes.ok) {
          const twin = await twinRes.json()
          if (twin?.nodes) setRealTwinNodes(twin.nodes)
        }
        if (mounted && logsRes.ok) {
          const logs = await logsRes.json()
          if (Array.isArray(logs)) setRealAuditLogs(logs)
        }
      } catch (e) {
        console.warn('Failed to load overview real telemetry', e)
      }
    }
    void fetchData()
    return () => {
      mounted = false
    }
  }, [organizationId, getIdToken])

  const riskCounts = useMemo(() => {
    let critical = 0
    let high = 0
    let medium = 0
    let low = 0

    for (const asset of realAssets) {
      const ports = (asset.ports || []).map((p) => p.port)
      if (ports.some((p: number) => [5432, 3306, 27017, 1433].includes(p))) {
        critical += 1
      } else if (ports.some((p: number) => [21, 22, 23, 25, 445].includes(p))) {
        high += 1
      } else if (ports.some((p: number) => [80, 443, 8080].includes(p))) {
        medium += 1
      } else {
        low += 1
      }
    }

    return {
      critical,
      high,
      medium,
      low,
      total: realAssets.length,
    }
  }, [realAssets])
  // Load layout preferences from localStorage
  const [layout, setLayout] = useState<LayoutConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (
          typeof parsed.mainSplit === 'number' &&
          typeof parsed.mainHeight === 'number' &&
          Array.isArray(parsed.bottomSplit) &&
          parsed.bottomSplit.length === 3
        ) {
          return parsed
        }
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_LAYOUT
  })

  // Active dragging handle indicator
  const [activeHandle, setActiveHandle] = useState<string | null>(null)
  const [showLayoutBar, setShowLayoutBar] = useState<boolean>(false)

  // Refs for tracking DOM boundaries
  const mainRowRef = useRef<HTMLDivElement>(null)
  const bottomRowRef = useRef<HTMLDivElement>(null)

  // Sync layout configuration to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
    } catch {
      // Storage unavailable or quota exceeded
    }
  }, [layout])

  // --- Handlers for Resizing Middle Row (Threat Chart vs Twin) ---
  const handleMainColMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setActiveHandle('main-col')

    const startX = e.clientX
    const container = mainRowRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const containerWidth = containerRect.width
    const initialSplit = layout.mainSplit

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaPercent = (deltaX / containerWidth) * 100
      const nextSplit = Math.min(Math.max(initialSplit + deltaPercent, 25), 75)
      setLayout((prev) => ({ ...prev, mainSplit: Math.round(nextSplit * 10) / 10 }))
    }

    const onMouseUp = () => {
      setActiveHandle(null)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [layout.mainSplit])

  const handleMainRowHeightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setActiveHandle('main-row')

    const startY = e.clientY
    const initialHeight = layout.mainHeight

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY
      const nextHeight = Math.min(Math.max(initialHeight + deltaY, 240), 520)
      setLayout((prev) => ({ ...prev, mainHeight: Math.round(nextHeight) }))
    }

    const onMouseUp = () => {
      setActiveHandle(null)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [layout.mainHeight])

  // --- Handlers for Resizing Bottom Row (Findings, Assets, Activity) ---
  const handleBottomCol1MouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setActiveHandle('bottom-col-1')

    const startX = e.clientX
    const container = bottomRowRef.current
    if (!container) return

    const containerWidth = container.getBoundingClientRect().width
    const [c1, c2, c3] = layout.bottomSplit

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaPercent = (deltaX / containerWidth) * 100
      const nextC1 = Math.min(Math.max(c1 + deltaPercent, 22), 55)
      const diff = nextC1 - c1
      const nextC2 = Math.min(Math.max(c2 - diff, 20), 45)
      const adjustedC1 = c1 + c2 - nextC2
      setLayout((prev) => ({
        ...prev,
        bottomSplit: [
          Math.round(adjustedC1 * 10) / 10,
          Math.round(nextC2 * 10) / 10,
          c3,
        ],
      }))
    }

    const onMouseUp = () => {
      setActiveHandle(null)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [layout.bottomSplit])

  const handleBottomCol2MouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setActiveHandle('bottom-col-2')

    const startX = e.clientX
    const container = bottomRowRef.current
    if (!container) return

    const containerWidth = container.getBoundingClientRect().width
    const [c1, c2, c3] = layout.bottomSplit

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaPercent = (deltaX / containerWidth) * 100
      const nextC2 = Math.min(Math.max(c2 + deltaPercent, 20), 45)
      const diff = nextC2 - c2
      const nextC3 = Math.min(Math.max(c3 - diff, 20), 55)
      const adjustedC2 = c2 + c3 - nextC3
      setLayout((prev) => ({
        ...prev,
        bottomSplit: [
          c1,
          Math.round(adjustedC2 * 10) / 10,
          Math.round(nextC3 * 10) / 10,
        ],
      }))
    }

    const onMouseUp = () => {
      setActiveHandle(null)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [layout.bottomSplit])

  const handleBottomRowHeightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setActiveHandle('bottom-row')

    const startY = e.clientY
    const initialHeight = layout.bottomHeight

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY
      const nextHeight = Math.min(Math.max(initialHeight + deltaY, 260), 560)
      setLayout((prev) => ({ ...prev, bottomHeight: Math.round(nextHeight) }))
    }

    const onMouseUp = () => {
      setActiveHandle(null)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [layout.bottomHeight])

  // Presets
  const applyPreset = (preset: 'balanced' | 'focus-chart' | 'focus-twin' | 'default') => {
    if (preset === 'balanced') {
      setLayout({
        mainSplit: 50,
        mainHeight: 310,
        bottomSplit: [33.3, 33.3, 33.4],
        bottomHeight: 340,
      })
    } else if (preset === 'focus-chart') {
      setLayout({
        mainSplit: 62,
        mainHeight: 340,
        bottomSplit: [42, 26, 32],
        bottomHeight: 340,
      })
    } else if (preset === 'focus-twin') {
      setLayout({
        mainSplit: 38,
        mainHeight: 360,
        bottomSplit: [32, 26, 42],
        bottomHeight: 340,
      })
    } else {
      setLayout(DEFAULT_LAYOUT)
    }
  }

  return (
    <div className="overview-page">
      {/* Hero Header with Real Earth Visual and 4-KPI Strip */}
      <GlobeHero
        onRunDetection={onRunDetection}
        criticalCount={riskCounts.critical}
        highCount={riskCounts.high}
        mediumCount={riskCounts.medium}
        lowCount={riskCounts.low}
      />

      {/* Floating / Compact Layout Toolbar Toggle Strip */}
      <div className="overview-toolbar-strip">
        <button
          type="button"
          className={`btn-layout-toggle ${showLayoutBar ? 'active' : ''}`}
          onClick={() => setShowLayoutBar((prev) => !prev)}
          title="Toggle Workspace Layout Presets"
        >
          <SlidersHorizontal size={12} />
          <span>
            Layout ({layout.mainSplit === 50 ? '1:1 Balanced' : layout.mainSplit === 62 ? 'Focus Chart' : layout.mainSplit === 38 ? 'Focus Twin' : 'Custom'})
          </span>
        </button>
      </div>

      {/* Discrete Workspace Layout Controls Bar - Only visible when toggled or actively dragging */}
      {(showLayoutBar || activeHandle !== null) && (
        <div className="overview-layout-bar">
          <div className="layout-bar-left">
            <div className="layout-bar-title">
              <SlidersHorizontal size={13} />
              <span>Workspace Presets</span>
            </div>

            <div className="layout-presets-group">
              <button
                type="button"
                className={`btn-layout-preset ${layout.mainSplit === 50 ? 'active' : ''}`}
                onClick={() => applyPreset('balanced')}
                title="Set 50:50 balanced split across panels"
              >
                <Columns size={12} />
                <span>Balanced (1:1)</span>
              </button>

              <button
                type="button"
                className={`btn-layout-preset ${layout.mainSplit === 62 ? 'active' : ''}`}
                onClick={() => applyPreset('focus-chart')}
                title="Expand Threat Activity Timeline"
              >
                <span>Focus Chart</span>
              </button>

              <button
                type="button"
                className={`btn-layout-preset ${layout.mainSplit === 38 ? 'active' : ''}`}
                onClick={() => applyPreset('focus-twin')}
                title="Expand Digital Twin Topology Canvas"
              >
                <span>Focus Twin</span>
              </button>
            </div>
          </div>

          <div className="layout-bar-right">
            {activeHandle && (
              <div className="layout-hint-pill live">
                <span className="layout-hint-dot" />
                <span>Adjusting {activeHandle}</span>
              </div>
            )}

            <button
              type="button"
              className="btn-layout-reset"
              onClick={() => applyPreset('default')}
              title="Reset layout to default reference proportions"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              className="btn-layout-close"
              onClick={() => setShowLayoutBar(false)}
              title="Close layout presets bar"
              aria-label="Close"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Middle Row: Threat Activity & Digital Twin with Interactive Splitter */}
      <div
        className="resizable-row"
        ref={mainRowRef}
        style={{ height: `${layout.mainHeight}px` }}
      >
        {/* Panel 1: Threat Activity Chart */}
        <div
          className="resizable-col-panel"
          style={{ flex: `0 0 calc(${layout.mainSplit}% - 14px)` }}
        >
          <ThreatActivityChart data={[]} />
        </div>

        {/* Draggable Vertical Splitter Handle */}
        <div
          className={`split-gutter-col ${activeHandle === 'main-col' ? 'active' : ''}`}
          onMouseDown={handleMainColMouseDown}
          title="Drag left/right to resize Threat Chart vs Digital Twin"
        >
          <div className="gutter-track-col">
            <div className="gutter-grip-pill-col">
              <span className="gutter-grip-dot" />
              <span className="gutter-grip-dot" />
              <span className="gutter-grip-dot" />
            </div>
          </div>
        </div>

        {/* Panel 2: Digital Twin Preview */}
        <div
          className="resizable-col-panel"
          style={{ flex: `0 0 calc(${100 - layout.mainSplit}% - 14px)` }}
        >
          <DigitalTwinPreview onViewFullTwin={onViewTwin} nodes={realTwinNodes} />
        </div>
      </div>

      {/* Main Row Vertical Height Resize Handle */}
      <div
        className={`split-gutter-row ${activeHandle === 'main-row' ? 'active' : ''}`}
        onMouseDown={handleMainRowHeightMouseDown}
        title="Drag up/down to adjust row height"
      >
        <div className="gutter-track-row">
          <div className="gutter-grip-pill-row">
            <span className="gutter-grip-dot" />
            <span className="gutter-grip-dot" />
            <span className="gutter-grip-dot" />
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Findings, Assets by Risk, Recent Activity with Interactive Splitters */}
      <div
        className="resizable-row"
        ref={bottomRowRef}
        style={{ height: `${layout.bottomHeight}px` }}
      >
        {/* Panel 1: Top Findings */}
        <div
          className="resizable-col-panel"
          style={{ flex: `0 0 calc(${layout.bottomSplit[0]}% - 14px)` }}
        >
          <div className="cg-card top-findings-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Top Findings</h3>
                <p className="card-subtitle">Highest risk detections in this period</p>
              </div>
              <button
                type="button"
                className="btn-card-link"
                onClick={onViewAllFindings}
                title="Open full findings database"
              >
                <span>View All</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="findings-list" style={{ flex: 1, overflowY: 'auto' }}>
              {realFindings.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: '160px',
                    gap: '8px',
                    padding: '24px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <CheckCircle size={28} style={{ color: 'var(--accent-emerald)', opacity: 0.8 }} />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    No Active Findings Detected
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Packets and discovered services have satisfied baseline security signatures.
                  </span>
                </div>
              ) : (
                realFindings.map((finding) => {
                  const isCrit = finding.severity === 'Critical'
                  return (
                    <div
                      key={finding.id}
                      className={`finding-item-row ${isCrit ? 'critical' : 'high'}`}
                      onClick={() => onSelectFinding(finding)}
                      role="button"
                      tabIndex={0}
                      title="Click to inspect raw wire evidence and remediation options"
                    >
                      <div className={`finding-icon-wrap ${isCrit ? 'critical' : 'high'}`}>
                        <AlertTriangle size={15} />
                      </div>

                      <div className="finding-meta">
                        <span className="finding-title">{finding.title}</span>
                        <span className="finding-subtitle mono">
                          MITRE {finding.mitreTechnique} • {finding.target}
                        </span>
                      </div>

                      <span className={`finding-badge-pill ${isCrit ? 'critical' : 'high'}`}>
                        {finding.severity}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Splitter 1: between Findings and Assets */}
        <div
          className={`split-gutter-col ${activeHandle === 'bottom-col-1' ? 'active' : ''}`}
          onMouseDown={handleBottomCol1MouseDown}
          title="Drag left/right to resize Findings vs Assets Donut"
        >
          <div className="gutter-track-col">
            <div className="gutter-grip-pill-col">
              <span className="gutter-grip-dot" />
              <span className="gutter-grip-dot" />
              <span className="gutter-grip-dot" />
            </div>
          </div>
        </div>

        {/* Panel 2: Assets by Risk */}
        <div
          className="resizable-col-panel"
          style={{ flex: `0 0 calc(${layout.bottomSplit[1]}% - 14px)` }}
        >
          <AssetRiskDonut data={riskCounts} onSelectRisk={onSelectRiskCategory} />
        </div>

        {/* Splitter 2: between Assets and Activity */}
        <div
          className={`split-gutter-col ${activeHandle === 'bottom-col-2' ? 'active' : ''}`}
          onMouseDown={handleBottomCol2MouseDown}
          title="Drag left/right to resize Assets Donut vs Recent Activity"
        >
          <div className="gutter-track-col">
            <div className="gutter-grip-pill-col">
              <span className="gutter-grip-dot" />
              <span className="gutter-grip-dot" />
              <span className="gutter-grip-dot" />
            </div>
          </div>
        </div>

        {/* Panel 3: Recent Activity */}
        <div
          className="resizable-col-panel"
          style={{ flex: `0 0 calc(${layout.bottomSplit[2]}% - 14px)` }}
        >
          <div className="cg-card recent-activity-card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
              <button
                type="button"
                className="btn-live-pill"
                onClick={onViewLiveActivity}
                title="Real-time event stream"
              >
                <span className="live-dot pulse" />
                <span>Live</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="activity-timeline-list" style={{ flex: 1, overflowY: 'auto' }}>
              {realAuditLogs.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: '160px',
                    gap: '8px',
                    padding: '24px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Clock size={28} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    No Recent Activity Logged
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Operational events, scans, and defense actions will appear here in real time.
                  </span>
                </div>
              ) : (
                realAuditLogs.map((log, idx: number) => (
                  <div key={log.id || idx} className="timeline-item">
                    <div className="timeline-icon-circle lightning">
                      <Zap size={14} />
                    </div>
                    <div className="timeline-body">
                      <span className="timeline-title">{log.action || 'Security Action'}</span>
                      <span className="timeline-desc">{log.details || log.entity_type}</span>
                    </div>
                    <span className="timeline-time mono">{log.created_at ? new Date(log.created_at).toLocaleTimeString() : 'Recent'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row Vertical Height Resize Handle */}
      <div
        className={`split-gutter-row ${activeHandle === 'bottom-row' ? 'active' : ''}`}
        onMouseDown={handleBottomRowHeightMouseDown}
        title="Drag up/down to adjust bottom cards height"
      >
        <div className="gutter-track-row">
          <div className="gutter-grip-pill-row">
            <span className="gutter-grip-dot" />
            <span className="gutter-grip-dot" />
            <span className="gutter-grip-dot" />
          </div>
        </div>
      </div>
    </div>
  )
}
