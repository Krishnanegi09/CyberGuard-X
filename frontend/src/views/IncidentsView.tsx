import React, { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  User,
  Search,
  ExternalLink,
  X,
  Lock,
} from 'lucide-react'

export interface IncidentItem {
  id: string
  title: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED'
  affectedAsset: string
  ip: string
  leadAnalyst: string
  openedAt: string
  summary: string
  mitreTechniques: string[]
  timeline: { time: string; event: string; user?: string }[]
}

const SAMPLE_INCIDENTS: IncidentItem[] = [
  {
    id: 'INC-2026-081',
    title: 'Multi-Stage Reconnaissance & Lateral Access Attempt',
    severity: 'CRITICAL',
    status: 'INVESTIGATING',
    affectedAsset: 'Core App Server',
    ip: '10.0.0.12', // cgx-allow: lab replay telemetry
    leadAnalyst: 'operator@soc.alpha',
    openedAt: '14:20 Today',
    summary:
      'Correlated event combining vertical port scan T1046, brute-force SSH authentication T1110, and suspicious outbound connection to an untrusted external IP.',
    mitreTechniques: ['T1046', 'T1110', 'T1071'],
    timeline: [
      { time: '14:20:11', event: 'SYN flood & 50+ port probes from 192.168.1.105', user: 'NIDS Sensor 01' }, // cgx-allow: lab replay telemetry
      { time: '14:21:45', event: 'Failed SSH login threshold exceeded (34 attempts)', user: 'Auth Guard' },
      { time: '14:22:10', event: 'Incident auto-created with severity CRITICAL', user: 'Correlation Engine' },
      { time: '14:24:00', event: 'Investigation assigned to operator@soc.alpha', user: 'SOC Dispatch' },
    ],
  },
  {
    id: 'INC-2026-079',
    title: 'Unauthorized C2 Beaconing Channel (Port 8443)',
    severity: 'HIGH',
    status: 'CONTAINED',
    affectedAsset: 'Internal Host',
    ip: '10.0.0.56', // cgx-allow: lab replay telemetry
    leadAnalyst: 'responder@soc.alpha',
    openedAt: '12:45 Today',
    summary:
      'Isolation Forest anomaly detection triggered on low-jitter periodic HTTPS beacons. Automated firewall shun applied (TTL 15m).',
    mitreTechniques: ['T1071.001', 'T1573'],
    timeline: [
      { time: '12:45:00', event: 'Periodic 60s jitter-free outbound HTTPS beacons flagged', user: 'ML Anomaly Engine' },
      { time: '12:46:12', event: 'Dynamic packet-filter shun rule applied (10.0.0.56 -> C2)', user: 'Automated Defense' }, // cgx-allow: lab replay telemetry
      { time: '12:47:00', event: 'Status changed to CONTAINED', user: 'responder@soc.alpha' },
    ],
  },
  {
    id: 'INC-2026-074',
    title: 'Exposed Legacy FTP Vulnerability Exposure',
    severity: 'HIGH',
    status: 'RESOLVED',
    affectedAsset: 'Legacy Storage Server',
    ip: '10.0.0.25', // cgx-allow: lab replay telemetry
    leadAnalyst: 'admin@soc.alpha',
    openedAt: 'Yesterday 18:30',
    summary: 'Port 21 isolated via pf rule. Service migrated to SFTP.',
    mitreTechniques: ['T1133'],
    timeline: [
      { time: '18:30:10', event: 'Vulnerability scan detected vsftpd 2.3.4 (Backdoor PR)', user: 'Discovery Scanner' },
      { time: '18:35:00', event: 'Port 21 dropped in pf anchor rule', user: 'admin@soc.alpha' },
      { time: '19:10:00', event: 'Service validated and incident marked RESOLVED', user: 'admin@soc.alpha' },
    ],
  },
]

export const IncidentsView: React.FC = () => {
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED'>('ALL')
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null)

  const filtered = SAMPLE_INCIDENTS.filter((inc) => {
    const matchSev = severityFilter === 'ALL' || inc.severity === severityFilter
    const matchStat = statusFilter === 'ALL' || inc.status === statusFilter
    const matchQuery =
      inc.id.toLowerCase().includes(search.toLowerCase()) ||
      inc.title.toLowerCase().includes(search.toLowerCase()) ||
      inc.affectedAsset.toLowerCase().includes(search.toLowerCase()) ||
      inc.ip.includes(search)
    return matchSev && matchStat && matchQuery
  })

  return (
    <div className="view-container">
      {/* Header with Quick Stat Pills */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Security Incidents Queue</h2>
          <p className="view-subtitle">
            Escalated multi-indicator incidents requiring containment, formal investigation, and four-eyes defense authorization.
          </p>
        </div>
        <div className="incident-stat-strip">
          <div className="stat-pill-item critical">
            <span className="stat-pill-label">Critical</span>
            <span className="stat-pill-val">1</span>
          </div>
          <div className="stat-pill-item high">
            <span className="stat-pill-label">High</span>
            <span className="stat-pill-val">2</span>
          </div>
          <div className="stat-pill-item contained">
            <span className="stat-pill-label">Contained</span>
            <span className="stat-pill-val">1</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="toolbar-row">
        <div className="toolbar-search">
          <Search size={15} className="toolbar-search-icon" />
          <input
            type="text"
            className="toolbar-search-input"
            placeholder="Search by ID, title, target, or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="toolbar-filters">
          <div className="filter-pill-group">
            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                className={`filter-btn ${severityFilter === sev ? 'active' : ''}`}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="filter-divider" />

          <div className="filter-pill-group">
            {(['ALL', 'INVESTIGATING', 'CONTAINED', 'RESOLVED'] as const).map((stat) => (
              <button
                key={stat}
                type="button"
                className={`filter-btn ${statusFilter === stat ? 'active' : ''}`}
                onClick={() => setStatusFilter(stat)}
              >
                {stat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Incident List */}
      <div className="incident-queue-list">
        {filtered.map((inc) => (
            <div
              key={inc.id}
              className={`cg-card incident-card ${inc.severity.toLowerCase()} ${
                selectedIncident?.id === inc.id ? 'selected' : ''
              }`}
            >
              <div className="incident-card-top">
                <div className="incident-badge-row">
                  <span className={`badge-severity ${inc.severity.toLowerCase()}`}>
                    {inc.severity}
                  </span>
                  <span className="incident-id-tag mono">{inc.id}</span>
                  <span className="incident-time-tag">
                    <Clock size={12} /> {inc.openedAt}
                  </span>
                </div>

                <div className="incident-status-wrap">
                  <span className={`badge-status ${inc.status.toLowerCase()}`}>
                    <span className="status-dot" />
                    {inc.status}
                  </span>
                </div>
              </div>

              <div className="incident-card-middle">
                <h3 className="incident-title">{inc.title}</h3>
                <p className="incident-summary">{inc.summary}</p>

                {/* Structured Key-Value Metadata Grid - NO CONCATENATION */}
                <div className="incident-metadata-grid">
                  <div className="meta-field">
                    <span className="meta-label">Affected Target</span>
                    <span className="meta-value mono">
                      {inc.affectedAsset} <span className="meta-ip text-cyan">({inc.ip})</span>
                    </span>
                  </div>

                  <div className="meta-field">
                    <span className="meta-label">MITRE Tactics</span>
                    <div className="meta-tags-row">
                      {inc.mitreTechniques.map((t) => (
                        <span key={t} className="mitre-tag mono">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="meta-field">
                    <span className="meta-label">Lead Operator</span>
                    <span className="meta-value">
                      <User size={13} className="text-muted" /> {inc.leadAnalyst}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons with Proper Spacing */}
              <div className="incident-card-bottom">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedIncident(inc)}
                  title="View detailed audit timeline and raw sensor events"
                >
                  <Clock size={13} />
                  <span>View Full Audit Timeline</span>
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setSelectedIncident(inc)}
                  title="Open formal investigation workbench"
                >
                  <span>Investigate Incident</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
        ))}

        {filtered.length === 0 && (
          <div className="cg-card empty-state-card">
            <AlertTriangle size={24} className="text-muted" />
            <p className="empty-title">No incidents matching the current filter criteria</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearch('')
                setSeverityFilter('ALL')
                setStatusFilter('ALL')
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Incident Detail Drawer */}
      {selectedIncident && (
        <div className="incident-drawer-overlay" onClick={() => setSelectedIncident(null)}>
          <div className="incident-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <div className="drawer-badges">
                  <span className={`badge-severity ${selectedIncident.severity.toLowerCase()}`}>
                    {selectedIncident.severity}
                  </span>
                  <span className="incident-id-tag mono">{selectedIncident.id}</span>
                  <span className={`badge-status ${selectedIncident.status.toLowerCase()}`}>
                    {selectedIncident.status}
                  </span>
                </div>
                <h2 className="drawer-title">{selectedIncident.title}</h2>
              </div>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => setSelectedIncident(null)}
                aria-label="Close Drawer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-section">
                <h4 className="drawer-section-title">Incident Summary</h4>
                <p className="drawer-text">{selectedIncident.summary}</p>
              </div>

              <div className="drawer-section">
                <h4 className="drawer-section-title">Target & Attribution</h4>
                <div className="drawer-info-grid">
                  <div className="info-cell">
                    <span className="cell-label">HOST / ASSET</span>
                    <span className="cell-val mono">{selectedIncident.affectedAsset}</span>
                  </div>
                  <div className="info-cell">
                    <span className="cell-label">IP ADDRESS</span>
                    <span className="cell-val mono text-cyan">{selectedIncident.ip}</span>
                  </div>
                  <div className="info-cell">
                    <span className="cell-label">LEAD OPERATOR</span>
                    <span className="cell-val">{selectedIncident.leadAnalyst}</span>
                  </div>
                  <div className="info-cell">
                    <span className="cell-label">OPENED AT</span>
                    <span className="cell-val">{selectedIncident.openedAt}</span>
                  </div>
                </div>
              </div>

              <div className="drawer-section">
                <h4 className="drawer-section-title">Audit Timeline & Telemetry Events</h4>
                <div className="drawer-timeline">
                  {selectedIncident.timeline.map((item, idx) => (
                    <div key={idx} className="timeline-entry">
                      <div className="entry-point" />
                      <div className="entry-meta">
                        <span className="entry-time mono">{item.time}</span>
                        {item.user && <span className="entry-user">{item.user}</span>}
                      </div>
                      <div className="entry-desc">{item.event}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="drawer-section">
                <h4 className="drawer-section-title">Authorized Countermeasure Actions</h4>
                <div className="drawer-actions-row">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      alert(`Containment order issued for ${selectedIncident.ip}. Firewall shun active.`)
                      setSelectedIncident(null)
                    }}
                  >
                    <Lock size={13} />
                    <span>Apply Immediate Network Quarantine</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      alert(`Incident ${selectedIncident.id} assigned for formal audit report.`)
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Export Evidence Bundle</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
