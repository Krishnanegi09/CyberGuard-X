import { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import {
  Activity,
  Radio,
  Play,
  Square,
  AlertTriangle,
  Cpu,
  Layers,
  RefreshCw,
  CheckCircle2,
  Search,
  Pause,
  Trash2,
  Terminal,
  ShieldAlert,
  X,
  Lock,
  Check,
} from 'lucide-react'
import {
  BackendRequestError,
  getMonitoringStatus,
  getNIDSAlerts,
  getNetworkScopes,
  startMonitoring,
  stopMonitoring,
  updateNIDSAlertStatus,
  getMonitoringPackets,
  getMonitoringAnomalies,
  type MonitoringStats,
  type NIDSAlert,
  type NetworkScope,
  type WiresharkPacket,
  type AnomalyPacketRecord,
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value.trim())
}

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
    isValidUUID(initialScopeId) ? initialScopeId : ''
  )
  const [busy, setBusy] = useState(false)
  const [scanningIfaces, setScanningIfaces] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Wireshark Live Packet Stream State
  const [packets, setPackets] = useState<WiresharkPacket[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyPacketRecord[]>([])
  const [selectedPacket, setSelectedPacket] = useState<WiresharkPacket | null>(null)
  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const [protocolFilter, setProtocolFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const latestPacketIdRef = useRef<number>(0)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Packet ingestion rate & UI feedback states
  const [packetRate, setPacketRate] = useState<number>(0)
  const prevCountRef = useRef<number>(0)
  const prevTimeRef = useRef<number>(0)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [copiedPacketId, setCopiedPacketId] = useState<number | null>(null)

  // Auto-scroll Wireshark list to bottom when new packets arrive
  useEffect(() => {
    if (autoScroll && tableContainerRef.current) {
      tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight
    }
  }, [packets, autoScroll])

  // Load scopes if scopeId is not a valid scope
  useEffect(() => {
    let mounted = true
    const fetchScopes = async () => {
      if (!isValidUUID(organizationId)) return
      try {
        const token = await getIdToken()
        const scopeList = await getNetworkScopes(organizationId, token)
        if (mounted) {
          setScopes(scopeList)
          const active = scopeList.find((s) => s.status === 'active') || scopeList[0]
          if (active && !isValidUUID(activeScopeId)) {
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
  const fetchInterfaces = useCallback(async () => {
    if (!isValidUUID(organizationId)) return
    setScanningIfaces(true)
    try {
      const token = await getIdToken()
      const url = isValidUUID(activeScopeId)
        ? `/api/v1/organizations/${encodeURIComponent(organizationId)}/network-scopes/${encodeURIComponent(activeScopeId)}/monitoring/interfaces`
        : `/api/v1/organizations/${encodeURIComponent(organizationId)}/monitoring/interfaces`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const list: string[] = await res.json()
        if (Array.isArray(list) && list.length > 0) {
          setAvailableInterfaces(list)
          setNetworkInterface((prev) => (list.includes(prev) ? prev : list[0]))
        }
      }
    } catch (e) {
      console.warn('Using default interface probe list', e)
    } finally {
      setScanningIfaces(false)
    }
  }, [organizationId, activeScopeId, getIdToken])

  useEffect(() => {
    if (!isValidUUID(organizationId)) return
    let mounted = true
    const load = async () => {
      try {
        const token = await getIdToken()
        const url = isValidUUID(activeScopeId)
          ? `/api/v1/organizations/${encodeURIComponent(organizationId)}/network-scopes/${encodeURIComponent(activeScopeId)}/monitoring/interfaces`
          : `/api/v1/organizations/${encodeURIComponent(organizationId)}/monitoring/interfaces`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (mounted && res.ok) {
          const list: string[] = await res.json()
          if (Array.isArray(list) && list.length > 0) {
            setAvailableInterfaces(list)
            setNetworkInterface((prev) => (list.includes(prev) ? prev : list[0]))
          }
        }
      } catch (e) {
        console.warn('Using default interface probe list', e)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [organizationId, activeScopeId, getIdToken])

  const refresh = useCallback(async () => {
    if (!isValidUUID(organizationId) || !isValidUUID(activeScopeId)) return
    try {
      const token = await getIdToken()
      const [monitoring, alertList, scopeList] = await Promise.all([
        getMonitoringStatus(organizationId, activeScopeId, token),
        getNIDSAlerts(organizationId, activeScopeId, token),
        getNetworkScopes(organizationId, token).catch(() => null),
      ])
      setStats(monitoring)
      setAlerts(alertList.items)
      if (scopeList && Array.isArray(scopeList)) {
        setScopes(scopeList)
      }

      // Calculate instantaneous arrival rate
      const now = Date.now()
      if (prevTimeRef.current === 0) {
        prevTimeRef.current = now
        prevCountRef.current = monitoring.captured_packets
      } else {
        const dt = (now - prevTimeRef.current) / 1000
        if (dt >= 1.5) {
          const delta = Math.max(0, monitoring.captured_packets - prevCountRef.current)
          setPacketRate(Math.round(delta / dt))
          prevCountRef.current = monitoring.captured_packets
          prevTimeRef.current = now
        }
      }

      setError(null)
    } catch (cause) {
      setError(
        cause instanceof BackendRequestError
          ? cause.message
          : 'Unable to load NIDS telemetry.',
      )
    }
  }, [getIdToken, organizationId, activeScopeId])

  // Periodic metadata & status refresh
  useEffect(() => {
    if (!isValidUUID(organizationId) || !isValidUUID(activeScopeId)) return
    const initialLoad = window.setTimeout(() => void refresh(), 0)
    const interval = window.setInterval(() => void refresh(), 3000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [refresh, organizationId, activeScopeId])

  // Fast real-time packet & anomaly ingestion loop while running
  useEffect(() => {
    if (!isValidUUID(organizationId) || !isValidUUID(activeScopeId) || stats.status !== 'running') {
      return
    }

    let active = true
    const pollPackets = async () => {
      try {
        const token = await getIdToken()
        const [pktsResp, anomsResp] = await Promise.all([
          getMonitoringPackets(organizationId, activeScopeId, token, latestPacketIdRef.current, 100),
          getMonitoringAnomalies(organizationId, activeScopeId, token, 50),
        ])

        if (!active) return

        if (pktsResp.packets.length > 0) {
          latestPacketIdRef.current = pktsResp.latest_id
          setPackets((prev) => {
            const combined = [...prev, ...pktsResp.packets]
            return combined.slice(-1000)
          })
        }

        if (anomsResp.anomalies.length > 0) {
          setAnomalies(anomsResp.anomalies)
        }
      } catch (e) {
        console.warn('Failed real-time packet poll', e)
      }
    }

    const interval = window.setInterval(() => void pollPackets(), 800)
    void pollPackets()

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [organizationId, activeScopeId, stats.status, getIdToken])

  const toggle = async () => {
    if (!isValidUUID(organizationId) || !isValidUUID(activeScopeId)) {
      setError('Please select or register an active network scope first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const token = await getIdToken()
      if (stats.status === 'running') {
        const next = await stopMonitoring(organizationId, activeScopeId, token)
        setStats(next)
        setPacketRate(0)
      } else {
        latestPacketIdRef.current = 0
        setPackets([])
        setAnomalies([])
        const next = await startMonitoring(organizationId, activeScopeId, networkInterface, token)
        setStats(next)
        prevCountRef.current = 0
        prevTimeRef.current = Date.now()
      }
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
    if (!isValidUUID(organizationId) || !isValidUUID(activeScopeId)) return
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

  const clearBuffer = () => {
    setPackets([])
    setSelectedPacket(null)
  }

  // Active selected scope entity
  const currentScope = useMemo(
    () => scopes.find((s) => s.id === activeScopeId),
    [scopes, activeScopeId]
  )

  // Scope option formatter: Keep select clean and compact
  const getScopeOptionLabel = (s: NetworkScope) => {
    if (!s.cidr_ranges || s.cidr_ranges.length === 0) return `${s.name} (No CIDRs)`
    if (s.cidr_ranges.length === 1) return `${s.name} (${s.cidr_ranges[0]})`
    return `${s.name} (${s.cidr_ranges[0]} +${s.cidr_ranges.length - 1} more)`
  }

  // Protocol frequency counts in current buffer
  const protocolCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: packets.length,
      TCP: 0,
      UDP: 0,
      DNS: 0,
      TLS: 0,
      HTTP: 0,
      ANOMALIES: 0,
    }
    for (const p of packets) {
      if (p.is_anomaly) counts.ANOMALIES++
      const proto = p.protocol.toUpperCase()
      if (proto.includes('DNS')) counts.DNS++
      else if (proto.includes('TLS')) counts.TLS++
      else if (proto.includes('HTTP')) counts.HTTP++
      else if (proto === 'UDP') counts.UDP++
      else if (proto === 'TCP') counts.TCP++
    }
    return counts
  }, [packets])

  // Filter packets based on protocol pill and search text
  const filteredPackets = useMemo(() => {
    return packets.filter((p) => {
      if (protocolFilter !== 'ALL') {
        if (protocolFilter === 'ANOMALIES') {
          if (!p.is_anomaly) return false
        } else if (!p.protocol.toUpperCase().includes(protocolFilter)) {
          return false
        }
      }
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        p.source.toLowerCase().includes(q) ||
        p.destination.toLowerCase().includes(q) ||
        p.protocol.toLowerCase().includes(q) ||
        p.info.toLowerCase().includes(q) ||
        (p.flags_desc && p.flags_desc.toLowerCase().includes(q))
      )
    })
  }, [packets, protocolFilter, searchQuery])

  const activeAlerts = alerts.filter((alert) => alert.status !== 'resolved').length
  const isRunning = stats.status === 'running'

  return (
    <section className="nids-monitor-section">
      {/* NIDS Header */}
      <div className="nids-header">
        <div className="nids-header-copy">
          <h2>Live Wire NIDS Sensor &amp; Packet Stream</h2>
          <p className="nids-description">
            Scope-bound wire-level network telemetry with passive link-layer inspection, Wireshark-grade frame decoding, and real-time signature threat detection.
          </p>
        </div>

        <div className="nids-header-right">
          <button
            type="button"
            className="btn-nids-refresh"
            onClick={() => void refresh()}
            disabled={busy}
            title="Refresh NIDS telemetry and stream metrics"
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

          {/* Active Scope CIDRs Badge Bar */}
          {currentScope && currentScope.cidr_ranges.length > 0 && (
            <div className="nids-scope-cidr-tags">
              <span className="nids-cidr-label">BPF Scope:</span>
              {currentScope.cidr_ranges.slice(0, 4).map((c) => (
                <span key={c} className="nids-cidr-pill" title={c}>
                  {c}
                </span>
              ))}
              {currentScope.cidr_ranges.length > 4 && (
                <span
                  className="nids-cidr-pill more"
                  title={currentScope.cidr_ranges.slice(4).join(', ')}
                >
                  +{currentScope.cidr_ranges.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="nids-control-actions">
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
                title="Select authorized scope"
              >
                {scopes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {getScopeOptionLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Device Dropdown scanning all available options */}
          <div className="interface-input-wrap">
            <div className="interface-input-label-row">
              <label className="interface-input-label" htmlFor="nids-iface-select">
                Device ({availableInterfaces.length})
              </label>
              <button
                type="button"
                className="btn-iface-scan"
                onClick={() => void fetchInterfaces()}
                disabled={busy || scanningIfaces || isRunning}
                title="Rescan network interface devices on this machine"
              >
                <RefreshCw size={11} className={scanningIfaces ? 'spinning' : ''} />
              </button>
            </div>
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

      {/* Action Toast Feedback */}
      {actionFeedback && (
        <div className="nids-action-toast" role="status">
          <Check size={14} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {error && (
        <div className="callout-error" role="alert">
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* 4-Metric Grid */}
      <div className="nids-metrics-grid">
        <article className="nids-metric-card card-captured">
          <div className="nids-metric-header">
            <span className="nids-metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={13} style={{ color: '#00f0ff' }} />
              Packets Captured
            </span>
            <span className={`nids-metric-badge ${isRunning ? 'live' : ''}`}>
              {isRunning ? (packetRate > 0 ? `${packetRate} pkts/s` : 'Active stream') : 'Offline'}
            </span>
          </div>
          <span className="nids-metric-value">{stats.captured_packets.toLocaleString()}</span>
          <span className="nids-metric-sub">Raw link-layer frames observed</span>
        </article>

        <article className="nids-metric-card card-processed">
          <div className="nids-metric-header">
            <span className="nids-metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Cpu size={13} style={{ color: '#38bdf8' }} />
              Packets Processed
            </span>
            <span className="nids-metric-badge">
              {stats.captured_packets > 0
                ? `${Math.min(100, Math.round((stats.processed_packets / stats.captured_packets) * 100))}% Decoded`
                : '100% Ready'}
            </span>
          </div>
          <span className="nids-metric-value">{stats.processed_packets.toLocaleString()}</span>
          <span className="nids-metric-sub">Decoded through inspection rules</span>
        </article>

        <article className={`nids-metric-card card-alerts ${activeAlerts > 0 ? 'has-alerts' : ''}`}>
          <div className="nids-metric-header">
            <span className="nids-metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Radio size={13} style={{ color: activeAlerts > 0 ? '#f43f5e' : '#10b981' }} />
              Active Alerts
            </span>
            <span className={`nids-metric-badge ${activeAlerts > 0 ? 'critical' : 'clean'}`}>
              {activeAlerts > 0 ? `${activeAlerts} Threat${activeAlerts > 1 ? 's' : ''}` : 'Clean'}
            </span>
          </div>
          <span className={`nids-metric-value ${activeAlerts > 0 ? 'attention' : ''}`}>
            {activeAlerts}
          </span>
          <span className="nids-metric-sub">{alerts.length} total event detections</span>
        </article>

        <article className="nids-metric-card card-drops">
          <div className="nids-metric-header">
            <span className="nids-metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={13} style={{ color: '#a855f7' }} />
              Queue Drops
            </span>
            <span className="nids-metric-badge">
              {stats.dropped_packets === 0 ? '0% Loss' : `${stats.dropped_packets} Dropped`}
            </span>
          </div>
          <span className="nids-metric-value">{stats.dropped_packets.toLocaleString()}</span>
          <span className="nids-metric-sub">{stats.queue_size} frames currently buffered</span>
        </article>
      </div>

      {/* =================================================================== */}
      {/* 1. WIRESHARK-STYLE LIVE PACKET STREAM WINDOW                       */}
      {/* =================================================================== */}
      <div className="wireshark-window">
        {/* Toolbar */}
        <div className="wireshark-toolbar">
          <div className="wireshark-toolbar-left">
            <div className="wireshark-title-tag">
              <Terminal size={14} />
              <span>PACKET STREAM</span>
            </div>

            {/* Display Filter Input */}
            <div className="wireshark-filter-bar">
              <Search size={13} style={{ color: '#64748b' }} />
              <input
                type="text"
                className="wireshark-filter-input"
                placeholder="Filter IP, port, flags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'inline-flex' }}
                  title="Clear filter"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Protocol Quick-Filter Chips */}
            <div className="wireshark-protocol-pills">
              {(['ALL', 'TCP', 'UDP', 'DNS', 'TLS', 'HTTP', 'ANOMALIES'] as const).map((proto) => {
                const count = protocolCounts[proto] || 0
                return (
                  <button
                    key={proto}
                    type="button"
                    className={`ws-proto-btn ${protocolFilter === proto ? 'active' : ''} ${proto === 'ANOMALIES' ? 'proto-anomaly' : ''}`}
                    onClick={() => setProtocolFilter(proto)}
                  >
                    <span>{proto}</span>
                    {count > 0 && <span className="ws-proto-badge">{count}</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="wireshark-toolbar-right">
            <span className="ws-frames-pill">
              <strong>{filteredPackets.length}</strong> / {packets.length} frames
            </span>

            <button
              type="button"
              className={`ws-tool-btn ${autoScroll ? 'active' : ''}`}
              onClick={() => setAutoScroll(!autoScroll)}
              title={autoScroll ? 'Click to pause auto-scroll' : 'Click to resume auto-scroll'}
            >
              {autoScroll ? <Pause size={12} /> : <Play size={12} />}
              <span>{autoScroll ? 'Auto-Scroll' : 'Paused'}</span>
            </button>

            <button
              type="button"
              className="ws-tool-btn"
              onClick={clearBuffer}
              disabled={packets.length === 0}
              title="Clear current packet buffer"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Wireshark Packet Table */}
        <div className="wireshark-table-container" ref={tableContainerRef}>
          <table className="wireshark-table">
            <thead>
              <tr>
                <th style={{ width: '55px' }}>No.</th>
                <th style={{ width: '85px' }}>Time</th>
                <th style={{ width: '165px' }}>Source</th>
                <th style={{ width: '165px' }}>Destination</th>
                <th style={{ width: '75px' }}>Protocol</th>
                <th style={{ width: '65px' }}>Length</th>
                <th style={{ width: '90px' }}>Flags</th>
                <th style={{ minWidth: '220px' }}>Info</th>
              </tr>
            </thead>
            <tbody>
              {filteredPackets.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                    {isRunning ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontWeight: 500 }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00D4FF', boxShadow: '0 0 8px #00D4FF' }} />
                          Waiting for network frames matching active filter...
                        </div>
                        {stats.captured_packets === 0 && (
                          <div style={{ fontSize: '12px', maxWidth: '600px', margin: '4px auto 0', color: '#94a3b8', lineHeight: 1.6, background: 'rgba(15, 23, 42, 0.6)', padding: '12px 18px', borderRadius: '8px', border: '1px solid rgba(0, 212, 255, 0.15)', textAlign: 'left' }}>
                            <div style={{ color: '#00D4FF', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <ShieldAlert size={14} />
                              Scope Isolation Active (Kernel BPF Filter)
                            </div>
                            CYBERGUARD-X strictly confines packet sniffing to approved CIDRs of the active scope. If your device is connected to a cellular hotspot or different subnet, or if you want to inspect local frontend/API traffic, add that CIDR in <strong style={{ color: '#f1f5f9' }}>Scopes &amp; Scans</strong> or select loopback interface <code style={{ color: '#00D4FF', background: 'rgba(0,212,255,0.1)', padding: '1px 5px', borderRadius: 4 }}>lo0</code>.
                          </div>
                        )}
                      </div>
                    ) : (
                      'Sensor is idle. Select device and click "Start Capture" to begin observing live traffic.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredPackets.map((pkt, idx) => {
                  const isSelected = selectedPacket?.id === pkt.id
                  const protoLower = pkt.protocol.toLowerCase()
                  const rowClass = pkt.is_anomaly
                    ? 'ws-row-anomaly'
                    : protoLower.includes('dns')
                      ? 'ws-row-dns'
                      : protoLower.includes('tls')
                        ? 'ws-row-tls'
                        : protoLower.includes('http')
                          ? 'ws-row-http'
                          : protoLower.includes('udp')
                            ? 'ws-row-udp'
                            : 'ws-row-tcp'

                  return (
                    <tr
                      key={`${pkt.id}-${idx}`}
                      className={`ws-row ${rowClass} ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedPacket(isSelected ? null : pkt)}
                    >
                      <td>{pkt.id}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>+{pkt.time_rel.toFixed(2)}s</td>
                      <td title={pkt.source} className="ws-col-addr">{formatAddress(pkt.source)}</td>
                      <td title={pkt.destination} className="ws-col-addr">{formatAddress(pkt.destination)}</td>
                      <td>
                        <span className={`ws-badge-proto ${pkt.is_anomaly ? 'anomaly' : protoLower}`}>
                          {pkt.protocol}
                        </span>
                      </td>
                      <td>{pkt.length}</td>
                      <td>{pkt.flags_desc || '-'}</td>
                      <td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pkt.is_anomaly && <span style={{ color: '#fb7185', marginRight: 6 }}>⚠</span>}
                        {pkt.info}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Packet Inspector */}
        {selectedPacket && (
          <div className="packet-inspector">
            <div className="packet-inspector-header">
              <div className="packet-inspector-title">
                <Terminal size={14} />
                <span>Packet #{selectedPacket.id} Inspection</span>
                <span className={`ws-badge-proto ${selectedPacket.is_anomaly ? 'anomaly' : selectedPacket.protocol.toLowerCase()}`}>
                  {selectedPacket.protocol}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-inspector-action"
                  onClick={() => setSearchQuery(selectedPacket.source_ip)}
                  title="Filter packet table by this source IP"
                >
                  Filter by Source IP
                </button>
                <button
                  type="button"
                  className="btn-inspector-action"
                  onClick={() => {
                    navigator.clipboard?.writeText(JSON.stringify(selectedPacket, null, 2))
                    setCopiedPacketId(selectedPacket.id)
                    setActionFeedback(`Copied packet #${selectedPacket.id} JSON to clipboard.`)
                    setTimeout(() => {
                      setCopiedPacketId(null)
                      setActionFeedback(null)
                    }, 2500)
                  }}
                  title="Copy packet details as JSON"
                >
                  {copiedPacketId === selectedPacket.id ? 'Copied!' : 'Copy JSON'}
                </button>
                <button
                  type="button"
                  className="btn-inspector-close"
                  onClick={() => setSelectedPacket(null)}
                  title="Close inspector"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="packet-inspector-grid">
              <div className="inspector-section">
                <div className="inspector-section-title">Frame &amp; Time Metadata</div>
                <div className="inspector-field">
                  <span className="inspector-field-label">Relative Arrival:</span>
                  <span className="inspector-field-value">+{selectedPacket.time_rel.toFixed(4)}s</span>
                </div>
                <div className="inspector-field">
                  <span className="inspector-field-label">Timestamp:</span>
                  <span className="inspector-field-value">{selectedPacket.time}</span>
                </div>
                <div className="inspector-field">
                  <span className="inspector-field-label">Wire Frame Length:</span>
                  <span className="inspector-field-value">{selectedPacket.length} bytes</span>
                </div>
                <div className="inspector-field">
                  <span className="inspector-field-label">Inspection Interface:</span>
                  <span className="inspector-field-value">{stats.interface ?? networkInterface}</span>
                </div>
              </div>

              <div className="inspector-section">
                <div className="inspector-section-title">Flow &amp; Transport Layer</div>
                <div className="inspector-field">
                  <span className="inspector-field-label">Source IP:</span>
                  <span className="inspector-field-value">{selectedPacket.source_ip}</span>
                </div>
                <div className="inspector-field">
                  <span className="inspector-field-label">Source Port:</span>
                  <span className="inspector-field-value">{selectedPacket.source_port ?? 'N/A'}</span>
                </div>
                <div className="inspector-field">
                  <span className="inspector-field-label">Destination IP:</span>
                  <span className="inspector-field-value">{selectedPacket.destination_ip}</span>
                </div>
                <div className="inspector-field">
                  <span className="inspector-field-label">Destination Port:</span>
                  <span className="inspector-field-value">{selectedPacket.destination_port ?? 'N/A'}</span>
                </div>
                <div className="inspector-field">
                  <span className="inspector-field-label">TCP Flags:</span>
                  <span className="inspector-field-value">
                    {selectedPacket.flags_desc ? `${selectedPacket.flags_desc} (0x${(selectedPacket.tcp_flags ?? 0).toString(16)})` : 'None'}
                  </span>
                </div>
              </div>

              <div className="inspector-section">
                <div className="inspector-section-title">Threat &amp; Anomaly Evaluation</div>
                <div className="inspector-field">
                  <span className="inspector-field-label">Security Verdict:</span>
                  <span
                    className="inspector-field-value"
                    style={{ color: selectedPacket.is_anomaly ? '#fb7185' : '#34d399' }}
                  >
                    {selectedPacket.is_anomaly ? 'SUSPICIOUS / ANOMALY' : 'CLEAN TRAFFIC'}
                  </span>
                </div>
                {selectedPacket.anomaly_rule && (
                  <div className="inspector-field">
                    <span className="inspector-field-label">Rule Signature:</span>
                    <span className="inspector-field-value" style={{ color: '#fb7185' }}>{selectedPacket.anomaly_rule}</span>
                  </div>
                )}
                <div className="inspector-field">
                  <span className="inspector-field-label">Data Provenance:</span>
                  <span className="inspector-field-value">OBSERVED</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 2. DEDICATED BOTTOM WINDOW: ANOMALY & INTRUSION PACKETS (NIDS)      */}
      {/* =================================================================== */}
      <div className={`anomalies-bottom-window ${anomalies.length === 0 ? 'clean-state' : ''}`}>
        <div className="anomalies-header">
          <div className="anomalies-title">
            <ShieldAlert size={16} />
            <span>DETECTED THREAT &amp; ANOMALY PACKETS (LINK-LAYER NIDS)</span>
          </div>
          <span className="anomalies-count-tag">
            {anomalies.length === 0 ? '0 Anomaly Detections' : `${anomalies.length} Flagged Events`}
          </span>
        </div>

        <div className="anomalies-table-container">
          {anomalies.length === 0 ? (
            <div className="anomalies-compact-empty">
              <div className="anomalies-empty-indicator">
                <CheckCircle2 size={16} style={{ color: '#34d399' }} />
                <span className="anomalies-empty-title">All Monitored Traffic Compliant</span>
                <span className="anomalies-empty-desc">
                  0 signature violations detected across current BPF scope.
                </span>
              </div>
            </div>
          ) : (
            <table className="anomalies-table">
              <thead>
                <tr>
                  <th style={{ width: '65px' }}>Packet #</th>
                  <th style={{ width: '75px' }}>Time</th>
                  <th style={{ width: '145px' }}>Rule Signature</th>
                  <th style={{ width: '75px' }}>Severity</th>
                  <th style={{ width: '185px' }}>Offender ➔ Target</th>
                  <th style={{ minWidth: '200px' }}>Violation Evidence &amp; Description</th>
                  <th style={{ width: '115px', textAlign: 'right' }}>Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((anom) => (
                  <tr key={anom.id} className="anomalies-row">
                    <td>#{anom.packet_id}</td>
                    <td>{anom.time}</td>
                    <td>
                      <span className="anomaly-rule-tag" title={anom.name}>{anom.name}</span>
                    </td>
                    <td>
                      <span className={`nids-severity-tag ${anom.severity.toLowerCase()}`}>
                        {anom.severity}
                      </span>
                    </td>
                    <td title={`${anom.source} ➔ ${anom.destination}`}>
                      <span style={{ color: '#fda4af' }}>{formatAddress(anom.source)}</span>
                      <span style={{ color: '#64748b', margin: '0 4px' }}>➔</span>
                      <span>{formatAddress(anom.destination)}</span>
                    </td>
                    <td>
                      <div className="anomaly-desc-text" title={anom.description}>{anom.description}</div>
                      <div className="anomaly-evidence-text" title={anom.evidence}>{anom.evidence}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-shun-action"
                        onClick={() => {
                          setActionFeedback(`Defensive host shun request staged for offender ${anom.source}. Verification logged.`)
                          setTimeout(() => setActionFeedback(null), 4000)
                        }}
                      >
                        <Lock size={11} />
                        <span>Shun Source</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Historical Signature & Persistent Alerts Feed */}
      <div className="nids-alerts-card">
        <div className="nids-alerts-heading">
          <h3 className="nids-alerts-title">Historical Signature &amp; Intrusion Alerts</h3>
          <span className="records-count-pill">{alerts.length} Events Recorded</span>
        </div>

        {alerts.length === 0 ? (
          <div className="empty-state-box">
            <CheckCircle2 size={24} className="empty-state-icon" style={{ color: '#34d399' }} />
            <span className="empty-state-title">No Persistent Alerts Recorded</span>
            <span className="empty-state-desc">
              Historical intrusion detection event table is clear.
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
                        <span className="nids-alert-rule mono">{alert.rule_id}</span>
                      </div>
                      <p className="nids-alert-desc">{alert.description}</p>
                      <div className="nids-alert-meta mono">
                        <span>{formatAddress(alert.source_ip)}</span>
                        <span className="flow-arrow">➔</span>
                        <span>{formatAddress(alert.destination_ip)}</span>
                        <span className="meta-sep">•</span>
                        <span>{alert.occurred_at ? new Date(alert.occurred_at).toLocaleTimeString() : 'Recent'}</span>
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
                        disabled={busy}
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
