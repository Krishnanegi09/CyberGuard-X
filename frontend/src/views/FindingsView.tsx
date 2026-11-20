import React, { useState } from 'react'
import { Search, Filter, ExternalLink } from 'lucide-react'
import type { FindingDetail } from '../components/EvidenceDrawer'

interface FindingsViewProps {
  onSelectFinding: (finding: FindingDetail) => void
}

const ALL_FINDINGS: FindingDetail[] = [
  {
    id: 'find-01',
    title: 'Port scan (vertical)',
    severity: 'Critical',
    ruleId: 'RULE_PORT_SCAN_VERTICAL',
    mitreTechnique: 'T1046',
    mitreTactic: 'Discovery',
    target: '10.0.0.12', // cgx-allow: lab replay telemetry
    destinationPort: 'Multiple (50+)',
    confidence: 0.96,
    provenance: 'OBSERVED',
    status: 'OPEN',
    description: 'Single external source initiated rapid SYN probes hitting 58 distinct ports within a 4.2-second window on core application server 10.0.0.12.', // cgx-allow: lab replay telemetry
    evidenceLogs: [
      { timestamp: '14:20:11.204', srcIp: '192.168.1.105', dstIp: '10.0.0.12', srcPort: 54101, dstPort: 21, proto: 'TCP', packets: 1, bytes: 60, flags: 'SYN' }, // cgx-allow: lab replay telemetry
      { timestamp: '14:20:11.248', srcIp: '192.168.1.105', dstIp: '10.0.0.12', srcPort: 54102, dstPort: 22, proto: 'TCP', packets: 1, bytes: 60, flags: 'SYN' }, // cgx-allow: lab replay telemetry
    ],
  },
  {
    id: 'find-02',
    title: 'Brute force (SSH)',
    severity: 'High',
    ruleId: 'RULE_BRUTE_FORCE_AUTH',
    mitreTechnique: 'T1110',
    mitreTactic: 'Credential Access',
    target: '10.0.0.18', // cgx-allow: lab replay telemetry
    destinationPort: 22,
    confidence: 0.91,
    provenance: 'OBSERVED',
    status: 'INVESTIGATING',
    description: 'High-frequency authentication stream detected on port 22 (SSH). Exceeded baseline threshold with 34 failed authentication exchanges within 60s.',
    evidenceLogs: [
      { timestamp: '14:18:02.110', srcIp: '192.168.1.188', dstIp: '10.0.0.18', srcPort: 48920, dstPort: 22, proto: 'TCP', packets: 8, bytes: 1240, flags: 'PSH,ACK' }, // cgx-allow: lab replay telemetry
    ],
  },
  {
    id: 'find-03',
    title: 'Risky exposed service (FTP vsftpd 2.3.4)',
    severity: 'High',
    ruleId: 'RULE_RISKY_SERVICE',
    mitreTechnique: 'T1133',
    mitreTactic: 'Initial Access',
    target: '10.0.0.25 (FTP)', // cgx-allow: lab replay telemetry
    destinationPort: 21,
    confidence: 0.88,
    provenance: 'DERIVED',
    status: 'OPEN',
    description: 'Unencrypted File Transfer Protocol (FTP, vsftpd 2.3.4) detected open on internal host 10.0.0.25 communicating across DMZ zone boundary.', // cgx-allow: lab replay telemetry
    evidenceLogs: [
      { timestamp: '14:15:22.000', srcIp: '10.0.0.25', dstIp: '0.0.0.0', srcPort: 21, dstPort: 0, proto: 'TCP', packets: 1, bytes: 48, flags: 'LISTEN' }, // cgx-allow: lab replay telemetry
    ],
  },
  {
    id: 'find-04',
    title: 'Anomalous Lateral C2 Beaconing',
    severity: 'High',
    ruleId: 'ML_BEACON_DETECTION',
    mitreTechnique: 'T1071',
    mitreTactic: 'Command & Control',
    target: '10.0.0.56', // cgx-allow: lab replay telemetry
    destinationPort: 8443,
    confidence: 0.89,
    provenance: 'PREDICTED',
    status: 'CONFIRMED',
    description: 'Supervised Random Forest flow classifier identified periodic low-jitter heartbeat connections to an unauthorized external IP.',
    evidenceLogs: [
      { timestamp: '14:10:00.000', srcIp: '10.0.0.56', dstIp: '198.51.100.22', srcPort: 51230, dstPort: 8443, proto: 'TCP', packets: 4, bytes: 320, flags: 'ACK' }, // cgx-allow: lab replay telemetry
    ],
  },
  {
    id: 'find-05',
    title: 'Host Sweep Probing (Subnet Scan)',
    severity: 'Medium',
    ruleId: 'RULE_HOST_SWEEP',
    mitreTechnique: 'T1046',
    mitreTactic: 'Discovery',
    target: '10.0.0.0/24', // cgx-allow: lab replay telemetry
    destinationPort: 'ICMP / 80',
    confidence: 0.84,
    provenance: 'OBSERVED',
    status: 'OPEN',
    description: 'Single source probed 24 unique host IP addresses within a 60-second window.',
    evidenceLogs: [
      { timestamp: '13:58:12.000', srcIp: '192.168.1.105', dstIp: '10.0.0.1', srcPort: 0, dstPort: 0, proto: 'ICMP', packets: 1, bytes: 32 }, // cgx-allow: lab replay telemetry
    ],
  },
  {
    id: 'find-06',
    title: 'Potential CVE-2024-38077 (Windows RLS RCE)', // cgx-allow: lab replay telemetry
    severity: 'Critical',
    ruleId: 'VULN_CPE_MATCH',
    mitreTechnique: 'T1190',
    mitreTactic: 'Exploit Public-Facing App',
    target: '10.0.0.30 (MS-RPC 135)', // cgx-allow: lab replay telemetry
    destinationPort: 135,
    confidence: 0.92,
    provenance: 'DERIVED',
    status: 'OPEN',
    description: 'Local NVD correlation matched Windows Remote Procedure Call (RPC) banner against CVE-2024-38077 with CVSS base score 9.8.', // cgx-allow: lab replay telemetry
    evidenceLogs: [
      { timestamp: '13:45:00.000', srcIp: '10.0.0.30', dstIp: '0.0.0.0', srcPort: 135, dstPort: 0, proto: 'TCP', packets: 1, bytes: 64, flags: 'LISTEN' }, // cgx-allow: lab replay telemetry
    ],
  },
]

export const FindingsView: React.FC<FindingsViewProps> = ({ onSelectFinding }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = ALL_FINDINGS.filter((f) => {
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
            placeholder="Filter findings by title, target IP, or MITRE technique..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-filters">
          <span className="filter-label"><Filter size={13} /> Severity:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
            <button
              key={s}
              type="button"
              className={`filter-btn ${filterSeverity === s ? 'active' : ''}`}
              onClick={() => setFilterSeverity(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Findings Table */}
      <div className="cg-card table-card">
        <div className="table-wrap">
          <table className="cg-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Finding Title</th>
                <th>Target Asset</th>
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
        </div>
      </div>
    </div>
  )
}
