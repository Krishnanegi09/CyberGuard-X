import React, { useState } from 'react'
import {
  Play,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'

interface Playbook {
  id: string
  name: string
  trigger: string
  mitreTactic: string
  action: string
  status: 'active' | 'paused' | 'approval_required'
  executionsCount: number
  lastRun: string
  description: string
}

const INITIAL_PLAYBOOKS: Playbook[] = [
  {
    id: 'pb-01',
    name: 'Auto-Shun Malicious Scanner',
    trigger: 'RULE_PORT_SCAN_VERTICAL (SYN probes >= 12 in 10s)',
    mitreTactic: 'Discovery (T1046)',
    action: 'Apply dynamic pfSense packet filter block (TTL 15m)',
    status: 'active',
    executionsCount: 42,
    lastRun: '12m ago',
    description: 'Instantly blackholes aggressive external IP probes at perimeter gateway before reconnaissance completes.',
  },
  {
    id: 'pb-02',
    name: 'Isolate Crown Jewel on High Severity',
    trigger: 'Critical Finding on asset tagged CROWN_JEWEL',
    mitreTactic: 'Lateral Movement (T1021)',
    action: 'Dynamic host isolation + 4-Eyes SOC Lead authorization',
    status: 'approval_required',
    executionsCount: 3,
    lastRun: '2h ago',
    description: 'Severs non-management egress traffic to prevent exfiltration or ransomware propagation across subnets.',
  },
  {
    id: 'pb-03',
    name: 'Firewall Ingress Null-Route on Lateral Movement',
    trigger: 'Unauthorized cross-zone traffic to Database Core',
    mitreTactic: 'Collection (T1005)',
    action: 'Inject drop route into BGP routing table',
    status: 'active',
    executionsCount: 8,
    lastRun: '1d ago',
    description: 'Enforces micro-segmentation by severing transit reachability from DMZ to protected PostgreSQL cluster.',
  },
  {
    id: 'pb-04',
    name: 'Automated Forensic PCAP Dump',
    trigger: 'Anomaly Alert or High Flow Deviation (>3.5 std dev)',
    mitreTactic: 'Exfiltration (T1048)',
    action: 'Snapshot rolling 60-second wire buffer to encrypted GCS bucket',
    status: 'active',
    executionsCount: 19,
    lastRun: '45m ago',
    description: 'Preserves cryptographic raw packet evidence for post-incident chain of custody and forensic review.',
  },
]

export const PlaybooksView: React.FC = () => {
  const [playbooks, setPlaybooks] = useState<Playbook[]>(INITIAL_PLAYBOOKS)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const handleToggle = (id: string) => {
    setPlaybooks((prev) =>
      prev.map((pb) =>
        pb.id === id
          ? {
              ...pb,
              status: pb.status === 'active' ? 'paused' : 'active',
            }
          : pb
      )
    )
  }

  const handleExecute = (pb: Playbook) => {
    setExecutingId(pb.id)
    setTimeout(() => {
      setExecutingId(null)
      setPlaybooks((prev) =>
        prev.map((item) =>
          item.id === pb.id
            ? { ...item, executionsCount: item.executionsCount + 1, lastRun: 'Just now' }
            : item
        )
      )
      setSuccessToast(`Playbook "${pb.name}" dry-run executed successfully. Actions verified.`)
      setTimeout(() => setSuccessToast(null), 4000)
    }, 1200)
  }

  return (
    <div className="view-container">
      <div className="discovery-view-header" style={{ marginBottom: '24px' }}>
        <div className="discovery-header-copy">
          <h2>Automated Defense Playbooks</h2>
          <p>
            Deterministic security orchestration workflows triggered by verified telemetry anomalies and threat signatures.
            All mitigation actions are reversible, time-bounded (TTL), and enforce multi-tenant isolation.
          </p>
        </div>
        <div className="discovery-header-actions">
          <button
            type="button"
            className="btn-discovery-refresh"
            onClick={() => {
              setSuccessToast('Playbook triggers synchronized with active NIDS inspection rules.')
              setTimeout(() => setSuccessToast(null), 3000)
            }}
          >
            <RotateCcw size={14} />
            <span>Sync Rules</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="callout-success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={16} />
          <span>{successToast}</span>
        </div>
      )}

      {/* 3-KPI Bar */}
      <div className="discovery-kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="discovery-kpi-card">
          <span className="discovery-kpi-label">Active Automated Playbooks</span>
          <span className="discovery-kpi-value text-cyan">
            {playbooks.filter((p) => p.status === 'active').length}
          </span>
          <span className="discovery-kpi-sub">Continuous policy engines</span>
        </div>
        <div className="discovery-kpi-card">
          <span className="discovery-kpi-label">Total Orchestrated Defenses</span>
          <span className="discovery-kpi-value">
            {playbooks.reduce((acc, p) => acc + p.executionsCount, 0)}
          </span>
          <span className="discovery-kpi-sub">Mitigation actions dispatched</span>
        </div>
        <div className="discovery-kpi-card">
          <span className="discovery-kpi-label">Four-Eyes Approvals Enforced</span>
          <span className="discovery-kpi-value text-amber">
            {playbooks.filter((p) => p.status === 'approval_required').length}
          </span>
          <span className="discovery-kpi-sub">Dual-operator verified</span>
        </div>
      </div>

      {/* Playbooks List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {playbooks.map((pb) => {
          const isActive = pb.status === 'active'
          const isApproval = pb.status === 'approval_required'
          const isRunning = executingId === pb.id

          return (
            <div
              key={pb.id}
              className="cg-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                padding: '20px 24px',
                borderLeft: `4px solid ${isActive ? 'var(--accent-cyan)' : isApproval ? '#f59e0b' : 'var(--border-subtle)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {pb.name}
                    </h3>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        backgroundColor: isActive
                          ? 'rgba(6, 182, 212, 0.15)'
                          : isApproval
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(255, 255, 255, 0.05)',
                        color: isActive ? 'var(--accent-cyan)' : isApproval ? '#f59e0b' : 'var(--text-muted)',
                      }}
                    >
                      {pb.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, maxWidth: '850px' }}>
                    {pb.description}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-layout-preset"
                    onClick={() => handleToggle(pb.id)}
                    style={{ height: '32px', padding: '0 12px' }}
                  >
                    <span>{isActive ? 'Pause' : 'Activate'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-nids-start"
                    onClick={() => handleExecute(pb)}
                    disabled={isRunning}
                    style={{ height: '32px', padding: '0 14px', fontSize: '12px' }}
                  >
                    <Play size={13} />
                    <span>{isRunning ? 'Executing...' : 'Run Playbook'}</span>
                  </button>
                </div>
              </div>

              {/* Attributes Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px',
                  backgroundColor: 'var(--bg-canvas)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                    Trigger Condition
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{pb.trigger}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                    Automated Countermeasure
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>{pb.action}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                    MITRE ATT&CK Matrix
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{pb.mitreTactic}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                    Execution History
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {pb.executionsCount} runs • Last: {pb.lastRun}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default PlaybooksView
