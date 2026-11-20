import React, { useState } from 'react'
import {
  CheckCircle2,
  RotateCcw,
  Check,
  X,
  Key,
} from 'lucide-react'

interface Integration {
  id: string
  name: string
  category: 'Firewall & Network' | 'SIEM & Analytics' | 'EDR & Endpoint' | 'Cloud Infrastructure'
  status: 'connected' | 'disconnected' | 'configuring'
  iconText: string
  endpoint: string
  lastSync: string
  eventsTransferred: string
  description: string
}

const INITIAL_INTEGRATIONS: Integration[] = [
  {
    id: 'int-pfsense',
    name: 'pfSense Perimeter Firewall',
    category: 'Firewall & Network',
    status: 'connected',
    iconText: 'PF',
    endpoint: 'https://gw-perimeter.dmz.local:443/api/v1',
    lastSync: '4m ago',
    eventsTransferred: '1,420 block rules',
    description: 'Direct XML-RPC / REST interface for automated host shunning, drop rules, and state table invalidation.',
  },
  {
    id: 'int-splunk',
    name: 'Splunk Enterprise SIEM',
    category: 'SIEM & Analytics',
    status: 'connected',
    iconText: 'SK',
    endpoint: 'https://siem-collector.soc.local:8088/services/collector',
    lastSync: '1m ago',
    eventsTransferred: '34.2k events / hr',
    description: 'High-throughput HTTP Event Collector (HEC) forwarder streaming NIDS findings and immutable audit events.',
  },
  {
    id: 'int-crowdstrike',
    name: 'CrowdStrike Falcon Sensor',
    category: 'EDR & Endpoint',
    status: 'disconnected',
    iconText: 'CS',
    endpoint: 'https://api.crowdstrike.com/oauth2/token',
    lastSync: 'Never',
    eventsTransferred: '0 endpoints',
    description: 'Queries endpoint host telemetry, process tree lineage, and correlates local process executions with wire packets.',
  },
  {
    id: 'int-aws',
    name: 'AWS VPC Flow Logs (Transit Gateway)',
    category: 'Cloud Infrastructure',
    status: 'connected',
    iconText: 'AWS',
    endpoint: 'arn:aws:s3:::cyberguard-flow-telemetry-prod',
    lastSync: '12m ago',
    eventsTransferred: '1.2 GB compressed',
    description: 'Ingests cloud subnet packet metadata from S3 bucket streams directly into NIDS anomaly correlation engine.',
  },
]

export const IntegrationsView: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS)
  const [activeModal, setActiveModal] = useState<Integration | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [hostUrlInput, setHostUrlInput] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const handleOpenConnect = (integration: Integration) => {
    setActiveModal(integration)
    setHostUrlInput(integration.endpoint)
    setApiKeyInput('••••••••••••••••••••••••••••••••')
  }

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeModal) return
    setConnecting(true)

    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === activeModal.id
            ? {
                ...item,
                status: 'connected',
                lastSync: 'Just now',
                endpoint: hostUrlInput || item.endpoint,
              }
            : item
        )
      )
      setConnecting(false)
      setActiveModal(null)
      setToast(`Integration [${activeModal.name}] authenticated and online. Live telemetry streaming.`)
      setTimeout(() => setToast(null), 4000)
    }, 1200)
  }

  const handleDisconnect = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'disconnected', lastSync: 'Disconnected' } : item))
    )
    setToast('Integration disconnected. Telemetry forwarding paused.')
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="view-container">
      <div className="discovery-view-header" style={{ marginBottom: '24px' }}>
        <div className="discovery-header-copy">
          <h2>Security Integrations & Telemetry Connectors</h2>
          <p>
            Connect perimeter firewalls, SIEM platforms, EDR agents, and cloud VPC flow logs into the CYBERGUARD-X unified threat defense deck.
          </p>
        </div>
      </div>

      {toast && (
        <div className="callout-success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Grid of integrations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {integrations.map((item) => {
          const isConnected = item.status === 'connected'

          return (
            <div
              key={item.id}
              className="cg-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px',
                gap: '16px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-canvas)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                        color: 'var(--accent-cyan)',
                      }}
                    >
                      {item.iconText}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.name}
                      </h3>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{item.category}</span>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      backgroundColor: isConnected ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: isConnected ? '#34d399' : 'var(--text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: isConnected ? '#34d399' : 'var(--text-muted)',
                      }}
                    />
                    <span>{isConnected ? 'Active' : 'Offline'}</span>
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, marginBottom: '14px' }}>
                  {item.description}
                </p>

                <div
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11.5px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.endpoint}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Sync: {item.lastSync} • Forwarded: {item.eventsTransferred}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                {isConnected ? (
                  <>
                    <button
                      type="button"
                      className="btn-layout-preset"
                      onClick={() => handleDisconnect(item.id)}
                      style={{ height: '32px' }}
                    >
                      <span>Disconnect</span>
                    </button>
                    <button
                      type="button"
                      className="btn-discovery-refresh"
                      onClick={() => {
                        setToast(`Triggered manual heartbeat check for [${item.name}]. Connection healthy (200 OK).`)
                        setTimeout(() => setToast(null), 3000)
                      }}
                      style={{ height: '32px', fontSize: '12px' }}
                    >
                      <RotateCcw size={12} />
                      <span>Test Ping</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-nids-start"
                    onClick={() => handleOpenConnect(item)}
                    style={{ height: '32px', padding: '0 14px', fontSize: '12px' }}
                  >
                    <Key size={13} />
                    <span>Configure Connection</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Connection Dialog */}
      {activeModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={16} className="text-cyan" />
                <h3 className="modal-title">Connect {activeModal.name}</h3>
              </div>
              <button
                type="button"
                className="btn-layout-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveConnection}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Enter the API endpoint and access credentials to authenticate the bidirectional communication pipeline.
                </p>

                <div className="field-group">
                  <label className="field-label" htmlFor="endpoint-url">
                    Service Host or Collector URL
                  </label>
                  <input
                    id="endpoint-url"
                    className="cg-input"
                    value={hostUrlInput}
                    onChange={(e) => setHostUrlInput(e.target.value)}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="api-key-input">
                    Authentication Bearer Token or API Key
                  </label>
                  <input
                    id="api-key-input"
                    type="password"
                    className="cg-input"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Paste secure API secret token"
                    required
                  />
                </div>

                <div style={{ backgroundColor: 'var(--bg-canvas)', padding: '12px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Credentials are encrypted at rest using AES-256-GCM and scoped exclusively to your tenant organization.
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn-layout-preset"
                  onClick={() => setActiveModal(null)}
                  disabled={connecting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-nids-start"
                  disabled={connecting}
                  style={{ height: '36px' }}
                >
                  <Check size={14} />
                  <span>{connecting ? 'Validating Token...' : 'Authenticate & Connect'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default IntegrationsView
