import React, { useState } from 'react'
import {
  Server,
  Database,
  Radio,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  Shield,
  Layers,
  ArrowRight,
  GitBranch,
} from 'lucide-react'

interface LiveTwinShowcaseProps {
  onLaunchConsole?: () => void
}

export const LiveTwinShowcase: React.FC<LiveTwinShowcaseProps> = ({
  onLaunchConsole,
}) => {
  const [selectedNode, setSelectedNode] = useState<string>('node-comp')
  const [simStep, setSimStep] = useState<number>(2) // 0: Recon, 1: Initial, 2: Lateral, 3: PrivEsc, 4: Impact, 5: Response
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [isShunned, setIsShunned] = useState<boolean>(false)

  const nodes = [
    {
      id: 'node-dmz',
      name: 'DMZ-Web-01',
      ip: '192.168.1.10',
      role: 'Public Gateway',
      status: 'normal',
      zone: 'DMZ_EXTERNAL',
      x: 18,
      y: 65,
    },
    {
      id: 'node-comp',
      name: 'Internal-Worker-02',
      ip: '10.0.2.14',
      role: 'Compromised Vector',
      status: isShunned ? 'isolated' : 'compromised',
      zone: 'CORP_INTERNAL',
      x: 38,
      y: 75,
    },
    {
      id: 'node-core',
      name: 'Core-App-Cluster',
      ip: '10.0.3.5',
      role: 'Application Core',
      status: 'target',
      zone: 'SECURE_APPLICATION',
      x: 58,
      y: 40,
    },
    {
      id: 'node-db',
      name: 'Prod-Database-01',
      ip: '10.0.4.88',
      role: 'Crown Jewel Database',
      status: 'crown',
      zone: 'RESTRICTED_DATA',
      x: 78,
      y: 30,
    },
    {
      id: 'node-dc',
      name: 'Identity-DC-01',
      ip: '10.0.1.2',
      role: 'Active Directory DC',
      status: 'normal',
      zone: 'IDENTITY_SERVICES',
      x: 44,
      y: 20,
    },
  ]

  const stages = [
    { name: 'Reconnaissance', duration: '1.2s' },
    { name: 'Initial Access', duration: '2.8s' },
    { name: 'Lateral Movement', duration: '0.9s' },
    { name: 'Privilege Escalation', duration: '3.4s' },
    { name: 'Impact Simulation', duration: '1.8s' },
    { name: 'Response Execution', duration: '0.4s' },
  ]

  const handleNextStep = () => {
    setIsSimulating(true)
    setTimeout(() => {
      setSimStep((prev) => (prev < 5 ? prev + 1 : 0))
      setIsSimulating(false)
    }, 600)
  }

  const handleDeployShun = () => {
    setIsShunned(true)
    setSimStep(5)
  }

  const handleReset = () => {
    setIsShunned(false)
    setSimStep(2)
  }

  const blastRadiusValue = isShunned ? 8 : simStep >= 4 ? 85 : simStep >= 2 ? 32 : 12
  const affectedAssetsValue = isShunned ? 1 : simStep >= 4 ? 38 : simStep >= 2 ? 14 : 4
  const riskScoreLabel = isShunned ? 'Mitigated' : simStep >= 4 ? 'Critical' : 'High'
  const estImpactValue = isShunned ? '0 min' : simStep >= 4 ? '~ 45 min' : '~ 18 min'

  return (
    <section id="twin" className="twin-showcase-section">
      <div className="showcase-container">
        {/* Top Header Row of Product Preview */}
        <div className="showcase-header-bar">
          <div className="showcase-header-left">
            <div className="window-dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <div className="showcase-title-badge">
              <Layers size={14} />
              <span>CYBER DIGITAL TWIN // LIVE TOPOLOGY GRAPH</span>
            </div>
          </div>

          <div className="showcase-header-right">
            <span className="live-simulation-tag">
              <span className="tag-ping" />
              ACTIVE SIMULATION
            </span>
          </div>
        </div>

        {/* Split Main Frame */}
        <div className="showcase-split-grid">
          {/* Left Panel: Live Digital Twin Isometric Topology */}
          <div className="showcase-left-panel">
            <div className="panel-badge-row">
              <span className="panel-badge">
                <Radio size={13} className="text-cyan" />
                <span>Live Digital Twin</span>
              </span>
              <span className="status-indicator-green">
                <span className="dot-pulse" />
                Active Simulation
              </span>
            </div>

            {/* Isometric Circuit Canvas */}
            <div className="isometric-topology-canvas">
              {/* SVG Connector Traces & Circuit Grid */}
              <svg className="topology-svg-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cyanTrace" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00ddf5" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#00c89a" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="alertTrace" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff4d5d" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#00ddf5" stopOpacity="0.3" />
                  </linearGradient>
                </defs>

                {/* Circuit Grid Lines */}
                <line x1="10" y1="20" x2="90" y2="20" stroke="rgba(36,51,65,0.4)" strokeWidth="0.4" strokeDasharray="1 2" />
                <line x1="10" y1="50" x2="90" y2="50" stroke="rgba(36,51,65,0.4)" strokeWidth="0.4" strokeDasharray="1 2" />
                <line x1="10" y1="80" x2="90" y2="80" stroke="rgba(36,51,65,0.4)" strokeWidth="0.4" strokeDasharray="1 2" />

                {/* Connection lines between nodes */}
                <path d="M 18 65 L 38 75" stroke="url(#cyanTrace)" strokeWidth="1" />
                <path d="M 38 75 L 58 40" stroke="url(#alertTrace)" strokeWidth="1.4" strokeDasharray="2 1" />
                <path d="M 58 40 L 78 30" stroke="url(#cyanTrace)" strokeWidth="1.2" />
                <path d="M 58 40 L 44 20" stroke="url(#cyanTrace)" strokeWidth="0.8" />
              </svg>

              {/* Render Server & Database Nodes */}
              {nodes.map((node) => {
                const isSelected = selectedNode === node.id
                const isCompromised = node.status === 'compromised'
                const isCrown = node.status === 'crown'

                return (
                  <div
                    key={node.id}
                    className={`topology-node-card ${node.status} ${isSelected ? 'selected' : ''}`}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    onClick={() => setSelectedNode(node.id)}
                  >
                    <div className="node-icon-box">
                      {isCrown ? (
                        <Database size={18} />
                      ) : isCompromised ? (
                        <AlertTriangle size={18} />
                      ) : (
                        <Server size={18} />
                      )}
                      {isCompromised && <span className="compromised-pulse-ring" />}
                    </div>

                    <div className="node-info-tooltip">
                      <span className="tooltip-name">{node.name}</span>
                      <span className="tooltip-ip">{node.ip}</span>
                    </div>
                  </div>
                )
              })}

              {/* Node Detail Overlay at Bottom of Topology Canvas */}
              {selectedNode && (
                <div className="topology-node-detail-bar">
                  {(() => {
                    const current = nodes.find((n) => n.id === selectedNode) || nodes[1]
                    return (
                      <>
                        <div className="detail-meta">
                          <span className="meta-zone">{current.zone}</span>
                          <span className="meta-name">{current.name}</span>
                          <span className="meta-ip">{current.ip}</span>
                        </div>
                        <div className="detail-status">
                          <span className={`status-pill ${current.status}`}>
                            {current.status.toUpperCase()}
                          </span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Interactive Simulation Action Buttons */}
            <div className="topology-action-bar">
              <button
                type="button"
                className="btn-action-simulate"
                onClick={handleNextStep}
                disabled={isSimulating}
              >
                <Play size={14} />
                <span>{isSimulating ? 'Simulating Step...' : 'Advance Attack Stage'}</span>
              </button>

              {!isShunned ? (
                <button
                  type="button"
                  className="btn-action-shun"
                  onClick={handleDeployShun}
                >
                  <Shield size={14} />
                  <span>Enforce Firewall Shun</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-action-reset"
                  onClick={handleReset}
                >
                  <RotateCcw size={14} />
                  <span>Reset Attack Simulation</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Panel: Attack Simulation (Live) & Simulation Insights */}
          <div className="showcase-right-panel">
            <div className="panel-badge-row">
              <span className="panel-badge">
                <GitBranch size={14} className="text-cyan" />
                <span>Attack Simulation (Live)</span>
              </span>
            </div>

            {/* Simulation Stages Lifecycle */}
            <div className="simulation-lifecycle-list">
              {stages.map((stage, idx) => {
                const isCompleted = idx < simStep
                const isInProgress = idx === simStep
                const isPending = idx > simStep

                return (
                  <div
                    key={stage.name}
                    className={`lifecycle-stage-row ${
                      isCompleted ? 'completed' : isInProgress ? 'in-progress' : 'pending'
                    }`}
                  >
                    <div className="stage-marker">
                      {isCompleted ? (
                        <CheckCircle2 size={16} className="marker-icon completed" />
                      ) : isInProgress ? (
                        <span className="marker-dot active-pulse" />
                      ) : (
                        <span className="marker-dot pending" />
                      )}
                    </div>

                    <div className="stage-name-col">
                      <span className="stage-name">{stage.name}</span>
                    </div>

                    <div className="stage-status-col">
                      {isCompleted && (
                        <span className="stage-tag completed">
                          Completed · {stage.duration}
                        </span>
                      )}
                      {isInProgress && (
                        <span className="stage-tag in-progress">
                          In Progress · {stage.duration}
                        </span>
                      )}
                      {isPending && (
                        <span className="stage-tag pending">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Simulation Insights Subpanel */}
            <div className="simulation-insights-card">
              <div className="insights-card-title">
                <Clock size={14} />
                <span>Simulation Insights</span>
              </div>

              <div className="insights-metrics-grid">
                {/* Blast Radius Progress Bar */}
                <div className="insight-metric-item full-width">
                  <div className="metric-header-row">
                    <span className="metric-label">Blast Radius</span>
                    <span className="metric-value-num">{blastRadiusValue}%</span>
                  </div>
                  <div className="blast-progress-track">
                    <div
                      className={`blast-progress-fill ${isShunned ? 'mitigated' : ''}`}
                      style={{ width: `${blastRadiusValue}%` }}
                    />
                  </div>
                </div>

                {/* Affected Assets */}
                <div className="insight-metric-item">
                  <span className="metric-label">Affected Assets</span>
                  <span className="metric-value-num large">{affectedAssetsValue}</span>
                </div>

                {/* Risk Score */}
                <div className="insight-metric-item">
                  <span className="metric-label">Risk Score</span>
                  <span className={`risk-badge-pill ${riskScoreLabel.toLowerCase()}`}>
                    {riskScoreLabel}
                  </span>
                </div>

                {/* Estimated Impact */}
                <div className="insight-metric-item">
                  <span className="metric-label">Est. Impact</span>
                  <span className="metric-value-num mono">{estImpactValue}</span>
                </div>
              </div>
            </div>

            {/* Quick Link to Operator Console */}
            <div className="showcase-footer-link">
              <button
                type="button"
                className="btn-deep-dive"
                onClick={onLaunchConsole}
              >
                <span>Launch Full Digital Twin in Console</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LiveTwinShowcase
