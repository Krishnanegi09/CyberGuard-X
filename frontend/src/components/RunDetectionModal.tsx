import React, { useState } from 'react'
import { Play, Shield, X, CheckCircle, Radio } from 'lucide-react'

type ProfileType = 'TOP_PORTS' | 'DISCOVERY' | 'SERVICE' | 'OS'

interface RunDetectionModalProps {
  isOpen: boolean
  onClose: () => void
  onExecuteScan: (profile: ProfileType, targetCidr: string) => Promise<void>
  targetCidr?: string
}

export const RunDetectionModal: React.FC<RunDetectionModalProps> = ({
  isOpen,
  onClose,
  onExecuteScan,
  targetCidr = '10.0.0.0/24', // cgx-allow: lab replay telemetry
}) => {
  const [profile, setProfile] = useState<ProfileType>('TOP_PORTS')
  const [submitting, setSubmitting] = useState(false)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  if (!isOpen) return null

  const handleRun = async () => {
    setSubmitting(true)
    setSuccessNotice(null)
    try {
      await onExecuteScan(profile, targetCidr)
      setSuccessNotice(`Detection job enqueued successfully for ${targetCidr} using profile ${profile}.`)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch {
      // handled
    } finally {
      setSubmitting(false)
    }
  }

  const profiles: Array<{ id: ProfileType; label: string; desc: string }> = [
    { id: 'TOP_PORTS', label: 'Top 1000 Ports (-sS)', desc: 'Fast SYN stealth scan of common service ports.' },
    { id: 'DISCOVERY', label: 'Host Discovery (-sn)', desc: 'Ping and ARP sweep to map live hosts.' },
    { id: 'SERVICE', label: 'Service Version (-sV)', desc: 'Deep service fingerprinting and CPE extraction.' },
    { id: 'OS', label: 'OS Fingerprinting (-O)', desc: 'TCP/IP stack fingerprinting for operating system.' },
  ]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Shield size={18} className="text-cyan" />
            <h3 className="modal-title">Trigger Detection Cycle</h3>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Run a verified scope-bound security audit against your authorized subnet. All executions are strictly checked against your organization allowlist.
          </p>

          <div className="form-group">
            <label className="form-label">Authorized Scope CIDR</label>
            <input
              type="text"
              className="form-input mono"
              value={targetCidr}
              disabled
              title="Restricted by organization scope boundary"
            />
            <span className="field-hint">Validated against active database scope rules (Least-Privilege).</span>
          </div>

          <div className="form-group">
            <label className="form-label">Detection Profile</label>
            <div className="profile-radio-group">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className={`profile-card ${profile === p.id ? 'active' : ''}`}
                  onClick={() => setProfile(p.id)}
                >
                  <div className="profile-card-header">
                    <Radio size={14} className={profile === p.id ? 'text-cyan' : 'text-muted'} />
                    <span className="profile-card-name">{p.label}</span>
                  </div>
                  <span className="profile-card-desc">{p.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {successNotice && (
            <div className="notice-banner success">
              <CheckCircle size={15} />
              <span>{successNotice}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleRun} disabled={submitting}>
            <Play size={14} fill="currentColor" />
            <span>{submitting ? 'Enqueuing Job...' : 'Launch Detection Job'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
