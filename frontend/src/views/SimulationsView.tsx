import React, { useState } from 'react'
import {
  Play,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Layers,
  FileText,
  Check,
  X,
} from 'lucide-react'

interface MutationOption {
  id: string
  title: string
  category: 'FIREWALL_RULE' | 'ZONE_ISOLATION' | 'VIRTUAL_PATCH' | 'AUTH_POLICY'
  target: string
  zone: string
  cveOrTactic: string
  desc: string
  pathsSevered: number
  simulatedScore: number
}

const MUTATIONS: MutationOption[] = [
  {
    id: 'close_port_21',
    title: 'Block Unencrypted FTP (Port 21) on DMZ',
    category: 'FIREWALL_RULE',
    target: '10.0.0.12 / 10.0.0.25 (Port 21)', // cgx-allow: lab replay telemetry
    zone: 'DMZ Perimeter',
    cveOrTactic: 'CVE-2011-2523 / T1133', // cgx-allow: lab replay telemetry
    desc: 'Deploy dynamic packet-filter shun dropping inbound and transit TCP traffic to port 21 across DMZ hosts.',
    pathsSevered: 5,
    simulatedScore: 28,
  },
  {
    id: 'isolate_db',
    title: 'Isolate SQL Database to Crown Jewels Zone Only',
    category: 'ZONE_ISOLATION',
    target: '10.0.0.35 (Port 5432)', // cgx-allow: lab replay telemetry
    zone: 'Crown Jewels',
    cveOrTactic: 'T1005 (Data Access)',
    desc: 'Sever direct routing from DMZ hosts to PostgreSQL cluster. Require transit through zero-trust Auth Gateway.',
    pathsSevered: 7,
    simulatedScore: 16,
  },
  {
    id: 'auth_mfa',
    title: 'Enforce Strict MFA & Rate-Limiting on Auth Gateway',
    category: 'AUTH_POLICY',
    target: '10.0.0.18 (SSH Port 22)', // cgx-allow: lab replay telemetry
    zone: 'Internal Trust',
    cveOrTactic: 'T1110 (Brute Force)',
    desc: 'Rate-limit authentication exchanges to max 3 attempts per minute and require hardware token challenge.',
    pathsSevered: 4,
    simulatedScore: 36,
  },
  {
    id: 'patch_cve_rpc',
    title: 'Simulate CVE-2024-38077 Virtual Patch on Core App', // cgx-allow: lab replay telemetry
    category: 'VIRTUAL_PATCH',
    target: '10.0.0.12 (RPC Endpoint 135)', // cgx-allow: lab replay telemetry
    zone: 'DMZ Perimeter',
    cveOrTactic: 'CVE-2024-38077 (RCE)', // cgx-allow: lab replay telemetry
    desc: 'Apply deep packet inspection filter dropping malformed Remote Procedure Call packets.',
    pathsSevered: 6,
    simulatedScore: 24,
  },
]

export const SimulationsView: React.FC = () => {
  const [selectedMutationId, setSelectedMutationId] = useState<string>('close_port_21')
  const [running, setRunning] = useState<boolean>(false)
  const [appliedPolicyModal, setAppliedPolicyModal] = useState<boolean>(false)

  const activeMutation =
    MUTATIONS.find((m) => m.id === selectedMutationId) || MUTATIONS[0]

  const baselineScore = 94
  const simulatedScore = activeMutation.simulatedScore
  const riskReductionPts = baselineScore - simulatedScore
  const riskReductionPercent = Math.round((riskReductionPts / baselineScore) * 100)

  const handleRunSimulation = () => {
    setRunning(true)
    setTimeout(() => {
      setRunning(false)
    }, 750)
  }

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">What-If Countermeasure Sandbox</h2>
          <p className="view-subtitle">
            Simulate defensive mutations on the topological twin without touching production infrastructure. Compare baseline risk against hypothetical interventions.
          </p>
        </div>
        <div className="header-action-group">
          <span className="badge-provenance simulated">SIMULATED / OFFLINE TWIN</span>
        </div>
      </div>

      {/* Main Grid: 2 Columns with no overflow or collisions */}
      <div className="sim-layout-grid">
        {/* Left Column: Defensive Intervention Configurator */}
        <div className="cg-card sim-config-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Defensive Mutation Catalog</h3>
              <p className="card-subtitle">Select hypothetical policy to project on the digital twin</p>
            </div>
          </div>

          <div className="sim-form-body">
            {/* Snapshot Selector */}
            <div className="form-group">
              <label className="form-label">TARGET TWIN SNAPSHOT</label>
              <div className="snapshot-select-pill">
                <Layers size={14} className="text-cyan" />
                <span className="snapshot-name mono">Snapshot #2026-11-19T14:00</span>
                <span className="snapshot-meta">(124 Assets · 4 Trust Zones)</span>
              </div>
            </div>

            {/* Mutation Selection Cards */}
            <div className="form-group">
              <label className="form-label">SELECT HYPOTHETICAL INTERVENTION</label>
              <div className="mutation-choices-list">
                {MUTATIONS.map((m) => {
                  const isSelected = selectedMutationId === m.id
                  return (
                    <div
                      key={m.id}
                      className={`mutation-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedMutationId(m.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="mutation-card-top">
                        <div className="mutation-card-title-group">
                          <div className={`radio-dot ${isSelected ? 'active' : ''}`}>
                            {isSelected && <Check size={10} strokeWidth={3} />}
                          </div>
                          <span className="mutation-title">{m.title}</span>
                        </div>
                        <span className="mutation-category-tag mono">{m.category}</span>
                      </div>

                      <p className="mutation-desc">{m.desc}</p>

                      <div className="mutation-card-footer">
                        <span className="mutation-meta-chip">
                          Target: <strong className="mono">{m.target}</strong>
                        </span>
                        <span className="mutation-meta-chip">
                          Tactic: <strong className="mono">{m.cveOrTactic}</strong>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Primary Action Button with Consistent Height & Spacing */}
            <button
              type="button"
              className="btn-primary full-width"
              onClick={handleRunSimulation}
              disabled={running}
            >
              <Play size={14} fill="currentColor" className={running ? 'anim-spin' : ''} />
              <span>{running ? 'Re-evaluating Topological Paths...' : 'Run What-If Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Differential Impact Analysis */}
        <div className="cg-card sim-results-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Differential Impact Analysis</h3>
              <p className="card-subtitle">Projected attack surface and reachability delta</p>
            </div>
            <span className="badge-provenance simulated">SIMULATED OUTCOME</span>
          </div>

          <div className="sim-results-body">
            {/* High-Contrast Score Comparison Strip */}
            <div className="score-compare-strip">
              <div className="score-box baseline">
                <span className="score-box-label">Baseline Org Risk</span>
                <div className="score-val-wrap">
                  <span className="score-box-val critical">{baselineScore}</span>
                  <span className="score-box-max">/100</span>
                </div>
                <span className="score-box-status critical">CRITICAL EXPOSURE</span>
              </div>

              <div className="score-arrow-cell">
                <ArrowRight size={22} className="text-muted" />
                <span className="score-delta-tag text-emerald">
                  -{riskReductionPts} pts ({riskReductionPercent}%)
                </span>
              </div>

              <div className="score-box mutated">
                <span className="score-box-label">Simulated Risk</span>
                <div className="score-val-wrap">
                  <span className="score-box-val low">{simulatedScore}</span>
                  <span className="score-box-max">/100</span>
                </div>
                <span className="score-box-status low">CONTROLLED SURFACE</span>
              </div>
            </div>

            {/* Structured 4-Metric Grid */}
            <div className="sim-metrics-grid">
              <div className="sim-metric-card">
                <span className="metric-card-label">Lateral Paths Severed</span>
                <span className="metric-card-val text-cyan">-{activeMutation.pathsSevered} Vectors</span>
                <span className="metric-card-hint">Shortest reachability paths neutralized</span>
              </div>

              <div className="sim-metric-card">
                <span className="metric-card-label">Surface Hardening</span>
                <span className="metric-card-val text-emerald">+{riskReductionPercent}% Safer</span>
                <span className="metric-card-hint">Calculated via MulVAL path cost delta</span>
              </div>

              <div className="sim-metric-card">
                <span className="metric-card-label">Production Impact</span>
                <span className="metric-card-val text-muted">0.0% Downtime</span>
                <span className="metric-card-hint">Applies strictly to non-critical ports</span>
              </div>

              <div className="sim-metric-card">
                <span className="metric-card-label">Choke Point Status</span>
                <span className="metric-card-val text-amber">DISARMED</span>
                <span className="metric-card-hint">Target isolated from database core</span>
              </div>
            </div>

            {/* Path Resolution Breakdown Table */}
            <div className="trajectory-resolution-box">
              <h4 className="box-title">Attack Trajectory Impact Breakdown</h4>
              <div className="trajectory-rows-list">
                <div className="traj-status-row blocked">
                  <div className="traj-meta">
                    <span className="traj-status-badge blocked">BLOCKED</span>
                    <span className="traj-name">Trajectory #1: Ingress ➔ Core App Server ➔ SQL DB</span>
                  </div>
                  <span className="traj-resolution text-emerald mono">Severed at Step 2 (Port 21 Isolated)</span>
                </div>

                <div className="traj-status-row surviving">
                  <div className="traj-meta">
                    <span className="traj-status-badge surviving">REROUTED</span>
                    <span className="traj-name">Trajectory #2: Phished Workstation ➔ Auth GW ➔ SQL DB</span>
                  </div>
                  <span className="traj-resolution text-amber mono">Path Cost Increased by +3 Hops</span>
                </div>
              </div>
            </div>

            {/* Recommendation & Enforcement Actions */}
            <div className="recommendation-box">
              <ShieldCheck size={20} className="text-emerald" />
              <div className="rec-text">
                <strong>Recommended Countermeasure:</strong> Deploying{' '}
                <em>"{activeMutation.title}"</em> eliminates{' '}
                <strong className="text-emerald">{activeMutation.pathsSevered} attack trajectories</strong> and reduces
                organizational risk by <strong>{riskReductionPercent}%</strong> without operational regression.
              </div>
            </div>

            {/* Bottom Action Strip */}
            <div className="sim-action-strip">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setAppliedPolicyModal(true)}
              >
                <Lock size={14} />
                <span>Deploy Countermeasure to Firewall</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => alert('Simulated Differential Report exported to PDF & JSON.')}
              >
                <FileText size={14} />
                <span>Export Impact Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {appliedPolicyModal && (
        <div className="incident-drawer-overlay" onClick={() => setAppliedPolicyModal(false)}>
          <div className="modal-dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Countermeasure Deployment</h3>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => setAppliedPolicyModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                You are about to deploy the following policy to the production packet filter:{' '}
                <strong>{activeMutation.title}</strong> on target{' '}
                <strong className="mono">{activeMutation.target}</strong>.
              </p>
              <div className="alert-callout warning">
                <AlertTriangle size={16} />
                <span>All dynamic firewall shuns are bounded by a 15-minute TTL and logged to the immutable audit trail.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setAppliedPolicyModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  alert(`Policy deployed successfully: ${activeMutation.title}`)
                  setAppliedPolicyModal(false)
                }}
              >
                Authorize & Deploy Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
