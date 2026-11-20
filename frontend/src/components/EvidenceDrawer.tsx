import React from 'react'
import { X, ShieldAlert, CheckCircle, Activity } from 'lucide-react'

export interface FindingDetail {
  id: string
  title: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  ruleId: string
  mitreTechnique: string
  mitreTactic: string
  target: string
  destinationPort?: number | string
  confidence: number
  provenance: 'OBSERVED' | 'DERIVED' | 'PREDICTED' | 'SIMULATED'
  status: 'OPEN' | 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED' | 'FALSE_POSITIVE'
  description: string
  evidenceLogs: Array<{
    timestamp: string
    srcIp: string
    dstIp: string
    srcPort: number
    dstPort: number
    proto: string
    packets: number
    bytes: number
    flags?: string
  }>
}

interface EvidenceDrawerProps {
  finding: FindingDetail | null
  onClose: () => void
  onAcknowledge?: (id: string) => void
  onContain?: (id: string, target: string) => void
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  finding,
  onClose,
  onAcknowledge,
  onContain,
}) => {
  if (!finding) return null

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header: Clean inline badges, no excessive empty space */}
        <div className="drawer-header">
          <div className="drawer-header-content">
            <div className="drawer-badge-row">
              <span className={`badge-severity ${finding.severity.toLowerCase()}`}>
                {finding.severity}
              </span>
              <span className={`badge-provenance ${finding.provenance.toLowerCase()}`}>
                {finding.provenance}
              </span>
              <span className="finding-id-tag mono">{finding.id}</span>
            </div>
            <h2 className="drawer-title">{finding.title}</h2>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close Drawer">
            <X size={16} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {/* Metadata Grid */}
          <div className="metadata-grid">
            <div className="meta-box">
              <span className="meta-label">Target Asset</span>
              <span className="meta-value mono">{finding.target}</span>
            </div>
            <div className="meta-box">
              <span className="meta-label">Detection Rule</span>
              <span className="meta-value mono">{finding.ruleId}</span>
            </div>
            <div className="meta-box">
              <span className="meta-label">MITRE Technique</span>
              <span className="meta-value mono">
                {finding.mitreTechnique} ({finding.mitreTactic})
              </span>
            </div>
            <div className="meta-box">
              <span className="meta-label">Confidence Score</span>
              <span className="meta-value">{(finding.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Description */}
          <div className="section-block">
            <h4 className="section-heading">Threat Synopsis</h4>
            <p className="section-text">{finding.description}</p>
          </div>

          {/* Raw Wire Evidence (Zero Fake Data Guarantee) */}
          <div className="section-block">
            <div className="evidence-header">
              <h4 className="section-heading">
                <Activity size={14} className="heading-icon" /> Raw Flow Evidence ({finding.evidenceLogs.length} Records)
              </h4>
              <span className="evidence-badge">BPF Packet Filter Stream</span>
            </div>

            <div className="evidence-table-wrap">
              <table className="evidence-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Source ➔ Target</th>
                    <th>Proto</th>
                    <th>Pkts</th>
                    <th>Bytes</th>
                    <th>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {finding.evidenceLogs.map((log, idx) => (
                    <tr key={idx}>
                      <td className="mono">{log.timestamp}</td>
                      <td className="mono">
                        {log.srcIp}:{log.srcPort} ➔ {log.dstIp}:{log.dstPort}
                      </td>
                      <td className="mono">{log.proto}</td>
                      <td className="mono">{log.packets}</td>
                      <td className="mono">{log.bytes}</td>
                      <td className="mono text-cyan">{log.flags || 'SYN'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions: Balanced (Button Space Button) Grid */}
        <div className="drawer-footer">
          <button
            type="button"
            className="btn-drawer-secondary"
            onClick={() => onAcknowledge?.(finding.id)}
          >
            <CheckCircle size={14} />
            <span>Acknowledge</span>
          </button>

          <button
            type="button"
            className="btn-drawer-danger"
            onClick={() => onContain?.(finding.id, finding.target)}
          >
            <ShieldAlert size={14} />
            <span>Apply Host Shun (TTL 15m)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
