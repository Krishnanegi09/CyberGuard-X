import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  Radio,
  Play,
  Square,
  AlertTriangle,
  Cpu,
  Layers,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import {
  BackendRequestError,
  getMonitoringStatus,
  getNIDSAlerts,
  getNetworkScopes,
  startMonitoring,
  stopMonitoring,
  updateNIDSAlertStatus,
  type MonitoringStats,
  type NIDSAlert,
  type NetworkScope,
} from './services/backendAuth'
import './NIDSMonitor.css'

interface Props {
  organizationId: string
  scopeId: string
  getIdToken: () => Promise<string>
}

const emptyStats: MonitoringStats = {
  status: 'stopped',
  interface: null,
  captured_packets: 0,
  queued_packets: 0,
  processed_packets: 0,
  dropped_packets: 0,
  ignored_packets: 0,
  processing_errors: 0,
  queue_size: 0,
}

const DEFAULT_INTERFACES = ['en0', 'lo0', 'en1', 'en2', 'bridge0', 'utun0', 'utun1']

function formatAddress(value: string) {
  return value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-9)}` : value
}

export default function NIDSMonitor({
  organizationId,
  scopeId: initialScopeId,
  getIdToken,
}: Props) {
  const [stats, setStats] = useState(emptyStats)
  const [alerts, setAlerts] = useState<NIDSAlert[]>([])
  const [networkInterface, setNetworkInterface] = useState('en0')
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>(DEFAULT_INTERFACES)
  const [scopes, setScopes] = useState<NetworkScope[]>([])
  const [activeScopeId, setActiveScopeId] = useState(
    initialScopeId && initialScopeId !== 'default-scope' ? initialScopeId : ''
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load scopes if scopeId is not a valid scope
  useEffect(() => {
    let mounted = true
    const fetchScopes = async () => {
      if (!organizationId) return
      try {
        const token = await getIdToken()
        const scopeList = await getNetworkScopes(organizationId, token)
        if (mounted) {
          setScopes(scopeList)
          const active = scopeList.find((s) => s.status === 'active') || scopeList[0]
          if (active && (!activeScopeId || activeScopeId === 'default-scope')) {
            setActiveScopeId(active.id)
          }
        }
      } catch (e) {
        console.warn('Failed to load scopes in NIDSMonitor', e)
      }
    }
    void fetchScopes()
    return () => {
      mounted = false
    }
  }, [organizationId, getIdToken, activeScopeId])

  // Probe available interfaces from backend
  useEffect(() => {
    let mounted = true
    const fetchInterfaces = async () => {
      if (!organizationId || !activeScopeId || activeScopeId === 'default-scope') return
      try {
        const token = await getIdToken()
        const res = await fetch(
          `/api/v1/organizations/${encodeURIComponent(organizationId)}/network-scopes/${encodeURIComponent(activeScopeId)}/monitoring/interfaces`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        if (res.ok) {
          const list: string[] = await res.json()
          if (mounted && Array.isArray(list) && list.length > 0) {
            setAvailableInterfaces(list)
            if (!list.includes(networkInterface)) {
              setNetworkInterface(list[0])
            }
          }
        }
      } catch (e) {
        console.warn('Using default interface probe list', e)
      }
    }
    void fetchInterfaces()
    return () => {
      mounted = false
    }
  }, [organizationId, activeScopeId, getIdToken, networkInterface])

  const refresh = useCallback(async () => {
    if (!activeScopeId || activeScopeId === 'default-scope') return
    try {
      const token = await getIdToken()
      const [monitoring, alertList] = await Promise.all([
        getMonitoringStatus(organizationId, activeScopeId, token),
        getNIDSAlerts(organizationId, activeScopeId, token),
      ])
      setStats(monitoring)
      setAlerts(alertList.items)
      setError(null)
    } catch (cause) {
      setError(
        cause instanceof BackendRequestError
          ? cause.message
          : 'Unable to load NIDS telemetry.',
      )
    }
  }, [getIdToken, organizationId, activeScopeId])

  useEffect(() => {
    if (!activeScopeId || activeScopeId === 'default-scope') return
    const initialLoad = window.setTimeout(() => void refresh(), 0)
    const interval = window.setInterval(() => void refresh(), 4000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [refresh, activeScopeId])

  const toggle = async () => {
    if (!activeScopeId || activeScopeId === 'default-scope') {
      setError('Please select or register an active network scope first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const token = await getIdToken()
      const next =
        stats.status === 'running'
          ? await stopMonitoring(organizationId, activeScopeId, token)
          : await startMonitoring(organizationId, activeScopeId, networkInterface, token)
      setStats(next)
    } catch (cause) {
      setError(
        cause instanceof BackendRequestError
          ? cause.message
          : 'Unable to change monitoring state.',
      )
    } finally {
      setBusy(false)
    }
  }

  const resolve = async (alert: NIDSAlert) => {
    if (!activeScopeId || activeScopeId === 'default-scope') return
    try {
      const token = await getIdToken()
      const updated = await updateNIDSAlertStatus(
        organizationId,
        activeScopeId,
        alert.id,
        'resolved',
        token,
      )
      setAlerts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (cause) {
      setError(
        cause instanceof BackendRequestError
          ? cause.message
          : 'Unable to update alert.',
      )
    }
  }

  const activeAlerts = alerts.filter((alert) => alert.status !== 'resolved').length
  const isRunning = stats.status === 'running'

  return (
    <section className="nids-monitor-section">
      {/* NIDS Header */}
      <div className="nids-header">
        <div className="nids-header-copy">
          <h2>Live Wire NIDS Sensor & Packet Stream</h2>
          <p className="nids-description">
            Scope-bound wire-level network telemetry with passive link-layer inspection and signature
            threat detection.
          </p>
        </div>

        <div className="nids-header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn-discovery-refresh"
            onClick={() => void refresh()}
            disabled={busy}
            title="Refresh NIDS telemetry and stream metrics"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={busy ? 'spinning' : ''} />
            <span>Refresh</span>
          </button>

          <span className={`nids-live-state ${stats.status}`} aria-live="polite">
            <span className="status-dot-pulse" />
            <span>{isRunning ? 'LIVE SENSOR ACTIVE' : 'SENSOR OFFLINE'}</span>
          </span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="nids-control-bar">
        <div className="nids-control-info">
          <span className="control-kicker-label">Capture Session Control</span>
          <span className="control-status-title">
            {isRunning ? 'Packet Capture Engine Active' : 'Passive Monitoring Idle'}
          </span>
          <span className="control-status-sub">
            {isRunning
              ? `Listening on device [${stats.interface ?? networkInterface}]`
              : 'Select network interface and initialize packet ingestion session.'}
          </span>
        </div>

        <div className="nids-control-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Scope Dropdown */}
          {scopes.length > 0 && (
            <div className="interface-input-wrap">
              <label className="interface-input-label" htmlFor="nids-scope-select">
                Scope
              </label>
              <select
                id="nids-scope-select"
                className="nids-interface-select"
                value={activeScopeId}
                onChange={(e) => setActiveScopeId(e.target.value)}
                disabled={isRunning}
              >
                {scopes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.cidr_ranges.join(', ')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Device Dropdown scanning all available options */}
          <div className="interface-input-wrap">
            <label className="interface-input-label" htmlFor="nids-iface-select">
              Device
            </label>
            <select
              id="nids-iface-select"
              className="nids-interface-select"
              value={networkInterface}
              onChange={(e) => setNetworkInterface(e.target.value)}
              disabled={isRunning}
              title="Select network interface device for packet capture"
            >
              {availableInterfaces.map((iface) => (
                <option key={iface} value={iface}>
                  {iface}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={isRunning ? 'btn-nids-stop' : 'btn-nids-start'}
            onClick={() => void toggle()}
            disabled={busy || stats.status === 'starting' || stats.status === 'stopping'}
          >
            {isRunning ? <Square size={14} /> : <Play size={14} />}
            <span>
              {busy
                ? 'Processing...'
                : isRunning
                  ? 'Terminate Session'
                  : 'Start Capture'}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="callout-error" role="alert">
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* 4-Metric Grid */}
      <div className="nids-metrics-grid">
        <article className="nids-metric-card">
          <div className="nids-metric-header">
            <span className="nids-metric-label">Packets Captured</span>
            <Activity size={15} className="text-cyan" />
          </div>
          <span className="nids-metric-value">{stats.captured_packets.toLocaleString()}</span>
          <span className="nids-metric-sub">Raw link-layer frames observed</span>
        </article>

        <article className="nids-metric-card">
          <div className="nids-metric-header">
            <span className="nids-metric-label">Packets Processed</span>
            <Cpu size={15} className="text-cyan" />
          </div>
          <span className="nids-metric-value">{stats.processed_packets.toLocaleString()}</span>
          <span className="nids-metric-sub">Decoded through inspection rules</span>
        </article>

        <article className="nids-metric-card">
          <div className="nids-metric-header">
            <span className="nids-metric-label">Active Alerts</span>
            <Radio size={15} className={activeAlerts > 0 ? 'text-critical' : ''} />
          </div>
          <span className={`nids-metric-value ${activeAlerts > 0 ? 'attention' : ''}`}>
            {activeAlerts}
          </span>
          <span className="nids-metric-sub">{alerts.length} total event detections</span>
        </article>

        <article className="nids-metric-card">
          <div className="nids-metric-header">
            <span className="nids-metric-label">Queue Drops</span>
            <Layers size={15} />
          </div>
          <span className="nids-metric-value">{stats.dropped_packets.toLocaleString()}</span>
          <span className="nids-metric-sub">{stats.queue_size} frames currently buffered</span>
        </article>
      </div>

      {/* Real-time Alerts Feed */}
      <div className="nids-alerts-card">
        <div className="nids-alerts-heading">
          <h3 className="nids-alerts-title">Signature & Anomaly Alerts</h3>
          <span className="records-count-pill">{alerts.length} Events Recorded</span>
        </div>

        {alerts.length === 0 ? (
          <div className="empty-state-box">
            <CheckCircle2 size={24} className="empty-state-icon" style={{ color: '#34d399' }} />
            <span className="empty-state-title">No Intrusion Alerts Detected</span>
            <span className="empty-state-desc">
              Packets passing through active filters have satisfied baseline security signatures.
            </span>
          </div>
        ) : (
          <div className="nids-alert-list">
            {alerts.map((alert) => {
              const sev = alert.severity.toLowerCase()
              const isResolved = alert.status === 'resolved'
              return (
                <div key={alert.id} className="nids-alert-item">
                  <div className="nids-alert-left">
                    <span className={`nids-severity-tag ${sev}`}>{alert.severity}</span>
                    <div className="nids-alert-content">
                      <div className="nids-alert-name-row">
                        <span className="nids-alert-name">{alert.name}</span>
                        <span className="nids-alert-time">
                          {new Date(alert.occurred_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="nids-alert-desc">{alert.description}</p>
                      <div className="nids-alert-flow-meta">
                        <code className="flow-addr-pill">{formatAddress(alert.source_ip)}</code>
                        <ArrowRight size={12} className="flow-arrow" />
                        <code className="flow-addr-pill">{formatAddress(alert.destination_ip)}</code>
                        <span className="field-hint-text">({alert.evidence})</span>
                      </div>
                    </div>
                  </div>

                  <div className="nids-alert-right">
                    {isResolved ? (
                      <span className="badge-resolved">
                        <CheckCircle2 size={13} />
                        <span>Resolved</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-nids-resolve"
                        onClick={() => void resolve(alert)}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
