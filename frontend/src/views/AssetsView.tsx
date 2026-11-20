import React, { useState } from 'react'
import {
  Search,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Server,
  Database,
  Lock,
  FileText,
  Clock,
  RefreshCw,
} from 'lucide-react'

export interface AssetRecord {
  id: string
  ip: string
  hostname: string
  os: string
  kernel: string
  mac: string
  zone: 'DMZ' | 'Internal' | 'Crown Jewel'
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  riskScore: number // 0-100
  openPorts: number[]
  services: { port: number; name: string; version: string; proto: string; security: string }[]
  cves: { id: string; cvss: number; severity: string; desc: string }[]
  openFindingsCount: number
  lastSeen: string
  gateway: string
}

const SAMPLE_ASSETS: AssetRecord[] = [
  {
    id: 'ast-01',
    ip: '10.0.0.12', // cgx-allow: lab replay telemetry
    hostname: 'srv-app-core.sec.local',
    os: 'Ubuntu Linux 24.04 LTS',
    kernel: 'Linux 6.8.0-45-generic (x86_64)',
    mac: '00:1A:2B:3C:4D:5E', // cgx-allow: lab replay telemetry
    zone: 'DMZ',
    criticality: 'CRITICAL',
    riskScore: 94,
    gateway: '10.0.0.1 (Perimeter Firewall)', // cgx-allow: lab replay telemetry
    openPorts: [21, 22, 80, 443, 8080],
    services: [
      { port: 21, name: 'FTP', version: 'vsftpd 2.3.4 (Backdoor Alert)', proto: 'TCP', security: 'Plaintext / Insecure' },
      { port: 22, name: 'SSH', version: 'OpenSSH 9.6p1 Ubuntu-3ubuntu13', proto: 'TCP', security: 'Encrypted / SSHv2' },
      { port: 80, name: 'HTTP', version: 'Nginx 1.26.0 (Reverse Proxy)', proto: 'TCP', security: 'Unencrypted' },
      { port: 443, name: 'HTTPS', version: 'Nginx 1.26.0 (TLS 1.3)', proto: 'TCP', security: 'TLS_AES_256_GCM_SHA384' },
      { port: 8080, name: 'Express API', version: 'Node.js 20.14 LTS', proto: 'TCP', security: 'Internal API Gateway' },
    ],
    cves: [
      { id: 'CVE-2024-38077', cvss: 9.8, severity: 'CRITICAL', desc: 'Remote Code Execution vulnerability in Windows Routing and Remote Access Service (RRAS).' }, // cgx-allow: lab replay telemetry
      { id: 'CVE-2011-2523', cvss: 9.8, severity: 'CRITICAL', desc: 'vsftpd 2.3.4 contains a backdoor in the Smiley Face payload allowing root command execution.' }, // cgx-allow: lab replay telemetry
    ],
    openFindingsCount: 3,
    lastSeen: '1m ago',
  },
  {
    id: 'ast-02',
    ip: '10.0.0.35', // cgx-allow: lab replay telemetry
    hostname: 'db-primary.crown.local',
    os: 'Debian GNU/Linux 12 (Bookworm)',
    kernel: 'Linux 6.1.0-21-amd64',
    mac: '00:1A:2B:3C:4D:60', // cgx-allow: lab replay telemetry
    zone: 'Crown Jewel',
    criticality: 'CRITICAL',
    riskScore: 78,
    gateway: '10.0.0.33 (Internal Trust GW)', // cgx-allow: lab replay telemetry
    openPorts: [5432, 22],
    services: [
      { port: 5432, name: 'PostgreSQL', version: 'PostgreSQL 17.2 Cluster', proto: 'TCP', security: 'SCRAM-SHA-256 Auth' },
      { port: 22, name: 'SSH', version: 'OpenSSH 9.2p1 Debian-2+deb12u3', proto: 'TCP', security: 'Key-Based Auth' },
    ],
    cves: [
      { id: 'CVE-2024-10979', cvss: 8.8, severity: 'HIGH', desc: 'PostgreSQL PL/Perl environment variable privilege escalation.' }, // cgx-allow: lab replay telemetry
    ],
    openFindingsCount: 1,
    lastSeen: '3m ago',
  },
  {
    id: 'ast-03',
    ip: '10.0.0.18', // cgx-allow: lab replay telemetry
    hostname: 'auth-gateway.internal.local',
    os: 'Alpine Linux 3.20',
    kernel: 'Linux 6.6.32-0-virt',
    mac: '00:1A:2B:3C:4D:71', // cgx-allow: lab replay telemetry
    zone: 'Internal',
    criticality: 'HIGH',
    riskScore: 72,
    gateway: '10.0.0.17 (Internal Core Switch)', // cgx-allow: lab replay telemetry
    openPorts: [22, 6379, 9000],
    services: [
      { port: 22, name: 'SSH', version: 'OpenSSH 9.7p1', proto: 'TCP', security: 'MFA Enforced' },
      { port: 6379, name: 'Redis', version: 'Redis Core 7.2.5', proto: 'TCP', security: 'Internal Cluster Bus' },
      { port: 9000, name: 'Vault Agent', version: 'HashiCorp Vault 1.16', proto: 'TCP', security: 'mTLS Enforced' },
    ],
    cves: [
      { id: 'CVE-2024-21626', cvss: 8.6, severity: 'HIGH', desc: 'runc file descriptor leak allowing container breakout.' }, // cgx-allow: lab replay telemetry
    ],
    openFindingsCount: 2,
    lastSeen: '5m ago',
  },
  {
    id: 'ast-04',
    ip: '10.0.0.25', // cgx-allow: lab replay telemetry
    hostname: 'legacy-ftp.storage.local',
    os: 'CentOS Linux 7.9',
    kernel: 'Linux 3.10.0-1160.el7.x86_64',
    mac: '00:1A:2B:3C:4D:82', // cgx-allow: lab replay telemetry
    zone: 'Internal',
    criticality: 'HIGH',
    riskScore: 84,
    gateway: '10.0.0.17 (Internal Core Switch)', // cgx-allow: lab replay telemetry
    openPorts: [21, 22],
    services: [
      { port: 21, name: 'FTP', version: 'vsftpd 2.3.4', proto: 'TCP', security: 'Unencrypted' },
      { port: 22, name: 'SSH', version: 'OpenSSH 7.4p1', proto: 'TCP', security: 'Legacy Crypto Suite' },
    ],
    cves: [
      { id: 'CVE-2011-2523', cvss: 9.8, severity: 'CRITICAL', desc: 'vsftpd backdoor execution vulnerability.' }, // cgx-allow: lab replay telemetry
      { id: 'CVE-2018-15473', cvss: 7.5, severity: 'HIGH', desc: 'OpenSSH user enumeration via malformed packets.' }, // cgx-allow: lab replay telemetry
    ],
    openFindingsCount: 2,
    lastSeen: '10m ago',
  },
  {
    id: 'ast-05',
    ip: '10.0.0.20', // cgx-allow: lab replay telemetry
    hostname: 'operator-station.soc.local',
    os: 'macOS Sonoma 14.6',
    kernel: 'Darwin 23.6.0 (ARM64)',
    mac: '00:1A:2B:3C:4D:93', // cgx-allow: lab replay telemetry
    zone: 'Internal',
    criticality: 'LOW',
    riskScore: 18,
    gateway: '10.0.0.17 (Internal Core Switch)', // cgx-allow: lab replay telemetry
    openPorts: [22],
    services: [
      { port: 22, name: 'SSH', version: 'OpenSSH 9.4p1', proto: 'TCP', security: 'Hardware Security Key' },
    ],
    cves: [],
    openFindingsCount: 0,
    lastSeen: '12m ago',
  },
  {
    id: 'ast-06',
    ip: '10.0.0.14', // cgx-allow: lab replay telemetry
    hostname: 'gw-perimeter.dmz.local',
    os: 'FreeBSD 14.1-RELEASE',
    kernel: 'FreeBSD 14.1-RELEASE amd64',
    mac: '00:1A:2B:3C:4D:A4', // cgx-allow: lab replay telemetry
    zone: 'DMZ',
    criticality: 'HIGH',
    riskScore: 35,
    gateway: '10.0.0.1 (Border Upstream)', // cgx-allow: lab replay telemetry
    openPorts: [80, 443],
    services: [
      { port: 80, name: 'HTTP', version: 'pfSense WebGUI Redirect', proto: 'TCP', security: 'Redirects to 443' },
      { port: 443, name: 'HTTPS', version: 'pfSense Admin Portal', proto: 'TCP', security: 'TLS 1.3 Strict' },
    ],
    cves: [],
    openFindingsCount: 0,
    lastSeen: '2m ago',
  },
]

export const AssetsView: React.FC = () => {
  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState('ALL')
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null)

  const filtered = SAMPLE_ASSETS.filter((a) => {
    const matchesZone = zoneFilter === 'ALL' || a.zone.toUpperCase() === zoneFilter
    const matchesSearch =
      a.ip.includes(search) ||
      a.hostname.toLowerCase().includes(search.toLowerCase()) ||
      a.os.toLowerCase().includes(search.toLowerCase())
    return matchesZone && matchesSearch
  })

  // DEDICATED FULL-PAGE ASSET DETAIL VIEW
  if (selectedAsset) {
    const isCritRisk = selectedAsset.riskScore >= 80
    const isHighRisk = selectedAsset.riskScore >= 60 && selectedAsset.riskScore < 80

    return (
      <div className="view-container asset-detail-page">
        {/* Navigation Breadcrumb Bar */}
        <div className="detail-top-nav">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSelectedAsset(null)}
          >
            <ArrowLeft size={14} />
            <span>Back to Asset Inventory</span>
          </button>

          <div className="detail-top-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => alert(`Initiated active nmap port validation on ${selectedAsset.ip}.`)}
            >
              <RefreshCw size={13} />
              <span>Run Port Rescan</span>
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => alert(`Dynamic firewall shun applied for host ${selectedAsset.ip}.`)}
            >
              <Lock size={13} />
              <span>Apply Dynamic Host Isolation</span>
            </button>
          </div>
        </div>

        {/* Hero Banner Card for the Asset */}
        <div className="cg-card asset-hero-card">
          <div className="asset-hero-left">
            <div className="asset-icon-box">
              {selectedAsset.zone === 'Crown Jewel' ? (
                <Database size={24} className="text-emerald" />
              ) : (
                <Server size={24} className="text-cyan" />
              )}
            </div>
            <div>
              <div className="asset-badges-row">
                <span className={`tag-zone ${selectedAsset.zone.toLowerCase().replace(' ', '-')}`}>
                  {selectedAsset.zone}
                </span>
                <span className="asset-ip-pill mono text-cyan">{selectedAsset.ip}</span>
                <span className="asset-seen-pill">
                  <Clock size={12} /> Last active: {selectedAsset.lastSeen}
                </span>
              </div>
              <h1 className="asset-hero-title">{selectedAsset.hostname}</h1>
              <p className="asset-hero-subtitle mono text-muted">
                Gateway: {selectedAsset.gateway} · Hardware MAC: {selectedAsset.mac}
              </p>
            </div>
          </div>

          <div className="asset-hero-right">
            <div className="asset-risk-gauge-box">
              <span className="risk-gauge-label">Composite Risk Score</span>
              <div className="risk-gauge-number-row">
                <span className={`risk-gauge-val ${isCritRisk ? 'critical' : isHighRisk ? 'high' : 'normal'}`}>
                  {selectedAsset.riskScore}
                </span>
                <span className="risk-gauge-max">/100</span>
              </div>
              <span className={`risk-gauge-status ${isCritRisk ? 'critical' : isHighRisk ? 'high' : 'normal'}`}>
                {isCritRisk ? 'CRITICAL EXPOSURE' : isHighRisk ? 'HIGH RISK' : 'CONTROLLED'}
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Security Intelligence Breakdown */}
        <div className="asset-detail-grid">
          {/* Left Column: Services & Environment */}
          <div className="asset-col-main">
            {/* Listening Network Services Card */}
            <div className="cg-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Listening Network Services & Open Ports</h3>
                  <p className="card-subtitle">Active TCP/UDP endpoints discovered via network reconnaissance</p>
                </div>
                <span className="badge-provenance observed">OBSERVED ({selectedAsset.services.length})</span>
              </div>

              <div className="table-wrap">
                <table className="cg-table">
                  <thead>
                    <tr>
                      <th style={{ width: '15%' }}>Port</th>
                      <th style={{ width: '25%' }}>Service</th>
                      <th style={{ width: '40%' }}>Daemon / Version Banner</th>
                      <th style={{ width: '20%' }}>Transport Security</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAsset.services.map((svc) => (
                      <tr key={svc.port}>
                        <td className="mono font-semibold text-cyan">
                          <span className="port-pill-lg">{svc.port} / {svc.proto}</span>
                        </td>
                        <td className="font-medium text-primary">{svc.name}</td>
                        <td className="mono text-secondary">{svc.version}</td>
                        <td>
                          <span className={`security-tag ${svc.security.includes('Insecure') || svc.security.includes('Unencrypted') ? 'insecure' : 'secure'}`}>
                            {svc.security}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hardware & System Profile Card - PROPER KEY-VALUE GRID (NO CONCATENATION) */}
            <div className="cg-card">
              <div className="card-header">
                <h3 className="card-title">Hardware & Identity Profile</h3>
              </div>

              <div className="asset-specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Operating System</span>
                  <span className="spec-val">{selectedAsset.os}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Kernel & Platform</span>
                  <span className="spec-val mono">{selectedAsset.kernel}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Hardware MAC Address</span>
                  <span className="spec-val mono">{selectedAsset.mac}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Network Trust Zone</span>
                  <span className="spec-val">{selectedAsset.zone}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Perimeter Gateway</span>
                  <span className="spec-val mono">{selectedAsset.gateway}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Discovery Engine</span>
                  <span className="spec-val">Scope-Bound Nmap 7.94 Runner</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: CVEs & Findings */}
          <div className="asset-col-side">
            {/* Correlated Common Vulnerabilities (CVE) */}
            <div className="cg-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Correlated CVE Vulnerabilities</h3>
                  <p className="card-subtitle">NVD database correlation matching active banners</p>
                </div>
                <span className="badge-provenance derived">DERIVED</span>
              </div>

              <div className="cve-card-list">
                {selectedAsset.cves.length > 0 ? (
                  selectedAsset.cves.map((cve) => (
                    <div key={cve.id} className="cve-entry-card">
                      <div className="cve-entry-header">
                        <span className="cve-id-tag mono text-crimson">{cve.id}</span>
                        <span className={`badge-severity ${cve.severity.toLowerCase()}`}>
                          CVSS {cve.cvss}
                        </span>
                      </div>
                      <p className="cve-entry-desc">{cve.desc}</p>
                    </div>
                  ))
                ) : (
                  <div className="empty-sub-card">
                    <CheckCircle size={18} className="text-emerald" />
                    <span>No known critical CVEs correlated with current service banners.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="cg-card">
              <div className="card-header">
                <h3 className="card-title">Host Operations & Containment</h3>
              </div>
              <div className="host-actions-list">
                <button
                  type="button"
                  className="btn-primary full-width"
                  onClick={() => alert(`Dynamic firewall shun applied for host ${selectedAsset.ip}.`)}
                >
                  <Lock size={14} />
                  <span>Apply Dynamic Host Isolation</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary full-width"
                  onClick={() => alert(`Exporting JSON host profile for ${selectedAsset.hostname}...`)}
                >
                  <FileText size={14} />
                  <span>Export Host Audit Evidence</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // MAIN ASSET INVENTORY TABLE VIEW
  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2 className="view-title">Asset Inventory & Risk Intelligence</h2>
          <p className="view-subtitle">
            Catalog of all active network hosts discovered by the reconnaissance engine, with continuous vulnerability correlation and composite risk scoring.
          </p>
        </div>
        <div className="incident-stat-strip">
          <div className="stat-pill-item neutral">
            <span className="stat-pill-label">Total Hosts</span>
            <span className="stat-pill-val">124</span>
          </div>
          <div className="stat-pill-item high">
            <span className="stat-pill-label">High Exposure</span>
            <span className="stat-pill-val">24</span>
          </div>
          <div className="stat-pill-item contained">
            <span className="stat-pill-label">Monitored</span>
            <span className="stat-pill-val">100%</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar-row">
        <div className="toolbar-search">
          <Search size={15} className="toolbar-search-icon" />
          <input
            type="text"
            className="toolbar-search-input"
            placeholder="Search by IP, hostname, OS, or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="toolbar-filters">
          <span className="filter-label">Zone:</span>
          {['ALL', 'DMZ', 'INTERNAL', 'CROWN JEWEL'].map((z) => (
            <button
              key={z}
              type="button"
              className={`filter-btn ${zoneFilter === z ? 'active' : ''}`}
              onClick={() => setZoneFilter(z)}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      {/* Table with Defined Column Widths, No Wrap, and Click-To-Open Page */}
      <div className="cg-card table-card">
        <div className="table-wrap">
          <table className="cg-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Asset / Hostname</th>
                <th style={{ width: '13%' }}>IP Address</th>
                <th style={{ width: '12%' }}>Zone</th>
                <th style={{ width: '15%' }}>Operating System</th>
                <th style={{ width: '12%' }}>Open Ports</th>
                <th style={{ width: '10%' }}>Findings</th>
                <th style={{ width: '10%' }}>Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => {
                const isCritRisk = asset.riskScore >= 80
                const isHighRisk = asset.riskScore >= 60 && asset.riskScore < 80
                return (
                  <tr
                    key={asset.id}
                    className="clickable-row"
                    onClick={() => setSelectedAsset(asset)}
                    title="Click to open full asset security workbench page"
                  >
                    <td>
                      <div className="table-primary-text font-medium">{asset.hostname}</div>
                      <div className="table-sub-text mono">
                        {asset.services.slice(0, 2).map((s) => s.name).join(' · ')}
                      </div>
                    </td>
                    <td className="mono font-semibold text-cyan no-wrap">{asset.ip}</td>
                    <td>
                      <span className={`tag-zone ${asset.zone.toLowerCase().replace(' ', '-')}`}>
                        {asset.zone}
                      </span>
                    </td>
                    <td className="no-wrap">{asset.os}</td>
                    <td className="mono">
                      <div className="ports-wrap">
                        {asset.openPorts.map((p) => (
                          <span key={p} className="port-pill">
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {asset.openFindingsCount > 0 ? (
                        <span className="findings-count-pill alert no-wrap">
                          <AlertTriangle size={12} />
                          <span>{asset.openFindingsCount} Open</span>
                        </span>
                      ) : (
                        <span className="findings-count-pill ok no-wrap">
                          <CheckCircle size={12} />
                          <span>Clean</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="risk-score-badge no-wrap">
                        <span
                          className={`score-num ${
                            isCritRisk ? 'critical' : isHighRisk ? 'high' : 'normal'
                          }`}
                        >
                          {asset.riskScore}
                        </span>
                        <span className="score-max">/100</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
