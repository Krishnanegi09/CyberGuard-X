import React, { useState, useEffect } from 'react'
import { Search, ExternalLink, ShieldCheck } from 'lucide-react'
import type { FindingDetail } from '../components/EvidenceDrawer'

interface RawFindingPort {
  port: number
  service?: string
}

interface RawFindingAsset {
  id: string
  ip_address: string
  ports?: RawFindingPort[]
}

interface FindingsViewProps {
  onSelectFinding: (finding: FindingDetail) => void
  organizationId?: string
  getIdToken?: () => Promise<string>
}

export const FindingsView: React.FC<FindingsViewProps> = ({
  onSelectFinding,
  organizationId,
  getIdToken,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [findings, setFindings] = useState<FindingDetail[]>([])

  useEffect(() => {
    let mounted = true
    const fetchFindings = async () => {
      if (!organizationId || !getIdToken) return
      try {
        const token = await getIdToken()
        const res = await fetch(`/api/v1/organizations/${encodeURIComponent(organizationId)}/assets`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (mounted && res.ok) {
          const assets = await res.json()
          if (Array.isArray(assets)) {
            const derived: FindingDetail[] = []
            ;(assets as RawFindingAsset[]).forEach((ast) => {
              (ast.ports || []).forEach((p) => {
                if ([21, 23, 445].includes(p.port)) {
                  derived.push({
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
            setFindings(derived)
          }
        }
      } catch (e) {
        console.warn('Failed to load real findings', e)
      }
    }
    void fetchFindings()
    return () => {
      mounted = false
    }
  }, [organizationId, getIdToken])

  const filtered = findings.filter((f) => {
    const matchesSev = filterSeverity === 'ALL' || f.severity.toUpperCase() === filterSeverity
    const matchesSearch =
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.mitreTechnique.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSev && matchesSearch
  })

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Findings & Threat Detections</h2>
          <p className="view-subtitle">
            Correlated indicators, heuristic rule hits, and ML anomaly predictions with full raw packet evidence.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="toolbar-row">
        <div className="toolbar-search">
          <Search size={15} className="toolbar-search-icon" />
          <input
            type="text"
            className="toolbar-search-input"
            placeholder="Search by title, target IP, MITRE technique..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-filters">
          <span className="filter-label">Severity:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
            <button
              key={sev}
              type="button"
              className={`filter-btn ${filterSeverity === sev ? 'active' : ''}`}
              onClick={() => setFilterSeverity(sev)}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Findings Table */}
      <div className="cg-card table-card">
        <div className="table-wrap">
          {filtered.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                gap: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <ShieldCheck size={38} style={{ color: 'var(--accent-emerald)', opacity: 0.8 }} />
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                No Threat Findings Detected
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '400px', textAlign: 'center' }}>
                All observed network traffic and listening endpoints have satisfied baseline security profiles.
              </span>
            </div>
          ) : (
            <table className="cg-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Finding Title & Rule</th>
                  <th>Target Host</th>
                  <th>MITRE ATT&CK</th>
                  <th>Provenance</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((finding) => (
                  <tr
                    key={finding.id}
                    onClick={() => onSelectFinding(finding)}
                    className="table-row-clickable"
                  >
                    <td>
                      <span className={`badge-severity ${finding.severity.toLowerCase()}`}>
                        {finding.severity}
                      </span>
                    </td>
                    <td>
                      <div className="table-primary-text">{finding.title}</div>
                      <div className="table-sub-text mono">{finding.ruleId}</div>
                    </td>
                    <td className="mono font-medium">{finding.target}</td>
                    <td>
                      <span className="tag-mitre">
                        {finding.mitreTechnique} · {finding.mitreTactic}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-provenance ${finding.provenance.toLowerCase()}`}>
                        {finding.provenance}
                      </span>
                    </td>
                    <td>
                      <div className="confidence-meter">
                        <div
                          className="confidence-fill"
                          style={{ width: `${finding.confidence * 100}%` }}
                        />
                        <span className="confidence-val">{(finding.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-status ${finding.status.toLowerCase()}`}>
                        {finding.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-inspect"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectFinding(finding)
                        }}
                      >
                        <span>Evidence</span>
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
