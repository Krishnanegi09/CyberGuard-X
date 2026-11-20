import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Globe,
  CheckCircle2,
  Activity,
  PlusCircle,
  RefreshCw,
  Shield,
  Layers,
  Search,
  Play,
  Info,
  Check,
  AlertTriangle,
} from 'lucide-react'
import {
  BackendRequestError,
  createDiscoveryScan,
  createNetworkScope,
  getDiscoveryScans,
  getNetworkScopes,
  type DiscoveryProfile,
  type DiscoveryScan,
  type NetworkScope,
} from './services/backendAuth'
import './NetworkDiscovery.css'

interface NetworkDiscoveryProps {
  organizationId: string
  getIdToken: () => Promise<string>
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function statusLabel(status: DiscoveryScan['status']) {
  return status.toUpperCase()
}

export default function NetworkDiscovery({
  organizationId,
  getIdToken,
}: NetworkDiscoveryProps) {
  const [scopes, setScopes] = useState<NetworkScope[]>([])
  const [selectedScopeId, setSelectedScopeId] = useState('')
  const [scans, setScans] = useState<DiscoveryScan[]>([])
  const [totalScans, setTotalScans] = useState(0)

  const [loadingScopes, setLoadingScopes] = useState(true)
  const [loadingScans, setLoadingScans] = useState(false)
  const [creatingScope, setCreatingScope] = useState(false)
  const [startingScan, setStartingScan] = useState(false)

  const [scopeName, setScopeName] = useState('')
  const [scopeDescription, setScopeDescription] = useState('')
  const [scopeCidrs, setScopeCidrs] = useState('')

  const [targetCidr, setTargetCidr] = useState('')
  const [profile, setProfile] = useState<DiscoveryProfile>('host_discovery')

  const [scopeError, setScopeError] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const selectedScope = scopes.find((scope) => scope.id === selectedScopeId)
  const activeScopes = scopes.filter((scope) => scope.status === 'active')

  const loadScopes = useCallback(async () => {
    setLoadingScopes(true)
    setScopeError(null)

    try {
      const token = await getIdToken()
      const result = await getNetworkScopes(organizationId, token)
      setScopes(result)

      setSelectedScopeId((current) => {
        if (current && result.some((scope) => scope.id === current)) {
          return current
        }
        return result.find((scope) => scope.status === 'active')?.id ?? ''
      })

      setTargetCidr((current) => {
        const currentScope = result.find((scope) => scope.id === selectedScopeId)
        if (
          currentScope?.status === 'active' &&
          current &&
          currentScope.cidr_ranges.includes(current)
        ) {
          return current
        }
        const activeScope = result.find((scope) => scope.status === 'active')
        return activeScope?.cidr_ranges[0] ?? ''
      })
    } catch (error) {
      setScopeError(
        error instanceof BackendRequestError
          ? error.message
          : 'Unable to load network scopes.',
      )
    } finally {
      setLoadingScopes(false)
    }
  }, [organizationId, getIdToken, selectedScopeId])

  const loadScans = useCallback(
    async (scopeId: string) => {
      if (!scopeId) return
      setLoadingScans(true)

      try {
        const token = await getIdToken()
        const result = await getDiscoveryScans(organizationId, scopeId, token)
        setScans(result.items)
        setTotalScans(result.total)
        setScanError(null)
      } catch (error) {
        setScanError(
          error instanceof BackendRequestError
            ? error.message
            : 'Unable to load discovery history.',
        )
      } finally {
        setLoadingScans(false)
      }
    },
    [organizationId, getIdToken],
  )

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadScopes()
    }, 0)
    return () => window.clearTimeout(initialLoad)
  }, [loadScopes])

  useEffect(() => {
    if (!selectedScopeId) return
    const timer = window.setTimeout(() => {
      void loadScans(selectedScopeId)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [selectedScopeId, loadScans])

  // Periodic polling while any scan is queued or running (2s), and periodic sync (8s)
  useEffect(() => {
    if (!selectedScopeId) return
    const hasActiveScans = scans.some(
      (s) => s.status === 'queued' || s.status === 'running'
    )
    const intervalTime = hasActiveScans ? 2000 : 8000
    const interval = window.setInterval(() => {
      void loadScans(selectedScopeId)
    }, intervalTime)
    return () => window.clearInterval(interval)
  }, [selectedScopeId, scans, loadScans])

  const handleCreateScope = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = scopeName.trim()
    const cidrRanges = scopeCidrs
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(entry)) {
          return `${entry}/32`
        }
        return entry
      })

    if (!name) {
      setScopeError('Scope name is required.')
      return
    }

    if (cidrRanges.length === 0) {
      setScopeError('At least one CIDR range is required.')
      return
    }

    setCreatingScope(true)
    setScopeError(null)
    setSuccessMessage(null)

    try {
      const token = await getIdToken()
      const created = await createNetworkScope(
        organizationId,
        name,
        scopeDescription,
        cidrRanges,
        token,
      )

      setScopes((current) => [
        created,
        ...current.filter((scope) => scope.id !== created.id),
      ])

      setSelectedScopeId(created.id)
      setTargetCidr(created.cidr_ranges[0] ?? '')
      setScopeName('')
      setScopeDescription('')
      setScopeCidrs('')
      setSuccessMessage('Network scope registered successfully.')
    } catch (error) {
      setScopeError(
        error instanceof BackendRequestError
          ? error.message
          : 'Unable to register the network scope.',
      )
    } finally {
      setCreatingScope(false)
    }
  }

  const handleStartScan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedScope || selectedScope.status !== 'active') {
      setScanError('Select an active network scope first.')
      return
    }

    let cleanTarget = targetCidr.trim()
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanTarget)) {
      cleanTarget = `${cleanTarget}/32`
      setTargetCidr(cleanTarget)
    }

    if (!cleanTarget) {
      setScanError('Enter a target CIDR.')
      return
    }

    setStartingScan(true)
    setScanError(null)
    setSuccessMessage(null)

    try {
      const token = await getIdToken()
      const created = await createDiscoveryScan(
        organizationId,
        selectedScope.id,
        cleanTarget,
        profile,
        token,
      )

      setScans((current) => [
        created,
        ...current.filter((scan) => scan.id !== created.id),
      ])
      setTotalScans((current) => current + 1)
      setSuccessMessage(
        `Discovery scan #${created.id} submitted. Execution status will update automatically.`,
      )
      void loadScans(selectedScope.id)
    } catch (error) {
      setScanError(
        error instanceof BackendRequestError
          ? error.message
          : 'Unable to start the discovery scan.',
      )
    } finally {
      setStartingScan(false)
    }
  }

  const completedScans = scans.filter((scan) => scan.status === 'completed').length
  const runningScans = scans.filter(
    (scan) => scan.status === 'running' || scan.status === 'queued',
  ).length

  return (
    <div className="discovery-view-container">
      {/* Top Header Card */}
      <header className="discovery-view-header">
        <div className="discovery-header-copy">
          <h2>Network Discovery & Assessment Scopes</h2>
          <p>
            Active network reconnaissance engine operating inside explicitly approved CIDR
            boundaries. Discovers live hosts, exposed TCP/UDP ports, and service banners.
          </p>
        </div>

        <div className="discovery-header-actions">
          <button
            type="button"
            className="btn-discovery-refresh"
            onClick={() => {
              void loadScopes()
              if (selectedScopeId) void loadScans(selectedScopeId)
            }}
            disabled={loadingScopes || loadingScans}
            title="Refresh scope and scan telemetry"
          >
            <RefreshCw
              size={14}
              className={loadingScopes || loadingScans ? 'spinning' : ''}
            />
            <span>{loadingScopes || loadingScans ? 'Querying...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Success Callout */}
      {successMessage && (
        <div className="callout-success" role="status">
          <Check size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Top 4-Metric KPI Strip */}
      <section className="discovery-kpi-grid">
        <div className="discovery-kpi-card">
          <div className="discovery-kpi-header">
            <span className="discovery-kpi-label">Registered Scopes</span>
            <Globe size={16} className="discovery-kpi-icon" />
          </div>
          <span className="discovery-kpi-value">{scopes.length}</span>
          <span className="discovery-kpi-sub">Active assessment boundaries</span>
        </div>

        <div className="discovery-kpi-card">
          <div className="discovery-kpi-header">
            <span className="discovery-kpi-label">Scans Recorded</span>
            <Layers size={16} className="discovery-kpi-icon" />
          </div>
          <span className="discovery-kpi-value">{totalScans}</span>
          <span className="discovery-kpi-sub">Total execution cycles</span>
        </div>

        <div className="discovery-kpi-card">
          <div className="discovery-kpi-header">
            <span className="discovery-kpi-label">Completed in View</span>
            <CheckCircle2 size={16} className="discovery-kpi-icon" />
          </div>
          <span className="discovery-kpi-value">{completedScans}</span>
          <span className="discovery-kpi-sub">Finalized scan records</span>
        </div>

        <div className="discovery-kpi-card">
          <div className="discovery-kpi-header">
            <span className="discovery-kpi-label">Active in View</span>
            <Activity size={16} className="discovery-kpi-icon" />
          </div>
          <span className={`discovery-kpi-value ${runningScans > 0 ? 'active-glow' : ''}`}>
            {runningScans}
          </span>
          <span className="discovery-kpi-sub">Queued or running probes</span>
        </div>
      </section>

      {/* Main Two-Column Operations Layout */}
      <section className="discovery-workbench-grid">
        {/* Left Column: Approved Boundaries & New Scope Registration */}
        <div className="discovery-panel-card">
          <div className="panel-card-header">
            <h3 className="panel-card-title">
              <Shield size={16} className="text-cyan" />
              <span>Approved Network Boundaries</span>
            </h3>
            <p className="panel-card-subtitle">
              Select or register authorized subnets. The engine strictly restricts scan execution
              within configured boundaries.
            </p>
          </div>

          {scopeError && (
            <div className="callout-error" role="alert">
              <AlertTriangle size={15} />
              <span>{scopeError}</span>
            </div>
          )}

          {/* Scopes List */}
          <div className="scopes-list-wrap">
            {loadingScopes ? (
              <div className="empty-state-box">
                <span className="field-hint-text">Loading approved network scopes...</span>
              </div>
            ) : scopes.length === 0 ? (
              <div className="empty-state-box">
                <span className="empty-state-desc">No network scopes registered yet.</span>
              </div>
            ) : (
              scopes.map((scope) => {
                const isSelected = selectedScopeId === scope.id
                return (
                  <div
                    key={scope.id}
                    className={`scope-item-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedScopeId(scope.id)
                      setTargetCidr(scope.cidr_ranges[0] ?? '')
                      setScanError(null)
                      setSuccessMessage(null)
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="scope-item-top">
                      <div className="scope-title-area">
                        <span className="scope-name-text">{scope.name}</span>
                        {isSelected && <Check size={14} className="text-cyan" />}
                      </div>
                      <span
                        className={
                          scope.status === 'active'
                            ? 'scope-badge-active'
                            : 'scope-badge-inactive'
                        }
                      >
                        {scope.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="scope-cidr-pills">
                      {scope.cidr_ranges.map((range) => (
                        <span key={range} className="cidr-mono-pill">
                          {range}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Register New Scope Form */}
          <form className="discovery-form-block" onSubmit={handleCreateScope}>
            <div className="form-block-title">
              <PlusCircle size={14} />
              <span>Register New Boundary</span>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="scope-name-input">
                Scope Name
              </label>
              <input
                id="scope-name-input"
                className="cg-input"
                value={scopeName}
                onChange={(e) => setScopeName(e.target.value)}
                placeholder="e.g. Production DMZ or Lab Network"
                minLength={2}
                maxLength={120}
                required
              />
            </div>

            <div className="field-group">
              <div className="field-label-row">
                <label className="field-label" htmlFor="scope-desc-input">
                  Description
                </label>
                <span className="optional-badge">OPTIONAL</span>
              </div>
              <input
                id="scope-desc-input"
                className="cg-input"
                value={scopeDescription}
                onChange={(e) => setScopeDescription(e.target.value)}
                placeholder="Authorization reference, owner, or environment details"
                maxLength={500}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="scope-cidrs-input">
                Authorized CIDR Ranges
              </label>
              <textarea
                id="scope-cidrs-input"
                className="cg-textarea mono"
                value={scopeCidrs}
                onChange={(e) => setScopeCidrs(e.target.value)}
                placeholder={'192.168.1.0/24\n10.10.0.0/24'} /* cgx-allow: lab placeholder */
                rows={3}
                required
              />
              <span className="field-hint-text">One canonical IPv4 or IPv6 CIDR per line.</span>
            </div>

            <button
              type="submit"
              className="btn-primary-action"
              disabled={creatingScope}
            >
              <PlusCircle size={15} />
              <span>{creatingScope ? 'Registering...' : 'Register Network Scope'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Launch Discovery Scan */}
        <div className="discovery-panel-card">
          <div className="panel-card-header">
            <h3 className="panel-card-title">
              <Play size={16} className="text-cyan" />
              <span>Launch Discovery Scan</span>
            </h3>
            <p className="panel-card-subtitle">
              Initiate active host or TCP port reconnaissance within the active boundary scope.
            </p>
          </div>

          <form className="discovery-form-block" onSubmit={handleStartScan}>
            <div className="field-group">
              <label className="field-label" htmlFor="active-scope-select">
                Active Network Scope
              </label>
              <select
                id="active-scope-select"
                className="cg-select"
                value={selectedScopeId}
                onChange={(e) => {
                  const scopeId = e.target.value
                  const scope = scopes.find((item) => item.id === scopeId)
                  setSelectedScopeId(scopeId)
                  setTargetCidr(scope?.cidr_ranges[0] ?? '')
                  setScanError(null)
                  setSuccessMessage(null)
                }}
                required
              >
                <option value="">Select an active network scope</option>
                {activeScopes.map((scope) => (
                  <option key={scope.id} value={scope.id}>
                    {scope.name} ({scope.cidr_ranges.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            {selectedScope && (
              <div className="approved-boundary-preview">
                <span className="boundary-preview-label">Registered Boundary Ranges (click to set target)</span>
                <div className="scope-cidr-pills">
                  {selectedScope.cidr_ranges.map((range) => (
                    <button
                      type="button"
                      key={range}
                      className="cidr-mono-pill"
                      style={{
                        cursor: 'pointer',
                        background: 'rgba(0, 240, 255, 0.05)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        transition: 'all 0.15s ease',
                      }}
                      title={`Click to set target CIDR to ${range}`}
                      onClick={() => {
                        setTargetCidr(range)
                        setScanError(null)
                      }}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="field-group">
              <label className="field-label" htmlFor="target-cidr-input">
                Target CIDR
              </label>
              <input
                id="target-cidr-input"
                className="cg-input"
                value={targetCidr}
                onChange={(e) => {
                  setTargetCidr(e.target.value)
                  setScanError(null)
                }}
                placeholder="e.g. 192.168.1.0/24" /* cgx-allow: lab placeholder */
                maxLength={100}
                required
                disabled={!selectedScope || selectedScope.status !== 'active'}
              />
              <span className="field-hint-text">
                The backend validates containment within the active scope before execution.
              </span>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="profile-select">
                Discovery Profile
              </label>
              <select
                id="profile-select"
                className="cg-select"
                value={profile}
                onChange={(e) => setProfile(e.target.value as DiscoveryProfile)}
              >
                <option value="host_discovery">
                  Host discovery — ICMP / ARP live host identification
                </option>
                <option value="tcp_service_discovery">
                  TCP service discovery — Top 100 ports & version fingerprinting
                </option>
              </select>
            </div>

            <div className="profile-explain-card">
              <Info size={15} className="text-cyan flex-shrink-0" />
              <span>
                {profile === 'host_discovery'
                  ? 'Performs fast ICMP echo and ARP sweep to identify reachable hosts without probing ports.'
                  : 'Performs SYN connect scanning across top 100 ports with service banner fingerprinting.'}
              </span>
            </div>

            {scanError && (
              <div className="callout-error" role="alert">
                <AlertTriangle size={15} />
                <span>{scanError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary-action"
              disabled={
                startingScan || !selectedScope || selectedScope.status !== 'active'
              }
            >
              <Play size={14} />
              <span>{startingScan ? 'Queuing Scan...' : 'Start Authorized Scan'}</span>
            </button>
          </form>
        </div>
      </section>

      {/* Discovery History Table */}
      <section className="discovery-history-card">
        <div className="history-card-header">
          <h3 className="history-card-title">Discovery History</h3>
          <div className="history-meta-group">
            <span className="records-count-pill">{totalScans} Total Records</span>
          </div>
        </div>

        {!selectedScopeId ? (
          <div className="empty-state-box">
            <Search size={24} className="empty-state-icon" />
            <span className="empty-state-title">Select a Network Scope</span>
            <span className="empty-state-desc">
              Choose an approved boundary above to view its historical discovery runs.
            </span>
          </div>
        ) : loadingScans && scans.length === 0 ? (
          <div className="empty-state-box">
            <span className="field-hint-text">Loading scan history records...</span>
          </div>
        ) : scans.length === 0 ? (
          <div className="empty-state-box">
            <Shield size={24} className="empty-state-icon" />
            <span className="empty-state-title">No Scan Runs Recorded</span>
            <span className="empty-state-desc">
              Launch a discovery scan above to begin mapping live hosts in this scope.
            </span>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="cg-table">
              <thead>
                <tr>
                  <th>Scan ID</th>
                  <th>Target CIDR</th>
                  <th>Profile</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => {
                  const status = scan.status.toLowerCase()
                  return (
                    <tr key={scan.id}>
                      <td className="mono">#{scan.id}</td>
                      <td>
                        <code className="cidr-mono-pill">{scan.target}</code>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {scan.scan_type.replaceAll('_', ' ')}
                      </td>
                      <td>
                        <span className={`scan-status-pill ${status}`} title={scan.error_message ?? undefined}>
                          <span className="status-dot-pulse" />
                          <span>{statusLabel(scan.status)}</span>
                        </span>
                        {scan.error_message && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--accent-red, #f87171)',
                              marginTop: '3px',
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={scan.error_message}
                          >
                            {scan.error_message}
                          </div>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: '11.5px' }}>
                        {formatDate(scan.started_at)}
                      </td>
                      <td className="mono" style={{ fontSize: '11.5px' }}>
                        {formatDate(scan.completed_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
