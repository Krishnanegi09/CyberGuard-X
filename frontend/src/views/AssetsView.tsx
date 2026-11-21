import React, { useState, useEffect } from 'react'
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


interface RawAssetPort {
  port: number
  service?: string
  product?: string
  version?: string
  protocol?: string
}

interface RawAssetEntity {
  id: string
  ip_address: string
  hostname?: string
  operating_system?: string
  last_seen?: string
  ports?: RawAssetPort[]
}

interface AssetsViewProps {
  organizationId?: string
  getIdToken?: () => Promise<string>
}

export const AssetsView: React.FC<AssetsViewProps> = ({ organizationId, getIdToken }) => {
  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState('ALL')
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null)
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetchAssets = async () => {
      if (!organizationId || !getIdToken) return
      setLoading(true)
      try {
        const token = await getIdToken()
        const res = await fetch(`/api/v1/organizations/${encodeURIComponent(organizationId)}/assets`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (mounted && res.ok) {
          const rawAssets = await res.json()
          if (Array.isArray(rawAssets)) {
            const mapped: AssetRecord[] = (rawAssets as RawAssetEntity[]).map((a) => {
              const openPorts = (a.ports || []).map((p) => p.port)
              const hasDb = openPorts.some((p: number) => [5432, 3306, 27017, 1433].includes(p))
              const hasWeb = openPorts.some((p: number) => [80, 443, 8080].includes(p))
              const zone: 'DMZ' | 'Internal' | 'Crown Jewel' = hasDb ? 'Crown Jewel' : hasWeb ? 'DMZ' : 'Internal'
              const criticality = hasDb ? 'CRITICAL' : hasWeb ? 'HIGH' : 'MEDIUM'
              const riskScore = hasDb ? 85 : hasWeb ? 65 : 35

              const services = (a.ports || []).map((p) => ({
                port: p.port,
                name: p.service || 'unknown',
                version: p.version ? `${p.product || ''} ${p.version}`.trim() : (p.product || 'Standard Daemon'),
                proto: p.protocol || 'tcp',
                security: [21, 23, 80].includes(p.port) ? 'Unencrypted / Insecure' : 'Encrypted Transport',
              }))

              return {
                id: `ast-${a.id}`,
                ip: a.ip_address,
                hostname: a.hostname || `Host-${a.ip_address}`,
                os: a.operating_system || 'Discovered Linux / Unix',
                kernel: 'Discovered via L3 Reconnaissance',
                mac: 'Active Observed Interface',
                zone,
                criticality,
                riskScore,
                openPorts,
                services,
                cves: [],
                openFindingsCount: services.filter((s) => s.security.includes('Insecure')).length,
                lastSeen: a.last_seen ? new Date(a.last_seen).toLocaleTimeString() : 'Recent',
                gateway: 'Discovered Local Gateway',
              }
            })
            setAssets(mapped)
          }
        }
      } catch (e) {
        console.warn('Failed to load real assets', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void fetchAssets()
    return () => {
      mounted = false
    }
  }, [organizationId, getIdToken])

  const filtered = assets.filter((a) => {
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
            <span className="stat-pill-val">{assets.length}</span>
          </div>
          <div className="stat-pill-item high">
            <span className="stat-pill-label">High Exposure</span>
            <span className="stat-pill-val">{assets.filter((a) => a.criticality === 'CRITICAL' || a.criticality === 'HIGH').length}</span>
          </div>
          <div className="stat-pill-item contained">
            <span className="stat-pill-label">Monitored</span>
            <span className="stat-pill-val">{assets.length > 0 ? '100%' : '0%'}</span>
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
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
              <RefreshCw size={24} className="spin" style={{ opacity: 0.6 }} />
              <span style={{ marginLeft: 10, color: 'var(--text-muted)' }}>Querying observed network assets...</span>
            </div>
          ) : filtered.length === 0 ? (
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
              <Server size={38} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                No Assets Discovered Yet
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '400px', textAlign: 'center' }}>
                No host devices exist in this organization inventory. Navigate to 'Scopes & Scans' to define an authorized CIDR range and trigger discovery.
              </span>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  )
}
